-- Miniatura das fotos: guardamos, além do caminho principal (comprimido),
-- um caminho da versão reduzida usada em listas/thumbnails. Fotos antigas
-- ficam com thumb_path nulo (o app cai no caminho principal).
alter table listing_photos add column if not exists thumb_path text;

-- Recria a view do feed expondo também a miniatura da foto principal.
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
  (select p.thumb_path
   from listing_photos p
   where p.listing_id = l.id
   order by p.position
   limit 1) as main_photo_thumb_path
from listings l
where l.status = 'active';

grant select on public.feed_listings to anon, authenticated;
