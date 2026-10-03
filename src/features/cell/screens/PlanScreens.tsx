import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, ConfirmCard, IconButton, Page, SectionLabel, Tag, TextField, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useBible } from '../../bible/BibleContext'
import { planState } from '../../bible/plans'
import { useCell } from '../CellContext'
import { type Cell, type PlanSection } from '../data'
import { useSermons } from '../../sermon/SermonContext'
import { formatMeetingDay } from '../meetings'
import { CellGuard } from './Guard'

function SectionCard({ s }: { s: PlanSection }) {
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <SectionLabel>{s.title}</SectionLabel>
        <Tag label={`${s.minutes} min`} />
      </View>
      <AppText variant="body" style={{ lineHeight: 24 }}>
        {s.content || 'Sem texto ainda.'}
      </AppText>
    </Card>
  )
}

/** Roteiro completo, só leitura. Visitante também vê. */
export function PlanScreen() {
  return (
    <CellGuard title="Roteiro da reunião">
      {(cell) => (
        <Page title="Roteiro da reunião">
          {cell.planTitle ? (
            <View style={{ gap: 2 }}>
              <AppText variant="title" accessibilityRole="header">
                {cell.planTitle}
              </AppText>
              {cell.planRef ? <AppText variant="small" tone="secondary">{cell.planRef}</AppText> : null}
            </View>
          ) : null}
          {cell.plan.length === 0 ? <AppText variant="body" tone="secondary">O roteiro desta semana ainda não foi montado.</AppText> : null}
          {cell.plan.map((s) => (
            <SectionCard key={s.id} s={s} />
          ))}
          {cell.plan.length ? <AppText variant="small" tone="secondary">{`Duração total: ${cell.plan.reduce((a, s) => a + s.minutes, 0)} minutos`}</AppText> : null}
          {cell.myRole === 'lider' ? <Button label="Editar roteiro" variant="outline" onPress={() => router.push('/celula/roteiro-editar')} /> : null}
        </Page>
      )}
    </CellGuard>
  )
}

export function EditPlanScreen() {
  return <CellGuard title="Editar roteiro" action="editPlan">{(cell) => <EditPlan cell={cell} />}</CellGuard>
}

let n = 0
const sid = () => `s${Date.now().toString(36)}${n++}`

function EditPlan({ cell }: { cell: Cell }) {
  const bible = useBible()
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const [title, setTitle] = useState(cell.planTitle)
  const [ref, setRef] = useState(cell.planRef)
  const [sections, setSections] = useState<PlanSection[]>(cell.plan)
  const [start, setStart] = useState<'tema' | 'plano' | null>(null)
  const [theme, setTheme] = useState('')
  const [replace, setReplace] = useState<null | (() => void)>(null)

  const set = (id: string, patch: Partial<PlanSection>) => setSections((x) => x.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const move = (i: number, d: -1 | 1) =>
    setSections((x) => {
      const j = i + d
      if (j < 0 || j >= x.length) return x
      const y = [...x]
      ;[y[i], y[j]] = [y[j], y[i]]
      return y
    })

  function apply(next: { title: string; ref: string; sections: PlanSection[] }) {
    const go = () => {
      setTitle(next.title)
      setRef(next.ref)
      setSections(next.sections)
      setStart(null)
      setReplace(null)
    }
    if (sections.length) setReplace(() => go)
    else go()
  }

  /** Estrutura padrão da reunião, vazia, com a palavra preenchida. */
  function skeleton(word: string): PlanSection[] {
    return [
      { id: sid(), title: 'Quebra-gelo', content: '', minutes: 10 },
      { id: sid(), title: 'Louvor', content: '', minutes: 15 },
      { id: sid(), title: 'Palavra', content: word, minutes: 20 },
      { id: sid(), title: 'Perguntas para reflexão', content: '', minutes: 10 },
      { id: sid(), title: 'Oração', content: 'Pedidos do grupo.', minutes: 10 },
      { id: sid(), title: 'Avisos', content: '', minutes: 5 },
    ]
  }

  return (
    <Page title="Editar roteiro">
      <View style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Começar a partir de</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Culto gravado" icon="mic" variant="soft" size="sm" onPress={() => router.push('/celula/roteiro-culto')} />
          <Button label="Um tema" icon="edit" variant="soft" size="sm" onPress={() => setStart(start === 'tema' ? null : 'tema')} />
          <Button label="Plano de leitura" icon="book" variant="soft" size="sm" onPress={() => setStart(start === 'plano' ? null : 'plano')} />
        </View>
      </View>

      {start === 'tema' ? (
        <Card style={{ gap: 10 }}>
          <TextField label="Tema da reunião" value={theme} onChangeText={setTheme} placeholder="Ex.: Perdão" maxLength={60} />
          <AppText variant="small" tone="secondary">
            Monta a estrutura da reunião com o tema na palavra. Você completa o resto.
          </AppText>
          <Button label="Montar roteiro" disabled={!theme.trim()} onPress={() => apply({ title: theme.trim(), ref: '', sections: skeleton(`Tema: ${theme.trim()}`) })} />
        </Card>
      ) : null}

      {start === 'plano' ? (
        <Card style={{ gap: 10 }}>
          <AppText variant="small" tone="secondary">
            Escolha o plano. A leitura de hoje vira o texto base da palavra.
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {bible.plans.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={false}
                onPress={() => {
                  const r = planState(p, bible.progress[p.id]).todayLabel
                  apply({ title: p.name, ref: r, sections: skeleton(`Texto base: ${r}`) })
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {replace ? (
        <ConfirmCard title="Trocar o roteiro atual?" message="As seções que você já escreveu serão substituídas." confirmLabel="Trocar" danger={false} onCancel={() => setReplace(null)} onConfirm={replace} />
      ) : null}

      <TextField label="Título do roteiro" value={title} onChangeText={setTitle} placeholder="Ex.: Vivendo com propósito" maxLength={80} />
      <TextField label="Texto bíblico base" value={ref} onChangeText={setRef} placeholder="Ex.: João 15:1-17" maxLength={60} />

      {sections.map((s, i) => (
        <Card key={s.id} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText variant="label" tone="secondary" style={{ flex: 1 }}>{`SEÇÃO ${i + 1} DE ${sections.length}`}</AppText>
            <IconButton icon="arrowUp" label={`Subir ${s.title}`} onPress={() => move(i, -1)} />
            <IconButton icon="arrowDown" label={`Descer ${s.title}`} onPress={() => move(i, 1)} />
            <IconButton icon="trash" label={`Remover ${s.title}`} onPress={() => setSections((x) => x.filter((y) => y.id !== s.id))} />
          </View>
          <TextField label="Nome da seção" value={s.title} onChangeText={(v) => set(s.id, { title: v })} maxLength={40} />
          <TextField label={`Conteúdo de ${s.title || 'seção'}`} value={s.content} onChangeText={(v) => set(s.id, { content: v })} multiline maxLength={1000} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="body" style={{ flex: 1 }}>{`Duração: ${s.minutes} min`}</AppText>
            <Pressable onPress={() => set(s.id, { minutes: Math.max(5, s.minutes - 5) })} accessibilityRole="button" accessibilityLabel={`Diminuir duração de ${s.title}`} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }}>
              <AppText style={{ color: colors.primary, fontSize: 22 }}>−</AppText>
            </Pressable>
            <Pressable onPress={() => set(s.id, { minutes: Math.min(90, s.minutes + 5) })} accessibilityRole="button" accessibilityLabel={`Aumentar duração de ${s.title}`} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }}>
              <AppText style={{ color: colors.primary, fontSize: 22 }}>+</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
      {sections.length === 0 ? <AppText variant="body" tone="secondary">Nenhuma seção ainda. Comece por um culto, um tema ou um plano, ou acrescente uma seção.</AppText> : null}
      <Button label="Acrescentar seção" icon="plus" variant="outline" onPress={() => setSections((x) => [...x, { id: sid(), title: 'Nova seção', content: '', minutes: 10 }])} />
      <Button
        label="Salvar roteiro"
        onPress={() => {
          update((c) => ({ ...c, plan: sections.filter((s) => s.title.trim()), planTitle: title.trim(), planRef: ref.trim() }))
          toast('Roteiro salvo')
          router.back()
        }}
      />
    </Page>
  )
}

/** Escolher um culto gravado: a pregação vira a base do roteiro. */
export function ChooseRecordingScreen() {
  const { sermons } = useSermons()
  const ready = sermons.filter((s) => s.status === 'ready')
  return (
    <CellGuard title="Escolher culto" action="editPlan">
      {() => (
        <Page title="Escolher culto">
          {ready.length === 0 ? (
            <>
              <AppText variant="body" tone="secondary">
                Você ainda não gravou nenhum culto. Grave a próxima pregação e depois monte o roteiro a partir dela.
              </AppText>
              <Button label="Gravar culto" icon="mic" onPress={() => router.push('/culto/gravar')} />
            </>
          ) : (
            <AppText variant="body" tone="secondary">
              Escolha o culto. O resultado abre e você toca em "Transformar em roteiro da célula".
            </AppText>
          )}
          {ready.map((r) => (
            <Card key={r.id} style={{ paddingVertical: 4 }}>
              <Pressable onPress={() => router.push({ pathname: '/culto/[id]', params: { id: r.id } })} accessibilityRole="button" accessibilityLabel={`${r.theme}, ${r.preacher ? `${r.preacher}, ` : ''}${formatMeetingDay(r.date)}`} style={{ minHeight: 64, justifyContent: 'center', gap: 2 }}>
                <AppText variant="bodyStrong">{r.theme || 'Culto sem tema'}</AppText>
                <AppText variant="small" tone="secondary">{[r.preacher, formatMeetingDay(r.date)].filter(Boolean).join(' · ')}</AppText>
              </Pressable>
            </Card>
          ))}
        </Page>
      )}
    </CellGuard>
  )
}
