-- Corrige a mensagem de erro do teto FIPE ("%85" -> "85%").
create or replace function enforce_fipe_cap()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cap numeric;
begin
  select (value #>> '{}')::numeric into cap
  from app_settings where key = 'max_fipe_percent';

  if new.status in ('active') and new.price > new.fipe_value * cap / 100 then
    raise exception using
      message = format('Preço (%s) acima do limite de %s%% da FIPE (%s)', new.price, cap, new.fipe_value),
      errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function enforce_fipe_cap() from public, anon, authenticated;
