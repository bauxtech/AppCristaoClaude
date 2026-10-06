// Gera os arquivos do texto bíblico que vão dentro do app, um por livro.
// Uso: node scripts/build-bible.mjs <arquivo-fonte.json> <id-da-tradução>
// Fonte da v1: PorBLivre.json de github.com/scrollmapper/bible_databases (formats/json),
// texto da Bíblia Livre, licença Creative Commons Atribuição. Ver src/features/bible/translations.ts.
//
// Saída: src/features/bible/data/<id>/<slug>.json, um array de capítulos, cada um com o texto dos versículos em ordem.
// Versículo vazio fica como "": a tradução juntou o texto dele ao anterior (ex.: Salmos 46:2-3).
// Também gera supabase/seed/bible_<id>.sql, usado pelo chat no servidor para citar o mesmo texto do app.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [src, id] = process.argv.slice(2)
if (!src || !id) {
  console.error('Uso: node scripts/build-bible.mjs <arquivo-fonte.json> <id-da-tradução>')
  process.exit(1)
}

// Mesma regra de slugify em src/features/bible/books.ts.
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const booksTs = readFileSync(join(root, 'src/features/bible/books.ts'), 'utf8')
const names = [...booksTs.matchAll(/\{ name: '([^']+)', abbr: '[^']+', chapters: (\d+)/g)].map((m) => ({ name: m[1], chapters: Number(m[2]) }))
if (names.length !== 66) throw new Error(`books.ts tem ${names.length} livros, esperado 66`)

// Limpeza mínima: tira marcação de nota de rodapé que veio no arquivo (ex.: Dt 32:5) e espaços sobrando.
const clean = (t) =>
  t
    .replace(/\/fn\/key.*?\/\*fn\s*/g, ' ')
    .replace(/´/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const data = JSON.parse(readFileSync(src, 'utf8'))
if (data.books.length !== 66) throw new Error('A fonte precisa ter 66 livros')

const outDir = join(root, 'src/features/bible/data', id)
mkdirSync(outDir, { recursive: true })
const sql = [`-- Gerado por scripts/build-bible.mjs. Texto: ver src/features/bible/translations.ts (${id}).`, `delete from public.bible_verses where translation = '${id}';`]
let total = 0
const index = []

data.books.forEach((book, i) => {
  const info = names[i]
  if (book.chapters.length !== info.chapters) throw new Error(`${info.name}: ${book.chapters.length} capítulos na fonte, ${info.chapters} no app`)
  const slug = slugify(info.name)
  const chapters = book.chapters.map((c, ci) => {
    const nums = c.verses.map((v) => v.verse)
    nums.forEach((n, k) => {
      if (n !== k + 1) throw new Error(`${info.name} ${ci + 1}: numeração fora de ordem`)
    })
    return c.verses.map((v) => clean(v.text))
  })
  writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(chapters))
  index.push(slug)
  const rows = []
  chapters.forEach((vs, ci) =>
    vs.forEach((t, vi) => {
      if (!t) return
      total++
      rows.push(`('${id}','${slug}',${ci + 1},${vi + 1},'${t.replace(/'/g, "''")}')`)
    }),
  )
  for (let k = 0; k < rows.length; k += 500) sql.push(`insert into public.bible_verses (translation, book, chapter, verse, text) values\n${rows.slice(k, k + 500).join(',\n')};`)
})

// Índice com um carregador por livro: o JSON de cada livro só é lido quando a pessoa abre o livro.
const loader = [
  '// Gerado por scripts/build-bible.mjs. Não editar à mão.',
  '/* eslint-disable */',
  'export const BOOK_DATA: Record<string, () => string[][]> = {',
  ...index.map((s) => `  '${s}': () => require('./${s}.json'),`),
  '}',
  '',
].join('\n')
writeFileSync(join(outDir, 'index.ts'), loader)

mkdirSync(join(root, 'supabase/seed'), { recursive: true })
writeFileSync(join(root, `supabase/seed/bible_${id}.sql`), sql.join('\n') + '\n')
console.log(`${id}: 66 livros, ${total} versículos com texto`)
