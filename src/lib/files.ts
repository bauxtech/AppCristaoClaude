import { File } from 'expo-file-system'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Arquivos no Supabase Storage. Todos os baldes são privados: para mostrar, o app pede um link temporário.

/** Lê o arquivo do aparelho. Devolve null se ele não existe mais. */
export async function readBytes(uri: string): Promise<ArrayBuffer | null> {
  try {
    if (Platform.OS === 'web' || /^(blob|data|https?):/.test(uri)) return await (await fetch(uri)).arrayBuffer()
    const f = new File(uri)
    if (!f.exists) return null
    return await f.arrayBuffer()
  } catch {
    return null
  }
}

/** Link que vale por 7 dias para mostrar um arquivo privado. Null se não há servidor ou permissão. */
export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  if (!supabase || !path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 7 * 24 * 3600)
  return error ? null : data.signedUrl
}

/** Tipo do arquivo pelo nome, para o Storage servir certo. */
export function contentTypeOf(name: string) {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', heic: 'image/heic' }[ext] ?? 'application/octet-stream'
}
