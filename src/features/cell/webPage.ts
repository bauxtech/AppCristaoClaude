import { readBytes } from '../../lib/files'
import { supabase } from '../../lib/supabase'

// Página da célula na internet: acasa.app.br/celulas/<nome>. Decidido em 16/10.
// As regras valem no banco (check_cell_web_slug, set_cell_web_slug, set_cell_logo). Aqui só se repetem
// para avisar enquanto o líder digita.

/** Hoje só o endereço com www responde com segurança. */
export const SITE = 'https://www.acasa.app.br'
export const WEB_BASE = `${SITE}/celulas/`
export const SLUG_MIN = 3
export const SLUG_MAX = 30
/** Logo: o banco aceita até 1 MB. */
export const LOGO_MAX_BYTES = 1024 * 1024

export type SlugStatus = 'ok' | 'invalid' | 'reserved' | 'blocked' | 'taken' | 'no_access' | 'failed'

export const SLUG_MESSAGE: Record<Exclude<SlugStatus, 'ok'>, string> = {
  invalid: `Use de ${SLUG_MIN} a ${SLUG_MAX} letras sem acento, números e hífen. Sem hífen no começo, no fim ou dois seguidos.`,
  reserved: 'Este endereço é reservado pelo acasa. Escolha outro.',
  blocked: 'Este endereço não é permitido. Escolha outro.',
  taken: 'Este endereço já é de outra célula. Escolha outro.',
  no_access: 'Só o líder de uma célula ativa muda o endereço.',
  failed: 'Não foi possível conferir agora. Confira a internet e tente de novo.',
}

export function webUrl(slug: string) {
  return `${WEB_BASE}${slug}`
}

/** Link pelo código de convite: vale para toda célula, inclusive a que ainda não tem endereço próprio. */
export function codeUrl(code: string) {
  return `${SITE}/c/${code}`
}

/** O link público da célula: o endereço próprio, ou o do código enquanto o líder não escolhe. */
export function publicUrl(cell: { webSlug?: string | null; code: string }) {
  return cell.webSlug ? webUrl(cell.webSlug) : codeUrl(cell.code)
}

/** Nome da célula → sugestão de endereço: "Célula dos Jovens!" vira "celula-dos-jovens". */
export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
}

/** Enquanto a pessoa digita: deixa só o que o endereço aceita. */
export function cleanSlugInput(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, SLUG_MAX)
}

/** Mesma regra do banco para o formato. Palavras reservadas e palavrões o banco confere. */
export function slugFormatOk(slug: string) {
  return new RegExp(`^[a-z0-9][a-z0-9-]{${SLUG_MIN - 2},${SLUG_MAX - 2}}[a-z0-9]$`).test(slug) && !slug.includes('--')
}

const STATUSES: SlugStatus[] = ['ok', 'invalid', 'reserved', 'blocked', 'taken', 'no_access']
const asStatus = (v: unknown): SlugStatus => (STATUSES.includes(v as SlugStatus) ? (v as SlugStatus) : 'failed')

/** O endereço está livre para esta célula? Sem célula (ainda criando), confere para uma célula nova. */
export async function checkSlugRemote(slug: string, cellId?: string): Promise<SlugStatus> {
  if (!slugFormatOk(slug)) return 'invalid'
  if (!supabase) return 'ok'
  const { data, error } = await supabase.rpc('check_cell_web_slug', { p_slug: slug, p_cell: cellId ?? null })
  return error ? 'failed' : asStatus(data)
}

export async function setSlugRemote(cellId: string, slug: string): Promise<SlugStatus> {
  if (!slugFormatOk(slug)) return 'invalid'
  if (!supabase) return 'ok'
  const { data, error } = await supabase.rpc('set_cell_web_slug', { p_cell: cellId, p_slug: slug })
  return error ? 'failed' : asStatus(data)
}

export function logoPublicUrl(path: string | null | undefined) {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL
  return path && base ? `${base}/storage/v1/object/public/cell-logos/${path}` : null
}

export type LogoResult = { ok: true; path: string | null; url: string | null } | { ok: false; reason: 'too_big' | 'no_access' | 'failed' }

const EXT: Record<string, 'jpg' | 'png' | 'webp'> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Imagens da página pública: o logo e a capa, no balde público cell-logos. */
export type PageImage = 'logo' | 'capa'
const SETTER: Record<PageImage, string> = { logo: 'set_cell_logo', capa: 'set_cell_cover' }

/** O banco não apaga arquivo: o app apaga a imagem antiga pela API do Storage. Se falhar, sobra só um arquivo sem uso. */
async function removeOld(oldPath: string | null | undefined, keep: string | null) {
  if (!supabase || !oldPath || oldPath === keep) return
  await supabase.storage.from('cell-logos').remove([oldPath])
}

/** Envia o logo ou a capa para a pasta da célula e põe na página. */
export async function uploadPageImageRemote(kind: PageImage, cellId: string, uri: string, mimeType: string, oldPath?: string | null): Promise<LogoResult> {
  if (!supabase) return { ok: true, path: null, url: uri }
  const ext = EXT[mimeType] ?? 'jpg'
  const bytes = await readBytes(uri)
  if (!bytes) return { ok: false, reason: 'failed' }
  if (bytes.byteLength > LOGO_MAX_BYTES) return { ok: false, reason: 'too_big' }
  // Nome novo a cada envio: a página não mostra a imagem antiga guardada pelo navegador.
  const path = `${cellId}/${kind}-${Date.now().toString(36)}.${ext}`
  const up = await supabase.storage.from('cell-logos').upload(path, bytes, { contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}` })
  if (up.error) return { ok: false, reason: 'failed' }
  const { data, error } = await supabase.rpc(SETTER[kind], { p_cell: cellId, p_path: path })
  if (error || data !== 'ok') {
    await supabase.storage.from('cell-logos').remove([path])
    return { ok: false, reason: data === 'no_access' ? 'no_access' : 'failed' }
  }
  await removeOld(oldPath, path)
  return { ok: true, path, url: logoPublicUrl(path) }
}

export async function removePageImageRemote(kind: PageImage, cellId: string, oldPath?: string | null): Promise<'ok' | 'no_access' | 'failed'> {
  if (!supabase) return 'ok'
  const { data, error } = await supabase.rpc(SETTER[kind], { p_cell: cellId, p_path: null })
  if (error) return 'failed'
  if (data === 'ok') await removeOld(oldPath, null)
  return data === 'ok' ? 'ok' : data === 'no_access' ? 'no_access' : 'failed'
}

export const uploadLogoRemote = (cellId: string, uri: string, mimeType: string, oldPath?: string | null) => uploadPageImageRemote('logo', cellId, uri, mimeType, oldPath)
export const removeLogoRemote = (cellId: string, oldPath?: string | null) => removePageImageRemote('logo', cellId, oldPath)

/** Iniciais do nome da célula para quando não há logo (QA de 20/10): "Jovens da Central" vira "JC"; uma palavra, a primeira letra. */
export function cellInitials(name: string) {
  const words = name.trim().split(/\s+/).filter((w) => w && !/^(da|de|do|das|dos|e)$/i.test(w))
  if (!words.length) return '?'
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase()
}
