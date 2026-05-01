-- ============================================================
-- Product Units Migration for TechBits (Per-Unit QR Codes)
-- ============================================================

-- Create product unit status enum
do $$ begin
  create type public.unit_status as enum ('unclaimed', 'claimed', 'disabled');
exception when duplicate_object then null;
end $$;

-- Drop old qr_codes trigger
drop trigger if exists create_character_qr_code_after_insert on public.techbits_characters;
drop function if exists public.create_character_qr_code();

-- Create product_units table
create table if not exists public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.techbits_characters(id) on delete cascade,
  serial_number text not null,
  qr_token text not null unique,
  qr_image_url text,
  status public.unit_status not null default 'unclaimed',
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_product_units_product_id on public.product_units(product_id);
create index if not exists idx_product_units_qr_token on public.product_units(qr_token);
create index if not exists idx_product_units_status on public.product_units(status);

-- Auto-update updated_at trigger
drop trigger if exists set_product_units_updated_at on public.product_units;
create trigger set_product_units_updated_at
before update on public.product_units
for each row execute function public.set_updated_at();

-- RLS
alter table public.product_units enable row level security;

-- Admin can read/write everything
drop policy if exists "product_units_admin_all" on public.product_units;
create policy "product_units_admin_all" on public.product_units
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Users can read their own claimed units
drop policy if exists "product_units_user_read_own" on public.product_units;
create policy "product_units_user_read_own" on public.product_units
for select using (auth.uid() = claimed_by);

-- We need to migrate old collections to the new system, or at least update the user_collections table
-- user_collections used to reference qr_code_id. We'll change it to reference product_units(id)
alter table public.user_collections drop constraint if exists user_collections_qr_code_id_fkey;
alter table public.user_collections drop constraint if exists user_collections_user_id_character_id_key;
alter table public.user_collections drop column if exists qr_code_id;
alter table public.user_collections add column if not exists product_unit_id uuid references public.product_units(id) on delete set null;

-- claim_scans table updates
alter table public.claim_scans drop constraint if exists claim_scans_qr_code_id_fkey;
alter table public.claim_scans drop column if exists qr_code_id;
alter table public.claim_scans add column if not exists product_unit_id uuid references public.product_units(id) on delete set null;

-- Drop old qr_codes table (WARNING: This will wipe out old QR data, but since we are replacing the system, it's necessary)
drop table if exists public.qr_codes cascade;
drop type if exists public.qr_status cascade;

-- RPC to increment total quantity
create or replace function public.increment_character_quantity(p_character_id uuid, p_amount int)
returns void
language plpgsql
security definer
as $$
begin
  update public.techbits_characters
  set total_quantity = total_quantity + p_amount
  where id = p_character_id;
end;
$$;

-- Fix user_collections foreign key to allow character deletion (CASCADE)
alter table public.user_collections drop constraint if exists user_collections_character_id_fkey;
alter table public.user_collections 
  add constraint user_collections_character_id_fkey 
  foreign key (character_id) references public.techbits_characters(id) on delete cascade;
