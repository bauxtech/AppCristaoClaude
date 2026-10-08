import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { useRemoteState } from '../../../state/connection'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native'
import { AppText, Button, Card, IconButton, MIN_TOUCH, Sheet, TopBar, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { VOICE_RECORDING } from '../../../lib/recording'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts, size } from '../../../theme/typography'
import { useAudio } from '../../audio/AudioContext'
import { slugify } from '../../bible/books'
import { formatMeetingDay } from '../../cell/meetings'
import { useSermons } from '../../sermon/SermonContext'
import { askBible, transcribeQuestion, type ChatContextRef } from '../answer'
import { askRemote, ChatBlocked } from '../remote'
import { IS_REMOTE } from '../../../lib/supabase'
import { currentUserId } from '../../../lib/sync'
import { useFaithConsent } from '../../settings/SettingsContext'
import { saveConversation } from '../sync'
import { useChat, type Conversation, type Message } from '../ChatContext'
import { DAILY_LIMIT, isCrisis } from '../rules'
import { getTranslation } from '../../bible/translations'

const SUGGESTIONS = ['O que significa "O Senhor é meu pastor"?', 'Quais versículos falam sobre ansiedade?', 'O que a Bíblia diz sobre perdão?', 'Quem é o bom pastor em João 10?']

export function ChatScreen() {
  const params = useLocalSearchParams<{ passagem?: string; culto?: string; conversa?: string }>()
  const chat = useChat()
  const { sermons } = useSermons()
  const [convId, setConvId] = useState<string | null>(params.conversa ?? null)
  const conv = chat.conversations.find((c) => c.id === convId) ?? null

  // Abriu da Bíblia ou de um culto: começa uma conversa com esse contexto.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || params.conversa) return
    started.current = true
    const sermon = params.culto ? sermons.find((s) => s.id === params.culto) : null
    const ctx: ChatContextRef | null = sermon
      ? { kind: 'sermon', id: sermon.id, label: `Sobre o culto de ${formatMeetingDay(sermon.date).split(', ')[1]}` }
      : params.passagem
        ? { kind: 'passage', label: String(params.passagem) }
        : null
    if (ctx) setConvId(chat.newConversation(ctx).id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <ChatView conv={conv} onConversation={setConvId} />
}

function ChatView({ conv, onConversation }: { conv: Conversation | null; onConversation: (id: string | null) => void }) {
  const { colors } = useTheme()
  const toast = useToast()
  const audio = useAudio()
  const chat = useChat()
  const faith = useFaithConsent()
  const { profile } = useSession()
  const { sermons } = useSermons()
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const [voice, setVoice] = useState(false)
  const [divided, setDivided] = useState(false)
  const scroll = useRef<ScrollView>(null)
  const limit = chat.remaining <= 0
  const { online } = useRemoteState()
  const sermon = conv?.context?.kind === 'sermon' ? sermons.find((s) => s.id === (conv.context as { id: string }).id) ?? null : null

  async function ask(text: string, existing?: { conv: Conversation; msgId: string }) {
    const q = text.trim()
    if (!q) return
    if (isCrisis(q)) {
      setCrisis(true)
      setInput('')
      return
    }
    // A verificação de crise vem antes: o campo fica aberto mesmo sem internet ou no limite do dia.
    if ((limit || !online) && !existing) return
    let c = existing?.conv ?? conv
    if (!c) {
      c = chat.newConversation(null)
      onConversation(c.id)
    }
    const replyId = existing?.msgId ?? `a${Date.now().toString(36)}`
    if (!existing) {
      chat.addMessage(c.id, { id: `u${Date.now().toString(36)}`, role: 'user', text: q })
      chat.countQuestion()
      setInput('')
    }
    setTyping(true)
    try {
      // Com consentimento de fé, a conversa fica guardada no banco: o servidor grava pergunta e resposta nela.
      const uid = currentUserId()
      const title = c.messages.length === 0 && !c.context ? q.slice(0, 60) : c.title
      const saved = IS_REMOTE && faith && uid ? await saveConversation({ id: c.id, title, context: c.context }, uid) : false
      const answer = IS_REMOTE ? await askRemote(q, saved ? c.id : null, c.context?.label ?? null) : await askBible(q, c.context, sermon)
      const msg: Message = { id: replyId, role: 'assistant', text: answer.text, answer }
      if (existing) chat.replaceMessage(c.id, replyId, { ...msg, failed: false })
      else chat.addMessage(c.id, msg)
      // O servidor guardou a pergunta e a resposta. Conversa que já tinha mensagens só no aparelho continua para envio.
      if (saved && !existing && (c.synced || c.messages.length === 0)) chat.markSynced(c.id)
    } catch (e) {
      // O servidor confere crise, assinatura e limite de novo: o app obedece.
      if (e instanceof ChatBlocked) {
        if (e.reason === 'crisis') setCrisis(true)
        if (e.reason === 'limit') chat.fillTodayLimit()
        if (e.reason === 'no_access') router.replace('/assinatura')
        return
      }
      const msg: Message = { id: replyId, role: 'assistant', text: q, failed: true }
      if (existing) chat.replaceMessage(c.id, replyId, msg)
      else chat.addMessage(c.id, msg)
    } finally {
      setTyping(false)
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  if (crisis) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar title="Você não está sozinho" onBack={() => setCrisis(false)} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <AppText variant="body">Se você está passando por um momento difícil e pensando em se machucar, fale agora com o Centro de Valorização da Vida. A ligação é gratuita e funciona 24 horas, todos os dias.</AppText>
          <Card style={{ alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
            <AppText variant="label" tone="secondary">
              CVV, CENTRO DE VALORIZAÇÃO DA VIDA
            </AppText>
            <AppText accessibilityLabel="Telefone 1 8 8" style={{ fontFamily: fonts.bold, fontSize: 44, color: colors.primary }}>
              188
            </AppText>
            <Button label="Ligar para o 188" icon="phone" onPress={() => Linking.openURL('tel:188').catch(() => toast('Disque 188 no telefone'))} style={{ alignSelf: 'stretch' }} />
            <AppText variant="small" tone="secondary">
              Também pelo site cvv.org.br
            </AppText>
          </Card>
          <AppText variant="body" tone="secondary">
            Se estiver em perigo agora, ligue 192 (SAMU).
          </AppText>
          <Button label="Voltar ao chat" variant="text" onPress={() => setCrisis(false)} />
        </ScrollView>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar
        title="Chat bíblico"
        onBack={() => router.back()}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="plus" label="Nova conversa" onPress={() => onConversation(null)} />
            <IconButton icon="clock" label="Histórico de conversas" onPress={() => router.push('/chat/historico')} />
          </View>
        }
      />
      {conv?.context ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primarySoft }}>
          <AppText variant="small" style={{ color: colors.primary, fontFamily: fonts.semibold }}>
            {conv.context.kind === 'passage' ? `Sobre ${conv.context.label}` : conv.context.label}
          </AppText>
        </View>
      ) : null}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 2 }}>
        <AppText variant="small" tone="secondary">
          Este chat não substitui o seu pastor e não dá conselho médico, jurídico ou psicológico.
        </AppText>
        {profile.tradition ? <AppText variant="small" tone="secondary">{`Respostas de acordo com a tradição ${profile.tradition}.`}</AppText> : null}
      </View>
      {!limit && chat.remaining <= 5 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primarySoft }} accessibilityLiveRegion="polite">
          <AppText variant="small" style={{ color: colors.accent, fontFamily: fonts.semibold }}>{`${chat.remaining} ${chat.remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje`}</AppText>
        </View>
      ) : null}

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {!conv || conv.messages.length === 0 ? (
          <>
            <AppText variant="body" tone="secondary">
              Pergunte sobre significado, contexto, personagens e palavras da Bíblia.
            </AppText>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => ask(s)} disabled={limit} accessibilityRole="button" accessibilityLabel={`Perguntar: ${s}`} style={{ minHeight: MIN_TOUCH, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14, justifyContent: 'center' }}>
                <AppText variant="body">{s}</AppText>
              </Pressable>
            ))}
          </>
        ) : (
          conv.messages.map((m) => <Bubble key={m.id} m={m} onRetry={() => ask(m.text, { conv, msgId: m.id })} onListen={() => audio.play({ title: 'Resposta do chat', text: [m.text, ...(m.answer?.verses ?? []).map((v) => `${v.book} ${v.chapter}, ${v.verse}. ${v.text}`)].join(' ') })} onDivided={() => setDivided(true)} />)
        )}
        {typing ? (
          <AppText variant="small" tone="secondary" accessibilityLiveRegion="polite">
            Procurando a resposta
          </AppText>
        ) : null}
      </ScrollView>

      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card }}>
        {!online ? (
          <View style={{ gap: 4, alignItems: 'center', paddingBottom: 10 }} accessibilityLiveRegion="polite">
            <AppText variant="bodyStrong">O chat precisa de internet</AppText>
            <AppText variant="small" tone="secondary">
              As conversas anteriores continuam abertas. Quando a internet voltar, você pode perguntar de novo.
            </AppText>
          </View>
        ) : limit ? (
          <View style={{ gap: 4, alignItems: 'center', paddingBottom: 10 }}>
            <AppText variant="bodyStrong">{`Você usou as ${DAILY_LIMIT} perguntas de hoje`}</AppText>
            <AppText variant="small" tone="secondary">
              Amanhã você pode perguntar de novo. O histórico continua aberto.
            </AppText>
          </View>
        ) : null}
        {!online || limit ? (
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center', paddingBottom: 8 }}>
            Precisa conversar com alguém agora? CVV, telefone 188, 24 horas.
          </AppText>
        ) : null}
        {(
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Sua pergunta sobre a Bíblia"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Sua pergunta sobre a Bíblia"
              multiline
              maxLength={500}
              style={{ flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontFamily: fonts.regular, fontSize: size.body, backgroundColor: colors.bg }}
            />
            <IconButton icon="mic" label="Perguntar por voz" onPress={() => setVoice(true)} />
            <Pressable
              onPress={() => ask(input)}
              disabled={!input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar pergunta"
              accessibilityState={{ disabled: !input.trim() }}
              style={{ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: 14, backgroundColor: input.trim() ? colors.primary : colors.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="arrowUp" size={20} color={input.trim() ? colors.primaryText : colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>
        )}
      </View>

      <VoiceSheet visible={voice} onClose={() => setVoice(false)} onText={(t) => setInput(t)} />
      <Sheet visible={divided} onClose={() => setDivided(false)} title="Igrejas pensam diferente sobre isso">
        <AppText variant="body">Igrejas cristãs têm leituras diferentes sobre este tema. O chat mostra o que a Bíblia diz e avisa quando há diferença entre as tradições. Converse também com o seu pastor.</AppText>
        <Button label="Entendi" onPress={() => setDivided(false)} />
      </Sheet>
    </KeyboardAvoidingView>
  )
}

function Bubble({ m, onRetry, onListen, onDivided }: { m: Message; onRetry: () => void; onListen: () => void; onDivided: () => void }) {
  const { colors } = useTheme()
  const mine = m.role === 'user'
  if (m.failed) {
    return (
      <Card style={{ gap: 8, borderColor: colors.danger }}>
        <AppText variant="bodyStrong">A resposta falhou</AppText>
        <AppText variant="small" tone="secondary">
          Confira a internet e tente de novo.
        </AppText>
        <Button label="Tentar de novo" size="sm" onPress={onRetry} style={{ alignSelf: 'flex-start' }} />
      </Card>
    )
  }
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          maxWidth: '88%',
          borderRadius: 20,
          borderBottomRightRadius: mine ? 6 : 20,
          borderBottomLeftRadius: mine ? 20 : 6,
          padding: 14,
          gap: 10,
          backgroundColor: mine ? colors.primary : colors.card,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.line,
        }}
      >
        <AppText variant="body" style={{ color: mine ? colors.primaryText : colors.text }}>
          {m.text}
        </AppText>
        {m.answer?.verses.map((v) => (
          <Pressable
            key={`${v.book}${v.chapter}:${v.verse}`}
            onPress={() => router.push({ pathname: '/biblia/[livro]/[capitulo]', params: { livro: slugify(v.book), capitulo: String(v.chapter), v: String(v.verse) } })}
            accessibilityRole="link"
            accessibilityLabel={`${v.book} ${v.chapter}:${v.verse}. ${v.text}. Abrir na Bíblia`}
            style={{ borderRadius: 12, padding: 12, backgroundColor: colors.primarySoft, gap: 4 }}
          >
            <AppText variant="small" style={{ color: colors.primary, fontFamily: fonts.semibold }}>{`${v.book} ${v.chapter}:${v.verse} · ${getTranslation().name}`}</AppText>
            <AppText style={{ fontFamily: fonts.bible, fontSize: size.body, color: colors.text, lineHeight: 24 }}>{v.text}</AppText>
          </Pressable>
        ))}
        {m.answer?.verses.length ? (
          <Button
            label={`Texto: ${getTranslation().name} · ${getTranslation().licenseShort}`}
            variant="text"
            size="sm"
            onPress={() => router.push('/biblia/sobre-traducao')}
            accessibilityHint={`Licença ${getTranslation().licenseName}. Abre o crédito da tradução`}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
        {m.answer?.divided ? <Button label="Igrejas pensam diferente sobre isso" variant="text" size="sm" onPress={onDivided} style={{ alignSelf: 'flex-start' }} /> : null}
        {m.answer?.preview ? (
          <AppText variant="small" tone="secondary">
            Na prévia, o chat mostra só os versículos do app. A explicação chega quando o chat estiver ligado ao servidor.
          </AppText>
        ) : null}
        {!mine ? <Button label="Ouvir resposta" icon="volume" variant="text" size="sm" onPress={onListen} style={{ alignSelf: 'flex-start' }} /> : null}
      </View>
    </View>
  )
}

function VoiceSheet({ visible, onClose, onText }: { visible: boolean; onClose: () => void; onText: (t: string) => void }) {
  const toast = useToast()
  const recorder = useAudioRecorder(VOICE_RECORDING)
  const [state, setState] = useState<'idle' | 'listening' | 'working' | 'unavailable' | 'denied'>('idle')

  useEffect(() => {
    if (!visible) {
      setState('idle')
      return
    }
    ;(async () => {
      const p = await requestRecordingPermissionsAsync()
      if (!p.granted) return setState('denied')
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setState('listening')
    })().catch(() => setState('unavailable'))
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  async function stop() {
    setState('working')
    await recorder.stop().catch(() => {})
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {})
    try {
      onText(await transcribeQuestion(recorder.uri ?? ''))
      onClose()
    } catch {
      setState('unavailable')
    }
  }

  return (
    <Sheet visible={visible} onClose={() => (recorder.stop().catch(() => {}), onClose())} title="Perguntar por voz">
      {state === 'listening' ? (
        <>
          <AppText variant="body" accessibilityLiveRegion="polite">
            Ouvindo. Faça a sua pergunta e toque em Pronto.
          </AppText>
          <Button label="Pronto" icon="stop" onPress={stop} />
        </>
      ) : state === 'working' ? (
        <AppText variant="body">Transformando em texto</AppText>
      ) : state === 'denied' ? (
        <>
          <AppText variant="body">O microfone está desligado para o app. Ligue nos ajustes do celular.</AppText>
          <Button label="Abrir ajustes do celular" onPress={() => Linking.openSettings()} />
        </>
      ) : state === 'unavailable' ? (
        <>
          <AppText variant="body">A pergunta por voz chega quando o chat estiver ligado ao servidor. Por enquanto, use o microfone do teclado do celular.</AppText>
          <Button label="Entendi" onPress={() => (onClose(), toast('Use o microfone do teclado'))} />
        </>
      ) : (
        <AppText variant="body">Preparando o microfone</AppText>
      )}
    </Sheet>
  )
}
