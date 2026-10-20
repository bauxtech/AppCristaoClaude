import * as Updates from 'expo-updates'

// Atualização do app de teste sem passar pela loja. O expo-updates baixa ao abrir, mas só aplica quando o
// Android fecha o app de verdade, o que quase nunca acontece. Aqui o app procura a versão nova ao abrir e ao
// voltar para a tela, baixa e oferece "Atualizar agora", que reinicia o app já na versão nova.

/** Procura e baixa a versão nova. Devolve true quando há uma pronta para aplicar. */
export async function fetchNewVersion(): Promise<boolean> {
  if (!Updates.isEnabled || __DEV__) return false
  try {
    const check = await Updates.checkForUpdateAsync()
    if (!check.isAvailable) return false
    const got = await Updates.fetchUpdateAsync()
    return got.isNew
  } catch {
    // Sem internet ou servidor fora: tenta de novo na próxima volta ao app.
    return false
  }
}

export function applyNewVersion() {
  return Updates.reloadAsync().catch(() => {})
}

/** "19/10, 22:05": quando a versão em uso foi publicada. Vazio na versão que veio dentro do APK. */
export function currentVersionLabel(createdAt: Date | null = Updates.createdAt, embedded = Updates.isEmbeddedLaunch) {
  if (embedded || !createdAt) return 'versão do APK'
  const p = (n: number) => String(n).padStart(2, '0')
  return `atualização de ${p(createdAt.getDate())}/${p(createdAt.getMonth() + 1)}, ${p(createdAt.getHours())}:${p(createdAt.getMinutes())}`
}

export type UpdateCheck = { kind: 'ready' | 'latest' | 'off' | 'error'; message: string }

/** Procura a versão nova quando a pessoa pede, e diz o que achou, inclusive o erro. */
export async function checkUpdateNow(): Promise<UpdateCheck> {
  if (!Updates.isEnabled || __DEV__) return { kind: 'off', message: 'Atualização desligada nesta versão.' }
  try {
    const check = await Updates.checkForUpdateAsync()
    if (!check.isAvailable) return { kind: 'latest', message: 'Você já está na versão mais nova.' }
    await Updates.fetchUpdateAsync()
    return { kind: 'ready', message: 'Versão nova baixada.' }
  } catch (e) {
    return { kind: 'error', message: `Não deu para procurar: ${e instanceof Error ? e.message : String(e)}` }
  }
}
