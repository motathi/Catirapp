-- Ao criar o perfil, também aproveita o nome vindo de provedores OAuth (Google
-- envia full_name/name), mantendo o fallback para o formulário e o e-mail.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name, city, state)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(left(upper(new.raw_user_meta_data->>'state'), 2), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
