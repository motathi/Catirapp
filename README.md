# Catirapp

**O marketplace que encontra negócios para você.**

Catirapp é um marketplace de veículos focado em oportunidades reais: toda oferta publicada precisa estar abaixo de um percentual da tabela FIPE, e um sistema de matching inteligente conecta automaticamente compradores, vendedores e interessados em troca (catira).

🌐 **Produção:** https://catirapp-omega.vercel.app

## Documentação

- [Conceito do produto](docs/conceito-do-produto.md) — posicionamento, pilares, planos e estratégia
- [Modelo de dados](docs/modelo-de-dados.md) — entidades e regras de negócio no banco
- [Algoritmo de matching](docs/algoritmo-de-matching.md) — especificação da v1 do matching

## Estrutura do projeto

| Caminho | Conteúdo |
| --- | --- |
| `app/` | Aplicação web (Next.js + Tailwind): feed, busca, detalhe do anúncio, login/cadastro e perfil |
| `lib/` | Tipos, formatação, clients Supabase e dados de demonstração |
| `supabase/migrations/` | Schema PostgreSQL com triggers de cota/teto FIPE, matching e políticas RLS |
| `docs/` | Documentação do produto |

### Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Feed de oportunidades em tela cheia |
| `/buscar` | Busca com filtros (marca, modelo, ano, preço, % FIPE, cidade, UF, troca, bem aceito) |
| `/anuncio/[id]` | Detalhes do anúncio: valores FIPE, economia, catira e vendedor |
| `/entrar` · `/cadastro` | Autenticação (Supabase Auth); o perfil é criado por trigger no cadastro |
| `/perfil` | Perfil: plano, cota diária de contatos, matches dos seus anúncios, garagem digital |

Conta de demonstração: `demo1@catirapp.demo` / `catirapp123` (há `demo1`–`demo6`, cada uma dona de um anúncio do seed).

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do projeto Supabase
npm run dev                  # http://localhost:3000
```

O feed lê os anúncios ativos do Supabase pela view `feed_listings` (anúncios públicos + trocas aceitas + contagem de matches). Sem `.env.local`, o app cai automaticamente nos dados de demonstração de `lib/listings.ts` — útil para rodar o protótipo sem backend.

### Backend (Supabase)

As migrations em `supabase/migrations/` criam todo o backend:

1. `0001_initial_schema.sql` — tabelas, triggers de regra de negócio (teto de 85% da FIPE, cotas de anúncios e de contatos por plano) e políticas RLS
2. `0002_feed_view.sql` — view pública do feed
3. `0003`–`0005` — hardening de segurança e ajustes
4. `0006_auth_profile_trigger.sql` — criação automática do perfil no cadastro
5. `0007_matching.sql` — algoritmo de matching v1 ([spec](docs/algoritmo-de-matching.md)): recálculo incremental por trigger a cada anúncio publicado/editado, com tipos `troca_direta`/`troca_com_volta`/`compra` e score 0–100

As regras críticas moram no banco: um anúncio acima do teto FIPE ou além da cota do plano é rejeitado pelo próprio PostgreSQL, independentemente do cliente — e os matches são recalculados na mesma transação que muda o anúncio.

## Os três pilares

1. **Oportunidades** — todo anúncio tem limite máximo de preço baseado na FIPE (ex.: 85%), garantindo que qualquer oferta na plataforma já passou por um filtro de valor.
2. **Matching Inteligente** — o sistema analisa os anúncios e encontra automaticamente veículos compatíveis para compra ou troca, invertendo a lógica dos marketplaces tradicionais.
3. **Catira** — cada usuário pode cadastrar outros bens (carros, motos, imóveis, máquinas, embarcações etc.) para usar como parte do pagamento em negociações.

## Estratégia de evolução

| Fase | Foco | Objetivo |
| --- | --- | --- |
| 1 | Marketplace de oportunidades | Construir reputação como *o lugar* para encontrar bons negócios |
| 2 | Matching Inteligente | Aumentar negociações sem depender apenas de busca manual |
| 3 | Plataforma de negociação patrimonial | Expandir trocas para imóveis, máquinas, embarcações e equipamentos |

## Modelo de receita

Sem comissão sobre vendas. Receita via anúncios avulsos, assinaturas (PRO e Premium), destaques de anúncios e, no futuro, publicidade de empresas do setor automotivo.
