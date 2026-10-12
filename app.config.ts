import type { ConfigContext, ExpoConfig } from 'expo/config'

// Lê o app.json e acrescenta o que vem das variáveis do EAS.
// google-services.json (Firebase, avisos no Android) não fica no repositório: o EAS entrega o arquivo
// pela variável GOOGLE_SERVICES_JSON, do tipo arquivo. Sem ela, o app compila sem avisos do servidor.
// Se o arquivo for de outro identificador (ex.: o antigo com.bauxtech.appcristao), o build falharia: o app compila sem ele.

// O app.config roda no Node (EAS), não no celular: lê o arquivo com o fs do Node.
declare const require: (name: 'fs') => { existsSync(path: string): boolean; readFileSync(path: string, enc: 'utf8'): string }
const { existsSync, readFileSync } = require('fs')

/** O arquivo do Firebase tem um app Android com este identificador. */
export function firebaseHasPackage(file: string, pkg: string | undefined) {
  if (!pkg || !existsSync(file)) return false
  try {
    const json = JSON.parse(readFileSync(file, 'utf8')) as { client?: { client_info?: { android_client_info?: { package_name?: string } } }[] }
    return (json.client ?? []).some((c) => c.client_info?.android_client_info?.package_name === pkg)
  } catch {
    return false
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServices = process.env.GOOGLE_SERVICES_JSON
  const usable = !!googleServices && firebaseHasPackage(googleServices, config.android?.package)
  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(usable ? { googleServicesFile: googleServices } : {}) },
  }
}
