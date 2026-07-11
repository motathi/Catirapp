-- As funções de trigger não devem ser chamáveis via API REST (rpc/):
-- triggers disparam independentemente do privilégio EXECUTE do usuário.
revoke execute on function enforce_fipe_cap() from public, anon, authenticated;
revoke execute on function enforce_listing_quota() from public, anon, authenticated;
revoke execute on function enforce_contact_quota() from public, anon, authenticated;
