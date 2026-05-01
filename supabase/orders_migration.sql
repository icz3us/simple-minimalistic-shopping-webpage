-- ============================================================
-- Orders & Order Items migration for TechBits e-commerce
-- ============================================================

-- Enum types for order tracking
do $$ begin
  create type public.payment_status as enum ('Pending', 'Paid', 'Failed', 'Refunded', 'Expired');
exception when duplicate_object then null;
end $$;
alter type public.payment_status add value if not exists 'Expired';

do $$ begin
  create type public.order_status as enum ('Pending', 'Processing', 'Completed', 'Cancelled');
exception when duplicate_object then null;
end $$;

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null default '',
  phone text not null default '',
  shipping_address text not null default '',
  shipping_city text not null default '',
  shipping_province text not null default '',
  shipping_zip text not null default '',
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment_status public.payment_status not null default 'Pending',
  order_status public.order_status not null default 'Pending',
  paymongo_payment_intent_id text,
  paymongo_source_id text,
  paymongo_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_image_url text,
  rarity text not null default 'Common',
  price_each numeric(10, 2) not null check (price_each >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_order_status on public.orders(order_status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- Auto-update updated_at trigger
drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- RLS
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Users can read their own orders
drop policy if exists "orders_user_read_own" on public.orders;
create policy "orders_user_read_own" on public.orders
for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Admin full access on orders
drop policy if exists "orders_admin_write" on public.orders;
create policy "orders_admin_write" on public.orders
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Users can read their own order items (via order ownership)
drop policy if exists "order_items_user_read_own" on public.order_items;
create policy "order_items_user_read_own" on public.order_items
for select using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

-- Admin full access on order items
drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write" on public.order_items
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'paymongo',
  method text not null,
  amount numeric(10, 2) not null,
  status text not null,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payments RLS
alter table public.payments enable row level security;

drop policy if exists "payments_user_read_own" on public.payments;
create policy "payments_user_read_own" on public.payments
for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

