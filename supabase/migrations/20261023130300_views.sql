-- Vues de lecture en security_invoker : la RLS de l'appelant s'applique,
-- seul un admin voit les chiffres globaux des vues KPI.

create view public.product_catalog with (security_invoker = true) as
select
  p.id, p.slug, p.name, p.tagline, p.description, p.story, p.ingredients, p.pairing,
  p.sugar_g, p.kcal, p.price_cents, p.stock, p.color, p.accent, p.secondary, p.pattern,
  p.is_active, p.created_at,
  c.id as category_id, c.slug as category_slug, c.name as category_name,
  coalesce(r.avg_rating, 0) as avg_rating,
  coalesce(r.review_count, 0) as review_count
from public.products p
join public.categories c on c.id = p.category_id
left join (
  select product_id, round(avg(rating), 1) as avg_rating, count(*)::integer as review_count
  from public.reviews group by product_id
) r on r.product_id = p.id;

create view public.kpi_overview with (security_invoker = true) as
select
  coalesce(sum(total_cents), 0)::bigint as revenue_cents,
  count(*)::integer as order_count,
  coalesce(round(avg(total_cents)), 0)::integer as avg_order_cents,
  count(distinct user_id)::integer as buyer_count,
  coalesce(sum(total_cents) filter (where created_at >= now() - interval '30 days'), 0)::bigint as revenue_30d_cents,
  count(*) filter (where created_at >= now() - interval '30 days')::integer as orders_30d,
  (select coalesce(sum(oi.quantity), 0) from public.order_items oi
     join public.orders o2 on o2.id = oi.order_id where o2.status <> 'cancelled')::integer as cans_sold,
  (select count(*) from public.profiles where role = 'client')::integer as customer_count,
  (select count(*) from public.profiles where role = 'client' and created_at >= now() - interval '30 days')::integer as new_customers_30d,
  (select count(*) from public.newsletter_subscribers)::integer as newsletter_count,
  (select count(*) from public.contact_messages where not is_handled)::integer as open_contacts
from public.orders
where status <> 'cancelled';

create view public.kpi_daily_revenue with (security_invoker = true) as
select d::date as day, coalesce(sum(o.total_cents), 0)::bigint as revenue_cents, count(o.id)::integer as order_count
from generate_series(current_date - 29, current_date, interval '1 day') d
left join public.orders o on o.created_at::date = d::date and o.status <> 'cancelled'
group by d order by d;

create view public.kpi_top_products with (security_invoker = true) as
select oi.product_id, oi.product_name, sum(oi.quantity)::integer as units_sold,
  sum(oi.quantity * oi.unit_price_cents)::bigint as revenue_cents
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.status <> 'cancelled'
group by oi.product_id, oi.product_name
order by units_sold desc;

create view public.kpi_orders_by_status with (security_invoker = true) as
select status, count(*)::integer as order_count from public.orders group by status;

create view public.kpi_category_sales with (security_invoker = true) as
select c.name as category_name,
  coalesce(sum(s.quantity), 0)::integer as units_sold,
  coalesce(sum(s.quantity * s.unit_price_cents), 0)::bigint as revenue_cents
from public.categories c
left join public.products p on p.category_id = c.id
left join (
  select oi.product_id, oi.quantity, oi.unit_price_cents
  from public.order_items oi
  join public.orders o on o.id = oi.order_id and o.status <> 'cancelled'
) s on s.product_id = p.id
group by c.name order by revenue_cents desc;

create view public.kpi_product_views with (security_invoker = true) as
select p.id as product_id, p.name as product_name,
  count(distinct pv.id)::integer as views,
  coalesce(s.units_sold, 0)::integer as units_sold
from public.products p
left join public.product_views pv on pv.product_id = p.id
left join (
  select oi.product_id, sum(oi.quantity) as units_sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id and o.status <> 'cancelled'
  group by oi.product_id
) s on s.product_id = p.id
group by p.id, p.name, s.units_sold order by views desc;

create view public.kpi_low_stock with (security_invoker = true) as
select id as product_id, name as product_name, stock
from public.products
where stock <= 24 and is_active
order by stock, name;

revoke select on public.kpi_overview, public.kpi_daily_revenue, public.kpi_top_products,
  public.kpi_orders_by_status, public.kpi_category_sales, public.kpi_product_views, public.kpi_low_stock
from anon;
