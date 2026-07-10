-- Cria o perfil automaticamente no cadastro, a partir dos metadados
-- enviados pelo formulário (display_name, city, state).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name, city, state)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(left(upper(new.raw_user_meta_data->>'state'), 2), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
