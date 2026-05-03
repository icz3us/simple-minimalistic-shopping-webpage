-- ============================================================
-- Serialized Product Units Migration for TechBits
-- Adds integer serials, total quantities, and #n/total labels.
-- ============================================================

alter table public.product_units add column if not exists total_quantity integer;
alter table public.product_units add column if not exists display_number text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_units'
      and column_name = 'serial_number'
      and data_type <> 'integer'
  ) then
    alter table public.product_units add column if not exists serial_number_int integer;

    update public.product_units
    set serial_number_int = coalesce(nullif(substring(serial_number from '([0-9]+)'), '')::integer, 1)
    where serial_number_int is null;

    alter table public.product_units drop column serial_number;
    alter table public.product_units rename column serial_number_int to serial_number;
  end if;
end $$;

with normalized as (
  select
    pu.id,
    coalesce(
      nullif(pu.serial_number, 0),
      row_number() over (partition by pu.product_id order by pu.created_at, pu.id)::integer
    ) as normalized_serial,
    greatest(
      count(*) over (partition by pu.product_id)::integer,
      max(coalesce(pu.serial_number, 0)) over (partition by pu.product_id)::integer,
      coalesce(c.total_quantity, 1)
    ) as normalized_total
  from public.product_units pu
  join public.techbits_characters c on c.id = pu.product_id
)
update public.product_units pu
set
  serial_number = normalized.normalized_serial,
  total_quantity = greatest(normalized.normalized_total, normalized.normalized_serial),
  display_number = '#' || normalized.normalized_serial || '/' || greatest(normalized.normalized_total, normalized.normalized_serial)
from normalized
where pu.id = normalized.id;

alter table public.product_units alter column serial_number set not null;
alter table public.product_units alter column total_quantity set not null;
alter table public.product_units alter column display_number set not null;

do $$
begin
  alter table public.product_units
    add constraint product_units_serial_number_positive check (serial_number > 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.product_units
    add constraint product_units_total_quantity_valid check (total_quantity >= serial_number);
exception when duplicate_object then null;
end $$;

create index if not exists idx_product_units_display_number on public.product_units(display_number);
create unique index if not exists ux_product_units_product_serial on public.product_units(product_id, serial_number);

create unique index if not exists ux_user_collections_product_unit_id
  on public.user_collections(product_unit_id)
  where product_unit_id is not null;

create or replace function public.increment_character_claimed_quantity(p_character_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.techbits_characters
  set claimed_quantity = least(claimed_quantity + 1, total_quantity)
  where id = p_character_id;
end;
$$;
