// A voz do Android lê no máximo 4.000 letras por vez (Speech.maxSpeechInputLength). Um capítulo longo passa disso,
// e a voz recusa sem som nenhum. O texto vai em partes, cortadas no fim de uma frase ou de um versículo.

export function speechChunks(text: string, max = 3000): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const out: string[] = []
  let rest = clean
  while (rest.length > max) {
    const slice = rest.slice(0, max)
    // Corta no último fim de frase; sem frase, no último espaço; sem espaço, no limite.
    const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '), slice.lastIndexOf('; '))
    const cut = end > max / 2 ? end + 1 : slice.lastIndexOf(' ') > 0 ? slice.lastIndexOf(' ') : max
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}
