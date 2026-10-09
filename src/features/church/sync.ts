import { callFunction, supabase } from '../../lib/supabase'
import type { SyncOp } from '../../lib/sync'
import { isUuid } from '../../lib/uuid'
import type { Accessibility, Church, Course, Ministry, Service } from './data'

// Igreja, ministérios e cursos no banco.
// Igreja do CNPJ: nome e endereço vêm da Receita, pelo servidor. Quem a cadastrou à mão informa horários e acessibilidade.
// Igreja do CNPJ ainda não tem quem edite horários e acessibilidade no servidor (CLAUDE.md, EM ABERTO): ficam no aparelho.
// Ministérios e cursos são da própria pessoa. Arquivos (certificado, materiais) ficam só no aparelho.

export type ChurchRelation = 'frequento' | 'visito'
export interface SyncedChurch {
  churches: { church: Church; relation: ChurchRelation }[]
  ministries: Ministry[]
  courses: Course[]
}

type Row = {
  id: string
  cnpj: string | null
  name: string
  address: string | null
  neighborhood: string | null
  city: string | null
  denomination?: string | null
  created_by?: string | null
  church_services?: { id: string; weekday: number; time: string }[]
  church_accessibility?: AccessRow | AccessRow[] | null
}
type AccessRow = { libras: boolean | null; ramp: boolean | null; audio_description: boolean | null; reserved: boolean | null; libras_services: string | null; updated_at: string }

const SELECT = 'id, cnpj, name, address, neighborhood, city, denomination, created_by, church_services(id, weekday, time), church_accessibility(libras, ramp, audio_description, reserved, libras_services, updated_at)'

export function formatCnpj(d: string) {
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d
}

export function rowToChurch(r: Row, uid: string | null): Church {
  const a = Array.isArray(r.church_accessibility) ? r.church_accessibility[0] : r.church_accessibility
  const accessibility: Accessibility = {}
  if (a) {
    if (a.libras != null) accessibility.libras = a.libras
    if (a.ramp != null) accessibility.ramp = a.ramp
    if (a.reserved != null) accessibility.reserved = a.reserved
    if (a.audio_description != null) accessibility.audiodesc = a.audio_description
    if (a.libras_services) accessibility.librasServices = a.libras_services
    accessibility.updatedAt = String(a.updated_at).slice(0, 10)
  }
  return {
    id: r.id,
    name: r.name,
    city: r.city ?? '',
    neighborhood: r.neighborhood ?? '',
    address: r.address ?? '',
    ...(r.cnpj ? { cnpj: formatCnpj(r.cnpj) } : {}),
    ...(r.denomination ? { denomination: r.denomination } : {}),
    source: r.cnpj ? 'cnpj' : 'manual',
    ...(r.created_by && r.created_by === uid ? { mine: true } : {}),
    services: (r.church_services ?? []).map((s) => ({ id: s.id, day: s.weekday, time: s.time })).sort((x, y) => x.day - y.day || x.time.localeCompare(y.time)),
    accessibility,
    events: [],
  }
}

export type SearchResult = { kind: 'ok'; list: Church[] } | { kind: 'invalid' | 'not_found' | 'not_religious' | 'inactive' | 'failed' }

/** CNPJ completo: busca nos dados da Receita pelo servidor. Texto: procura entre as igrejas já no app. */
export async function searchChurches(q: string, uid: string | null): Promise<SearchResult> {
  if (!supabase) return { kind: 'failed' }
  const digits = q.replace(/\D/g, '')
  if (digits.length === 14) {
    try {
      const r = await callFunction<{ kind: string; church?: Row }>('church-lookup', { cnpj: digits })
      if (r.kind === 'found' && r.church) return { kind: 'ok', list: [rowToChurch({ ...r.church }, uid)] }
      if (r.kind === 'invalid' || r.kind === 'not_found' || r.kind === 'not_religious' || r.kind === 'inactive') return { kind: r.kind }
      return { kind: 'failed' }
    } catch {
      return { kind: 'failed' }
    }
  }
  const text = q.replace(/[%,()*\\]/g, ' ').trim()
  if (text.length < 2) return { kind: 'ok', list: [] }
  const { data, error } = await supabase.from('churches').select(SELECT).or(`name.ilike.%${text}%,city.ilike.%${text}%`).limit(20)
  if (error) return { kind: 'failed' }
  return { kind: 'ok', list: ((data ?? []) as unknown as Row[]).map((r) => rowToChurch(r, uid)) }
}

/** Uma igreja pelo id, para a tela de confirmar. */
export async function fetchChurch(id: string, uid: string | null): Promise<Church | null> {
  if (!supabase || !isUuid(id)) return null
  const { data, error } = await supabase.from('churches').select(SELECT).eq('id', id).maybeSingle()
  return error || !data ? null : rowToChurch(data as unknown as Row, uid)
}

const servicesKey = (s: Service[]) => JSON.stringify(s.map((x) => [x.day, x.time]))
const accessKey = (a: Accessibility) => JSON.stringify([a.libras, a.ramp, a.reserved, a.audiodesc, a.librasServices ?? null])

/** Sem os caminhos de arquivo do aparelho, que não servem em outro celular. */
export function courseData(c: Course) {
  const { id: _id, certificate, lessons, ...rest } = c
  return {
    ...rest,
    ...(certificate ? { certificate: { name: certificate.name, uri: '' } } : {}),
    lessons: lessons.map((l) => ({ ...l, materials: l.materials.map((m) => ({ ...m, uri: '' })) })),
  }
}

export function ministryData(m: Ministry) {
  const { id: _id, ...rest } = m
  return rest
}

export function churchDiffOps(prev: SyncedChurch, next: SyncedChurch): SyncOp[] {
  const ops: SyncOp[] = []
  const before = new Map(prev.churches.map((x) => [x.church.id, x]))
  const after = new Map(next.churches.map((x) => [x.church.id, x]))
  for (const x of next.churches) {
    const c = x.church
    if (!isUuid(c.id)) continue
    const old = before.get(c.id)
    // Igreja cadastrada à mão por esta pessoa: vai inteira (a regra do banco confere quem cadastrou).
    if (c.source === 'manual' && c.mine && (!old || old.church !== c)) {
      if (!old || old.church.name !== c.name || old.church.city !== c.city || old.church.address !== c.address || old.church.neighborhood !== c.neighborhood || old.church.denomination !== c.denomination)
        ops.push({ kind: 'upsert', table: 'churches', row: { id: c.id, name: c.name, city: c.city || null, neighborhood: c.neighborhood || null, address: c.address || null, denomination: c.denomination ?? null, created_by: '$uid' } })
      if (!old || servicesKey(old.church.services) !== servicesKey(c.services)) {
        ops.push({ kind: 'delete', table: 'church_services', match: { church_id: c.id } })
        if (c.services.length) ops.push({ kind: 'upsert', table: 'church_services', row: c.services.map((s) => ({ church_id: c.id, weekday: s.day, time: s.time, created_by: '$uid' })) })
      }
      if (!old || accessKey(old.church.accessibility) !== accessKey(c.accessibility)) {
        const a = c.accessibility
        ops.push({ kind: 'upsert', table: 'church_accessibility', row: { church_id: c.id, libras: a.libras ?? null, ramp: a.ramp ?? null, reserved: a.reserved ?? null, audio_description: a.audiodesc ?? null, libras_services: a.librasServices ?? null, updated_by: '$uid' } })
      }
    }
    if (!old || old.relation !== x.relation) ops.push({ kind: 'upsert', table: 'user_churches', row: { user_id: '$uid', church_id: c.id, is_main: x.relation === 'frequento' } })
  }
  for (const x of prev.churches) if (isUuid(x.church.id) && !after.has(x.church.id)) ops.push({ kind: 'delete', table: 'user_churches', match: { user_id: '$uid', church_id: x.church.id } })

  const list = <T extends { id: string }>(a: T[], b: T[], table: string, data: (x: T) => unknown) => {
    const pa = new Map(a.map((x) => [x.id, x]))
    const nb = new Set(b.map((x) => x.id))
    for (const x of b) if (isUuid(x.id) && pa.get(x.id) !== x) ops.push({ kind: 'upsert', table, row: { id: x.id, user_id: '$uid', data: data(x) } })
    for (const x of a) if (isUuid(x.id) && !nb.has(x.id)) ops.push({ kind: 'delete', table, match: { id: x.id, user_id: '$uid' } })
  }
  list(prev.ministries, next.ministries, 'ministries', ministryData)
  list(prev.courses, next.courses, 'courses', courseData)
  return ops
}

/** Junta o que veio do banco com o que só está no aparelho. Arquivos dos cursos continuam os do aparelho. */
export function mergeChurch(local: SyncedChurch, remote: SyncedChurch): SyncedChurch {
  const ids = new Set(remote.churches.map((x) => x.church.id))
  const localCourse = new Map(local.courses.map((c) => [c.id, c]))
  return {
    churches: [
      ...remote.churches.map((x) => {
        const l = local.churches.find((y) => y.church.id === x.church.id)?.church
        // Igreja do CNPJ: horários e acessibilidade informados no aparelho continuam (o servidor ainda não guarda).
        return l && x.church.source === 'cnpj' && !x.church.services.length ? { ...x, church: { ...x.church, services: l.services, accessibility: { ...l.accessibility, ...x.church.accessibility }, events: l.events } } : { ...x, church: { ...x.church, events: l?.events ?? [] } }
      }),
      ...local.churches.filter((x) => !isUuid(x.church.id) && !ids.has(x.church.id)),
    ],
    ministries: [...remote.ministries, ...local.ministries.filter((m) => !isUuid(m.id))],
    courses: [
      ...remote.courses.map((c) => {
        const l = localCourse.get(c.id)
        if (!l) return c
        const uriOf = new Map(l.lessons.flatMap((x) => x.materials.map((m) => [m.id, m.uri] as const)))
        return { ...c, ...(l.certificate ? { certificate: l.certificate } : {}), lessons: c.lessons.map((x) => ({ ...x, materials: x.materials.map((m) => ({ ...m, uri: uriOf.get(m.id) ?? m.uri })) })) }
      }),
      ...local.courses.filter((c) => !isUuid(c.id)),
    ],
  }
}

export async function pullChurch(uid: string): Promise<SyncedChurch | null> {
  if (!supabase) return null
  const [links, ministries, courses] = await Promise.all([
    supabase.from('user_churches').select(`is_main, churches(${SELECT})`).eq('user_id', uid),
    supabase.from('ministries').select('id, data').eq('user_id', uid),
    supabase.from('courses').select('id, data').eq('user_id', uid),
  ])
  if (links.error || ministries.error || courses.error) return null
  return {
    churches: (links.data ?? [])
      .filter((l) => l.churches)
      .map((l) => ({ church: rowToChurch((Array.isArray(l.churches) ? l.churches[0] : l.churches) as unknown as Row, uid), relation: (l.is_main ? 'frequento' : 'visito') as ChurchRelation })),
    ministries: (ministries.data ?? []).map((m) => ({ ...(m.data as Omit<Ministry, 'id'>), id: m.id })),
    courses: (courses.data ?? []).map((c) => ({ ...(c.data as Omit<Course, 'id'>), id: c.id })),
  }
}
