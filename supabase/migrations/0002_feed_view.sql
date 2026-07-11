-- View do feed público: anúncios ativos + trocas aceitas + contagem de matches.
-- Security definer proposital: expõe SOMENTE anúncios ativos (já públicos por RLS)
-- e a contagem agregada de matches (não os matches em si, que permanecem privados).
create view public.feed_listings
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
     and m.status <> 'dismissed') as match_count
from listings l
where l.status = 'active';

grant select on public.feed_listings to anon, authenticated;
