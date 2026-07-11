-- Propostas de catira: o comprador oferece itens da sua garagem (assets) por um
-- anúncio, com uma volta em dinheiro opcional (ele paga a mais, ou o vendedor
-- paga a diferença). O vendedor aceita ou recusa.

create type trade_cash_direction as enum ('none', 'proposer_pays', 'seller_pays');
create type trade_proposal_status as enum ('pending', 'accepted', 'rejected', 'cancelled');

create table trade_proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  proposer_id uuid not null references profiles (id) on delete cascade,
  seller_id uuid not null references profiles (id) on delete cascade,
  cash_amount numeric(12,2) not null default 0 check (cash_amount >= 0),
  cash_direction trade_cash_direction not null default 'none',
  message text,
  status trade_proposal_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (proposer_id <> seller_id)
);

create index trade_proposals_seller_idx on trade_proposals (seller_id, status, created_at desc);
create index trade_proposals_proposer_idx on trade_proposals (proposer_id, created_at desc);

-- Itens ofertados. Guardamos um snapshot (título/valor) para a proposta
-- permanecer legível mesmo se o bem for editado ou removido depois.
create table trade_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references trade_proposals (id) on delete cascade,
  asset_id uuid references assets (id) on delete set null,
  title text not null,
  category asset_category,
  estimated_value numeric(12,2)
);

create index trade_proposal_items_proposal_idx on trade_proposal_items (proposal_id);

alter table trade_proposals enable row level security;
alter table trade_proposal_items enable row level security;

create policy trade_proposals_read on trade_proposals for select
  using (auth.uid() in (proposer_id, seller_id));

create policy trade_proposal_items_read on trade_proposal_items for select
  using (
    exists (
      select 1 from trade_proposals p
      where p.id = proposal_id and auth.uid() in (p.proposer_id, p.seller_id)
    )
  );

-- Envia a proposta: valida o anúncio, os itens (devem ser do proponente) e a
-- volta em dinheiro; grava o snapshot dos itens e notifica o vendedor.
create or replace function send_trade_proposal(
  p_listing_id uuid,
  p_asset_ids uuid[],
  p_cash_amount numeric default 0,
  p_cash_direction text default 'none',
  p_message text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  l listings%rowtype;
  dir trade_cash_direction;
  cash numeric;
  n_ids int := coalesce(array_length(p_asset_ids, 1), 0);
  n_valid int;
  prop_id uuid;
begin
  if n_ids < 1 then
    raise exception 'Selecione ao menos um item do seu estoque';
  end if;

  select * into l from listings where id = p_listing_id;
  if not found then
    raise exception 'Anúncio não encontrado';
  end if;
  if l.owner_id = auth.uid() then
    raise exception 'Você não pode propor catira no seu próprio anúncio';
  end if;

  dir := coalesce(nullif(trim(p_cash_direction), ''), 'none')::trade_cash_direction;
  cash := coalesce(p_cash_amount, 0);
  if cash < 0 then
    raise exception 'Valor em dinheiro inválido';
  end if;
  if dir = 'none' then
    cash := 0;
  elsif cash <= 0 then
    raise exception 'Informe o valor em dinheiro da volta';
  end if;

  select count(*) into n_valid
  from assets where id = any(p_asset_ids) and owner_id = auth.uid();
  if n_valid <> n_ids then
    raise exception 'Itens inválidos no estoque';
  end if;

  insert into trade_proposals
    (listing_id, proposer_id, seller_id, cash_amount, cash_direction, message)
  values
    (p_listing_id, auth.uid(), l.owner_id, cash, dir, nullif(trim(p_message), ''))
  returning id into prop_id;

  insert into trade_proposal_items (proposal_id, asset_id, title, category, estimated_value)
  select prop_id, a.id, a.title, a.category, a.estimated_value
  from assets a
  where a.id = any(p_asset_ids) and a.owner_id = auth.uid();

  insert into notifications (user_id, kind, payload)
  values (
    l.owner_id, 'proposta',
    jsonb_build_object('proposal_id', prop_id, 'listing_id', p_listing_id)
  );

  return prop_id;
end;
$$;

-- Vendedor aceita ou recusa uma proposta pendente
create or replace function respond_trade_proposal(p_proposal_id uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  p trade_proposals%rowtype;
begin
  select * into p from trade_proposals where id = p_proposal_id;
  if not found then
    raise exception 'Proposta não encontrada';
  end if;
  if p.seller_id <> auth.uid() then
    raise exception 'Apenas o vendedor pode responder';
  end if;
  if p.status <> 'pending' then
    raise exception 'Proposta já respondida';
  end if;

  update trade_proposals
  set status = case when p_accept then 'accepted' else 'rejected' end::trade_proposal_status,
      responded_at = now()
  where id = p_proposal_id;

  insert into notifications (user_id, kind, payload)
  values (
    p.proposer_id, 'proposta',
    jsonb_build_object(
      'proposal_id', p_proposal_id, 'listing_id', p.listing_id,
      'status', case when p_accept then 'accepted' else 'rejected' end
    )
  );
end;
$$;

-- Proponente cancela a própria proposta enquanto pendente
create or replace function cancel_trade_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update trade_proposals
  set status = 'cancelled', responded_at = now()
  where id = p_proposal_id and proposer_id = auth.uid() and status = 'pending';
end;
$$;

-- Minhas propostas (enviadas e recebidas), enriquecidas com itens e a outra parte
create or replace function my_trade_proposals()
returns table (
  proposal_id uuid,
  listing_id uuid,
  listing_title text,
  role text,
  other_name text,
  cash_amount numeric,
  cash_direction trade_cash_direction,
  status trade_proposal_status,
  message text,
  created_at timestamptz,
  items jsonb
)
language sql
stable
security definer set search_path = public
as $$
  select
    p.id,
    p.listing_id,
    l.brand || ' ' || l.model,
    case when p.proposer_id = auth.uid() then 'sent' else 'received' end,
    coalesce(other.display_name, 'Usuário'),
    p.cash_amount,
    p.cash_direction,
    p.status,
    p.message,
    p.created_at,
    coalesce(
      (select jsonb_agg(
         jsonb_build_object('title', i.title, 'value', i.estimated_value)
         order by i.title)
       from trade_proposal_items i where i.proposal_id = p.id),
      '[]'::jsonb
    )
  from trade_proposals p
  join listings l on l.id = p.listing_id
  join profiles other
    on other.id = case when p.proposer_id = auth.uid() then p.seller_id else p.proposer_id end
  where auth.uid() in (p.proposer_id, p.seller_id)
  order by p.created_at desc;
$$;

revoke execute on function send_trade_proposal(uuid, uuid[], numeric, text, text) from public, anon;
revoke execute on function respond_trade_proposal(uuid, boolean) from public, anon;
revoke execute on function cancel_trade_proposal(uuid) from public, anon;
revoke execute on function my_trade_proposals() from public, anon;
grant execute on function send_trade_proposal(uuid, uuid[], numeric, text, text) to authenticated;
grant execute on function respond_trade_proposal(uuid, boolean) to authenticated;
grant execute on function cancel_trade_proposal(uuid) to authenticated;
grant execute on function my_trade_proposals() to authenticated;
