/** @type {import('next').NextConfig} */

// Na Vercel, a página roda como Next.js normal: qualquer /celulas/<nome> e /c/<código> é montado na hora.
// STATIC_EXPORT=1 gera só arquivos prontos (prévia sem banco e Netlify, com web/public/_redirects).
const staticExport = process.env.STATIC_EXPORT === '1'

const nextConfig = {
  ...(staticExport ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: true },
}

export default nextConfig
