-- Matching v1 implementado no banco, conforme docs/algoritmo-de-matching.md.
-- Recalcula os matches de um anúncio sempre que ele (ou suas trocas aceitas)
-- muda, de forma incremental: nunca varre a base inteira.
create or replace function recompute_matches(p_listing_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  tol_pct numeric;
  w jsonb;
begin
  select (value #>> '{}')::numeric into tol_pct
  from app_settings where key = 'match_value_tolerance_percent';
  select value into w from app_settings where key = 'match_score_weights';

  -- Matches ainda não negociados são refeitos do zero; os já contatados
  -- ou descartados preservam o status e só têm o score atualizado.
  delete from matches
  where (listing_a_id = p_listing_id or listing_b_id = p_listing_id)
    and status in ('suggested', 'viewed');

  insert into matches (listing_a_id, listing_b_id, kind, score, cash_difference)
  select
    least(me.id, o.id),
    greatest(me.id, o.id),
    k.kind,
    round(
      (w->>'valor')::numeric        * (1 - x.diff / greatest(me.price, o.price))
    + (w->>'oportunidade')::numeric * least(1, greatest(0,
        ((100 - me.fipe_percent) + (100 - o.fipe_percent)) / 2 / 15))
    + (w->>'distancia')::numeric    * case
        when me.city = o.city and me.state = o.state then 1
        when me.state = o.state then 0.6
        else 0.3 end
    + (w->>'reciprocidade')::numeric * case k.kind
        when 'troca_direta' then 1
        when 'troca_com_volta' then 0.7
        else 0.4 end
    , 2),
    case when me.id < o.id then o.price - me.price else me.price - o.price end
  from (
    select l.id, l.owner_id, l.price, l.fipe_percent, l.city, l.state,
           l.accepts_cash_complement, a.category
    from listings l
    join assets a on a.id = l.asset_id
    where l.id = p_listing_id and l.status = 'active'
  ) me
  join listings o on o.status = 'active' and o.owner_id <> me.owner_id
  join assets oa on oa.id = o.asset_id
  cross join lateral (
    select
      exists (select 1 from listing_accepted_trades t
              where t.listing_id = me.id and t.category = oa.category) as i_accept,
      exists (select 1 from listing_accepted_trades t
              where t.listing_id = o.id and t.category = me.category) as they_accept,
      abs(me.price - o.price) as diff,
      tol_pct / 100 * least(me.price, o.price) as tol
  ) x
  cross join lateral (
    select case
      -- reciprocidade total com valores próximos
      when x.i_accept and x.they_accept and x.diff <= x.tol
        then 'troca_direta'::match_kind
      -- reciprocidade total, diferença coberta por dinheiro
      when x.i_accept and x.they_accept
           and (me.accepts_cash_complement or o.accepts_cash_complement)
        then 'troca_com_volta'::match_kind
      -- compatibilidade em um sentido só
      when (x.i_accept or x.they_accept)
           and (x.diff <= x.tol or me.accepts_cash_complement or o.accepts_cash_complement)
        then 'compra'::match_kind
      else null
    end as kind
  ) k
  where k.kind is not null
  on conflict (listing_a_id, listing_b_id) do update
    set kind = excluded.kind,
        score = excluded.score,
        cash_difference = excluded.cash_difference,
        computed_at = now();
end;
$$;

create or replace function trg_recompute_listing_matches()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform recompute_matches(new.id);
  return new;
end;
$$;

create trigger listings_recompute_matches
  after insert or update of status, price, accepts_trade, accepts_cash_complement on listings
  for each row execute function trg_recompute_listing_matches();

create or replace function trg_recompute_trade_matches()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform recompute_matches(coalesce(new.listing_id, old.listing_id));
  return coalesce(new, old);
end;
$$;

create trigger trades_recompute_matches
  after insert or update or delete on listing_accepted_trades
  for each row execute function trg_recompute_trade_matches();

revoke execute on function recompute_matches(uuid) from public, anon, authenticated;
revoke execute on function trg_recompute_listing_matches() from public, anon, authenticated;
revoke execute on function trg_recompute_trade_matches() from public, anon, authenticated;

-- Recalcula toda a base ativa uma única vez, substituindo os matches semeados
select recompute_matches(id) from listings where status = 'active';
