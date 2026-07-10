# Catirapp

**O marketplace que encontra negócios para você.**

Catirapp é um marketplace de veículos focado em oportunidades reais: toda oferta publicada precisa estar abaixo de um percentual da tabela FIPE, e um sistema de matching inteligente conecta automaticamente compradores, vendedores e interessados em troca (catira).

## Documentação

- [Conceito do produto](docs/conceito-do-produto.md) — posicionamento, pilares, planos e estratégia
- [Modelo de dados](docs/modelo-de-dados.md) — entidades e regras de negócio no banco
- [Algoritmo de matching](docs/algoritmo-de-matching.md) — especificação da v1 do matching

## Estrutura do projeto

| Caminho | Conteúdo |
| --- | --- |
| `app/` | Aplicação web (Next.js + Tailwind) — protótipo do feed de oportunidades |
| `lib/` | Tipos, formatação e dados de demonstração |
| `supabase/migrations/` | Schema PostgreSQL com triggers de cota/teto FIPE e políticas RLS |
| `docs/` | Documentação do produto |

## Desenvolvimento

```bash
npm install
npm run dev   # http://localhost:3000
```

O protótipo atual usa dados mock (`lib/listings.ts`). O próximo passo é conectar ao Supabase usando o schema em `supabase/migrations/0001_initial_schema.sql`.

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
