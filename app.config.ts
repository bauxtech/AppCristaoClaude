import type { ConfigContext, ExpoConfig } from 'expo/config'

// Lê o app.json e acrescenta o que vem das variáveis do EAS.
// google-services.json (Firebase, avisos no Android) não fica no repositório: o EAS entrega o arquivo
// pela variável GOOGLE_SERVICES_JSON, do tipo arquivo. Sem ela, o app compila sem avisos do servidor.
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServices = process.env.GOOGLE_SERVICES_JSON
  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(googleServices ? { googleServicesFile: googleServices } : {}) },
  }
}
