-- Threshold initial schema
-- Run via supabase db push or paste into the SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ENUMS ----------------------------------------------------------------
do $$ begin
  create type account_type as enum ('cash','bank','credit_card','crypto','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type income_frequency as enum ('one_time','weekly','biweekly','monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('active','achieved','archived');
exception when duplicate_object then null; end $$;

-- PROFILES -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'MXN',
  weight_urgency numeric not null default 1,
  weight_importance numeric not null default 1,
  weight_roi numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ACCOUNTS -------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type account_type not null,
  name text not null,
  balance numeric not null default 0,
  currency text not null default 'MXN',
  is_debt boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts(user_id);

-- CRYPTO HOLDINGS ------------------------------------------------------
create table if not exists public.crypto_holdings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  symbol text not null,
  amount numeric not null default 0,
  source text not null default 'manual' check (source in ('manual','binance')),
  last_price_usd numeric,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, symbol, source)
);
create index if not exists crypto_user_idx on public.crypto_holdings(user_id);

-- INCOME SOURCES -------------------------------------------------------
create table if not exists public.income_sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'MXN',
  frequency income_frequency not null,
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists income_user_idx on public.income_sources(user_id);

-- GOALS ----------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  currency text not null default 'MXN',
  urgency int not null default 3 check (urgency between 1 and 5),
  importance int not null default 3 check (importance between 1 and 5),
  roi int not null default 3 check (roi between 1 and 5),
  position int not null default 0,
  status goal_status not null default 'active',
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);
create index if not exists goals_user_status_idx on public.goals(user_id, status);

-- FX RATES (cache) -----------------------------------------------------
create table if not exists public.fx_rates (
  base text not null,
  quote text not null,
  rate numeric not null,
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

-- BINANCE CREDENTIALS --------------------------------------------------
-- Encrypted at rest with pgcrypto. The key lives in Supabase Vault as
-- `binance_encryption_key` and is read by the Edge Functions.
create table if not exists public.binance_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  api_key_encrypted bytea not null,
  api_secret_encrypted bytea not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY ---------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.crypto_holdings enable row level security;
alter table public.income_sources enable row level security;
alter table public.goals enable row level security;
alter table public.fx_rates enable row level security;
alter table public.binance_credentials enable row level security;

-- profiles: a user reads / updates only their own row
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- accounts
drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- crypto_holdings
drop policy if exists "crypto_owner" on public.crypto_holdings;
create policy "crypto_owner" on public.crypto_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- income_sources
drop policy if exists "income_owner" on public.income_sources;
create policy "income_owner" on public.income_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goals
drop policy if exists "goals_owner" on public.goals;
create policy "goals_owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- fx_rates: read-only for authenticated users
drop policy if exists "fx_read" on public.fx_rates;
create policy "fx_read" on public.fx_rates for select using (auth.role() = 'authenticated');

-- binance_credentials: NEVER expose to clients; only Edge Functions
-- (using service role) can read/write them. So no policy = no client access.

-- TRIGGERS -------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.accounts;
create trigger set_updated_at before update on public.accounts
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.income_sources;
create trigger set_updated_at before update on public.income_sources
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.goals;
create trigger set_updated_at before update on public.goals
  for each row execute function public.tg_set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
