import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { callFunction } from './supabase'
import { currentUserId } from './sync'

// "Baixar meus dados" (LGPD): o servidor junta tudo o que guarda da pessoa e o app entrega o arquivo.
// O arquivo fica na pasta temporária do app, que só o app lê. Ele não é apagado logo depois de entregue,
// porque o app que recebe (e-mail, Drive) pode ler o arquivo depois. O próximo download troca o arquivo.

export function exportFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `meus-dados-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

export async function downloadMyData(): Promise<'ok' | 'no_login' | 'failed'> {
  if (!currentUserId()) return 'no_login'
  try {
    const data = await callFunction<unknown>('export-data', {})
    const file = new File(Paths.cache, exportFileName())
    if (file.exists) file.delete()
    file.create()
    file.write(JSON.stringify(data, null, 2))
    if (!(await Sharing.isAvailableAsync())) return 'failed'
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Meus dados' })
    return 'ok'
  } catch {
    return 'failed'
  }
}
