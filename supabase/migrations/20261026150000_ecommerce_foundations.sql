-- Étape 1 de la boutique : fondations e-commerce.
-- Migration additive : aucune colonne ni table existante n'est supprimée, les données restent intactes.

-- ─── Types ──────────────────────────────────────────────────────────────────
create type public.product_status as enum ('active', 'hidden', 'out_of_stock');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.fulfillment_status as enum ('unfulfilled', 'preparing', 'prepared', 'cancelled');
create type public.delivery_status as enum ('not_shipped', 'shipped', 'in_transit', 'delivered', 'returned', 'lost', 'damaged');
create type public.shipping_kind as enum ('home', 'express', 'relay');
create type public.discount_type as enum ('percent', 'fixed');
create type public.stock_reason as enum ('order', 'cancellation', 'restock', 'adjustment', 'return');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');

-- ─── Produits : fiche commerciale complète ──────────────────────────────────
alter table public.products
  add column sku text unique,
  add column compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents > 0),
  add column volume_ml integer not null default 330 check (volume_ml > 0),
  add column weight_g integer not null default 360 check (weight_g > 0),
  add column length_mm integer not null default 66 check (length_mm > 0),
  add column width_mm integer not null default 66 check (width_mm > 0),
  add column height_mm integer not null default 115 check (height_mm > 0),
  add column status public.product_status not null default 'active',
  add column images text[] not null default '{}',
  add column low_stock_threshold integer not null default 24 check (low_stock_threshold >= 0),
  add column updated_at timestamptz not null default now();

update public.products set sku = 'PET-' || upper(replace(slug, '-', '')) || '-33' where sku is null;
alter table public.products alter column sku set not null;
-- Statut aligné sur l'existant : saveur retirée = masquée
update public.products set status = 'hidden' where not is_active;

-- Packs de 6, 12 ou 24 canettes : une saveur fixe, ou personnalisable (saveurs choisies par le client)
create table public.packs (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 80),
  size integer not null check (size in (6, 12, 24)),
  price_cents integer not null check (price_cents > 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents > 0),
  product_id bigint references public.products (id) on delete cascade, -- null = pack personnalisable
  is_customizable boolean not null default false,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  check (is_customizable = (product_id is null))
);

-- Packs dans le panier, avec la répartition des saveurs ({"<product_id>": quantité})
create table public.cart_packs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id bigint not null references public.packs (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 10),
  selections jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now()
);

-- Journal de chaque mouvement de stock (delta positif = entrée)
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason public.stock_reason not null,
  order_id bigint references public.orders (id) on delete set null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Stock mis de côté pendant un paiement, libéré à l'expiration ou à l'annulation
create table public.stock_reservations (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Livraison ──────────────────────────────────────────────────────────────
create table public.carriers (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9-]+$'),
  name text not null,
  tracking_url_template text, -- {tracking} remplacé par le numéro de suivi
  api_configured boolean not null default false, -- passe à vrai quand le contrat et les clés existent
  is_active boolean not null default true
);

create table public.shipping_zones (
  id bigint generated always as identity primary key,
  name text not null unique,
  countries text[] not null check (cardinality(countries) > 0), -- codes ISO, ex. {FR}
  excluded_zip_prefixes text[] not null default '{}'
);

create table public.shipping_methods (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null default '',
  kind public.shipping_kind not null,
  carrier_id bigint references public.carriers (id) on delete set null,
  zone_id bigint not null references public.shipping_zones (id) on delete restrict,
  price_cents integer not null check (price_cents >= 0),
  free_threshold_cents integer check (free_threshold_cents is null or free_threshold_cents > 0),
  extra_fee_cents integer not null default 0 check (extra_fee_cents >= 0),
  min_days integer not null check (min_days >= 0),
  max_days integer not null check (max_days >= min_days),
  max_weight_g integer check (max_weight_g is null or max_weight_g > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.carriers (code, name, tracking_url_template) values
  ('mondial-relay', 'Mondial Relay', 'https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition={tracking}'),
  ('colissimo', 'Colissimo', 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}');
insert into public.shipping_zones (name, countries) values ('France métropolitaine', '{FR}');
insert into public.shipping_methods (code, name, description, kind, carrier_id, zone_id, price_cents, min_days, max_days, sort_order)
select 'point-relais', 'Point relais', 'Retrait dans un point relais près de chez toi.', 'relay',
  (select id from public.carriers where code = 'mondial-relay'), z.id, 0, 3, 5, 1
from public.shipping_zones z where z.name = 'France métropolitaine';
insert into public.shipping_methods (code, name, description, kind, carrier_id, zone_id, price_cents, min_days, max_days, sort_order)
select 'domicile', 'À domicile', 'Livré dans ta boîte aux lettres ou en main propre.', 'home',
  (select id from public.carriers where code = 'colissimo'), z.id, 200, 2, 3, 2
from public.shipping_zones z where z.name = 'France métropolitaine';

-- ─── Commandes : trois statuts distincts, commande sans compte, livraison choisie ──
alter table public.orders
  alter column user_id drop not null,
  add column email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column guest_token uuid unique default gen_random_uuid(), -- lien de suivi pour une commande sans compte
  add column phone text check (phone is null or char_length(phone) <= 30),
  add column shipping_country text not null default 'FR',
  add column shipping_method_id bigint references public.shipping_methods (id) on delete set null,
  add column shipping_kind public.shipping_kind,
  add column relay_point_id text check (relay_point_id is null or char_length(relay_point_id) <= 40),
  add column relay_point_label text check (relay_point_label is null or char_length(relay_point_label) <= 200),
  add column payment_status public.payment_status not null default 'pending',
  add column fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  add column delivery_status public.delivery_status not null default 'not_shipped',
  add column idempotency_key text unique,
  add column expires_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add constraint orders_owner check (user_id is not null or email is not null);

-- Commandes existantes : on reporte l'ancien statut unique sur les trois nouveaux
update public.orders set
  payment_status = case status when 'pending' then 'pending' when 'cancelled' then 'cancelled' else 'paid' end::public.payment_status,
  fulfillment_status = case status when 'cancelled' then 'cancelled' when 'paid' then 'unfulfilled' when 'pending' then 'unfulfilled' else 'prepared' end::public.fulfillment_status,
  delivery_status = case status when 'shipped' then 'shipped' when 'delivered' then 'delivered' else 'not_shipped' end::public.delivery_status,
  shipping_kind = 'home';

-- Historique horodaté de chaque changement de statut
create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  field text not null check (field in ('payment', 'fulfillment', 'delivery', 'legacy')),
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.shipments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  carrier_id bigint references public.carriers (id) on delete set null,
  tracking_number text check (tracking_number is null or char_length(tracking_number) <= 60),
  label_url text, -- renseigné seulement si une étiquette existe réellement
  status public.delivery_status not null default 'shipped',
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- ─── Paiements (Stripe, PayPal plus tard) ───────────────────────────────────
create table public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('stripe', 'paypal')),
  provider_ref text not null unique, -- id de session / paiement chez le prestataire
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id bigint generated always as identity primary key,
  payment_id bigint not null references public.payments (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  provider_ref text unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Webhooks déjà traités : un événement reçu deux fois n'est appliqué qu'une fois
create table public.payment_events (
  id text primary key, -- id de l'événement chez le prestataire
  provider text not null,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ─── Codes promo enrichis ───────────────────────────────────────────────────
alter table public.coupons
  alter column percent_off drop not null,
  add column discount_type public.discount_type not null default 'percent',
  add column amount_off_cents integer check (amount_off_cents is null or amount_off_cents > 0),
  add column min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  add column starts_at timestamptz,
  add column max_uses integer check (max_uses is null or max_uses > 0),
  add column uses_count integer not null default 0 check (uses_count >= 0),
  add column per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  add column product_id bigint references public.products (id) on delete cascade, -- null = tout le panier
  add constraint coupons_amount check (
    (discount_type = 'percent' and percent_off is not null) or (discount_type = 'fixed' and amount_off_cents is not null));

create table public.coupon_redemptions (
  id bigint generated always as identity primary key,
  coupon_code text not null references public.coupons (code) on delete cascade,
  order_id bigint not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  created_at timestamptz not null default now()
);

-- ─── Espace client ──────────────────────────────────────────────────────────
alter table public.profiles
  add column phone text check (phone is null or char_length(phone) <= 30),
  add column marketing_opt_in boolean not null default false,
  add column deletion_requested_at timestamptz;
grant update (phone, marketing_opt_in, deletion_requested_at) on public.profiles to authenticated;

create table public.addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default 'Maison' check (char_length(label) <= 40),
  full_name text not null check (char_length(full_name) between 1 and 100),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  city text not null check (char_length(city) between 1 and 100),
  country text not null default 'FR',
  phone text check (phone is null or char_length(phone) <= 30),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Réglages, notifications, journal ──────────────────────────────────────
-- Une seule ligne ; les informations légales restent vides tant qu'elles ne sont pas validées
create table public.shop_settings (
  id boolean primary key default true check (id),
  shop_name text not null default 'Pétille',
  legal_name text,
  siret text,
  vat_number text,
  address text,
  contact_email text,
  phone text,
  vat_rate numeric(4, 2) not null default 5.5 check (vat_rate between 0 and 30),
  currency text not null default 'eur',
  reservation_minutes integer not null default 30 check (reservation_minutes between 5 and 1440),
  updated_at timestamptz not null default now()
);
insert into public.shop_settings default values;

-- File d'e-mails : la clé d'idempotence empêche d'envoyer deux fois le même message
create table public.notifications (
  id bigint generated always as identity primary key,
  kind text not null,
  order_id bigint references public.orders (id) on delete cascade,
  recipient text not null,
  idempotency_key text not null unique,
  status public.notification_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Index ─────────────────────────────────────────────────────────────────
create index on public.packs (product_id);
create index on public.cart_packs (user_id);
create index on public.cart_packs (pack_id);
create index on public.stock_movements (product_id, created_at desc);
create index on public.stock_movements (order_id);
create index on public.stock_movements (created_by);
create index on public.stock_reservations (order_id);
create index on public.stock_reservations (product_id);
create index on public.stock_reservations (expires_at) where released_at is null;
create index on public.shipping_methods (carrier_id);
create index on public.shipping_methods (zone_id);
create index on public.orders (shipping_method_id);
create index on public.orders (payment_status, fulfillment_status);
create index on public.orders (email);
create index on public.order_status_history (order_id, created_at);
create index on public.order_status_history (changed_by);
create index on public.shipments (order_id);
create index on public.shipments (carrier_id);
create index on public.payments (order_id);
create index on public.refunds (payment_id);
create index on public.refunds (created_by);
create index on public.coupons (product_id);
create index on public.coupon_redemptions (coupon_code);
create index on public.coupon_redemptions (user_id);
create index on public.addresses (user_id);
create index on public.notifications (order_id);
create index on public.notifications (status) where status = 'queued';
create index on public.audit_log (actor);
create index on public.audit_log (entity, entity_id);

-- ─── Sécurité (RLS) ─────────────────────────────────────────────────────────
alter table public.packs enable row level security;
alter table public.cart_packs enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.carriers enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.order_status_history enable row level security;
alter table public.shipments enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_events enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.addresses enable row level security;
alter table public.shop_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Catalogue et livraison : lecture publique de ce qui est actif, écriture admin
create policy "packs_select" on public.packs for select to anon, authenticated
  using (status <> 'hidden' or (select public.is_admin()));
create policy "packs_admin" on public.packs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "carriers_select" on public.carriers for select to anon, authenticated using (true);
create policy "carriers_admin" on public.carriers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "zones_select" on public.shipping_zones for select to anon, authenticated using (true);
create policy "zones_admin" on public.shipping_zones for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "methods_select" on public.shipping_methods for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "methods_admin" on public.shipping_methods for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "settings_select" on public.shop_settings for select to anon, authenticated using (true);
create policy "settings_admin" on public.shop_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Données du client : uniquement les siennes
create policy "cart_packs_own" on public.cart_packs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "addresses_own" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "history_select" on public.order_status_history for select to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "shipments_select" on public.shipments for select to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "shipments_admin" on public.shipments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "payments_select" on public.payments for select to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- Réservé à l'administration (les écritures passent par des fonctions serveur)
create policy "stock_movements_admin" on public.stock_movements for select to authenticated using ((select public.is_admin()));
create policy "reservations_admin" on public.stock_reservations for select to authenticated using ((select public.is_admin()));
create policy "refunds_admin" on public.refunds for select to authenticated using ((select public.is_admin()));
create policy "payment_events_admin" on public.payment_events for select to authenticated using ((select public.is_admin()));
create policy "redemptions_admin" on public.coupon_redemptions for select to authenticated using ((select public.is_admin()));
create policy "notifications_admin" on public.notifications for select to authenticated using ((select public.is_admin()));
create policy "audit_admin" on public.audit_log for select to authenticated using ((select public.is_admin()));

-- ─── Commande : mode de livraison choisi, tarifs lus en base ────────────────
-- Paiement : toujours simulé tant que Stripe n'est pas branché (étape 3).
create or replace function public.place_order(
  p_shipping_name text, p_shipping_address text, p_shipping_city text, p_shipping_zip text,
  p_coupon_code text, p_shipping_method text, p_relay_point_label text default null
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_method public.shipping_methods%rowtype;
  v_subtotal integer;
  v_percent integer;
  v_coupon text;
  v_discount integer := 0;
  v_shipping integer;
  v_order_id bigint;
  v_out_of_stock text;
begin
  if v_user is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not exists (select 1 from public.cart_items where user_id = v_user) then
    raise exception 'Panier vide' using errcode = 'P0001';
  end if;

  select * into v_method from public.shipping_methods where code = p_shipping_method and is_active;
  if not found then
    raise exception 'Mode de livraison indisponible' using errcode = 'P0001';
  end if;
  if v_method.kind = 'relay' and coalesce(trim(p_relay_point_label), '') = '' then
    raise exception 'Choisis ton point relais' using errcode = 'P0001';
  end if;

  perform 1 from public.products p
  join public.cart_items c on c.product_id = p.id
  where c.user_id = v_user
  for update of p;

  select p.name into v_out_of_stock
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user and (p.stock < c.quantity or not p.is_active or p.status <> 'active')
  limit 1;
  if v_out_of_stock is not null then
    raise exception 'Stock insuffisant pour %', v_out_of_stock using errcode = 'P0001';
  end if;

  select sum(p.price_cents * c.quantity) into v_subtotal
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user;

  if p_coupon_code is not null and trim(p_coupon_code) <> '' then
    v_percent := public.validate_coupon(p_coupon_code);
    if v_percent is null then
      raise exception 'Code promo invalide' using errcode = 'P0001';
    end if;
    v_coupon := upper(trim(p_coupon_code));
    v_discount := round(v_subtotal * v_percent / 100.0);
  end if;

  v_shipping := case
    when v_method.free_threshold_cents is not null and v_subtotal - v_discount >= v_method.free_threshold_cents then 0
    else v_method.price_cents + v_method.extra_fee_cents
  end;

  insert into public.orders (user_id, status, subtotal_cents, discount_cents, shipping_cents, total_cents,
    coupon_code, shipping_name, shipping_address, shipping_city, shipping_zip,
    shipping_method_id, shipping_kind, relay_point_label, payment_status)
  values (v_user, 'paid', v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon, trim(p_shipping_name), trim(p_shipping_address), trim(p_shipping_city), trim(p_shipping_zip),
    v_method.id, v_method.kind, nullif(trim(p_relay_point_label), ''), 'paid')
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  select v_order_id, p.id, p.name, p.price_cents, c.quantity
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user;

  insert into public.stock_movements (product_id, delta, reason, order_id, created_by)
  select c.product_id, -c.quantity, 'order', v_order_id, v_user
  from public.cart_items c where c.user_id = v_user;

  update public.products p set stock = p.stock - c.quantity, updated_at = now()
  from public.cart_items c
  where c.product_id = p.id and c.user_id = v_user;

  if v_coupon is not null then
    insert into public.coupon_redemptions (coupon_code, order_id, user_id) values (v_coupon, v_order_id, v_user);
    update public.coupons set uses_count = uses_count + 1 where code = v_coupon;
  end if;

  insert into public.order_status_history (order_id, field, to_status, note, changed_by)
  values (v_order_id, 'payment', 'paid', 'Paiement simulé (Stripe pas encore configuré)', v_user);

  delete from public.cart_items where user_id = v_user;
  return v_order_id;
end;
$$;

-- L'ancienne signature reste disponible le temps du déploiement : livraison à domicile
create or replace function public.place_order(
  p_shipping_name text, p_shipping_address text, p_shipping_city text, p_shipping_zip text,
  p_coupon_code text default null
)
returns bigint language sql security definer set search_path = ''
as $$
  select public.place_order(p_shipping_name, p_shipping_address, p_shipping_city, p_shipping_zip, p_coupon_code, 'domicile', null);
$$;

revoke execute on function public.place_order(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.place_order(text, text, text, text, text, text, text) to authenticated;
