create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.techbits_classification as enum ('Common', 'Uncommon', 'Rare', 'Legendary');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.qr_status as enum ('active', 'sold_out', 'disabled');
exception when duplicate_object then null;
end $$;

alter type public.qr_status add value if not exists 'active';
alter type public.qr_status add value if not exists 'sold_out';
alter type public.qr_status add value if not exists 'disabled';

do $$ begin
  create type public.claim_scan_status as enum ('success', 'rejected', 'sold_out');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  details text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  classification public.techbits_classification not null default 'Common',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists details text not null default '';

create table if not exists public.techbits_characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  classification public.techbits_classification not null default 'Common',
  price numeric(10, 2) not null default 0 check (price >= 0),
  total_quantity integer not null default 1 check (total_quantity >= 1),
  claimed_quantity integer not null default 0 check (claimed_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint character_claimed_not_above_total check (claimed_quantity <= total_quantity)
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.techbits_characters(id) on delete restrict,
  qr_value text not null unique,
  status public.qr_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (character_id)
);

create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.techbits_characters(id) on delete restrict,
  qr_code_id uuid not null references public.qr_codes(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  unique (user_id, character_id)
);

alter table public.techbits_characters
  add column if not exists price numeric(10, 2) not null default 0 check (price >= 0),
  add column if not exists total_quantity integer not null default 1 check (total_quantity >= 1),
  add column if not exists claimed_quantity integer not null default 0 check (claimed_quantity >= 0);

do $$ begin
  alter table public.techbits_characters
    add constraint character_claimed_not_above_total check (claimed_quantity <= total_quantity);
exception when duplicate_object then null;
end $$;

alter table public.qr_codes drop constraint if exists qr_claim_consistency;
alter table public.qr_codes alter column status set default 'active';

update public.qr_codes
set status = case
  when status::text = 'claimed' then 'sold_out'::public.qr_status
  when status::text = 'unclaimed' then 'active'::public.qr_status
  else status
end;

do $$ begin
  if not exists (
    select 1
    from public.qr_codes
    group by character_id
    having count(*) > 1
  ) then
    alter table public.qr_codes add constraint qr_codes_character_id_key unique (character_id);
  end if;
exception when duplicate_object then null;
end $$;

alter table public.user_collections drop constraint if exists user_collections_qr_code_id_key;
alter table public.user_collections drop constraint if exists user_collections_user_id_qr_code_id_key;

do $$ begin
  alter table public.user_collections add constraint user_collections_user_id_character_id_key unique (user_id, character_id);
exception when duplicate_object then null;
end $$;

create table if not exists public.claim_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  character_id uuid references public.techbits_characters(id) on delete set null,
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  qr_value text not null,
  status public.claim_scan_status not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_characters_created_at on public.techbits_characters(created_at desc);
create index if not exists idx_qr_codes_character_id on public.qr_codes(character_id);
create index if not exists idx_qr_codes_status on public.qr_codes(status);
create index if not exists idx_user_collections_user_id on public.user_collections(user_id);
create index if not exists idx_claim_scans_user_created_at on public.claim_scans(user_id, created_at desc);
create index if not exists idx_claim_scans_character_created_at on public.claim_scans(character_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_characters_updated_at on public.techbits_characters;
create trigger set_characters_updated_at
before update on public.techbits_characters
for each row execute function public.set_updated_at();

create or replace function public.create_character_qr_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.qr_codes (character_id, qr_value)
  values (new.id, 'TECHBITS-' || gen_random_uuid()::text)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_character_qr_code_after_insert on public.techbits_characters;
create trigger create_character_qr_code_after_insert
after insert on public.techbits_characters
for each row execute function public.create_character_qr_code();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.claim_qr_code_for_user(p_qr_value text, p_user_id uuid)
returns table (
  collection_id uuid,
  character_id uuid,
  character_name text,
  classification public.techbits_classification,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_qr public.qr_codes%rowtype;
  target_character public.techbits_characters%rowtype;
  existing_collection_id uuid;
  new_collection_id uuid;
  now_value timestamptz := now();
begin
  select *
  into target_qr
  from public.qr_codes
  where qr_value = p_qr_value
  for update;

  if not found then
    insert into public.claim_scans (user_id, qr_value, status, reason)
    values (p_user_id, p_qr_value, 'rejected', 'INVALID_QR');
    raise exception 'INVALID_QR' using errcode = 'P0001';
  end if;

  select *
  into target_character
  from public.techbits_characters
  where id = target_qr.character_id
  for update;

  if not found then
    insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
    values (p_user_id, target_qr.character_id, target_qr.id, p_qr_value, 'rejected', 'CHARACTER_NOT_FOUND');
    raise exception 'INVALID_QR' using errcode = 'P0001';
  end if;

  if target_qr.status = 'disabled' then
    insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
    values (p_user_id, target_character.id, target_qr.id, p_qr_value, 'rejected', 'DISABLED_QR');
    raise exception 'DISABLED_QR' using errcode = 'P0001';
  end if;

  if target_qr.status = 'sold_out' or target_character.claimed_quantity >= target_character.total_quantity then
    update public.qr_codes
    set status = 'sold_out'
    where id = target_qr.id and status <> 'disabled';

    insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
    values (p_user_id, target_character.id, target_qr.id, p_qr_value, 'sold_out', 'SOLD_OUT');
    raise exception 'SOLD_OUT' using errcode = 'P0001';
  end if;

  select id
  into existing_collection_id
  from public.user_collections
  where user_collections.user_id = p_user_id
    and user_collections.character_id = target_character.id
  limit 1;

  if existing_collection_id is not null then
    insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
    values (p_user_id, target_character.id, target_qr.id, p_qr_value, 'rejected', 'DUPLICATE_CLAIM');
    raise exception 'DUPLICATE_CLAIM' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.claim_scans
    where user_id = p_user_id
      and qr_code_id = target_qr.id
      and created_at > now_value - interval '3 seconds'
  ) then
    insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
    values (p_user_id, target_character.id, target_qr.id, p_qr_value, 'rejected', 'COOLDOWN');
    raise exception 'COOLDOWN' using errcode = 'P0001';
  end if;

  insert into public.user_collections (user_id, character_id, qr_code_id, claimed_at)
  values (p_user_id, target_character.id, target_qr.id, now_value)
  returning id into new_collection_id;

  update public.techbits_characters
  set claimed_quantity = claimed_quantity + 1
  where id = target_character.id;

  if target_character.claimed_quantity + 1 >= target_character.total_quantity then
    update public.qr_codes
    set status = 'sold_out'
    where id = target_qr.id and status <> 'disabled';
  end if;

  insert into public.claim_scans (user_id, character_id, qr_code_id, qr_value, status, reason)
  values (p_user_id, target_character.id, target_qr.id, p_qr_value, 'success', null);

  return query
  select
    new_collection_id,
    c.id,
    c.name,
    c.classification,
    now_value
  from public.techbits_characters c
  where c.id = target_character.id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.techbits_characters enable row level security;
alter table public.qr_codes enable row level security;
alter table public.user_collections enable row level security;
alter table public.claim_scans enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
for select using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "characters_public_read" on public.techbits_characters;
create policy "characters_public_read" on public.techbits_characters
for select using (true);

drop policy if exists "characters_admin_write" on public.techbits_characters;
create policy "characters_admin_write" on public.techbits_characters
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "qr_admin_read_write" on public.qr_codes;
create policy "qr_admin_read_write" on public.qr_codes
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "collections_user_read" on public.user_collections;
create policy "collections_user_read" on public.user_collections
for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "collections_admin_read_write" on public.user_collections;
create policy "collections_admin_read_write" on public.user_collections
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "claim_scans_user_or_admin_read" on public.claim_scans;
create policy "claim_scans_user_or_admin_read" on public.claim_scans
for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "claim_scans_admin_write" on public.claim_scans;
create policy "claim_scans_admin_write" on public.claim_scans
for all using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
