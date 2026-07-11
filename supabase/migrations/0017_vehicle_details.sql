-- Ficha padrão do veículo no anúncio: sinistro por monta, leilão, gravame,
-- mecânica, único dono, IPVA/licenciamento, blindagem, cor, câmbio,
-- combustível, portas e final de placa.
create type damage_severity as enum ('nenhum', 'pequena_monta', 'media_monta', 'grande_monta');
create type transmission_kind as enum ('manual', 'automatico', 'cvt', 'automatizado');
create type fuel_kind as enum ('flex', 'gasolina', 'etanol', 'diesel', 'hibrido', 'eletrico');

alter table listings
  add column damage_severity damage_severity not null default 'nenhum',
  add column auction_history boolean not null default false,
  add column has_lien boolean not null default false,
  add column mechanical_issues boolean not null default false,
  add column single_owner boolean not null default false,
  add column armored boolean not null default false,
  add column ipva_paid boolean not null default true,
  add column licensed boolean not null default true,
  add column color text,
  add column transmission transmission_kind,
  add column fuel fuel_kind,
  add column doors int check (doors between 2 and 6),
  add column plate_end int check (plate_end between 0 and 9),
  add column condition_notes text check (char_length(condition_notes) <= 1000);

-- is_damaged passa a derivar da monta do sinistro
update listings set damage_severity = 'media_monta' where is_damaged;

drop view feed_listings;
drop index if exists listings_damaged_idx;
alter table listings drop column is_damaged;
alter table listings add column is_damaged boolean
  generated always as (damage_severity <> 'nenhum') stored;
create index listings_damaged_idx on listings (status) where is_damaged;

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
     and m.status <> 'dismissed') as match_count,
  (select p.storage_path
   from listing_photos p
   where p.listing_id = l.id
   order by p.position
   limit 1) as main_photo_path,
  (select a.category from assets a where a.id = l.asset_id) as vehicle_category,
  l.is_damaged,
  l.previous_price,
  l.price_dropped_at,
  (l.highlighted_until is not null and l.highlighted_until > now()) as is_highlighted,
  coalesce(
    (select p.feed_priority
     from plans p join profiles pr on pr.plan_code = p.code
     where pr.id = l.owner_id),
    0
  ) as feed_priority
from listings l
where l.status = 'active';

grant select on public.feed_listings to anon, authenticated;
