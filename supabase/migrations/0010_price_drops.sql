-- Rastreia reduções de preço: quando o anúncio baixa de valor, o banco
-- registra o preço anterior e o momento — insumo do menu "Baixou o preço".
alter table listings
  add column previous_price numeric(12,2),
  add column price_dropped_at timestamptz;

create or replace function track_price_drop()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.price < old.price then
    new.previous_price = old.price;
    new.price_dropped_at = now();
  end if;
  return new;
end;
$$;

revoke execute on function track_price_drop() from public, anon, authenticated;

create trigger listings_price_drop
  before update of price on listings
  for each row execute function track_price_drop();

create or replace view public.feed_listings
with (security_invoker = false) as
select
  l.id,
  l.brand,
  l.model,
  l.model_year,
  l.mileage_km,
  l.city,
  l.state,
  l.price,
  l.fipe_value,
  l.fipe_percent,
  l.accepts_trade,
  l.accepts_cash_complement,
  l.highlighted_until,
  l.published_at,
  coalesce(
    (select array_agg(t.category order by t.category)
     from listing_accepted_trades t
     where t.listing_id = l.id),
    '{}'
  ) as accepted_categories,
  (select count(*)::int
   from matches m
   where (m.listing_a_id = l.id or m.listing_b_id = l.id)
     and m.status <> 'dismissed') as match_count,
  (select p.storage_path
   from listing_photos p
   where p.listing_id = l.id
   order by p.position
   limit 1) as main_photo_path,
  (select a.category from assets a where a.id = l.asset_id) as vehicle_category,
  l.is_damaged,
  l.previous_price,
  l.price_dropped_at
from listings l
where l.status = 'active';

grant select on public.feed_listings to anon, authenticated;
