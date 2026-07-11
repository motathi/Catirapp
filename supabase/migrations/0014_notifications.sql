-- Notificações do ciclo de negociação, alimentadas por triggers:
-- novo match encontrado, Contato Inteligente recebido e mensagem recebida.
create type notification_kind as enum ('novo_match', 'contato_recebido', 'mensagem');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind notification_kind not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, read_at, created_at desc);

alter table notifications enable row level security;

create policy notifications_read on notifications for select
  using (user_id = auth.uid());
create policy notifications_mark_read on notifications for update
  using (user_id = auth.uid());

-- Usuário só pode alterar o read_at (marcar como lida)
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

-- Novo match: notifica os donos dos dois anúncios
create or replace function notify_new_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (user_id, kind, payload)
  select l.owner_id, 'novo_match',
         jsonb_build_object('match_id', new.id, 'kind', new.kind, 'score', new.score)
  from listings l
  where l.id in (new.listing_a_id, new.listing_b_id);
  return new;
end;
$$;

create trigger matches_notify
  after insert on matches
  for each row execute function notify_new_match();

-- Contato Inteligente: notifica a outra parte do match
create or replace function notify_match_contact()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (user_id, kind, payload)
  select l.owner_id, 'contato_recebido',
         jsonb_build_object('match_id', new.match_id, 'contact_id', new.id)
  from matches m
  join listings l on l.id in (m.listing_a_id, m.listing_b_id)
  where m.id = new.match_id
    and l.owner_id <> new.sender_id;
  return new;
end;
$$;

create trigger match_contacts_notify
  after insert on match_contacts
  for each row execute function notify_match_contact();

revoke execute on function notify_new_match() from public, anon, authenticated;
revoke execute on function notify_match_contact() from public, anon, authenticated;
