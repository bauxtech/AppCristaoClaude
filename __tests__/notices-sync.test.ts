import { dismissOps, markReadOps, serverPrefs, toNotice } from '../src/features/settings/notices-sync'
import { defaultNotificationPrefs } from '../src/features/settings/prefs'
import { uuid } from '../src/lib/uuid'

test('só os tipos de aviso e o horário de silêncio vão para o servidor', () => {
  const p = defaultNotificationPrefs()
  expect(Object.keys(serverPrefs(p)).sort()).toEqual(['quietFrom', 'quietTo', 'types'])
})

test('marcar como lido e apagar valem só para os avisos da própria pessoa', () => {
  const id = uuid()
  const now = new Date('2026-10-08T12:00:00Z')
  expect(markReadOps([id, 'nt1'], now)).toEqual([{ kind: 'update', table: 'notifications', values: { read_at: now.toISOString() }, match: { id, user_id: '$uid' } }])
  expect(dismissOps(id)).toEqual([{ kind: 'delete', table: 'notifications', match: { id, user_id: '$uid' } }])
  expect(dismissOps('nt1')).toEqual([])
})

test('aviso do banco vira aviso da central; aviso de pedido da célula fica marcado para o visitante não ver', () => {
  const n = toNotice({ id: 'a', type: 'prayer', title: 'Novo pedido na célula', body: 'Ana compartilhou um pedido de oração.', href: '/celula/pedidos', read_at: null, created_at: '2026-10-08T12:00:00Z', cell_prayer: true })
  expect(n).toEqual({ id: 'a', type: 'prayer', title: 'Novo pedido na célula', body: 'Ana compartilhou um pedido de oração.', at: '2026-10-08T12:00:00Z', read: false, href: '/celula/pedidos', cellPrayer: true })
})
