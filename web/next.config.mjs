/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportação estática: a página lê os dados públicos direto do banco, pelo navegador.
  output: 'export',
  // O site acasa.app.br repassa /celulas e /c para este projeto. Com o endereço deste projeto aqui
  // (variável ASSET_PREFIX na Vercel), os arquivos da página vêm daqui e não do site principal.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
