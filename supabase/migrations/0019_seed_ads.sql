-- Semeia os patrocinadores da vitrine de forma idempotente, para que um reset
-- do banco restaure os banners automaticamente (antes eles existiam apenas como
-- inserção manual e sumiam a cada reseed). As imagens correspondentes estão
-- versionadas no repositório em `public/ads/` e servem de fallback no app.
--
-- Observação: os arquivos no bucket `ads` (loovi.webp, uai-veiculos.jpeg) são
-- binários e não podem ser criados por migration. Se o storage for zerado,
-- reenvie-os a partir de `public/ads/`. Mesmo assim, o app continua exibindo os
-- banners usando as imagens do repo (ver `fallbackAds` em lib/supabase.ts).

-- Evita duplicidade de anunciantes em novos seeds/inserções.
create unique index if not exists ads_advertiser_key on ads (advertiser);

insert into ads (advertiser, image_path, bg_color, target_url, active, weight)
values
  ('Loovi Seguros', 'loovi.webp', '#5578F5', 'https://loovi.com.br', true, 1),
  ('UAI Veículos', 'uai-veiculos.jpeg', '#0a0a0a', 'https://uaiveiculos.com/', true, 2)
on conflict (advertiser) do update set
  image_path = excluded.image_path,
  bg_color   = excluded.bg_color,
  target_url = excluded.target_url,
  active     = excluded.active,
  weight     = excluded.weight;
