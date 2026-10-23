-- Fonctions métier appelées via supabase.rpc()

-- Pourcentage de réduction d'un code valide, sinon null
create or replace function public.validate_coupon(p_code text)
returns integer language sql stable security definer set search_path = ''
as $$
  select percent_off from public.coupons
  where code = upper(trim(p_code)) and is_active and (expires_at is null or expires_at > now());
$$;

-- Transforme le panier du client connecté en commande, en une transaction :
-- verrouille les stocks, recalcule les prix côté serveur, applique code promo et port,
-- décrémente les stocks puis vide le panier.
create or replace function public.place_order(
  p_shipping_name text, p_shipping_address text, p_shipping_city text, p_shipping_zip text,
  p_coupon_code text default null
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  free_shipping_threshold constant integer := 2500; -- 25 €
  shipping_fee constant integer := 490;             -- 4,90 €
  v_user uuid := (select auth.uid());
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

  perform 1 from public.products p
  join public.cart_items c on c.product_id = p.id
  where c.user_id = v_user
  for update of p;

  select p.name into v_out_of_stock
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user and (p.stock < c.quantity or not p.is_active)
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

  v_shipping := case when v_subtotal - v_discount >= free_shipping_threshold then 0 else shipping_fee end;

  insert into public.orders (user_id, status, subtotal_cents, discount_cents, shipping_cents, total_cents,
    coupon_code, shipping_name, shipping_address, shipping_city, shipping_zip)
  values (v_user, 'paid', v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon, trim(p_shipping_name), trim(p_shipping_address), trim(p_shipping_city), trim(p_shipping_zip))
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price_cents, quantity)
  select v_order_id, p.id, p.name, p.price_cents, c.quantity
  from public.cart_items c join public.products p on p.id = c.product_id
  where c.user_id = v_user;

  update public.products p set stock = p.stock - c.quantity
  from public.cart_items c
  where c.product_id = p.id and c.user_id = v_user;

  delete from public.cart_items where user_id = v_user;
  return v_order_id;
end;
$$;

revoke execute on function public.validate_coupon(text) from public, anon;
grant execute on function public.validate_coupon(text) to authenticated;
revoke execute on function public.place_order(text, text, text, text, text) from public, anon;
grant execute on function public.place_order(text, text, text, text, text) to authenticated;
