import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Chip, Page, SectionLabel, Segmented, Switch, TextField, useToast } from '../../../components'
import { useBible } from '../BibleContext'
import { BOOKS } from '../books'
import { readingLabel, readingsForDay, totalChapters } from '../plans'

const SHORTCUTS: { label: string; books: () => string[] }[] = [
  { label: 'Novo Testamento', books: () => BOOKS.filter((b) => b.testament === 'NT').map((b) => b.name) },
  { label: 'Antigo Testamento', books: () => BOOKS.filter((b) => b.testament === 'AT').map((b) => b.name) },
  { label: 'Evangelhos', books: () => ['Mateus', 'Marcos', 'Lucas', 'João'] },
  { label: 'Cartas de Paulo', books: () => ['Romanos', '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses', 'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo', '2 Timóteo', 'Tito', 'Filemom'] },
]

/** A pessoa monta o próprio plano: livros, duração e nome. */
export function CreatePlanScreen() {
  const toast = useToast()
  const bible = useBible()
  const [books, setBooks] = useState<string[]>([])
  const [testament, setTestament] = useState<'AT' | 'NT'>('NT')
  const [by, setBy] = useState<'dias' | 'capitulos'>('dias')
  const [amount, setAmount] = useState('30')
  const [name, setName] = useState('')
  const [start, setStart] = useState(true)

  const ordered = BOOKS.map((b) => b.name).filter((n) => books.includes(n))
  const chapters = totalChapters(ordered)
  const n = Math.max(0, Number(amount) || 0)
  const total = by === 'dias' ? Math.min(n, chapters) : n > 0 ? Math.ceil(chapters / n) : 0
  const perDay = total > 0 ? chapters / total : 0
  const valid = ordered.length > 0 && total > 0 && total <= 730
  const autoName = ordered.length === 1 ? `${ordered[0]} em ${total} dias` : ordered.length ? `${ordered[0]} a ${ordered[ordered.length - 1]} em ${total} dias` : ''
  const toggle = (b: string) => setBooks((x) => (x.includes(b) ? x.filter((y) => y !== b) : [...x, b]))
  const allSelected = (list: string[]) => list.every((b) => books.includes(b))

  return (
    <Page title="Criar meu plano">
      <SectionLabel>1. O que ler</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SHORTCUTS.map((s) => {
          const list = s.books()
          const sel = allSelected(list)
          return <Chip key={s.label} label={s.label} selected={sel} onPress={() => setBooks((x) => (sel ? x.filter((b) => !list.includes(b)) : [...new Set([...x, ...list])]))} />
        })}
      </View>
      <Segmented label="Testamento" value={testament} onChange={setTestament} options={[{ id: 'AT', label: 'Antigo Testamento' }, { id: 'NT', label: 'Novo Testamento' }]} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BOOKS.filter((b) => b.testament === testament).map((b) => (
          <Chip key={b.name} label={b.name} selected={books.includes(b.name)} onPress={() => toggle(b.name)} />
        ))}
      </View>
      <AppText variant="small" tone="secondary" accessibilityLiveRegion="polite">
        {ordered.length ? `${ordered.length} ${ordered.length === 1 ? 'livro' : 'livros'}, ${chapters} capítulos` : 'Nenhum livro escolhido'}
      </AppText>

      <SectionLabel>2. Em quanto tempo</SectionLabel>
      <Segmented label="Medida" value={by} onChange={setBy} options={[{ id: 'dias', label: 'Número de dias' }, { id: 'capitulos', label: 'Capítulos por dia' }]} />
      <TextField label={by === 'dias' ? 'Dias' : 'Capítulos por dia'} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" />
      {valid ? (
        <Card style={{ gap: 4 }}>
          <AppText variant="bodyStrong">{`${total} dias, cerca de ${perDay < 1.5 ? 1 : Math.round(perDay)} ${Math.round(perDay) === 1 || perDay < 1.5 ? 'capítulo' : 'capítulos'} por dia`}</AppText>
          <AppText variant="small" tone="secondary">{`Dia 1: ${readingLabel(readingsForDay({ books: ordered, total }, 1))}`}</AppText>
        </Card>
      ) : ordered.length && total > 730 ? (
        <AppText variant="small" tone="danger">O plano pode ter no máximo 730 dias.</AppText>
      ) : null}

      <SectionLabel>3. Nome</SectionLabel>
      <TextField label="Nome do plano" value={name} onChangeText={setName} placeholder={autoName || 'Ex.: Evangelhos em 30 dias'} maxLength={60} hint={autoName && !name ? `Se ficar em branco: ${autoName}` : undefined} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          Começar hoje
        </AppText>
        <Switch label="Começar hoje" value={start} onChange={setStart} />
      </Card>
      <Button
        label="Criar plano"
        disabled={!valid}
        onPress={() => {
          const def = bible.createPlan({ name: name.trim() || autoName, books: ordered, total }, start)
          toast('Plano criado')
          router.replace(`/biblia/plano/${def.id}`)
        }}
      />
    </Page>
  )
}
