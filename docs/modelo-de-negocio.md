# Modelo de Negócio — Catire

> Documento estratégico. Projeções de receita, custo e valuation para os cenários de
> **10 mil**, **100 mil** e **1 milhão** de usuários ativos por mês (MAU).
> Valores em Reais (R$). As premissas estão explícitas para poderem ser ajustadas.

---

## 1. O que é a Catire

A **Catire** é um marketplace de veículos que não quer ser "mais uma OLX". A proposta,
resumida em uma frase, é:

> **O marketplace que encontra negócios para você.**

Enquanto os classificados tradicionais são um mural passivo — o vendedor publica e torce
para alguém achar —, a Catire inverte a lógica com três pilares:

1. **Oportunidades** — todo anúncio precisa estar **abaixo de um percentual da tabela FIPE**
   (ex.: 85%). Quem entra na plataforma já sabe que qualquer oferta passou por um filtro de
   preço. A regra é garantida no próprio banco de dados: um anúncio acima do teto é rejeitado
   pelo PostgreSQL, independentemente do cliente.
2. **Matching Inteligente** — o sistema analisa os anúncios e **encontra automaticamente
   veículos compatíveis** para compra ou troca. Em vez de o usuário buscar, a plataforma avisa:
   *"Encontramos 42 oportunidades compatíveis com o seu veículo."*
3. **Catira (troca)** — cada usuário cadastra outros bens (carros, motos, imóveis, máquinas,
   embarcações) para usar como parte do pagamento, abrindo negócios muito além da compra
   tradicional.

O diferencial competitivo não é reunir anúncios — é **usar tecnologia para conectar pessoas
com interesses compatíveis**. Quanto maior a base, maior o número de combinações possíveis, o
que torna o serviço mais útil e mais difícil de ser copiado (efeito de rede).

---

## 2. Canais de remuneração

A monetização é **simples, previsível e sem comissão sobre a venda** — um diferencial frente a
plataformas que cobram percentual sobre o negócio. São quatro fontes de receita:

### a) Pagar para anunciar o carro (anúncios avulsos e destaques)
Usuário do plano gratuito que quer publicar além da cota, ou dar visibilidade a um anúncio,
paga por **anúncio avulso** ou por **destaque** (posição de topo por 5–15 dias). É a receita
de entrada, de baixo atrito e alto volume.

### b) Assinatura (recorrência — o motor do negócio)
Planos mensais que liberam mais anúncios, mais contatos de matching e prioridade na exibição.
O **limite de contatos via matching é o principal gatilho de conversão**: quem negocia muito
precisa assinar.

| Recurso | Gratuito | PRO | Premium |
| --- | --- | --- | --- |
| Anúncios ativos | 1 | Até 10 | Ilimitados |
| Contatos de matching / dia | 1 | 4 | Ilimitados |
| Destaque | — | 5 dias | 15 dias |
| Prioridade na exibição | — | — | Máxima |

Além dos planos de pessoa física, há o **Plano Lojista** — o segmento de maior valor por
cliente (ARPU). Lojas e revendas têm alto volume de estoque, giro constante e disposição a
pagar por ferramentas de venda. É a assinatura que sustenta a receita recorrente.

### c) Pagar para fazer propaganda (publicidade do ecossistema automotivo)
Com audiência qualificada e de alta intenção de compra, a Catire vende espaço publicitário
para toda a cadeia: **seguradoras, financiamentos, oficinas, vistorias, despachantes,
autopeças**. Receita que escala com o tráfego, sem custo marginal relevante.

### Preços de referência (premissas do modelo)

| Item | Preço |
| --- | --- |
| Anúncio avulso / destaque | R$ 25 (ticket médio) |
| Assinatura PRO | R$ 39 / mês |
| Assinatura Premium | R$ 99 / mês |
| Plano Lojista | R$ 249 / mês |
| Publicidade | pacotes / CPM, escalando com o tráfego |

---

## 3. Por que pode ser um grande negócio

- **Recorrência.** Assinaturas (PF e, principalmente, lojistas) geram receita previsível mês
  a mês — a base de qualquer valuation alto.
- **Margem altíssima.** É software. Sem estoque, sem logística, sem comissão a repassar. O
  custo marginal de mais um usuário é quase zero.
- **Efeito de rede e defensividade.** Cada novo anúncio aumenta o número de matches possíveis
  para todos os outros. A base vira o fosso competitivo.
- **Múltiplas alavancas de receita.** Se a conversão de assinatura for baixa, publicidade e
  destaques compensam — e vice-versa.
- **Estrutura enxuta.** Manutenção via *vibe coding* (desenvolvimento assistido por IA)
  elimina o maior custo fixo de uma software house: a folha de engenharia.

---

## 4. Cenários de receita (10k / 100k / 1M usuários por mês)

**Premissas de conversão** (conservadoras, típicas de marketplace):
- ~20% dos usuários são anunciantes (vendedores).
- Assinantes PF (PRO + Premium): 3% a 4% da base, na proporção 80% PRO / 20% Premium.
- Lojistas e receita de publicidade crescem mais que proporcionalmente com a escala
  (mais audiência → mais anunciantes B2B pagando mais).

### Cenário A — 10.000 usuários/mês

| Fonte | Cálculo | Receita/mês |
| --- | --- | ---: |
| Assinaturas PF | 240 PRO × R$39 + 60 Premium × R$99 | R$ 15.300 |
| Plano Lojista | 20 × R$249 | R$ 4.980 |
| Avulsos / destaques | 160 × R$25 | R$ 4.000 |
| Publicidade | tráfego inicial | R$ 3.000 |
| **Total** | | **≈ R$ 27.000 / mês** |

**Receita anual (ARR): ≈ R$ 327 mil**

### Cenário B — 100.000 usuários/mês

| Fonte | Cálculo | Receita/mês |
| --- | --- | ---: |
| Assinaturas PF | 2.800 PRO × R$39 + 700 Premium × R$99 | R$ 178.500 |
| Plano Lojista | 300 × R$249 | R$ 74.700 |
| Avulsos / destaques | 2.000 × R$25 | R$ 50.000 |
| Publicidade | audiência qualificada | R$ 60.000 |
| **Total** | | **≈ R$ 363.000 / mês** |

**Receita anual (ARR): ≈ R$ 4,4 milhões**

### Cenário C — 1.000.000 usuários/mês

| Fonte | Cálculo | Receita/mês |
| --- | --- | ---: |
| Assinaturas PF | 32.000 PRO × R$39 + 8.000 Premium × R$99 | R$ 2.040.000 |
| Plano Lojista | 2.500 × R$249 | R$ 622.500 |
| Avulsos / destaques | 20.000 × R$25 | R$ 500.000 |
| Publicidade | seguradoras, bancos, financiamento | R$ 800.000 |
| **Total** | | **≈ R$ 3,96 milhões / mês** |

**Receita anual (ARR): ≈ R$ 47,5 milhões**

---

## 5. Custo estimado (sem programadores — manutenção por *vibe coding*)

A premissa central é que **não há folha de engenharia**: a evolução e a manutenção são feitas
com desenvolvimento assistido por IA. Sobram custos de infraestrutura, taxas de pagamento,
dados, ferramentas e — na escala — suporte/moderação e operação.

| Custo | 10k MAU | 100k MAU | 1M MAU |
| --- | ---: | ---: | ---: |
| Infra (Vercel + Supabase) | R$ 300 | R$ 4.000 | R$ 35.000 |
| Taxa de pagamento (~5% da receita) | R$ 1.360 | R$ 18.000 | R$ 198.000 |
| Dados / APIs (FIPE, etc.) | R$ 300 | R$ 2.000 | R$ 15.000 |
| Ferramentas de IA (vibe coding) | R$ 1.000 | R$ 2.000 | R$ 5.000 |
| Suporte / moderação / operação | — | R$ 12.000 | R$ 80.000 |
| Diversos (domínio, jurídico, e-mail) | R$ 200 | R$ 2.000 | R$ 20.000 |
| **Custo total / mês** | **≈ R$ 3.200** | **≈ R$ 40.000** | **≈ R$ 353.000** |

### Resultado operacional

| | 10k MAU | 100k MAU | 1M MAU |
| --- | ---: | ---: | ---: |
| Receita / mês | R$ 27.000 | R$ 363.000 | R$ 3.960.000 |
| Custo / mês | R$ 3.200 | R$ 40.000 | R$ 353.000 |
| **Lucro operacional / mês** | **≈ R$ 23.800** | **≈ R$ 323.000** | **≈ R$ 3.607.000** |
| **Margem** | **~88%** | **~89%** | **~91%** |

> ⚠️ **O que não está incluído: marketing / aquisição (CAC).** O custo de infraestrutura é
> baixo; o verdadeiro investimento está em **trazer o usuário**. Chegar a 100k ou 1M de MAU
> exige mídia paga, conteúdo e crescimento orgânico. A margem operacional de ~90% mostra que o
> negócio, uma vez com a base construída, é uma máquina de caixa — mas o caminho até lá é
> financiado por marketing, não por engenharia.

---

## 6. Valuation

Marketplaces de software com recorrência e margem alta são avaliados por **múltiplo de receita
anual (ARR)** na fase de crescimento e por **múltiplo de lucro (EBITDA)** quando maduros e
lucrativos. Faixas usuais no mercado brasileiro/LatAm: **3–6× ARR** (crescimento) e **8–15×
EBITDA** (lucro consolidado). Efeito de rede e defensividade puxam o múltiplo para cima.

| Cenário | ARR | Múltiplo (receita) | Valuation estimado |
| --- | ---: | :---: | ---: |
| **A — 10k MAU** | R$ 327 mil | 3–5× | **R$ 1,0 – 1,6 milhão** |
| **B — 100k MAU** | R$ 4,4 mi | 4–6× | **R$ 17 – 26 milhões** |
| **C — 1M MAU** | R$ 47,5 mi | 5–8× | **R$ 240 – 380 milhões** |

**Leitura:**
- No **cenário A**, a Catire já é um negócio validado e lucrativo — patamar de "produto que
  funciona", atraente para um primeiro aporte anjo/seed.
- No **cenário B**, entra no radar de fundos de *venture capital*: R$ 4M+ de ARR com ~90% de
  margem é um ativo de dezenas de milhões.
- No **cenário C**, com efeito de rede consolidado e liderança de categoria, a empresa está na
  faixa das **centenas de milhões** — território de rodada Série B/C ou aquisição estratégica
  por um grande player automotivo ou de classificados.

---

## 7. Síntese

| | 10k MAU | 100k MAU | 1M MAU |
| --- | ---: | ---: | ---: |
| Receita / mês | R$ 27 mil | R$ 363 mil | R$ 3,96 mi |
| Receita / ano (ARR) | R$ 327 mil | R$ 4,4 mi | R$ 47,5 mi |
| Custo / mês (sem devs) | R$ 3,2 mil | R$ 40 mil | R$ 353 mil |
| Lucro operacional / mês | R$ 23,8 mil | R$ 323 mil | R$ 3,6 mi |
| Margem | ~88% | ~89% | ~91% |
| Valuation | R$ 1–1,6 mi | R$ 17–26 mi | R$ 240–380 mi |

A Catire combina os três ingredientes de um negócio de alto valor: **receita recorrente**,
**margem de software (~90%)** e um **fosso competitivo por efeito de rede**. Com uma estrutura
enxuta — sem folha de engenharia, manutenção por vibe coding — o gargalo deixa de ser o custo
de operar e passa a ser exclusivamente o de **conquistar usuários**. Resolvido esse ponto, cada
degrau de escala multiplica receita e valuation de forma desproporcional ao custo.

> *Premissas de preço e conversão são estimativas de trabalho e devem ser calibradas com dados
> reais de mercado e de tração da plataforma.*
