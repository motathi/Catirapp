-- Hardening apontado pelos advisors do Supabase.

-- Tabelas de referência: leitura pública, escrita apenas via service role
alter table plans enable row level security;
create policy plans_read on plans for select using (true);

alter table fipe_reference enable row level security;
create policy fipe_reference_read on fipe_reference for select using (true);

-- Parâmetros de negócio: sem acesso direto via API (lidos pelos triggers abaixo)
alter table app_settings enable row level security;

-- Triggers de regra de negócio precisam ler app_settings/plans/listings
-- independentemente do RLS do usuário que dispara: security definer com
-- search_path fixo (corrige também o alerta de search_path mutável).
alter function enforce_fipe_cap() security definer set search_path = public;
alter function enforce_listing_quota() security definer set search_path = public;
alter function enforce_contact_quota() security definer set search_path = public;
