import { File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'

// Guarda pequenos dados do app no próprio aparelho (preferências, rascunho do cadastro).
// Dado sensível (fé, pedidos de oração) não fica aqui: vai para o banco com regras de acesso.

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
