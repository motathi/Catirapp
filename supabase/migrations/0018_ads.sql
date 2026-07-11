-- Publicidade de empresas do setor automotivo (fonte de receita do conceito):
-- banners exibidos entre os anúncios de veículos na vitrine.
create table ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null,
  image_path text not null,          -- caminho no bucket público `ads`
  bg_color text,                     -- cor de fundo do banner (hex)
  target_url text,                   -- destino do clique (opcional)
  active boolean not null default true,
  weight int not null default 0,     -- ordenação/rotação
  created_at timestamptz not null default now()
);

alter table ads enable row level security;

-- Anúncios ativos são públicos; gestão apenas via service role
create policy ads_read on ads for select using (active);

insert into storage.buckets (id, name, public) values ('ads', 'ads', true)
on conflict (id) do nothing;
