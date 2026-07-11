-- Aplica o destaque do plano ao publicar: PRO ganha 5 dias, Premium 15
-- (plans.highlight_days). A view expõe destaque e prioridade do plano
-- para a ordenação do feed.
create or replace function apply_plan_highlight()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  days int;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    select p.highlight_days into days
    from plans p join profiles pr on pr.plan_code = p.code
    where pr.id = new.owner_id;

    if days > 0 then
      new.highlighted_until = now() + make_interval(days => days);
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function apply_plan_highlight() from public, anon, authenticated;

create trigger listings_plan_highlight
  before insert or update of status on listings
  for each row execute function apply_plan_highlight();

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
