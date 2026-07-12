-- Planos por quantidade de carros; Contato Inteligente, Match e Catira liberados.
-- Deixa de existir limite diário de contato de matching em qualquer plano, e os
-- planos passam a se diferenciar pela quantidade de carros ativos anunciados.

-- Contato Inteligente, Match e Catira deixam de ter limite diário.
update plans set daily_match_contacts = null;

-- Gratuito: 1 carro ativo, sem limite mensal (só o teto de ativos importa agora).
update plans
  set max_active_listings = 1,
      max_monthly_listings = null
  where code = 'free';

-- Renomeia o plano 'pro' para 'essencial' (até 3 carros). Como o código é a PK
-- referenciada por profiles.plan_code, insere o novo, migra os perfis e remove o antigo.
insert into plans
  (code, name, max_active_listings, max_monthly_listings, daily_match_contacts, highlight_days, feed_priority)
values
  ('essencial', 'Essencial', 3, null, null, 5, 1)
on conflict (code) do update set
  name = excluded.name,
  max_active_listings = excluded.max_active_listings,
  max_monthly_listings = excluded.max_monthly_listings,
  daily_match_contacts = excluded.daily_match_contacts,
  highlight_days = excluded.highlight_days,
  feed_priority = excluded.feed_priority;

update profiles set plan_code = 'essencial' where plan_code = 'pro';
delete from plans where code = 'pro';

-- Premium: até 8 carros.
update plans
  set name = 'Premium',
      max_active_listings = 8,
      max_monthly_listings = null,
      daily_match_contacts = null,
      highlight_days = 15,
      feed_priority = 2
  where code = 'premium';

-- Lojista (B2B): até 14 carros.
insert into plans
  (code, name, max_active_listings, max_monthly_listings, daily_match_contacts, highlight_days, feed_priority)
values
  ('lojista', 'Lojista', 14, null, null, 30, 3)
on conflict (code) do update set
  name = excluded.name,
  max_active_listings = excluded.max_active_listings,
  max_monthly_listings = excluded.max_monthly_listings,
  daily_match_contacts = excluded.daily_match_contacts,
  highlight_days = excluded.highlight_days,
  feed_priority = excluded.feed_priority;
