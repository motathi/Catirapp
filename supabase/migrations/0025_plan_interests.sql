-- Captura de interesse em planos/pacotes (leads de monetização). Enquanto o
-- pagamento não é automatizado, registramos a intenção para follow-up comercial.
create table plan_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  plan_code text not null,
  created_at timestamptz not null default now()
);

create index plan_interests_user_idx on plan_interests (user_id, created_at desc);

alter table plan_interests enable row level security;

-- O usuário registra e lê apenas os próprios interesses
create policy plan_interests_insert on plan_interests for insert to authenticated
  with check (user_id = auth.uid());
create policy plan_interests_read on plan_interests for select
  using (user_id = auth.uid());
