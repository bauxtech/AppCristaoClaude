import { File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'

// Guarda os dados do app no próprio aparelho, num arquivo da pasta do app.
// PENDENTE ANTES DA LOJA: o diário, os pedidos de oração, as notas e a fila de sincronização
// ficam aqui sem criptografia. O backup do Android está desligado (app.json, allowBackup: false).
// Precisa passar a ser guardado criptografado, com a chave no expo-secure-store (docs/revisao-externa.md).

const FILE_NAME = 'app-estado.json'

function readAll(): Record<string, unknown> {
  try {
    if (Platform.OS === 'web') {
      const raw = globalThis.localStorage?.getItem(FILE_NAME)
      return raw ? JSON.parse(raw) : {}
    }
    const f = new File(Paths.document, FILE_NAME)
    return f.exists ? JSON.parse(f.textSync()) : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, unknown>) {
  try {
    const raw = JSON.stringify(data)
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(FILE_NAME, raw)
      return
    }
    const f = new File(Paths.document, FILE_NAME)
    if (!f.exists) f.create()
    f.write(raw)
  } catch {
    // sem espaço ou armazenamento bloqueado: o app segue sem guardar
  }
}

export function getItem<T>(key: string, fallback: T): T {
  const all = readAll()
  return key in all ? (all[key] as T) : fallback
}

export function setItem(key: string, value: unknown) {
  const all = readAll()
  all[key] = value
  writeAll(all)
}
