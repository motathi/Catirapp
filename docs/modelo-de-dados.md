# Modelo de Dados

Este documento descreve as entidades principais da plataforma. O schema SQL correspondente está em [`supabase/migrations`](../supabase/migrations), pensado para PostgreSQL/Supabase (autenticação via `auth.users`, segurança via RLS).

## Visão geral

```
profiles ──< assets (garagem digital)
profiles ──< listings (anúncios) ──< listing_photos
listings ──< listing_accepted_trades (o que aceita na troca)
listings >──< listings ....... matches (sugeridos pelo algoritmo)
matches ──< match_contacts (mensagens de contato inteligente)
profiles ──< saved_listings >── listings
plans ──< profiles
fipe_reference (tabela de referência FIPE)
```

## Entidades

### `plans`

Configuração dos planos comerciais. Mantida em tabela (e não hardcoded) para permitir ajuste de limites sem deploy.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `code` | text PK | `free`, `pro`, `premium` |
| `name` | text | Nome de exibição |
| `max_active_listings` | int, null | `null` = ilimitado |
| `max_monthly_listings` | int, null | `null` = ilimitado |
| `daily_match_contacts` | int, null | `null` = ilimitado |
| `highlight_days` | int | 0 no plano gratuito |
| `feed_priority` | int | Peso na ordenação do feed |

### `profiles`

Perfil público do usuário, 1:1 com `auth.users`.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `display_name` | text | |
| `phone` | text | Para contato via WhatsApp |
| `city` / `state` | text | Localização padrão |
| `plan_code` | text FK → plans | Default `free` |
| `plan_renews_at` | timestamptz | Controle de assinatura |

### `assets` — a garagem digital

Bens do usuário disponíveis para negociação. Um asset pode existir **sem** anúncio (é apenas moeda de troca) ou estar vinculado a um anúncio ativo.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `owner_id` | uuid FK → profiles | |
| `category` | enum `asset_category` | ver abaixo |
| `title` | text | ex.: "Corolla XEi 2021" |
| `description` | text | |
| `estimated_value` | numeric | Usado pelo matching para casar valores |
| `city` / `state` | text | |

**`asset_category`**: `carro`, `moto`, `caminhao`, `caminhonete`, `suv`, `embarcacao`, `maquina`, `trator`, `terreno`, `imovel`, `outro`.

### `listings` — anúncios

O anúncio de um veículo. A regra de negócio central — **preço máximo em relação à FIPE** — é aplicada por `CHECK constraint` no banco, além da validação na aplicação.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `owner_id` | uuid FK → profiles | |
| `asset_id` | uuid FK → assets | O veículo anunciado (fica na garagem) |
| `brand` / `model` / `model_year` | text / text / int | |
| `mileage_km` | int | |
| `city` / `state` | text | |
| `price` | numeric | Valor do anúncio |
| `fipe_code` | text | Referência na tabela FIPE |
| `fipe_value` | numeric | Snapshot da FIPE na publicação |
| `fipe_percent` | numeric (gerado) | `price / fipe_value * 100` |
| `accepts_trade` | boolean | |
| `accepts_cash_complement` | boolean | Aceita bem + dinheiro |
| `status` | enum | `draft`, `active`, `paused`, `sold`, `expired` |
| `highlighted_until` | timestamptz | Destaque pago |
| `published_at` | timestamptz | Base para cota mensal |

Constraint: `price <= fipe_value * (max_fipe_percent / 100)` — `max_fipe_percent` inicia em **85** e fica em `app_settings` para permitir ajuste.

Campos derivados exibidos no feed (calculados, não armazenados): **economia** (`fipe_value - price`) e **percentual da FIPE**.

### `listing_photos`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `listing_id` | uuid FK | |
| `storage_path` | text | Supabase Storage |
| `position` | int | 0 = foto principal |

### `listing_accepted_trades`

O que o vendedor aceita como parte do pagamento — insumo direto do matching.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `listing_id` | uuid FK | |
| `category` | enum `asset_category` | |
| `max_value` | numeric, null | Teto opcional para o bem recebido |

### `matches`

Compatibilidades encontradas pelo algoritmo (ver [algoritmo-de-matching.md](algoritmo-de-matching.md)). Sempre normalizado com `listing_a_id < listing_b_id` para evitar duplicatas.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `listing_a_id` / `listing_b_id` | uuid FK → listings | |
| `kind` | enum | `troca_direta`, `troca_com_volta`, `compra` |
| `score` | numeric | 0–100, para ordenação |
| `cash_difference` | numeric | Volta estimada (positiva ou negativa) |
| `status` | enum | `suggested`, `viewed`, `contacted`, `dismissed` |
| `computed_at` | timestamptz | |

### `match_contacts`

Cada "Contato Inteligente" enviado. É a base do limite diário por plano: a cota é verificada contando os registros do usuário nas últimas 24h antes do insert (função `can_send_match_contact()`).

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `match_id` | uuid FK → matches | |
| `sender_id` | uuid FK → profiles | |
| `message` | text | Mensagem automática ou personalizada |
| `created_at` | timestamptz | |

### `saved_listings`

Favoritos: PK composta (`user_id`, `listing_id`).

### `fipe_reference`

Cache local da tabela FIPE, atualizado mensalmente por job.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `fipe_code` | text | |
| `brand` / `model` / `model_year` | | |
| `reference_month` | date | |
| `value` | numeric | |

PK composta (`fipe_code`, `model_year`, `reference_month`).

### `app_settings`

Chave/valor para parâmetros de negócio ajustáveis: `max_fipe_percent` (85), `match_value_tolerance_percent`, etc.

## Regras de negócio no banco

1. **Teto FIPE** — trigger valida `price` contra `fipe_value * max_fipe_percent` na publicação.
2. **Cota de anúncios** — função verifica `max_active_listings` e `max_monthly_listings` do plano antes de ativar um anúncio.
3. **Cota de contatos** — função verifica `daily_match_contacts` antes de inserir em `match_contacts`.
4. **RLS** — leitura pública de anúncios ativos; escrita apenas pelo dono; `matches` visíveis apenas aos donos dos dois anúncios envolvidos.
