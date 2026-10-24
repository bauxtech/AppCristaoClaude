import * as DocumentPicker from 'expo-document-picker'
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
import { PlanButton, PlanLockRow } from '../../subscription/PlanLock'
import { showPlanBlocked } from '../../subscription/PlanBlocked'
import { useSubscription } from '../../subscription/SubscriptionContext'
import { IS_REMOTE } from '../../../lib/supabase'
import { readBytes } from '../../../lib/files'
import { useImagePicker } from '../../../lib/useImagePicker'
import { toBase64 } from '../../church/coursePhoto'
import { draftPlanRemote, importPlanRemote, mergeDraft, refLabel, SAMPLE_DRAFT, type DraftResult, type ImportedPlan, type ImportResult, type PlanAiFail } from '../planAi'

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
              {cell.planRef ? (
                <AppText variant="small" tone="secondary">
                  {cell.planRef}
                </AppText>
              ) : null}
            </View>
          ) : null}
          {cell.plan.length === 0 ? (
            <AppText variant="body" tone="secondary">
              O roteiro desta semana ainda não foi montado.
            </AppText>
          ) : null}
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
  return (
    <CellGuard title="Editar roteiro" action="editPlan">
      {(cell) => <EditPlan cell={cell} />}
    </CellGuard>
  )
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
  const [start, setStart] = useState<'tema' | 'plano' | 'arquivo' | null>(null)
  const [theme, setTheme] = useState('')
  const [replace, setReplace] = useState<null | (() => void)>(null)
  const sub = useSubscription()
  const { pickImageData, permissionSheet } = useImagePicker()
  // Roteiro com IA: o que está fazendo agora, o aviso do último pedido e os roteiros lidos do arquivo.
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [found, setFound] = useState<ImportedPlan[]>([])
  const canAi = sub.can('cell_lead')

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

  function failed(reason: PlanAiFail, resetsAt?: string | null) {
    setNote(AI_ERROR[reason](resetsAt))
    // Plano vencido no meio do caminho: além do texto, oferece o plano que libera.
    if (reason === 'no_access')
      showPlanBlocked({ title: 'Roteiro com IA', text: 'Montar o roteiro com IA é do plano Líder. Você pode escrever o roteiro à mão agora.', plan: 'lider', origin: 'roteiro-ia' })
  }

  async function draft(input: { theme: string; ref: string }): Promise<DraftResult> {
    setBusy('Montando o rascunho. Leva alguns segundos.')
    setNote(null)
    const r = IS_REMOTE ? await draftPlanRemote(input) : { ok: true as const, draft: SAMPLE_DRAFT }
    setBusy(null)
    if (!r.ok) failed(r.reason, r.resetsAt)
    return r
  }

  /** Tema novo: monta a reunião inteira com o rascunho. */
  async function draftFromTheme() {
    const t = theme.trim()
    const r = await draft({ theme: t, ref: '' })
    if (!r.ok) return
    const base = refLabel(r.draft.verseKeys)
    apply({ title: r.draft.title || t, ref: base, sections: mergeDraft([], r.draft, base, sid).sections })
    setNote(DRAFT_NOTE)
  }

  /** Roteiro já começado: preenche só as seções vazias. */
  async function complete() {
    const r = await draft({ theme: title.trim(), ref: ref.trim() })
    if (!r.ok) return
    const base = ref.trim() || refLabel(r.draft.verseKeys)
    const m = mergeDraft(sections, r.draft, base, sid)
    if (!title.trim() && r.draft.title) setTitle(r.draft.title)
    if (!ref.trim()) setRef(base)
    setSections(m.sections)
    setNote(m.filled ? DRAFT_NOTE : 'As seções já estavam escritas. Nada foi trocado.')
  }

  async function read(run: () => Promise<ImportResult>) {
    setBusy('Lendo o roteiro. Leva alguns segundos.')
    setNote(null)
    setFound([])
    const r = await run()
    setBusy(null)
    if (!r.ok) return failed(r.reason, r.resetsAt)
    if (r.plans.length === 1) return pickImported(r.plans[0])
    setFound(r.plans)
    setNote(`O arquivo tem ${r.plans.length} roteiros. Escolha qual usar.`)
  }

  function pickImported(p: ImportedPlan) {
    setFound([])
    apply({ title: p.title, ref: p.ref, sections: p.sections.map((x) => ({ ...x, id: sid() })) })
    setNote('Confira o que o app leu e corrija o que precisar antes de salvar.')
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    const doc = !res.canceled ? res.assets[0] : null
    if (!doc) return
    if (doc.size && doc.size > 10 * 1024 * 1024) return setNote(AI_ERROR.too_big())
    await read(async () => {
      const bytes = await readBytes(doc.uri)
      return bytes ? importPlanRemote(toBase64(bytes), 'application/pdf') : { ok: false, reason: 'failed' }
    })
  }

  async function takePhoto(source: 'camera' | 'library') {
    // Qualidade menor: a foto vai para o servidor e só precisa dar para ler o texto.
    const img = await pickImageData(source, 'para fotografar o roteiro da reunião', { quality: 0.4 })
    if (img) await read(() => importPlanRemote(img.base64, img.mimeType))
  }

  return (
    <Page title="Editar roteiro">
      {permissionSheet}
      <View style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Começar a partir de</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Culto gravado" icon="mic" variant="soft" size="sm" onPress={() => router.push('/celula/roteiro-culto')} />
          <Button label="Um tema" icon="edit" variant="soft" size="sm" onPress={() => setStart(start === 'tema' ? null : 'tema')} />
          <Button label="Plano de leitura" icon="book" variant="soft" size="sm" onPress={() => setStart(start === 'plano' ? null : 'plano')} />
          {IS_REMOTE ? <Button label="PDF ou foto" icon="file" variant="soft" size="sm" onPress={() => setStart(start === 'arquivo' ? null : 'arquivo')} /> : null}
        </View>
      </View>

      {start === 'tema' ? (
        <Card style={{ gap: 10 }}>
          <TextField label="Tema da reunião" value={theme} onChangeText={setTheme} placeholder="Ex.: Perdão" maxLength={60} />
          <AppText variant="small" tone="secondary">
            {canAi
              ? 'Com IA, o app escreve um rascunho da reunião com versículos da Bíblia do app. Você revisa antes de salvar.'
              : 'Monta a estrutura da reunião com o tema na palavra. Você completa o resto.'}
          </AppText>
          {canAi ? <Button label="Montar com IA" disabled={!theme.trim() || !!busy} onPress={() => void draftFromTheme()} /> : <PlanLockRow feature="cell_lead" label="Montar com IA" />}
          <Button
            label={canAi ? 'Só a estrutura, sem IA' : 'Montar roteiro'}
            variant={canAi ? 'outline' : undefined}
            disabled={!theme.trim() || !!busy}
            onPress={() => apply({ title: theme.trim(), ref: '', sections: skeleton(`Tema: ${theme.trim()}`) })}
          />
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

      {start === 'arquivo' ? (
        <Card style={{ gap: 10 }}>
          <AppText variant="small" tone="secondary">
            Recebeu o roteiro da igreja? O app lê o PDF ou a foto e preenche as seções. Você confere antes de salvar. O arquivo não fica guardado. PDF de até 20 páginas.
          </AppText>
          {canAi ? (
            <>
              <Button label="Escolher PDF" icon="file" disabled={!!busy} onPress={() => void pickPdf()} />
              <Button label="Tirar foto" icon="camera" variant="outline" disabled={!!busy} onPress={() => void takePhoto('camera')} />
              <Button label="Escolher da galeria" icon="image" variant="outline" disabled={!!busy} onPress={() => void takePhoto('library')} />
            </>
          ) : (
            <PlanLockRow feature="cell_lead" label="Ler o roteiro do PDF ou da foto" />
          )}
          {found.map((p, i) => (
            <Card key={i} style={{ paddingVertical: 4 }}>
              <Pressable
                onPress={() => pickImported(p)}
                accessibilityRole="button"
                accessibilityLabel={`Usar ${p.title || `roteiro ${i + 1}`}${p.ref ? `, ${p.ref}` : ''}`}
                style={{ minHeight: 56, justifyContent: 'center', gap: 2 }}
              >
                <AppText variant="bodyStrong">{p.title || `Roteiro ${i + 1}`}</AppText>
                <AppText variant="small" tone="secondary">
                  {[p.ref, `${p.sections.length} ${p.sections.length === 1 ? 'seção' : 'seções'}`].filter(Boolean).join(' · ')}
                </AppText>
              </Pressable>
            </Card>
          ))}
        </Card>
      ) : null}

      {busy || note ? (
        <AppText variant="body" tone="secondary" accessibilityLiveRegion="polite">
          {busy ?? note}
        </AppText>
      ) : null}

      {replace ? (
        <ConfirmCard
          title="Trocar o roteiro atual?"
          message="As seções que você já escreveu serão substituídas."
          confirmLabel="Trocar"
          danger={false}
          onCancel={() => setReplace(null)}
          onConfirm={replace}
        />
      ) : null}

      <TextField label="Título do roteiro" value={title} onChangeText={setTitle} placeholder="Ex.: Vivendo com propósito" maxLength={80} />
      <TextField label="Texto bíblico base" value={ref} onChangeText={setRef} placeholder="Ex.: João 15:1-17" maxLength={60} />
      {sections.length && (title.trim() || ref.trim()) ? (
        canAi ? (
          <View style={{ gap: 4 }}>
            <Button label="Completar com IA" icon="edit" variant="soft" disabled={!!busy} onPress={() => void complete()} />
            <AppText variant="small" tone="secondary">
              Escreve as seções que estão vazias, a partir do título e do texto base. O que você já escreveu fica como está.
            </AppText>
          </View>
        ) : (
          <PlanLockRow feature="cell_lead" label="Completar com IA" />
        )
      ) : null}

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
            <Pressable
              onPress={() => set(s.id, { minutes: Math.max(5, s.minutes - 5) })}
              accessibilityRole="button"
              accessibilityLabel={`Diminuir duração de ${s.title}`}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }}
            >
              <AppText style={{ color: colors.primary, fontSize: 22 }}>−</AppText>
            </Pressable>
            <Pressable
              onPress={() => set(s.id, { minutes: Math.min(90, s.minutes + 5) })}
              accessibilityRole="button"
              accessibilityLabel={`Aumentar duração de ${s.title}`}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft }}
            >
              <AppText style={{ color: colors.primary, fontSize: 22 }}>+</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
      {sections.length === 0 ? (
        <AppText variant="body" tone="secondary">
          Nenhuma seção ainda. Comece por um culto, um tema ou um plano, ou acrescente uma seção.
        </AppText>
      ) : null}
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
              <PlanButton feature="sermon" label="Gravar culto" icon="mic" onPress={() => router.push('/culto/gravar')} />
            </>
          ) : (
            <AppText variant="body" tone="secondary">
              Escolha o culto. O resultado abre e você toca em "Transformar em roteiro da célula".
            </AppText>
          )}
          {ready.map((r) => (
            <Card key={r.id} style={{ paddingVertical: 4 }}>
              <Pressable
                onPress={() => router.push({ pathname: '/culto/[id]', params: { id: r.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${r.theme}, ${r.preacher ? `${r.preacher}, ` : ''}${formatMeetingDay(r.date)}`}
                style={{ minHeight: 64, justifyContent: 'center', gap: 2 }}
              >
                <AppText variant="bodyStrong">{r.theme || 'Culto sem tema'}</AppText>
                <AppText variant="small" tone="secondary">
                  {[r.preacher, formatMeetingDay(r.date)].filter(Boolean).join(' · ')}
                </AppText>
              </Pressable>
            </Card>
          ))}
        </Page>
      )}
    </CellGuard>
  )
}

const DRAFT_NOTE = 'Rascunho pronto. Leia, ajuste o que quiser e toque em Salvar roteiro.'

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '')

const AI_ERROR: Record<PlanAiFail, (resetsAt?: string | null) => string> = {
  no_access: () => 'O roteiro com IA é do plano Líder. Escreva o roteiro à mão.',
  limit_month: (at) => `Você chegou ao limite de roteiros com IA deste mês. Libera de novo em ${day(at) || '1º do mês que vem'}. Por enquanto, escreva à mão.`,
  limit_day: () => 'Muitas tentativas hoje. Amanhã libera de novo. Por enquanto, escreva à mão.',
  off_topic: () => 'O roteiro com IA só monta reuniões sobre a Bíblia e a fé cristã. Tente outro tema. Essa tentativa não contou no limite do mês.',
  not_found: () => 'Não deu para achar um roteiro no arquivo. Tente outro PDF ou uma foto mais perto e com boa luz. Essa tentativa não contou no limite do mês.',
  too_big: () => 'O arquivo é grande demais. Use um PDF de até 10 MB ou tire uma foto.',
  too_many_pages: () => 'O PDF tem mais de 20 páginas. Envie só as páginas do roteiro ou tire uma foto.',
  failed: () => 'Não foi possível montar agora. Tente de novo ou escreva à mão.',
}
