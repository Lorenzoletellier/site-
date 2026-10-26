-- Étape 2 de la boutique : packs à composer, panier calculé en base, stocks tracés.
-- Migration additive, sauf place_order (7 arguments) qui est réécrite pour gérer les packs.

-- ─── Statut et mise en vente toujours cohérents ─────────────────────────────
-- is_active (utilisé par l'existant) et status (nouveau) se suivent : masquée <=> retirée de la vente
create or replace function public.sync_product_status()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.is_active := new.status <> 'hidden';
  elsif new.is_active is distinct from old.is_active then
    new.status := case when new.is_active then 'active' else 'hidden' end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_sync_status before update on public.products
  for each row execute function public.sync_product_status();

-- Catalogue : nouvelles colonnes ajoutées en fin de vue
create or replace view public.product_catalog with (security_invoker = true) as
select
  p.id, p.slug, p.name, p.tagline, p.description, p.story, p.ingredients, p.pairing,
  p.sugar_g, p.kcal, p.price_cents, p.stock, p.color, p.accent, p.secondary, p.pattern,
  p.is_active, p.created_at,
  c.id as category_id, c.slug as category_slug, c.name as category_name,
  coalesce(r.avg_rating, 0) as avg_rating,
  coalesce(r.review_count, 0) as review_count,
  p.status, p.compare_at_price_cents, p.sku, p.volume_ml
from public.products p
join public.categories c on c.id = p.category_id
left join (
  select product_id, round(avg(rating), 1) as avg_rating, count(*)::integer as review_count
  from public.reviews group by product_id
) r on r.product_id = p.id;

-- ─── Packs à composer ───────────────────────────────────────────────────────
insert into public.packs (slug, name, size, price_cents, is_customizable) values
  ('pack-6', 'Pack de 6', 6, 1440, true),
  ('pack-12', 'Pack de 12', 12, 2760, true),
  ('pack-24', 'Pack de 24', 24, 5280, true);

-- Message d'erreur si la composition d'un pack est invalide, sinon null.
-- Composition : {"<id saveur>": nombre de canettes}, saveurs en vente, total = taille du pack.
create or replace function public.pack_selection_error(p_size integer, p_selections jsonb)
returns text language plpgsql stable set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_total integer := 0;
begin
  if p_selections is null or jsonb_typeof(p_selections) <> 'object' then
    return 'Composition du pack invalide.';
  end if;
  for v_key, v_value in select key, value from jsonb_each(p_selections) loop
    if v_key !~ '^[0-9]+$' or jsonb_typeof(v_value) <> 'number'
       or (v_value #>> '{}')::numeric <> floor((v_value #>> '{}')::numeric) or (v_value #>> '{}')::integer <= 0 then
      return 'Composition du pack invalide.';
    end if;
    if not exists (select 1 from public.products where id = v_key::bigint and status = 'active') then
      return 'Une saveur du pack n''est plus disponible.';
    end if;
    v_total := v_total + (v_value #>> '{}')::integer;
  end loop;
  if v_total <> p_size then
    return format('Le pack doit contenir %s canettes.', p_size);
  end if;
  return null;
end;
$$;

-- ─── Panier : prix mémorisé à l'ajout (pour signaler un prix modifié), packs validés ──
alter table public.cart_items add column price_cents_at_add integer;
alter table public.cart_packs add column price_cents_at_add integer;

create or replace function public.cart_items_set_price()
returns trigger language plpgsql set search_path = ''
as $$
begin
  select price_cents into new.price_cents_at_add from public.products where id = new.product_id;
  return new;
end;
$$;
create trigger cart_items_price before insert on public.cart_items
  for each row execute function public.cart_items_set_price();

create or replace function public.cart_packs_check()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_pack public.packs%rowtype;
  v_error text;
begin
  select * into v_pack from public.packs where id = new.pack_id;
  if not found or v_pack.status <> 'active' then
    raise exception 'Ce pack n''est plus disponible.' using errcode = 'P0001';
  end if;
  v_error := public.pack_selection_error(v_pack.size, new.selections);
  if v_error is not null then
    raise exception '%', v_error using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.price_cents_at_add := v_pack.price_cents;
  end if;
  return new;
end;
$$;
create trigger cart_packs_check before insert or update on public.cart_packs
  for each row execute function public.cart_packs_check();

-- Réassort et corrections de stock saisis par l'admin : tracés dans le journal
create policy "stock_movements_admin_insert" on public.stock_movements for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()) and reason in ('restock', 'adjustment', 'return'));

-- Lignes de commande issues d'un pack : composition figée au moment de l'achat
alter table public.order_items
  add column pack_id bigint references public.packs (id) on delete set null,
  add column pack_selections jsonb;
create index on public.order_items (pack_id);

-- ─── Calcul du panier : une seule règle pour l'affichage et pour la commande ──
-- Recalcule tout côté serveur : sous-total, packs, code promo, livraison, économies réelles, ruptures.
create or replace function public._cart_quote(p_user uuid, p_coupon_code text, p_shipping_method text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_items integer;
  v_items_ref integer;
  v_packs integer;
  v_packs_ref integer;
  v_subtotal integer;
  v_coupon public.coupons%rowtype;
  v_coupon_error text;
  v_base integer;
  v_discount integer := 0;
  v_method public.shipping_methods%rowtype;
  v_shipping integer;
  v_issue text;
begin
  -- Canettes à l'unité : prix actuel et prix barré éventuel
  select coalesce(sum(p.price_cents * c.quantity), 0), coalesce(sum(coalesce(p.compare_at_price_cents, p.price_cents) * c.quantity), 0)
  into v_items, v_items_ref
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = p_user;

  -- Packs : prix du pack, et valeur des mêmes canettes achetées à l'unité
  select coalesce(sum(k.price_cents * cp.quantity), 0) into v_packs
  from public.cart_packs cp join public.packs k on k.id = cp.pack_id
  where cp.user_id = p_user;
  select coalesce(sum(p.price_cents * (s.value)::integer * cp.quantity), 0) into v_packs_ref
  from public.cart_packs cp
  cross join lateral jsonb_each_text(cp.selections) s
  join public.products p on p.id = s.key::bigint
  where cp.user_id = p_user;

  v_subtotal := v_items + v_packs;

  -- Rupture : besoin total par saveur (unités + contenu des packs) comparé au stock
  select p.name into v_issue
  from public.products p
  join (
    select product_id, sum(qty) as qty from (
      select product_id, quantity as qty from public.cart_items where user_id = p_user
      union all
      select s.key::bigint, (s.value)::integer * cp.quantity
      from public.cart_packs cp cross join lateral jsonb_each_text(cp.selections) s
      where cp.user_id = p_user
    ) x group by product_id
  ) need on need.product_id = p.id
  where p.stock < need.qty or p.status <> 'active'
  limit 1;
  if v_issue is null then
    select k.name into v_issue
    from public.cart_packs cp join public.packs k on k.id = cp.pack_id
    where cp.user_id = p_user and (k.status <> 'active' or public.pack_selection_error(k.size, cp.selections) is not null)
    limit 1;
  end if;

  -- Code promo : dates, limites d'utilisation, minimum d'achat, produit ciblé
  if coalesce(trim(p_coupon_code), '') <> '' then
    select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code));
    if not found or not v_coupon.is_active
       or (v_coupon.expires_at is not null and v_coupon.expires_at <= now())
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now()) then
      v_coupon_error := 'Code promo invalide ou expiré.';
    elsif v_coupon.max_uses is not null and v_coupon.uses_count >= v_coupon.max_uses then
      v_coupon_error := 'Ce code a atteint sa limite d''utilisation.';
    elsif v_coupon.per_customer_limit is not null and (
      select count(*) from public.coupon_redemptions where coupon_code = v_coupon.code and user_id = p_user
    ) >= v_coupon.per_customer_limit then
      v_coupon_error := 'Tu as déjà utilisé ce code.';
    elsif v_subtotal < v_coupon.min_subtotal_cents then
      v_coupon_error := format('Ce code demande %s € d''achat minimum.', replace(to_char(v_coupon.min_subtotal_cents / 100.0, 'FM999990.00'), '.', ','));
    else
      v_base := case when v_coupon.product_id is null then v_subtotal else (
        select coalesce(sum(p.price_cents * c.quantity), 0)
        from public.cart_items c join public.products p on p.id = c.product_id
        where c.user_id = p_user and c.product_id = v_coupon.product_id) end;
      if v_base = 0 then
        v_coupon_error := 'Ce code ne s''applique à aucun article de ton panier.';
      else
        v_discount := least(v_base, case v_coupon.discount_type
          when 'percent' then round(v_base * v_coupon.percent_off / 100.0)::integer
          else v_coupon.amount_off_cents end);
      end if;
    end if;
  end if;

  -- Livraison du mode choisi
  if p_shipping_method is not null then
    select * into v_method from public.shipping_methods where code = p_shipping_method and is_active;
    if found then
      v_shipping := case
        when v_method.free_threshold_cents is not null and v_subtotal - v_discount >= v_method.free_threshold_cents then 0
        else v_method.price_cents + v_method.extra_fee_cents end;
    end if;
  end if;

  return jsonb_build_object(
    'items_cents', v_items,
    'packs_cents', v_packs,
    'subtotal_cents', v_subtotal,
    'discount_cents', v_discount,
    'coupon_code', case when v_discount > 0 then v_coupon.code end,
    'coupon_error', v_coupon_error,
    'shipping_method_id', v_method.id,
    'shipping_cents', v_shipping,
    'total_cents', v_subtotal - v_discount + coalesce(v_shipping, 0),
    'savings_cents', greatest(v_items_ref - v_items, 0) + greatest(v_packs_ref - v_packs, 0) + v_discount,
    'stock_issue', v_issue,
    'is_empty', v_subtotal = 0
  );
end;
$$;

-- Version appelable par le client connecté : uniquement son propre panier
create or replace function public.cart_quote(p_coupon_code text default null, p_shipping_method text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  return public._cart_quote((select auth.uid()), p_coupon_code, p_shipping_method);
end;
$$;

revoke execute on function public._cart_quote(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.cart_quote(text, text) from public, anon;
grant execute on function public.cart_quote(text, text) to authenticated;
revoke execute on function public.pack_selection_error(integer, jsonb) from public, anon;
grant execute on function public.pack_selection_error(integer, jsonb) to authenticated;
revoke execute on function public.sync_product_status() from public, anon, authenticated;
revoke execute on function public.cart_items_set_price() from public, anon, authenticated;
revoke execute on function public.cart_packs_check() from public, anon, authenticated;

-- ─── Commande : unités et packs, montants issus de _cart_quote ──────────────
create or replace function public.place_order(
  p_shipping_name text, p_shipping_address text, p_shipping_city text, p_shipping_zip text,
  p_coupon_code text, p_shipping_method text, p_relay_point_label text default null
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_method public.shipping_methods%rowtype;
  v_quote jsonb;
  v_order_id bigint;
  v_coupon text;
begin
  if v_user is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;

  select * into v_method from public.shipping_methods where code = p_shipping_method and is_active;
  if not found then
    raise exception 'Mode de livraison indisponible' using errcode = 'P0001';
  end if;
  if v_method.kind = 'relay' and coalesce(trim(p_relay_point_label), '') = '' then
    raise exception 'Choisis ton point relais' using errcode = 'P0001';
  end if;

  -- Verrou sur les saveurs concernées : deux commandes simultanées ne vendent pas la même dernière canette
  perform 1 from public.products p
  where p.id in (
    select product_id from public.cart_items where user_id = v_user
    union
    select s.key::bigint from public.cart_packs cp cross join lateral jsonb_each_text(cp.selections) s where cp.user_id = v_user
  )
  order by p.id
  for update;

  v_quote := public._cart_quote(v_user, p_coupon_code, p_shipping_method);
  if (v_quote ->> 'is_empty')::boolean then
    raise exception 'Panier vide' using errcode = 'P0001';
  end if;
  if v_quote ->> 'stock_issue' is not null then
    raise exception 'Stock insuffisant pour %', v_quote ->> 'stock_issue' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_coupon_code), '') <> '' and v_quote ->> 'coupon_error' is not null then
    raise exception '%', v_quote ->> 'coupon_error' using errcode = 'P0001';
  end if;
  v_coupon := v_quote ->> 'coupon_code';

  insert into public.orders (user_id, status, subtotal_cents, discount_cents, shipping_cents, total_cents,
    coupon_code, shipping_name, shipping_address, shipping_city, shipping_zip,
    shipping_method_id, shipping_kind, relay_point_label, payment_status)
  values (v_user, 'paid', (v_quote ->> 'subtotal_cents')::integer, (v_quote ->> 'discount_cents')::integer,
    (v_quote ->> 'shipping_cents')::integer, (v_quote ->> 'total_cents')::integer,
    v_coupon, trim(p_shipping_name), trim(p_shipping_address), trim(p_shipping_city), trim(p_shipping_zip),
    v_method.id, v_method.kind, nullif(trim(p_relay_point_label), ''), 'paid')
  returning id into v_order_id;

  -- Canettes à l'unité
  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  select v_order_id, p.id, p.name, p.price_cents, c.quantity
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user;

  -- Packs, avec leur composition en clair et figée
  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity, pack_id, pack_selections)
  select v_order_id, null,
    k.name || ' : ' || (
      select string_agg(s.value || ' ' || p.name, ', ' order by p.name)
      from jsonb_each_text(cp.selections) s join public.products p on p.id = s.key::bigint),
    k.price_cents, cp.quantity, k.id, cp.selections
  from public.cart_packs cp join public.packs k on k.id = cp.pack_id
  where cp.user_id = v_user;

  -- Stock : sortie de chaque canette vendue, à l'unité ou en pack, tracée dans le journal
  with need as (
    select product_id, sum(qty)::integer as qty from (
      select product_id, quantity as qty from public.cart_items where user_id = v_user
      union all
      select s.key::bigint, (s.value)::integer * cp.quantity
      from public.cart_packs cp cross join lateral jsonb_each_text(cp.selections) s
      where cp.user_id = v_user
    ) x group by product_id
  ), moved as (
    insert into public.stock_movements (product_id, delta, reason, order_id, created_by)
    select product_id, -qty, 'order', v_order_id, v_user from need
    returning product_id
  )
  update public.products p set stock = p.stock - need.qty
  from need where need.product_id = p.id;

  if v_coupon is not null then
    insert into public.coupon_redemptions (coupon_code, order_id, user_id) values (v_coupon, v_order_id, v_user);
    update public.coupons set uses_count = uses_count + 1 where code = v_coupon;
  end if;

  insert into public.order_status_history (order_id, field, to_status, note, changed_by)
  values (v_order_id, 'payment', 'paid', 'Paiement simulé (Stripe pas encore configuré)', v_user);

  delete from public.cart_items where user_id = v_user;
  delete from public.cart_packs where user_id = v_user;
  return v_order_id;
end;
$$;
