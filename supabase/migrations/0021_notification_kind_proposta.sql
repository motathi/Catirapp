-- Novo tipo de notificação para propostas de catira.
-- Separado da migração 0022 porque um novo valor de enum não pode ser usado
-- na mesma transação em que é criado.
alter type notification_kind add value if not exists 'proposta';
