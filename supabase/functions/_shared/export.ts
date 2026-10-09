// "Baixar meus dados" (LGPD): tudo o que o servidor guarda da pessoa, num arquivo só.
// A leitura é feita como a própria pessoa: as regras do banco garantem que só sai o que é dela.

/** Tabela e a coluna que diz de quem é a linha. */
export const EXPORT_TABLES: [table: string, owner: string][] = [
  ['profiles', 'id'],
  ['subscriptions', 'user_id'],
  ['activity_days', 'user_id'],
  ['bible_reads', 'user_id'],
  ['bible_highlights', 'user_id'],
  ['bible_favorites', 'user_id'],
  ['bible_notes', 'user_id'],
  ['reading_plans', 'user_id'],
  ['plan_progress', 'user_id'],
  ['notes', 'user_id'],
  ['milestones', 'user_id'],
  ['prayer_diary', 'user_id'],
  ['prayer_requests', 'user_id'],
  ['prayer_campaigns', 'user_id'],
  ['prayer_prayed', 'user_id'],
  ['chat_conversations', 'user_id'],
  ['chat_messages', 'user_id'],
  ['sermons', 'user_id'],
  ['user_churches', 'user_id'],
  ['ministries', 'user_id'],
  ['courses', 'user_id'],
  ['saved_events', 'user_id'],
  ['favorite_songs', 'user_id'],
  ['cell_members', 'user_id'],
  ['cell_attendance', 'user_id'],
  ['cell_rsvps', 'user_id'],
  ['cell_poll_votes', 'user_id'],
  ['cell_board', 'author_id'],
  ['cell_rides', 'driver_id'],
  ['ride_requests', 'user_id'],
  ['hidden_content', 'user_id'],
  ['notifications', 'user_id'],
  ['blocks', 'blocker_id'],
]

/** Lidas pelo servidor, filtradas pela pessoa: o app não lê essas tabelas direto (denúncias). */
export const ADMIN_EXPORT_TABLES: [table: string, owner: string][] = [['reports', 'reporter_id']]

/** Campos que não fazem sentido para a pessoa nem devem sair (endereço técnico do aparelho). */
export const SKIP_TABLES = new Set(['push_tokens', 'usage_counters'])

export function exportFile(uid: string, parts: Record<string, unknown[]>, now = new Date()) {
  return {
    app: 'App Cristão',
    gerado_em: now.toISOString(),
    conta: uid,
    observacao: 'Dados guardados no servidor. Áudios e arquivos guardados só no celular não entram neste arquivo.',
    dados: parts,
  }
}
