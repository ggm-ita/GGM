-- ===========================================================================
-- GGM Retailer Hub — Supabase schema
--
-- Run this once: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Every statement is idempotent, so re-running it is safe.
--
-- It creates:
--   • tables   : profiles, retailers, visits, interactions
--   • helpers  : is_admin(), scope_is_all(), user_regions(), user_provinces()
--   • RPCs     : distinct_values(), bulk_update(), entity_aggregate()
--   • policies : row level security mirroring the original app rules, but with
--                territory-scoped reads on retailers/visits/interactions
--   • triggers : a profile row for every new auth user, plus row attribution
--   • storage  : the public bucket used for file uploads (size/type capped)
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per signed-in user. Mirrors auth.users and adds the territory scope
-- that decides which retailers the user may see.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('admin', 'user')),
  -- null = no territory assigned yet, which (like before) means "sees nothing"
  scope_type  text check (scope_type in ('all', 'regions', 'provinces')),
  regions     text[] not null default '{}',
  provinces   text[] not null default '{}',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.retailers (
  id                 uuid primary key default gen_random_uuid(),
  created_date       timestamptz not null default now(),
  updated_date       timestamptz not null default now(),
  created_by_id      uuid default auth.uid(),
  customer_id        integer not null,
  name               text not null,
  shop_name          text,
  address            text,
  postcode           text,
  city               text,
  province_code      text,
  province           text,
  region             text,
  mobile             text,
  balance            numeric not null default 0,
  is_active          boolean not null default false,
  lat                double precision,
  lng                double precision,
  location_basis     text default 'address',
  balance_updated_at timestamptz
);

create table if not exists public.visits (
  id               uuid primary key default gen_random_uuid(),
  created_date     timestamptz not null default now(),
  updated_date     timestamptz not null default now(),
  created_by_id    uuid default auth.uid(),
  retailer_id      text not null,
  retailer_name    text,
  customer_id      integer,
  city             text,
  region           text,
  scheduled_date   date not null,
  scheduled_time   text,
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'completed', 'cancelled')),
  assigned_to      text,
  assigned_to_name text,
  notes            text,
  outcome          text,
  completed_at     timestamptz
);

create table if not exists public.interactions (
  id            uuid primary key default gen_random_uuid(),
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by_id uuid default auth.uid(),
  retailer_id   text not null,
  retailer_name text,
  customer_id   integer,
  city          text,
  region        text,
  type          text not null default 'note'
                  check (type in ('whatsapp', 'call', 'visit', 'email', 'note')),
  summary       text not null,
  occurred_at   timestamptz,
  staff_name    text,
  staff_email   text
);

create index if not exists retailers_customer_id_idx   on public.retailers (customer_id);
create index if not exists retailers_city_idx          on public.retailers (city);
create index if not exists retailers_region_idx        on public.retailers (region);
create index if not exists retailers_province_code_idx on public.retailers (province_code);
create index if not exists visits_retailer_id_idx      on public.visits (retailer_id);
create index if not exists visits_scheduled_date_idx   on public.visits (scheduled_date);
create index if not exists visits_assigned_to_idx      on public.visits (assigned_to);
create index if not exists interactions_retailer_id_idx on public.interactions (retailer_id);
create index if not exists interactions_occurred_at_idx on public.interactions (occurred_at);

-- Keep updated_date honest without touching application code.
create or replace function public.touch_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'retailers', 'visits', 'interactions'] loop
    execute format('drop trigger if exists set_updated_date on public.%I', t);
    execute format(
      'create trigger set_updated_date before update on public.%I
         for each row execute function public.touch_updated_date()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attribution: the author of a row is taken from the session, never the payload
-- so a caller cannot forge created_by_id (and, for logs, staff_email) by hand.
-- ---------------------------------------------------------------------------

create or replace function public.set_attribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.created_by_id := auth.uid();
  end if;
  if tg_table_name = 'interactions' and auth.email() is not null then
    new.staff_email := auth.email();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['retailers', 'visits', 'interactions'] loop
    execute format('drop trigger if exists set_attribution on public.%I', t);
    execute format(
      'create trigger set_attribution before insert on public.%I
         for each row execute function public.set_attribution()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Scope helpers (security definer so the policies can read profiles safely)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.scope_is_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and scope_type = 'all'
  );
$$;

create or replace function public.user_regions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(regions, '{}') from public.profiles where id = auth.uid();
$$;

create or replace function public.user_provinces()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(provinces, '{}') from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.retailers    enable row level security;
alter table public.visits       enable row level security;
alter table public.interactions enable row level security;
alter table public.profiles     enable row level security;

-- profiles: readable by every signed-in user — the staff pickers and the reports
-- resolve assignees by name/email, so the directory has to stay readable. This is
-- safe because accounts are provisioned by an administrator only (public sign-up is
-- disabled and there is no self-registration path), so every authenticated caller
-- is already a vetted staff member. Writes stay admin-only.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'user' and scope_type is null);

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles delete admin" on public.profiles;
create policy "profiles delete admin" on public.profiles
  for delete to authenticated using (public.is_admin());

-- retailers: read limited to the assigned territory, writes for admins only.
drop policy if exists "retailers read" on public.retailers;
create policy "retailers read" on public.retailers
  for select to authenticated
  using (
    public.is_admin()
    or public.scope_is_all()
    or region = any (public.user_regions())
    or province_code = any (public.user_provinces())
  );

drop policy if exists "retailers write admin" on public.retailers;
create policy "retailers write admin" on public.retailers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- visits: read limited to the assigned territory, plus anything the caller created
-- or is assigned to; any staff member may create a visit.
drop policy if exists "visits read" on public.visits;
create policy "visits read" on public.visits
  for select to authenticated
  using (
    public.is_admin()
    or public.scope_is_all()
    or region = any (public.user_regions())
    or created_by_id = auth.uid()
    or assigned_to = auth.email()
  );

drop policy if exists "visits create" on public.visits;
create policy "visits create" on public.visits
  for insert to authenticated with check (true);

drop policy if exists "visits update" on public.visits;
create policy "visits update" on public.visits
  for update to authenticated
  using (
    public.is_admin()
    or created_by_id = auth.uid()
    or assigned_to = auth.email()
  )
  with check (
    public.is_admin()
    or created_by_id = auth.uid()
    or assigned_to = auth.email()
  );

drop policy if exists "visits delete" on public.visits;
create policy "visits delete" on public.visits
  for delete to authenticated
  using (public.is_admin() or created_by_id = auth.uid());

-- interactions: read limited to the assigned territory, plus the caller's own logs;
-- any staff member may log an interaction.
drop policy if exists "interactions read" on public.interactions;
create policy "interactions read" on public.interactions
  for select to authenticated
  using (
    public.is_admin()
    or public.scope_is_all()
    or region = any (public.user_regions())
    or created_by_id = auth.uid()
    or staff_email = auth.email()
  );

drop policy if exists "interactions create" on public.interactions;
create policy "interactions create" on public.interactions
  for insert to authenticated with check (true);

drop policy if exists "interactions update" on public.interactions;
create policy "interactions update" on public.interactions
  for update to authenticated
  using (public.is_admin() or created_by_id = auth.uid())
  with check (public.is_admin() or created_by_id = auth.uid());

drop policy if exists "interactions delete" on public.interactions;
create policy "interactions delete" on public.interactions
  for delete to authenticated
  using (public.is_admin() or created_by_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC functions used by the frontend client
-- ---------------------------------------------------------------------------

-- Sorted unique values of one column: db.entities.X.list({ distinct: "city" })
create or replace function public.distinct_values(p_table text, p_column text)
returns setof text
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_table not in ('retailers', 'visits', 'interactions', 'profiles') then
    raise exception 'distinct_values: unknown table %', p_table;
  end if;
  return query execute format(
    'select distinct %I::text from public.%I where %I is not null order by 1',
    p_column, p_table, p_column
  );
end;
$$;

-- Batch update where each row carries its id plus only the columns to change:
-- db.entities.X.bulkUpdate([{ id, ...fields }])
create or replace function public.bulk_update(p_table text, p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r         jsonb;
  sets      text;
  affected  int := 0;
  n         int;
begin
  if p_table not in ('retailers', 'visits', 'interactions', 'profiles') then
    raise exception 'bulk_update: unknown table %', p_table;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    select string_agg(format('%I = %L', key, value), ', ')
      into sets
      from jsonb_each_text(r)
     where key <> 'id';

    continue when sets is null;

    execute format('update public.%I set %s where id = %L', p_table, sets, r ->> 'id');
    get diagnostics n = row_count;
    affected := affected + n;
  end loop;

  return affected;
end;
$$;

-- Group by one column with the max of another, e.g. the last contact per
-- retailer: db.entities.Interaction.aggregate({ groupBy, max: ["occurred_at"] })
create or replace function public.entity_aggregate(p_table text, p_group text, p_max text)
returns table (group_value text, max_value text, total bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if p_table not in ('retailers', 'visits', 'interactions', 'profiles') then
    raise exception 'entity_aggregate: unknown table %', p_table;
  end if;
  return query execute format(
    'select %I::text as group_value, max(%I)::text as max_value, count(*)::bigint as total
       from public.%I
      group by %I',
    p_group, p_max, p_table, p_group
  );
end;
$$;

grant execute on function public.distinct_values(text, text)      to authenticated;
grant execute on function public.bulk_update(text, jsonb)         to authenticated;
grant execute on function public.entity_aggregate(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket used for file uploads
-- ---------------------------------------------------------------------------

-- The bucket is capped: uploads stay under 10 MB and only the file types the app
-- actually needs are accepted, so nothing executable can be parked here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public',
  'public',
  true,
  10485760,
  array[
    'text/csv',
    'text/plain',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public bucket read" on storage.objects;
create policy "public bucket read" on storage.objects
  for select using (bucket_id = 'public');

drop policy if exists "public bucket upload" on storage.objects;
create policy "public bucket upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'public');

-- ---------------------------------------------------------------------------
-- After running this: make yourself an admin
--
--   update public.profiles
--      set role = 'admin', scope_type = 'all'
--    where email = 'you@example.com';
-- ---------------------------------------------------------------------------
