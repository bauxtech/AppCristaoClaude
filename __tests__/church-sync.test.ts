import { churchDiffOps, courseData, mergeChurch, rowToChurch, withOwnInfo } from '../src/features/church/sync'
import type { Church, Course } from '../src/features/church/data'
import { uuid } from '../src/lib/uuid'

const empty = { churches: [], ministries: [], courses: [] }
const base = (over: Partial<Church> = {}): Church => ({ id: uuid(), name: 'Igreja', city: 'Recife, PE', neighborhood: '', address: '', source: 'cnpj', services: [], accessibility: {}, events: [], ...over })

test('igreja do CNPJ: vincular vai só para a lista da pessoa', () => {
  const c = base({ services: [{ id: 's', day: 0, time: '09:00' }] })
  const ops = churchDiffOps(empty, { ...empty, churches: [{ church: c, relation: 'frequento' }] })
  expect(ops).toEqual([{ kind: 'upsert', table: 'user_churches', row: { user_id: '$uid', church_id: c.id, is_main: true } }])
})

test('igreja cadastrada à mão pela pessoa vai inteira, com horários e acessibilidade', () => {
  const c = base({ source: 'manual', mine: true, services: [{ id: 's', day: 3, time: '19:30' }], accessibility: { libras: true, librasServices: 'Quarta' } })
  const ops = churchDiffOps(empty, { ...empty, churches: [{ church: c, relation: 'visito' }] })
  expect(ops.map((o) => (o.kind === 'rpc' ? o.fn : `${o.kind}:${o.table}`))).toEqual(['upsert:churches', 'delete:church_services', 'upsert:church_services', 'upsert:church_accessibility', 'upsert:user_churches'])
})

test('tirar a igreja da lista apaga só o vínculo da pessoa', () => {
  const c = base()
  const prev = { ...empty, churches: [{ church: c, relation: 'visito' as const }] }
  expect(churchDiffOps(prev, empty)).toEqual([{ kind: 'delete', table: 'user_churches', match: { user_id: '$uid', church_id: c.id } }])
})

test('curso vai sem os caminhos de arquivo do celular', () => {
  const c: Course = { id: uuid(), name: 'Discipulado', type: 'Curso', cards: [], certificate: { name: 'cert.pdf', uri: 'file:///cert.pdf' }, lessons: [{ id: 'l1', title: 'Aula 1', date: '2026-10-10', time: '09:00', notes: '', materials: [{ id: 'm1', name: 'a.pdf', kind: 'PDF', uri: 'file:///a.pdf' }] }] }
  const d = courseData(c) as { certificate: { uri: string }; lessons: { materials: { uri: string }[] }[] }
  expect(d.certificate.uri).toBe('')
  expect(d.lessons[0].materials[0].uri).toBe('')
  const merged = mergeChurch({ ...empty, courses: [c] }, { ...empty, courses: [{ ...c, ...(d as object), id: c.id } as Course] })
  expect(merged.courses[0].lessons[0].materials[0].uri).toBe('file:///a.pdf')
  expect(merged.courses[0].certificate?.uri).toBe('file:///cert.pdf')
})

test('igreja do banco: CNPJ formatado, acessibilidade sem informação fica vazia, cadastrada pela pessoa fica marcada', () => {
  const r = rowToChurch({ id: 'x', cnpj: '11222333000181', name: 'Igreja', address: null, neighborhood: null, city: 'Recife, PE', church_services: [], church_accessibility: null }, 'u')
  expect(r.cnpj).toBe('11.222.333/0001-81')
  expect(r.accessibility).toEqual({})
  const m = rowToChurch({ id: 'y', cnpj: null, name: 'Bairro', address: null, neighborhood: null, city: null, created_by: 'u', church_accessibility: [{ libras: true, ramp: null, audio_description: null, reserved: null, libras_services: null, updated_at: '2026-10-09T00:00:00Z' }] }, 'u')
  expect(m).toMatchObject({ source: 'manual', mine: true, accessibility: { libras: true, updatedAt: '2026-10-09' } })
})

test('igreja do CNPJ: horários e acessibilidade que a pessoa muda vão para o vínculo dela, não para a igreja', () => {
  const c = base()
  const prev = { ...empty, churches: [{ church: c, relation: 'frequento' as const }] }
  const edited = { ...c, services: [{ id: 's', day: 0, time: '18:00' }], accessibility: { libras: true } }
  const ops = churchDiffOps(prev, { ...empty, churches: [{ church: edited, relation: 'frequento' }] })
  expect(ops).toEqual([{ kind: 'upsert', table: 'user_churches', row: { user_id: '$uid', church_id: c.id, is_main: true, services: [{ day: 0, time: '18:00' }], accessibility: { libras: true } } }])
})

test('igreja cadastrada à mão por outra pessoa: o que esta pessoa muda fica só com ela', () => {
  const c = base({ source: 'manual' })
  const prev = { ...empty, churches: [{ church: c, relation: 'visito' as const }] }
  const ops = churchDiffOps(prev, { ...empty, churches: [{ church: { ...c, accessibility: { ramp: true } }, relation: 'visito' }] })
  expect(ops.map((o) => (o.kind === 'rpc' ? o.fn : `${o.kind}:${o.table}`))).toEqual(['upsert:user_churches'])
})

test('o que a pessoa guardou para ela aparece no lugar dos dados gerais', () => {
  const c = base({ services: [{ id: 'g', day: 0, time: '09:00' }], accessibility: { libras: false } })
  expect(withOwnInfo(c, {})).toEqual(c)
  const own = withOwnInfo(c, { services: [{ day: 3, time: '20:00' }, { day: 0, time: '18:00' }], accessibility: { libras: true } })
  expect(own.services.map((x) => [x.day, x.time])).toEqual([[0, '18:00'], [3, '20:00']])
  expect(own.accessibility).toEqual({ libras: true })
})
