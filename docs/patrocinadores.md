# Patrocinadores (banners da vitrine)

Os banners de publicidade exibidos entre os veículos na home vêm de três camadas,
projetadas para que **as imagens nunca sumam** — o problema que ocorria quando os
patrocinadores existiam apenas como inserção manual no Supabase.

## Como funciona

A regra de ouro: **a imagem é sempre servida do repositório**, nunca montada a
partir do bucket do Supabase. O banco só diz *quais* patrocinadores exibir e em
que ordem; o *arquivo* vem de `public/ads/`, que é deployado junto com o app.

1. **Fonte de verdade no repositório** — as imagens ficam versionadas em
   `public/ads/` (`loovi.webp`, `uai-veiculos.jpeg`). Como estão no Git, são
   deployadas com o app e não dependem de storage externo, env ou de qual
   projeto Supabase está conectado — por isso não desaparecem em resets.
2. **Metadados no banco** — a tabela `ads` guarda apenas anunciante, link,
   ordenação e ativo/inativo. Em `fetchActiveAds()` a imagem é montada como
   `/ads/<image_path>` (arquivo do repo), **não** como URL do bucket. O
   `image_path` deve bater com o nome do arquivo em `public/ads/`.
3. **Fallback no código** — `fallbackAds` em `lib/supabase.ts` lista os
   patrocinadores apontando para `/ads/*`. Se o Supabase não retornar nenhum
   anúncio ativo (banco vazio, backend fora do ar, sem env), o app exibe esses
   banners mesmo assim.
4. **Fallback de renderização** — o componente `components/AdBanner.tsx` tem
   `onError` em cadeia: se a imagem do repo faltar, tenta o bucket
   (`fallbackUrl`); se ainda assim falhar, mostra o nome do anunciante sobre a
   cor de fundo. Nunca renderiza um ícone de imagem quebrada.
5. **Seed no banco** — a migration `0019_seed_ads.sql` insere/atualiza as linhas
   da tabela `ads` de forma idempotente, restaurando os banners após qualquer
   reset do banco. Um índice único em `advertiser` evita duplicidade.

Ordem de prioridade em `fetchActiveAds()`: anúncios ativos do Supabase (com a
imagem servida do repo) → se não houver, `fallbackAds` do repositório. Em ambos
os casos a imagem sai de `public/ads/`.

## Adicionar um novo patrocinador

1. Coloque a imagem em `public/ads/<arquivo>` e faça commit. **Este passo é
   obrigatório** — é daqui que a imagem é servida.
2. Registre-o na tabela `ads` (via SQL/migration) com `image_path` igual ao nome
   do arquivo em `public/ads/` **ou** adicione-o a `fallbackAds` em
   `lib/supabase.ts` para que apareça sem depender do banco.
3. Enviar o arquivo para o bucket `ads` é **opcional** (só serve como fallback
   secundário); o app não depende mais dele para exibir o banner.

## Observação sobre o bucket de storage

O bucket `ads` deixou de ser a fonte das imagens — ele é apenas um fallback. Como
a imagem é servida de `public/ads/` (versionada no Git e deployada com o app), um
reset do storage **não** faz os banners sumirem. Por isso os arquivos binários,
que não podem ser criados por migration, não são mais um ponto de falha.
