-- Catirapp — schema inicial
-- Ver docs/modelo-de-dados.md para a descrição das entidades.

create type asset_category as enum (
  'carro', 'moto', 'caminhao', 'caminhonete', 'suv',
  'embarcacao', 'maquina', 'trator', 'terreno', 'imovel', 'outro'
);

create type listing_status as enum ('draft', 'active', 'paused', 'sold', 'expired');
create type match_kind as enum ('troca_direta', 'troca_com_volta', 'compra');
create type match_status as enum ('suggested', 'viewed', 'contacted', 'dismissed');

-- Parâmetros de negócio ajustáveis sem deploy
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('max_fipe_percent', '85'),
  ('match_value_tolerance_percent', '30'),
  ('match_score_weights', '{"valor": 40, "oportunidade": 25, "distancia": 20, "reciprocidade": 15}');

create table plans (
  code text primary key,
  name text not null,
  max_active_listings int,          -- null = ilimitado
  max_monthly_listings int,         -- null = ilimitado
  daily_match_contacts int,         -- null = ilimitado
  highlight_days int not null default 0,
  feed_priority int not null default 0
);

insert into plans (code, name, max_active_listings, max_monthly_listings, daily_match_contacts, highlight_days, feed_priority) values
  ('free',    'Gratuito', 1,    4,    1,    0,  0),
  ('pro',     'PRO',      10,   20,   4,    5,  1),
  ('premium', 'Premium',  null, null, null, 15, 2);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone text,
  city text,
  state char(2),
  plan_code text not null default 'free' references plans (code),
  plan_renews_at timestamptz,
  created_at timestamptz not null default now()
);

-- Garagem digital: bens disponíveis para negociação (com ou sem anúncio)
create table assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  category asset_category not null,
  title text not null,
  description text,
  estimated_value numeric(12,2),
  city text,
  state char(2),
  created_at timestamptz not null default now()
);

create index assets_owner_idx on assets (owner_id);
create index assets_category_idx on assets (category);

create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  asset_id uuid not null references assets (id),
  brand text not null,
  model text not null,
  model_year int not null,
  mileage_km int,
  city text not null,
  state char(2) not null,
  price numeric(12,2) not null check (price > 0),
  fipe_code text not null,
  fipe_value numeric(12,2) not null check (fipe_value > 0),
  fipe_percent numeric(5,2) generated always as (round(price / fipe_value * 100, 2)) stored,
  accepts_trade boolean not null default false,
  accepts_cash_complement boolean not null default false,
  status listing_status not null default 'draft',
  highlighted_until timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index listings_feed_idx on listings (status, published_at desc);
create index listings_owner_idx on listings (owner_id);
create index listings_price_idx on listings (status, price);

create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  storage_path text not null,
  position int not null default 0
);

create index listing_photos_listing_idx on listing_photos (listing_id, position);

create table listing_accepted_trades (
  listing_id uuid not null references listings (id) on delete cascade,
  category asset_category not null,
  max_value numeric(12,2),
  primary key (listing_id, category)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  listing_a_id uuid not null references listings (id) on delete cascade,
  listing_b_id uuid not null references listings (id) on delete cascade,
  kind match_kind not null,
  score numeric(5,2) not null,
  cash_difference numeric(12,2),
  status match_status not null default 'suggested',
  computed_at timestamptz not null default now(),
  -- normalização: sempre a < b, impedindo o par duplicado invertido
  check (listing_a_id < listing_b_id),
  unique (listing_a_id, listing_b_id)
);

create index matches_listing_a_idx on matches (listing_a_id, status);
create index matches_listing_b_idx on matches (listing_b_id, status);

create table match_contacts (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index match_contacts_quota_idx on match_contacts (sender_id, created_at desc);

create table saved_listings (
  user_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table fipe_reference (
  fipe_code text not null,
  brand text not null,
  model text not null,
  model_year int not null,
  reference_month date not null,
  value numeric(12,2) not null,
  primary key (fipe_code, model_year, reference_month)
);

-- ---------------------------------------------------------------------------
-- Regras de negócio
-- ---------------------------------------------------------------------------

-- Teto FIPE: um anúncio só pode ser publicado abaixo do percentual configurado
create or replace function enforce_fipe_cap()
returns trigger
language plpgsql
as $$
declare
  cap numeric;
begin
  select (value #>> '{}')::numeric into cap
  from app_settings where key = 'max_fipe_percent';

  if new.status in ('active') and new.price > new.fipe_value * cap / 100 then
    raise exception 'Preço (%) acima de %%% da FIPE (%)', new.price, cap, new.fipe_value
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger listings_fipe_cap
  before insert or update of price, fipe_value, status on listings
  for each row execute function enforce_fipe_cap();

-- Cota de anúncios do plano (ativos e mensais)
create or replace function enforce_listing_quota()
returns trigger
language plpgsql
as $$
declare
  p plans%rowtype;
  active_count int;
  monthly_count int;
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  select pl.* into p
  from plans pl join profiles pr on pr.plan_code = pl.code
  where pr.id = new.owner_id;

  if p.max_active_listings is not null then
    select count(*) into active_count
    from listings where owner_id = new.owner_id and status = 'active' and id <> new.id;
    if active_count >= p.max_active_listings then
      raise exception 'Limite de % anúncios ativos do plano % atingido', p.max_active_listings, p.name;
    end if;
  end if;

  if p.max_monthly_listings is not null then
    select count(*) into monthly_count
    from listings
    where owner_id = new.owner_id
      and published_at >= date_trunc('month', now())
      and id <> new.id;
    if monthly_count >= p.max_monthly_listings then
      raise exception 'Limite de % anúncios mensais do plano % atingido', p.max_monthly_listings, p.name;
    end if;
  end if;

  new.published_at = coalesce(new.published_at, now());
  return new;
end;
$$;

create trigger listings_quota
  before insert or update of status on listings
  for each row execute function enforce_listing_quota();

-- Cota diária de contatos de matching
create or replace function enforce_contact_quota()
returns trigger
language plpgsql
as $$
declare
  daily_limit int;
  used int;
begin
  select pl.daily_match_contacts into daily_limit
  from plans pl join profiles pr on pr.plan_code = pl.code
  where pr.id = new.sender_id;

  if daily_limit is not null then
    select count(*) into used
    from match_contacts
    where sender_id = new.sender_id and created_at >= now() - interval '24 hours';
    if used >= daily_limit then
      raise exception 'Limite diário de % contatos de matching atingido', daily_limit;
    end if;
  end if;
  return new;
end;
$$;

create trigger match_contacts_quota
  before insert on match_contacts
  for each row execute function enforce_contact_quota();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table assets enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table listing_accepted_trades enable row level security;
alter table matches enable row level security;
alter table match_contacts enable row level security;
alter table saved_listings enable row level security;

-- Perfis: leitura pública, escrita pelo próprio usuário
create policy profiles_read on profiles for select using (true);
create policy profiles_write on profiles for all using (auth.uid() = id);

-- Garagem: visível e editável apenas pelo dono
create policy assets_owner on assets for all using (auth.uid() = owner_id);

-- Anúncios ativos são públicos; rascunhos e demais estados só para o dono
create policy listings_read on listings for select
  using (status = 'active' or auth.uid() = owner_id);
create policy listings_write on listings for all using (auth.uid() = owner_id);

create policy listing_photos_read on listing_photos for select
  using (exists (select 1 from listings l where l.id = listing_id and (l.status = 'active' or l.owner_id = auth.uid())));
create policy listing_photos_write on listing_photos for all
  using (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()));

create policy accepted_trades_read on listing_accepted_trades for select
  using (exists (select 1 from listings l where l.id = listing_id and (l.status = 'active' or l.owner_id = auth.uid())));
create policy accepted_trades_write on listing_accepted_trades for all
  using (exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- Matches: visíveis apenas aos donos dos dois anúncios envolvidos
create policy matches_read on matches for select
  using (exists (
    select 1 from listings l
    where (l.id = listing_a_id or l.id = listing_b_id) and l.owner_id = auth.uid()
  ));

-- Contatos: remetente e destinatário do match
create policy match_contacts_read on match_contacts for select
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from matches m
      join listings l on l.id in (m.listing_a_id, m.listing_b_id)
      where m.id = match_id and l.owner_id = auth.uid()
    )
  );
create policy match_contacts_send on match_contacts for insert
  with check (sender_id = auth.uid());

-- Favoritos: privados
create policy saved_listings_owner on saved_listings for all using (auth.uid() = user_id);
