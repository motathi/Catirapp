-- RPCs do ciclo de negociação: Contato Inteligente (com cota diária),
-- ciclo de vida do match e favoritos.

-- Envia o Contato Inteligente de um match. A cota diária do plano é
-- validada pelo trigger match_contacts_quota no insert.
create or replace function send_match_contact(p_match_id uuid, p_message text default null)
returns match_contacts
language plpgsql
security definer set search_path = public
as $$
declare
  m matches%rowtype;
  contact match_contacts%rowtype;
begin
  select * into m from matches where id = p_match_id;
  if not found then
    raise exception 'Match não encontrado';
  end if;

  if not exists (
    select 1 from listings l
    where l.id in (m.listing_a_id, m.listing_b_id) and l.owner_id = auth.uid()
  ) then
    raise exception 'Você não participa deste match';
  end if;

  insert into match_contacts (match_id, sender_id, message)
  values (
    p_match_id,
    auth.uid(),
    coalesce(
      p_message,
      'Olá! O aplicativo encontrou compatibilidade entre nossos anúncios. Tenho interesse em conversar sobre uma possível negociação.'
    )
  )
  returning * into contact;

  update matches set status = 'contacted'
  where id = p_match_id and status <> 'dismissed';

  return contact;
end;
$$;

-- Marca um match como visto ou descartado (únicas transições do usuário)
create or replace function update_match_status(p_match_id uuid, p_status match_status)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_status not in ('viewed', 'dismissed') then
    raise exception 'Transição não permitida';
  end if;

  update matches m
  set status = p_status
  from listings l
  where m.id = p_match_id
    and l.id in (m.listing_a_id, m.listing_b_id)
    and l.owner_id = auth.uid()
    and m.status in ('suggested', 'viewed');
end;
$$;

-- Quantos contatos de matching o usuário ainda tem hoje (null = ilimitado)
create or replace function remaining_daily_contacts()
returns int
language plpgsql
stable
security definer set search_path = public
as $$
declare
  daily_limit int;
  used int;
begin
  select pl.daily_match_contacts into daily_limit
  from plans pl join profiles pr on pr.plan_code = pl.code
  where pr.id = auth.uid();

  if daily_limit is null then
    return null;
  end if;

  select count(*) into used
  from match_contacts
  where sender_id = auth.uid()
    and created_at >= now() - interval '24 hours';

  return greatest(daily_limit - used, 0);
end;
$$;

-- Alterna favorito; retorna true quando salvou, false quando removeu.
-- Security invoker: a RLS de saved_listings já restringe ao próprio usuário.
create or replace function toggle_saved_listing(p_listing_id uuid)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  delete from saved_listings
  where user_id = auth.uid() and listing_id = p_listing_id;
  if found then
    return false;
  end if;

  insert into saved_listings (user_id, listing_id)
  values (auth.uid(), p_listing_id);
  return true;
end;
$$;

revoke execute on function send_match_contact(uuid, text) from public, anon;
revoke execute on function update_match_status(uuid, match_status) from public, anon;
revoke execute on function remaining_daily_contacts() from public, anon;
revoke execute on function toggle_saved_listing(uuid) from public, anon;

grant execute on function send_match_contact(uuid, text) to authenticated;
grant execute on function update_match_status(uuid, match_status) to authenticated;
grant execute on function remaining_daily_contacts() to authenticated;
grant execute on function toggle_saved_listing(uuid) to authenticated;
