-- Manutenção automática: anúncios expiram após N dias (app_settings) via
-- job diário do pg_cron; índices para os filtros da vitrine.
create extension if not exists pg_cron;

insert into app_settings (key, value) values ('listing_expiry_days', '60')
on conflict (key) do nothing;

create or replace function expire_old_listings()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  expiry_days int;
  expired int;
begin
  select (value #>> '{}')::int into expiry_days
  from app_settings where key = 'listing_expiry_days';

  update listings
  set status = 'expired'
  where status = 'active'
    and published_at < now() - make_interval(days => expiry_days);

  get diagnostics expired = row_count;
  return expired;
end;
$$;

revoke execute on function expire_old_listings() from public, anon, authenticated;

-- Todo dia às 03:00 UTC
select cron.schedule(
  'expire-old-listings',
  '0 3 * * *',
  $$select expire_old_listings()$$
);

-- Índices para os filtros e ordenação da vitrine
create index listings_price_drop_idx on listings (price_dropped_at)
  where price_dropped_at is not null;
create index listings_damaged_idx on listings (status)
  where is_damaged;
create index messages_sender_idx on messages (sender_id);
