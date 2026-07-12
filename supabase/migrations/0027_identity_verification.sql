-- Verificação de identidade (KYC) no cadastro: facematch entre documento e selfie.
-- As imagens NÃO são armazenadas (processadas em memória pelo serviço de match);
-- guardamos apenas o resultado. O status de verificação é o gate de acesso.

-- Status de verificação no perfil. Só o backend (service_role) pode marcar como
-- verificado — o trigger abaixo impede o próprio usuário de se auto-verificar.
alter table profiles
  add column if not exists identity_verified boolean not null default false,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_consent_at timestamptz;

-- Log de tentativas de verificação (auditoria). Sem imagens: só o resultado.
create table if not exists identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  verified boolean not null,
  distance numeric,        -- distância retornada pelo DeepFace (menor = mais parecido)
  threshold numeric,       -- limiar do modelo para aquela verificação
  model text,              -- modelo usado (ex.: VGG-Face, Facenet)
  created_at timestamptz not null default now()
);

create index if not exists identity_verifications_user_idx
  on identity_verifications (user_id, created_at desc);

alter table identity_verifications enable row level security;

-- O usuário lê o próprio histórico; a escrita é feita apenas pelo backend
-- (service_role, que ignora RLS). Não há policy de insert para authenticated.
drop policy if exists identity_verifications_read on identity_verifications;
create policy identity_verifications_read on identity_verifications
  for select using (auth.uid() = user_id);

-- Impede que o usuário altere o próprio status de verificação. A policy
-- profiles_write permite update da própria linha (qualquer coluna), então
-- protegemos as colunas de verificação no nível de trigger: quem não for
-- service_role tem os valores revertidos para os anteriores.
create or replace function protect_identity_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Bloqueia apenas o usuário logado (role authenticated) de mexer no próprio
  -- status de verificação. O backend (service_role) e operações administrativas
  -- (migrations/SQL direto, onde auth.role() é nulo) continuam podendo alterar.
  if auth.role() = 'authenticated' then
    new.identity_verified := old.identity_verified;
    new.identity_verified_at := old.identity_verified_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_identity on profiles;
create trigger profiles_protect_identity
  before update on profiles
  for each row execute function protect_identity_columns();
