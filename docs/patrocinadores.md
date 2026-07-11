# Patrocinadores (banners da vitrine)

Os banners de publicidade exibidos entre os veículos na home vêm de três camadas,
projetadas para que **as imagens nunca sumam** — o problema que ocorria quando os
patrocinadores existiam apenas como inserção manual no Supabase.

## Como funciona

1. **Fonte de verdade no repositório** — as imagens ficam versionadas em
   `public/ads/` (`loovi.webp`, `uai-veiculos.jpeg`). Como estão no Git, não
   dependem de storage externo e não desaparecem em resets.
2. **Fallback no código** — `fallbackAds` em `lib/supabase.ts` lista os
   patrocinadores apontando para `/ads/*`. Se o Supabase não retornar nenhum
   anúncio ativo (banco vazio, backend fora do ar, sem env), o app exibe esses
   banners mesmo assim.
3. **Seed no banco** — a migration `0019_seed_ads.sql` insere/atualiza as linhas
   da tabela `ads` de forma idempotente, restaurando os banners após qualquer
   reset do banco. Um índice único em `advertiser` evita duplicidade.

Ordem de prioridade em `fetchActiveAds()`: anúncios ativos do Supabase →
se não houver, `fallbackAds` do repositório.

## Adicionar um novo patrocinador

1. Coloque a imagem em `public/ads/<arquivo>` e faça commit.
2. Registre-o na tabela `ads` (via SQL/migration) **ou** adicione-o a `fallbackAds`
   em `lib/supabase.ts` para que apareça sem depender do banco.
3. Se usar o Supabase, envie o mesmo arquivo para o bucket público `ads` com o
   nome exato de `image_path`.

## Observação sobre o bucket de storage

Arquivos binários não podem ser criados por migration. Se o bucket `ads` for
zerado, reenvie os arquivos a partir de `public/ads/`. Ainda assim, o app
continua mostrando os banners pela camada de fallback.
