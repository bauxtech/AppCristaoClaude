// Quem pode o quê na célula. Regras decididas:
// - O líder aprova cada entrada.
// - O auxiliar marca presença e edita a escala.
// - O anfitrião não tem permissão a mais.
// - Telefone dos membros aparece só para o líder.
// - Visitante vê reunião, endereço e roteiro. Não vê os pedidos de oração.
// Estas regras também precisam existir no banco. Aqui elas só escondem o que a pessoa não pode ver.

export type CellRole = 'lider' | 'auxiliar' | 'anfitriao' | 'membro' | 'visitante'

export const ROLE_LABEL: Record<CellRole, string> = {
  lider: 'Líder',
  auxiliar: 'Auxiliar',
  anfitriao: 'Anfitrião',
  membro: 'Membro',
  visitante: 'Visitante',
}

export const ROLES: CellRole[] = ['lider', 'auxiliar', 'anfitriao', 'membro', 'visitante']

export type CellAction =
  | 'editCell'
  | 'invite'
  | 'approveJoin'
  | 'manageMembers'
  | 'seePhones'
  | 'editPlan'
  | 'manageAgenda'
  | 'approveSwaps'
  | 'markAttendance'
  | 'editSchedule'
  | 'postBoard'
  | 'manageMaterials'
  | 'managePlaylist'
  | 'multiply'
  | 'seeHistory'
  | 'seePrayers'
  | 'askSwap'
  | 'vote'
  | 'participate'

const LEADER_ONLY: CellAction[] = ['editCell', 'invite', 'approveJoin', 'manageMembers', 'seePhones', 'editPlan', 'manageAgenda', 'approveSwaps', 'postBoard', 'manageMaterials', 'managePlaylist', 'multiply', 'seeHistory']
const LEADER_AND_AUX: CellAction[] = ['markAttendance', 'editSchedule']
const MEMBERS: CellAction[] = ['seePrayers', 'askSwap', 'vote', 'participate']

export function can(role: CellRole | null | undefined, action: CellAction): boolean {
  if (!role) return false
  if (role === 'lider') return true
  if (LEADER_ONLY.includes(action)) return false
  if (LEADER_AND_AUX.includes(action)) return role === 'auxiliar'
  if (MEMBERS.includes(action)) return role !== 'visitante'
  return false
}
