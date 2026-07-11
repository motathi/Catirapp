-- Chat direto comprador ↔ vendedor sobre um anúncio, independente de match.
-- Complementa o fluxo de match (messages) com uma conversa simples iniciada
-- a partir do botão Contato, com notificação e realtime.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  seller_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  buyer_read_at timestamptz,
  seller_read_at timestamptz,
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index conversations_buyer_idx on conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on conversations (seller_id, last_message_at desc);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index conversation_messages_idx on conversation_messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table conversation_messages enable row level security;

-- Leitura restrita aos dois participantes; escrita só via RPC (sem policy de insert)
create policy conversations_read on conversations for select
  using (auth.uid() in (buyer_id, seller_id));

create policy conversation_messages_read on conversation_messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- Inicia (ou reaproveita) a conversa do usuário logado com o dono do anúncio
-- e já grava a primeira mensagem. Retorna o id da conversa.
create or replace function send_listing_message(p_listing_id uuid, p_body text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  l listings%rowtype;
  conv conversations%rowtype;
begin
  if char_length(coalesce(trim(p_body), '')) < 1 then
    raise exception 'Mensagem vazia';
  end if;

  select * into l from listings where id = p_listing_id;
  if not found then
    raise exception 'Anúncio não encontrado';
  end if;
  if l.owner_id = auth.uid() then
    raise exception 'Você não pode enviar mensagem para o seu próprio anúncio';
  end if;

  insert into conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, auth.uid(), l.owner_id)
  on conflict (listing_id, buyer_id) do update set last_message_at = now()
  returning * into conv;

  insert into conversation_messages (conversation_id, sender_id, body)
  values (conv.id, auth.uid(), p_body);

  update conversations
  set last_message_at = now(), buyer_read_at = now()
  where id = conv.id;

  insert into notifications (user_id, kind, payload)
  values (
    l.owner_id, 'mensagem',
    jsonb_build_object('conversation_id', conv.id, 'listing_id', p_listing_id)
  );

  return conv.id;
end;
$$;

-- Envia mensagem numa conversa existente (comprador ou vendedor)
create or replace function send_conversation_message(p_conversation_id uuid, p_body text)
returns conversation_messages
language plpgsql
security definer set search_path = public
as $$
declare
  conv conversations%rowtype;
  msg conversation_messages%rowtype;
  recipient uuid;
begin
  if char_length(coalesce(trim(p_body), '')) < 1 then
    raise exception 'Mensagem vazia';
  end if;

  select * into conv from conversations where id = p_conversation_id;
  if not found then
    raise exception 'Conversa não encontrada';
  end if;
  if auth.uid() not in (conv.buyer_id, conv.seller_id) then
    raise exception 'Você não participa desta conversa';
  end if;

  insert into conversation_messages (conversation_id, sender_id, body)
  values (p_conversation_id, auth.uid(), p_body)
  returning * into msg;

  recipient := case
    when auth.uid() = conv.buyer_id then conv.seller_id
    else conv.buyer_id
  end;

  update conversations
  set last_message_at = now(),
      buyer_read_at = case when auth.uid() = buyer_id then now() else buyer_read_at end,
      seller_read_at = case when auth.uid() = seller_id then now() else seller_read_at end
  where id = p_conversation_id;

  insert into notifications (user_id, kind, payload)
  values (
    recipient, 'mensagem',
    jsonb_build_object('conversation_id', p_conversation_id, 'listing_id', conv.listing_id)
  );

  return msg;
end;
$$;

-- Marca a conversa como lida para o usuário logado
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update conversations
  set buyer_read_at = case when auth.uid() = buyer_id then now() else buyer_read_at end,
      seller_read_at = case when auth.uid() = seller_id then now() else seller_read_at end
  where id = p_conversation_id and auth.uid() in (buyer_id, seller_id);
end;
$$;

-- Minhas conversas, enriquecidas para a caixa de entrada
create or replace function my_conversations()
returns table (
  conversation_id uuid,
  listing_id uuid,
  listing_title text,
  other_name text,
  i_am_seller boolean,
  last_message_at timestamptz,
  unread boolean,
  last_body text
)
language sql
stable
security definer set search_path = public
as $$
  select
    c.id,
    c.listing_id,
    l.brand || ' ' || l.model,
    coalesce(other.display_name, 'Usuário'),
    (c.seller_id = auth.uid()),
    c.last_message_at,
    case
      when c.seller_id = auth.uid()
        then c.last_message_at > coalesce(c.seller_read_at, 'epoch'::timestamptz)
      else c.last_message_at > coalesce(c.buyer_read_at, 'epoch'::timestamptz)
    end,
    (select m.body from conversation_messages m
      where m.conversation_id = c.id order by m.created_at desc limit 1)
  from conversations c
  join listings l on l.id = c.listing_id
  join profiles other
    on other.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end
  where auth.uid() in (c.buyer_id, c.seller_id)
  order by c.last_message_at desc;
$$;

revoke execute on function send_listing_message(uuid, text) from public, anon;
revoke execute on function send_conversation_message(uuid, text) from public, anon;
revoke execute on function mark_conversation_read(uuid) from public, anon;
revoke execute on function my_conversations() from public, anon;
grant execute on function send_listing_message(uuid, text) to authenticated;
grant execute on function send_conversation_message(uuid, text) to authenticated;
grant execute on function mark_conversation_read(uuid) to authenticated;
grant execute on function my_conversations() to authenticated;

-- Realtime do chat (RLS continua valendo para cada assinante)
alter publication supabase_realtime add table conversation_messages;
