create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  risk_level text not null default 'beginner',
  preferred_regions text[] not null default '{}',
  preferred_topics text[] not null default '{}',
  digest_frequency text not null default 'daily',
  sentiment_alert_threshold numeric(5,2) not null default 0.35,
  fear_alert_threshold numeric(5,2) not null default 65.0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source_name text not null,
  source_domain text,
  title text not null,
  summary text,
  body text,
  url text not null unique,
  image_url text,
  language text,
  country_code text,
  region_code text not null,
  region_name text not null,
  topic_tags text[] not null default '{}',
  mentioned_tickers text[] not null default '{}',
  sentiment_score numeric(6,4) not null default 0,
  fear_score numeric(6,2) not null default 50,
  signal_score numeric(6,2) not null default 0,
  published_at timestamptz not null,
  ingested_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.news_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  region_code text not null,
  region_name text not null,
  event_type text not null,
  title text not null,
  summary text not null,
  intensity_score numeric(6,2) not null default 0,
  sentiment_score numeric(6,4) not null default 0,
  article_count integer not null default 0,
  primary_article_id uuid references public.news_articles(id) on delete set null,
  started_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.region_sentiment_daily (
  id uuid primary key default gen_random_uuid(),
  bucket_date date not null,
  region_code text not null,
  region_name text not null,
  article_count integer not null default 0,
  avg_sentiment numeric(6,4) not null default 0,
  fear_score numeric(6,2) not null default 50,
  momentum_score numeric(6,2) not null default 0,
  signal_score numeric(6,2) not null default 0,
  top_topics text[] not null default '{}',
  top_headline text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bucket_date, region_code)
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_type text not null check (item_type in ('region', 'sector', 'ticker')),
  item_key text not null,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, item_type, item_key)
);

create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  region_code text,
  user_message text not null,
  assistant_message text not null,
  tool_trace jsonb not null default '[]'::jsonb,
  model_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.countries (
  iso_code text primary key,
  country_name text not null,
  region_group text not null,
  currency_code text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.country_market_mapping (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(iso_code) on delete cascade,
  market_symbol text not null,
  market_name text not null,
  benchmark_symbol text not null,
  benchmark_name text not null,
  fx_pair_code text,
  fx_from_symbol text,
  fx_to_symbol text,
  provider text not null default 'alpha_vantage',
  is_primary boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (country_code, market_symbol)
);

create table if not exists public.raw_price_data (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  trade_date date not null,
  open_price numeric(18,6) not null,
  high_price numeric(18,6) not null,
  low_price numeric(18,6) not null,
  close_price numeric(18,6) not null,
  adjusted_close numeric(18,6) not null,
  volume bigint,
  provider text not null default 'alpha_vantage',
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default timezone('utc', now()),
  unique (symbol, trade_date)
);

create table if not exists public.raw_fx_data (
  id uuid primary key default gen_random_uuid(),
  pair_code text not null,
  from_symbol text not null,
  to_symbol text not null,
  trade_date date not null,
  open_rate numeric(18,8) not null,
  high_rate numeric(18,8) not null,
  low_rate numeric(18,8) not null,
  close_rate numeric(18,8) not null,
  provider text not null default 'alpha_vantage',
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default timezone('utc', now()),
  unique (pair_code, trade_date)
);

create table if not exists public.market_risk_scores (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(iso_code) on delete cascade,
  as_of_date date not null,
  market_risk_score numeric(6,2) not null,
  risk_level text not null,
  volatility_component_score numeric(6,2) not null,
  beta_component_score numeric(6,2) not null,
  fx_component_score numeric(6,2) not null,
  realized_vol_30d numeric(10,6),
  beta_60d numeric(10,6),
  fx_vol_30d numeric(10,6),
  benchmark_return_60d numeric(10,6),
  market_return_60d numeric(10,6),
  vix_close numeric(10,4),
  weights jsonb not null default '{}'::jsonb,
  raw_metrics jsonb not null default '{}'::jsonb,
  data_sources jsonb not null default '[]'::jsonb,
  explanation text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (country_code, as_of_date)
);

create index if not exists idx_news_articles_region_published
  on public.news_articles (region_code, published_at desc);

create index if not exists idx_news_articles_country_published
  on public.news_articles (country_code, published_at desc);

create index if not exists idx_news_events_region_last_seen
  on public.news_events (region_code, last_seen_at desc);

create index if not exists idx_region_sentiment_daily_bucket
  on public.region_sentiment_daily (bucket_date desc, region_code);

create index if not exists idx_watchlists_user
  on public.watchlists (user_id, created_at desc);

create index if not exists idx_chat_logs_user
  on public.chat_logs (user_id, created_at desc);

create index if not exists idx_country_market_mapping_country
  on public.country_market_mapping (country_code, is_primary);

create index if not exists idx_raw_price_data_symbol_date
  on public.raw_price_data (symbol, trade_date desc);

create index if not exists idx_raw_fx_data_pair_date
  on public.raw_fx_data (pair_code, trade_date desc);

create index if not exists idx_market_risk_scores_country_date
  on public.market_risk_scores (country_code, as_of_date desc);

create trigger set_users_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute procedure public.set_updated_at();

create trigger set_watchlists_updated_at
before update on public.watchlists
for each row execute procedure public.set_updated_at();

create trigger set_countries_updated_at
before update on public.countries
for each row execute procedure public.set_updated_at();

create trigger set_country_market_mapping_updated_at
before update on public.country_market_mapping
for each row execute procedure public.set_updated_at();

create trigger set_market_risk_scores_updated_at
before update on public.market_risk_scores
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.watchlists enable row level security;
alter table public.chat_logs enable row level security;

create policy "users_select_own_profile"
on public.users for select
using (auth.uid() = id);

create policy "users_update_own_profile"
on public.users for update
using (auth.uid() = id);

create policy "preferences_select_own"
on public.user_preferences for select
using (auth.uid() = user_id);

create policy "preferences_insert_own"
on public.user_preferences for insert
with check (auth.uid() = user_id);

create policy "preferences_update_own"
on public.user_preferences for update
using (auth.uid() = user_id);

create policy "watchlists_manage_own"
on public.watchlists for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat_logs_manage_own"
on public.chat_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
