# Algoritmo de Matching

O matching é o principal diferencial do produto: em vez de o usuário procurar, **o sistema procura por ele**. Este documento especifica a versão 1 do algoritmo — deliberadamente simples, determinística e explicável, para que o usuário entenda *por que* um match foi sugerido.

## Entradas

Para cada anúncio ativo:

- O veículo anunciado: categoria, valor (`price`), localização.
- O que o vendedor **aceita** na troca (`listing_accepted_trades`): categorias e tetos opcionais.
- Se aceita **complemento em dinheiro** (`accepts_cash_complement`).
- A **garagem digital** do dono (`assets`): outros bens que podem entrar na negociação.

## Tipos de match

| Tipo | Definição |
| --- | --- |
| `troca_direta` | O veículo de A é aceito por B **e** o veículo de B é aceito por A, com valores dentro da tolerância |
| `troca_com_volta` | Como acima, mas a diferença de valores é coberta por dinheiro (um dos lados aceita complemento) |
| `compra` | O anúncio de B casa com o que A declarou buscar, sem troca envolvida |

## Regras de compatibilidade (v1)

Dois anúncios A e B formam um match candidato quando **todas** as condições valem:

1. **Categoria cruzada** — a categoria do veículo de B está entre as aceitas por A, **e** a categoria do veículo de A está entre as aceitas por B (para trocas). Para `compra`, basta um dos lados.
2. **Faixa de valor** — `|price_A - price_B| <= tolerancia`, onde a tolerância é `match_value_tolerance_percent` (inicial: **30%** do menor valor). Acima disso, só há match se algum lado aceitar complemento em dinheiro (`troca_com_volta`) e a diferença couber no teto declarado (`max_value`).
3. **Donos distintos** — `owner_a != owner_b`.
4. **Ambos ativos** — `status = 'active'` nos dois anúncios.

A garagem digital amplia o passo 1: se o veículo de A não é aceito por B, mas **outro bem da garagem de A** é, o match é sugerido usando esse bem (ex.: B aceita moto; A anuncia um carro mas tem uma moto na garagem).

## Score (0–100)

O score ordena os matches na tela do usuário:

```
score = 40 * proximidade_de_valor      # 1 - (diferença / maior_valor)
      + 25 * qualidade_da_oportunidade # quão abaixo da FIPE o outro anúncio está
      + 20 * proximidade_geográfica    # mesma cidade = 1, mesmo estado = 0.6, senão decai por distância
      + 15 * reciprocidade             # troca_direta = 1, troca_com_volta = 0.7, compra = 0.4
```

Pesos ficam em `app_settings` para calibração sem deploy.

## Quando recalcular

O cálculo é **incremental**: nunca se recalcula a base inteira.

| Evento | Ação |
| --- | --- |
| Anúncio publicado ou editado (preço, trocas aceitas) | Calcula matches desse anúncio contra os ativos compatíveis |
| Bem adicionado/removido da garagem | Recalcula matches dos anúncios do dono |
| Anúncio pausado/vendido/expirado | Marca matches envolvidos como inativos |
| Atualização mensal da FIPE | Recalcula apenas o componente `qualidade_da_oportunidade` dos scores |

Implementação sugerida na v1: função SQL/Edge Function disparada por trigger com fila (`pg_net`/queue), retornando os candidatos via índice em (`status`, `category`, faixa de `price`). Com poucos milhares de anúncios ativos isso roda em milissegundos; otimizações (índices geoespaciais, pré-filtros por bucket de valor) entram quando a base crescer.

## Notificação e contato

1. Novos matches geram um evento "Encontramos N oportunidades compatíveis com seu veículo" (push + badge no app).
2. Ao abrir um match, o usuário vê os dois lados da negociação e a volta estimada (`cash_difference`).
3. O botão **Contato Inteligente** envia a mensagem padrão e registra em `match_contacts` — sujeito à cota diária do plano (1/dia no gratuito, 4/dia no PRO, ilimitado no Premium).
4. Match contatado muda para `status = 'contacted'`; descartado (`dismissed`) não é sugerido novamente, a menos que o anúncio mude.

## Fora de escopo na v1 (evolução futura)

- Cadeias de troca com 3+ participantes (A→B→C→A).
- Aprendizado de preferências implícitas (anúncios vistos/salvos).
- Matching entre categorias da Fase 3 (imóveis, máquinas) — o modelo de dados já suporta via `asset_category`, mas o produto lança focado em veículos.
