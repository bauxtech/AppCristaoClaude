import * as LocalAuthentication from 'expo-local-authentication'
import * as Speech from 'expo-speech'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, Icon, ListRow, Page, SectionLabel, Segmented, SelectCard, Switch, Tag, TextField, useToast } from '../../../components'
import { MIN_TOUCH } from '../../../components/Button'
import { IS_PREVIEW } from '../../../lib/preview'
import { useSession } from '../../../state/session'
import { useTheme, type AppearancePreference } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { FONT_MAX, FONT_MIN, useBible } from '../../bible/BibleContext'
import { DEMO_CODES, TRADITIONS, TRANSLATIONS } from '../../onboarding/data'
import { checkCode, CODE_MESSAGES, formatPhoneNumber, isValidPhone, onlyDigits } from '../../onboarding/validation'
import { usePrayer } from '../../prayer/PrayerContext'
import { useProfile } from '../../profile/ProfileContext'
import { AUDIO_DAYS } from '../../sermon/data'
import { useSettings } from '../SettingsContext'
import { isValidEmail } from './AccountScreens'

function SwitchRow({ label, sub, value, onChange, divider }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; divider?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.line }}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" style={{ fontFamily: fonts.medium }}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="small" tone="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
      <Switch label={label} value={value} onChange={onChange} />
    </View>
  )
}

export function SettingsHome() {
  return (
    <Page title="Configurações">
      <Card style={{ paddingVertical: 4 }}>
        <ListRow label="Conta" sub="Nome, telefone, e-mail" onPress={() => router.push('/configuracoes/conta')} divider />
        <ListRow label="Avisos" sub="Lembretes, silêncio e vibração" onPress={() => router.push('/avisos/configurar')} divider />
        <ListRow label="Bíblia e leitura" sub="Tradução, fonte, voz" onPress={() => router.push('/configuracoes/biblia')} divider />
        <ListRow label="Aparência e acessibilidade" sub="Tema, contraste, fonte grande" onPress={() => router.push('/configuracoes/aparencia')} divider />
        <ListRow label="Privacidade" sub="Quem vê meu progresso" onPress={() => router.push('/configuracoes/privacidade')} divider />
        <ListRow label="Gravações" sub="Guardar áudio ou só texto" onPress={() => router.push('/configuracoes/gravacoes')} divider />
        <ListRow label="Tradição do chat" sub="Denominação para o assistente" onPress={() => router.push('/configuracoes/tradicao')} divider />
        <ListRow label="Biometria" sub="Proteção do diário e notas" onPress={() => router.push('/configuracoes/biometria')} divider />
        <ListRow label="Meus dados" sub="Baixar, ver e revogar" onPress={() => router.push('/configuracoes/dados')} divider />
        <ListRow label="Bloquear ou denunciar" onPress={() => router.push('/configuracoes/bloquear')} divider />
        <ListRow label="Ajuda e termos" onPress={() => router.push('/configuracoes/ajuda')} />
      </Card>
    </Page>
  )
}

/** "+55 (11) 98765-4321" vira "•••• 4321". */
export function maskPhone(phone: string) {
  const d = onlyDigits(phone)
  return d ? `•••• ${d.slice(-4)}` : 'Sem telefone'
}

export function AccountScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { profile, updateProfile } = useSession()
  const [step, setStep] = useState<'idle' | 'input' | 'code' | 'done'>('idle')
  const [ddd, setDdd] = useState('')
  const [number, setNumber] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const newLabel = `+55 (${onlyDigits(ddd)}) ${formatPhoneNumber(number)}`

  function sendCode() {
    if (!isValidPhone(ddd, number)) return setError('Digite o DDD e o celular com 9 números.')
    setError(null)
    setStep('code')
  }

  function confirm() {
    const r = checkCode(code, DEMO_CODES)
    if (r === 'incomplete') return setError('Digite os 6 números do código.')
    if (r !== 'ok') return setError(CODE_MESSAGES[r])
    updateProfile({ phone: newLabel })
    setError(null)
    setStep('done')
    toast('Número atualizado')
  }

  return (
    <Page title="Conta">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" tone="secondary">
              Nome
            </AppText>
            <AppText variant="body" style={{ fontFamily: fonts.medium }}>
              {profile.name || 'Sem nome'}
            </AppText>
          </View>
          <Button label="Editar" variant="soft" size="sm" onPress={() => router.push('/eu/editar')} accessibilityHint="Editar nome, foto e aniversário" />
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" tone="secondary">
              Telefone
            </AppText>
            <AppText variant="body" style={{ fontFamily: fonts.medium }} accessibilityLabel={`Telefone terminado em ${onlyDigits(profile.phone).slice(-4).split('').join(' ')}`}>
              {maskPhone(profile.phone)}
            </AppText>
          </View>
          <Button label="Trocar número" variant="soft" size="sm" onPress={() => (setStep('input'), setError(null))} />
        </View>
        <View style={{ height: 1, backgroundColor: colors.line }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" tone="secondary">
              E-mail
            </AppText>
            <AppText variant="body" style={{ fontFamily: fonts.medium }} tone={profile.email ? 'primary' : 'secondary'}>
              {profile.email || 'Não cadastrado'}
            </AppText>
          </View>
          <Button label={profile.email ? 'Trocar e-mail' : 'Adicionar e-mail'} variant="soft" size="sm" onPress={() => (setEmailOpen(true), setEmail(profile.email ?? ''), setEmailError(null))} />
        </View>
      </Card>

      {emailOpen ? (
        <Card style={{ gap: 12 }}>
          <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="nome@email.com" error={emailError ?? undefined} />
          <AppText variant="small" tone="secondary">
            Usado para enviar o arquivo de Meus dados.
          </AppText>
          <Button
            label="Salvar e-mail"
            onPress={() => {
              if (!isValidEmail(email)) return setEmailError('Digite um e-mail válido, como nome@email.com.')
              updateProfile({ email: email.trim() })
              setEmailOpen(false)
              toast('E-mail salvo')
            }}
          />
        </Card>
      ) : null}

      {step === 'input' ? (
        <Card style={{ gap: 12 }}>
          <AppText variant="bodyStrong">Novo número</AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 88 }}>
              <TextField label="DDD" value={ddd} onChangeText={(v) => setDdd(onlyDigits(v).slice(0, 2))} keyboardType="number-pad" placeholder="11" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Celular" value={formatPhoneNumber(number)} onChangeText={(v) => setNumber(onlyDigits(v).slice(0, 9))} keyboardType="number-pad" placeholder="99999-0000" error={error ?? undefined} />
            </View>
          </View>
          <Button label="Enviar código" onPress={sendCode} />
        </Card>
      ) : null}

      {step === 'code' ? (
        <Card style={{ gap: 12 }}>
          <AppText variant="bodyStrong">{`Código enviado para ${newLabel}`}</AppText>
          <TextField label="Código de 6 números" value={code} onChangeText={(v) => setCode(onlyDigits(v).slice(0, 6))} keyboardType="number-pad" placeholder="000000" error={error ?? undefined} />
          {IS_PREVIEW ? (
            <AppText variant="small" tone="secondary">
              {`Na prévia, use ${DEMO_CODES.ok}.`}
            </AppText>
          ) : null}
          <Button label="Confirmar" onPress={confirm} />
          <Button label="Voltar e corrigir o número" variant="text" size="sm" onPress={() => setStep('input')} />
        </Card>
      ) : null}

      {step === 'done' ? (
        <Card style={{ gap: 4, borderColor: colors.primary, backgroundColor: colors.primarySoft }} accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Icon name="checkCircle" size={18} color={colors.primary} />
            <AppText variant="bodyStrong" style={{ color: colors.primary }}>
              Número atualizado
            </AppText>
          </View>
          <AppText variant="small" tone="secondary">
            Na próxima vez, entre com o número novo.
          </AppText>
        </Card>
      ) : null}
    </Page>
  )
}

export function BibleSettingsScreen() {
  const { colors } = useTheme()
  const bible = useBible()
  const s = useSettings()
  const [voices, setVoices] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    Speech.getAvailableVoicesAsync?.()
      .then((list) => setVoices(list.filter((v) => v.language?.toLowerCase().startsWith('pt')).map((v, i) => ({ id: v.identifier, name: `Voz ${i + 1}` }))))
      .catch(() => setVoices([]))
  }, [])

  return (
    <Page title="Bíblia e leitura">
      <Card style={{ gap: 4 }}>
        <SectionLabel>Tradução padrão</SectionLabel>
        {TRANSLATIONS.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MIN_TOUCH }} accessible accessibilityLabel={t.available ? `${t.label}, selecionada` : `${t.label}, em breve`}>
            <AppText variant="body" style={{ fontFamily: fonts.medium, color: t.available ? colors.text : colors.textSecondary }}>
              {t.label}
            </AppText>
            {t.available ? <Icon name="check" size={18} color={colors.primary} strokeWidth={2.5} /> : <Tag label="Em breve" tone="neutral" />}
          </View>
        ))}
        <AppText variant="small" tone="secondary">
          No lançamento, só a tradução de domínio público está disponível. As outras entram depois.
        </AppText>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Tamanho do texto bíblico</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Button label="A-" variant="outline" size="sm" onPress={() => bible.setFontSize(bible.fontSize - 1)} disabled={bible.fontSize <= FONT_MIN} accessibilityHint="Diminuir o texto bíblico" />
          <AppText style={{ flex: 1, textAlign: 'center', fontFamily: s.bibleFont === 'sans' ? fonts.regular : fonts.bible, fontSize: bible.fontSize, color: colors.text }} accessibilityLiveRegion="polite">
            {`${bible.fontSize}`}
          </AppText>
          <Button label="A+" variant="outline" size="sm" onPress={() => bible.setFontSize(bible.fontSize + 1)} disabled={bible.fontSize >= FONT_MAX} accessibilityHint="Aumentar o texto bíblico" />
        </View>
        <AppText style={{ fontFamily: s.bibleFont === 'sans' ? fonts.regular : fonts.bible, fontSize: bible.fontSize, lineHeight: bible.fontSize * 1.6, color: colors.text }}>
          O Senhor é o meu pastor; nada me faltará.
        </AppText>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Tipo de letra</SectionLabel>
        <Segmented
          label="Tipo de letra"
          value={s.bibleFont}
          onChange={(v) => s.update({ bibleFont: v })}
          options={[
            { id: 'serif', label: 'Com serifa' },
            { id: 'sans', label: 'Sem serifa' },
          ]}
        />
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Voz do áudio</SectionLabel>
        {voices.length === 0 ? (
          <AppText variant="small" tone="secondary">
            Usa a voz em português do celular. Para trocar, instale outras vozes nos ajustes do celular.
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Voz do áudio">
            <Chip label="Padrão do celular" selected={!s.voice} onPress={() => s.update({ voice: null })} />
            {voices.map((v) => (
              <Chip key={v.id} label={v.name} selected={s.voice === v.id} onPress={() => s.update({ voice: v.id })} />
            ))}
          </View>
        )}
        <Button label="Ouvir um trecho" variant="outline" size="sm" icon="volume" onPress={() => Speech.speak('O Senhor é o meu pastor; nada me faltará.', { language: 'pt-BR', voice: s.voice ?? undefined })} />
      </Card>
    </Page>
  )
}

export function AppearanceScreen() {
  const theme = useTheme()
  const s = useSettings()
  return (
    <Page title="Aparência e acessibilidade">
      <Card style={{ gap: 12 }}>
        <SectionLabel>Modo</SectionLabel>
        <Segmented<AppearancePreference>
          label="Modo"
          value={theme.preference}
          onChange={theme.setPreference}
          options={[
            { id: 'light', label: 'Claro' },
            { id: 'dark', label: 'Escuro' },
            { id: 'system', label: 'Igual ao celular' },
          ]}
        />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <SwitchRow label="Fonte grande" sub="Aumenta o tamanho do texto no app" value={theme.largeText} onChange={theme.setLargeText} divider />
        <SwitchRow label="Alto contraste" sub="Aumenta o contraste entre elementos" value={theme.highContrast} onChange={(v) => theme.setHighContrastOverride(v)} divider />
        <SwitchRow label="Legenda em tempo real" sub="No chat e nos momentos de oração" value={s.captions} onChange={(v) => s.update({ captions: v })} divider />
        <SwitchRow label="Intérprete de Libras (vídeo)" sub="Quando disponível no conteúdo" value={s.libras} onChange={(v) => s.update({ libras: v })} divider />
        <SwitchRow label="Modo simplificado" sub="Mostra menos elementos por tela" value={s.simple} onChange={(v) => s.update({ simple: v })} />
      </Card>
      <AppText variant="small" tone="secondary">
        A fonte grande se soma ao tamanho de letra escolhido nos ajustes do celular.
      </AppText>
    </Page>
  )
}

export function PrivacyScreen() {
  const profile = useProfile()
  const items = [
    { label: 'Quem vê meu progresso de leitura', key: 'showBooks' as const, on: 'Membros da sua célula veem quantos livros você leu.', off: 'Só você vê quantos livros leu.' },
    { label: 'Quem vê meu aniversário', key: 'showBirthday' as const, on: 'Membros da sua célula recebem um aviso no seu aniversário.', off: 'A célula não vê nem recebe aviso do seu aniversário.' },
    { label: 'Quem vê minha foto', key: 'showPhoto' as const, on: 'Membros da sua célula veem sua foto.', off: 'A célula vê só as suas iniciais.' },
  ]
  return (
    <Page title="Privacidade">
      {items.map((it) => {
        const on = profile.privacy[it.key]
        return (
          <Card key={it.key} style={{ gap: 10 }}>
            <AppText variant="bodyStrong">{it.label}</AppText>
            <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={it.label}>
              <Chip label="Só eu" selected={!on} onPress={() => profile.setPrivacy({ [it.key]: false })} />
              <Chip label="Minha célula" selected={on} onPress={() => profile.setPrivacy({ [it.key]: true })} />
            </View>
            <AppText variant="small" tone="secondary">
              {on ? it.on : it.off}
            </AppText>
          </Card>
        )
      })}
      <Card style={{ gap: 6 }}>
        <AppText variant="bodyStrong">Quem vê meus pedidos de oração</AppText>
        <AppText variant="small" tone="secondary">
          Cada pedido tem a sua escolha: só você ou a sua célula. Você escolhe ao escrever o pedido e pode mudar depois. O diário é sempre só seu.
        </AppText>
      </Card>
      <ListRow label="O que a célula vê" sub="Prévia do seu perfil para os membros" onPress={() => router.push('/eu/celula-ve')} />
    </Page>
  )
}

export function RecordingsSettingsScreen() {
  const s = useSettings()
  return (
    <Page title="Gravações">
      <AppText variant="body" tone="secondary">
        Escolha o padrão ao gravar um culto. Você ainda pode mudar antes de cada gravação.
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Como guardar" style={{ gap: 12 }}>
        <SelectCard kind="radio" label="Guardar só o texto" description="Somente o texto e o resumo ficam salvos. O áudio é apagado depois da transcrição." selected={s.recordingDefault === 'text'} onPress={() => s.update({ recordingDefault: 'text' })} />
        <SelectCard kind="radio" label="Guardar áudio" description={`O áudio fica salvo por ${AUDIO_DAYS} dias para você ouvir de novo. Depois é apagado e fica só o texto.`} selected={s.recordingDefault === 'audio'} onPress={() => s.update({ recordingDefault: 'audio' })} />
      </View>
    </Page>
  )
}

export function ChatTraditionScreen() {
  const toast = useToast()
  const { profile, updateProfile } = useSession()
  const [sel, setSel] = useState<string | null>(profile.tradition)
  return (
    <Page title="Tradição do chat">
      <AppText variant="body" tone="secondary">
        O assistente usa sua tradição para personalizar respostas bíblicas e teológicas. A resposta continua citando só o texto bíblico do app.
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tradição">
        {TRADITIONS.map((t) => (
          <Chip key={t} label={t} selected={sel === t} onPress={() => setSel(t)} />
        ))}
      </View>
      <Button
        label="Salvar"
        disabled={sel === profile.tradition}
        onPress={() => {
          updateProfile({ tradition: sel })
          toast('Preferência salva')
          router.back()
        }}
      />
    </Page>
  )
}

/** Confere se a pessoa consegue desbloquear antes de ligar a trava, para não ficar trancada para fora. */
async function confirmIdentity(what: string): Promise<'ok' | 'none' | 'fail'> {
  if (Platform.OS === 'web') return 'ok'
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE)
  if (level === LocalAuthentication.SecurityLevel.NONE) return 'none'
  const res = await LocalAuthentication.authenticateAsync({ promptMessage: `Proteger ${what}`, cancelLabel: 'Cancelar' }).catch(() => ({ success: false }))
  return res.success ? 'ok' : 'fail'
}

export function BiometricSettingsScreen() {
  const toast = useToast()
  const prayer = usePrayer()
  const s = useSettings()
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle(kind: 'diary' | 'notes', v: boolean) {
    setMsg(null)
    if (v) {
      const r = await confirmIdentity(kind === 'diary' ? 'o diário' : 'as anotações')
      if (r === 'none') return setMsg('Este celular não tem biometria nem código de bloqueio. Ative um deles nos ajustes do celular.')
      if (r === 'fail') return
    }
    if (kind === 'diary') prayer.setDiaryLock(v)
    else s.update({ notesLock: v })
    toast(v ? 'Proteção ligada' : 'Proteção desligada')
  }

  return (
    <Page title="Biometria">
      <AppText variant="body" tone="secondary">
        Proteja o acesso ao seu diário e anotações com biometria (impressão digital ou Face ID).
      </AppText>
      <Card style={{ paddingVertical: 4 }}>
        <SwitchRow label="Bloquear diário com biometria" sub="Exige autenticação para abrir o diário" value={prayer.diaryLock} onChange={(v) => toggle('diary', v)} divider />
        <SwitchRow label="Bloquear notas com biometria" sub="Exige autenticação para ver anotações" value={s.notesLock} onChange={(v) => toggle('notes', v)} />
      </Card>
      {msg ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {msg}
        </AppText>
      ) : null}
      {prayer.diaryLock || s.notesLock ? (
        <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
          Se a biometria falhar, você pode usar o código do celular.
        </AppText>
      ) : null}
    </Page>
  )
}

const FAQS = [
  { q: 'Como faço para exportar minhas anotações?', a: 'Vá em Eu > Anotações > Exportar. Você escolhe o que incluir e gera um PDF.' },
  { q: 'Posso usar o app sem internet?', a: 'Sim. A leitura da Bíblia e as anotações ficam disponíveis sem internet. Gravações e resumos de culto precisam de conexão para sincronizar.' },
  { q: 'Como excluir minha conta?', a: 'Vá em Eu > Excluir conta. Seus dados são apagados em 30 dias, e você pode cancelar nesse prazo.' },
]

export function HelpScreen() {
  const { colors } = useTheme()
  const [open, setOpen] = useState<number | null>(null)
  return (
    <Page title="Ajuda e termos">
      <Card style={{ paddingVertical: 4 }}>
        <ListRow label="Termos de Uso" onPress={() => router.push('/termos-completos')} divider />
        <ListRow label="Dados de fé e privacidade" onPress={() => router.push('/dados-de-fe')} divider />
        <ListRow label="Falar com suporte" onPress={() => router.push('/configuracoes/suporte')} />
      </Card>
      <SectionLabel>Perguntas frequentes</SectionLabel>
      <Card style={{ paddingVertical: 4 }}>
        {FAQS.map((f, i) => (
          <View key={f.q} style={{ borderBottomWidth: i < FAQS.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <Pressable
              onPress={() => setOpen(open === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={f.q}
              accessibilityState={{ expanded: open === i }}
              style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 }}
            >
              <AppText variant="body" style={{ flex: 1, fontFamily: fonts.medium }}>
                {f.q}
              </AppText>
              <View style={{ transform: [{ rotate: open === i ? '180deg' : '0deg' }] }}>
                <Icon name="chevronDown" size={18} color={colors.lineStrong} />
              </View>
            </Pressable>
            {open === i ? (
              <AppText variant="body" tone="secondary" style={{ paddingBottom: 12 }}>
                {f.a}
              </AppText>
            ) : null}
          </View>
        ))}
      </Card>
    </Page>
  )
}

export function SupportScreen() {
  const toast = useToast()
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) {
    return (
      <Page title="Falar com suporte">
        <Card style={{ gap: 6 }} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">Mensagem enviada</AppText>
          <AppText variant="body" tone="secondary">
            A equipe do app recebeu sua mensagem.
          </AppText>
        </Card>
        <Button label="Voltar" variant="outline" onPress={() => router.back()} />
      </Page>
    )
  }
  return (
    <Page title="Falar com suporte">
      <TextField label="Como podemos ajudar?" value={text} onChangeText={setText} multiline placeholder="Conte o que aconteceu" />
      {IS_PREVIEW ? (
        <AppText variant="small" tone="secondary">
          Na prévia, a mensagem não sai do aparelho.
        </AppText>
      ) : null}
      <Button
        label="Enviar"
        disabled={!text.trim()}
        onPress={() => {
          setSent(true)
          toast('Mensagem enviada')
        }}
      />
    </Page>
  )
}
