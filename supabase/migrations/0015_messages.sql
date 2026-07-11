-- Chat da negociação: depois do Contato Inteligente, as duas partes
-- conversam livremente dentro do match (sem consumir cota).
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_match_idx on messages (match_id, created_at);

alter table messages enable row level security;

-- Leitura pelas duas partes do match; escrita apenas via RPC
create policy messages_read on messages for select
  using (exists (
    select 1 from matches m
    join listings l on l.id in (m.listing_a_id, m.listing_b_id)
    where m.id = match_id and l.owner_id = auth.uid()
  ));

create or replace function send_message(p_match_id uuid, p_body text)
returns messages
language plpgsql
security definer set search_path = public
as $$
declare
  m matches%rowtype;
  msg messages%rowtype;
begin
  select * into m from matches where id = p_match_id;
  if not found then
    raise exception 'Match não encontrado';
  end if;

  if m.status <> 'contacted' then
    raise exception 'A conversa começa pelo Contato Inteligente';
  end if;

  if not exists (
    select 1 from listings l
    where l.id in (m.listing_a_id, m.listing_b_id) and l.owner_id = auth.uid()
  ) then
    raise exception 'Você não participa deste match';
  end if;

  insert into messages (match_id, sender_id, body)
  values (p_match_id, auth.uid(), p_body)
  returning * into msg;

  return msg;
end;
$$;

revoke execute on function send_message(uuid, text) from public, anon;
grant execute on function send_message(uuid, text) to authenticated;

-- Mensagem recebida: notifica a outra parte
create or replace function notify_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (user_id, kind, payload)
  select l.owner_id, 'mensagem',
         jsonb_build_object('match_id', new.match_id, 'message_id', new.id)
  from matches m
  join listings l on l.id in (m.listing_a_id, m.listing_b_id)
  where m.id = new.match_id
    and l.owner_id <> new.sender_id;
  return new;
end;
$$;

create trigger messages_notify
  after insert on messages
  for each row execute function notify_message();

revoke execute on function notify_message() from public, anon, authenticated;

-- Meus matches, enriquecidos com o resumo do outro anúncio (uma chamada só)
create or replace function my_matches()
returns table (
  match_id uuid,
  kind match_kind,
  score numeric,
  cash_difference numeric,
  status match_status,
  my_listing_id uuid,
  my_model text,
  other_listing_id uuid,
  other_brand text,
  other_model text,
  other_price numeric,
  other_fipe_percent numeric,
  other_city text,
  other_state text,
  other_photo_path text
)
language sql
stable
security definer set search_path = public
as $$
  select
    m.id,
    m.kind,
    m.score,
    m.cash_difference,
    m.status,
    mine.id,
    mine.brand || ' ' || mine.model,
    other.id,
    other.brand,
    other.model,
    other.price,
    other.fipe_percent,
    other.city,
    other.state,
    (select p.storage_path from listing_photos p
     where p.listing_id = other.id order by p.position limit 1)
  from matches m
  join listings mine
    on mine.id in (m.listing_a_id, m.listing_b_id) and mine.owner_id = auth.uid()
  join listings other
    on other.id in (m.listing_a_id, m.listing_b_id) and other.id <> mine.id
  where m.status <> 'dismissed'
  order by m.score desc;
$$;

revoke execute on function my_matches() from public, anon;
grant execute on function my_matches() to authenticated;
