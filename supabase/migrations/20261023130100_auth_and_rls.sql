-- Rôles, profil automatique et politiques RLS

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 100));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vrai si le client connecté a acheté cette saveur (condition pour laisser un avis)
create or replace function public.has_purchased(p_product_id bigint)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.user_id = (select auth.uid()) and oi.product_id = p_product_id and o.status <> 'cancelled'
  );
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_purchased(bigint) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_purchased(bigint) to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.product_views enable row level security;
alter table public.wall_messages enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Profils : chacun le sien, l'admin voit tout ; seul full_name est modifiable (pas de promotion admin)
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- Catalogue : lecture publique, écriture admin
create policy "categories_select" on public.categories for select to anon, authenticated using (true);
create policy "categories_admin_insert" on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy "categories_admin_update" on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories_admin_delete" on public.categories for delete to authenticated using ((select public.is_admin()));

create policy "products_select_anon" on public.products for select to anon using (is_active);
create policy "products_select_auth" on public.products for select to authenticated
  using (is_active or (select public.is_admin()));
create policy "products_admin_insert" on public.products for insert to authenticated with check ((select public.is_admin()));
create policy "products_admin_update" on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products_admin_delete" on public.products for delete to authenticated using ((select public.is_admin()));

-- Panier : uniquement le sien
create policy "cart_own" on public.cart_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Codes promo : admin ; les clients passent par validate_coupon()
create policy "coupons_admin" on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Commandes : créées par place_order() uniquement
create policy "orders_select" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "orders_admin_update" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "order_items_select" on public.order_items for select to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- Avis : lecture publique, écriture réservée aux acheteurs
create policy "reviews_select" on public.reviews for select to anon, authenticated using (true);
create policy "reviews_insert_buyer" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_purchased(product_id));
create policy "reviews_update_own" on public.reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews_delete" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Consultations : tout le monde enregistre, seul l'admin lit
create policy "views_insert" on public.product_views for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "views_select_admin" on public.product_views for select to authenticated using ((select public.is_admin()));

-- Mur des bulles : public en lecture (messages non masqués) et en écriture, modération admin
create policy "wall_select_anon" on public.wall_messages for select to anon using (not is_hidden);
create policy "wall_select_auth" on public.wall_messages for select to authenticated
  using (not is_hidden or (select public.is_admin()));
create policy "wall_insert" on public.wall_messages for insert to anon, authenticated
  with check (not is_hidden and (user_id is null or user_id = (select auth.uid())));
create policy "wall_admin_update" on public.wall_messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Contact et newsletter : écriture publique, lecture admin
create policy "contact_insert" on public.contact_messages for insert to anon, authenticated with check (not is_handled);
create policy "contact_admin_select" on public.contact_messages for select to authenticated using ((select public.is_admin()));
create policy "contact_admin_update" on public.contact_messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "newsletter_insert" on public.newsletter_subscribers for insert to anon, authenticated with check (email = lower(email));
create policy "newsletter_admin_select" on public.newsletter_subscribers for select to authenticated using ((select public.is_admin()));
