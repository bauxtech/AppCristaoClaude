/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportação estática: a página lê os dados públicos direto do banco, pelo navegador.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
