-- Pétille : sodas artisanaux en canette. Schéma e-commerce.

create type public.user_role as enum ('client', 'admin');
create type public.order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
create type public.can_pattern as enum
  ('sunburst', 'dots', 'waves', 'stripes', 'rings', 'bubbles', 'split', 'zigzag', 'checker');

-- Profil lié à auth.users (créé par trigger à l'inscription)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- Familles de saveurs : Fraîches, Fruitées, Gourmandes
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text
);

create table public.products (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 60),
  tagline text not null default '',
  description text not null default '',
  story text not null default '',
  ingredients text[] not null default '{}',
  pairing text not null default '',
  sugar_g numeric(3, 1) not null check (sugar_g between 0 and 15),  -- g / 100 ml
  kcal integer not null check (kcal between 0 and 200),             -- par 100 ml
  price_cents integer not null check (price_cents > 0),
  stock integer not null default 0 check (stock >= 0),
  -- Habillage de la canette : couleur, couleur du texte, couleur du motif
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  accent text not null check (accent ~* '^#[0-9a-f]{6}$'),
  secondary text not null check (secondary ~* '^#[0-9a-f]{6}$'),
  pattern public.can_pattern not null default 'bubbles',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Panier persistant : une ligne par (client, saveur)
create table public.cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 48),
  added_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.coupons (
  code text primary key check (code = upper(code)),
  percent_off integer not null check (percent_off between 1 and 90),
  is_active boolean not null default true,
  expires_at timestamptz
);

create table public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete restrict,
  status public.order_status not null default 'paid',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_code text references public.coupons (code) on delete set null,
  shipping_name text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_zip text not null check (shipping_zip ~ '^[0-9]{5}$'),
  created_at timestamptz not null default now()
);

-- Nom et prix figés au moment de l'achat
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity > 0)
);

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

-- Ouvertures de fiche produit (KPI « saveurs les plus consultées »)
create table public.product_views (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  viewed_at timestamptz not null default now()
);

-- Le mur des bulles : messages publics de la page d'accueil
create table public.wall_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  content text not null check (char_length(trim(content)) between 1 and 280),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Formulaire de contact (lu par l'admin)
create table public.contact_messages (
  id bigint generated always as identity primary key,
  first_name text not null check (char_length(first_name) between 1 and 60),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null check (subject in ('saveur', 'commande', 'evenement', 'revendeur', 'autre')),
  message text not null check (char_length(message) between 1 and 2000),
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  email text primary key check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subscribed_at timestamptz not null default now()
);

create index on public.products (category_id);
create index on public.products (is_active);
create index on public.cart_items (product_id);
create index on public.orders (user_id, created_at desc);
create index on public.orders (created_at);
create index on public.orders (coupon_code);
create index on public.order_items (order_id);
create index on public.order_items (product_id);
create index on public.reviews (user_id);
create index on public.product_views (product_id, viewed_at);
create index on public.product_views (user_id);
create index on public.wall_messages (created_at desc) where not is_hidden;
create index on public.wall_messages (user_id);
create index on public.contact_messages (created_at desc);
