-- Veículos batidos/sinistrados viram um atributo do anúncio, e a view do
-- feed passa a expor a categoria do veículo anunciado — insumos dos menus
-- da página inicial (batidos, caminhonetes, motos, caminhões...).
alter table listings add column is_damaged boolean not null default false;

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
  l.is_damaged
from listings l
where l.status = 'active';

grant select on public.feed_listings to anon, authenticated;
