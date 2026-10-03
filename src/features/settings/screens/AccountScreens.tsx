import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Avatar, Button, Card, Chip, ConfirmCard, EmptyState, Icon, ListRow, Page, SectionLabel, SelectCard, TextField, useToast } from '../../../components'
import { IS_PREVIEW } from '../../../lib/preview'
import { useSession } from '../../../state/session'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useBible } from '../../bible/BibleContext'
import { useCell } from '../../cell/CellContext'
import { useChat } from '../../chat/ChatContext'
import { usePrayer } from '../../prayer/PrayerContext'
import { useProfile } from '../../profile/ProfileContext'
import { useSermons } from '../../sermon/SermonContext'
import { DELETE_DAYS, REPORT_REASONS, useSettings } from '../SettingsContext'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const longDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

function XItem({ text }: { text: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 2 }}>
      <Icon name="close" size={14} color={colors.danger} strokeWidth={2.5} />
      <AppText variant="body" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  )
}

/** Quantidades reais do que está guardado na conta. */
export function useDataCounts() {
  const bible = useBible()
  const prayer = usePrayer()
  const profile = useProfile()
  const { sermons } = useSermons()
  const chat = useChat()
  const bibleNotes = Object.values(bible.notes).filter(Boolean).length
  return [
    { label: 'Cultos gravados', count: sermons.length, extra: sermons.filter((s) => s.audioUri).length ? `${sermons.filter((s) => s.audioUri).length} com áudio guardado` : undefined },
    { label: 'Anotações', count: bibleNotes + profile.notes.length },
    { label: 'Grifos e favoritos', count: Object.keys(bible.highlights).length + bible.favorites.length },
    { label: 'Pedidos de oração', count: prayer.requests.length },
    { label: 'Entradas do diário', count: prayer.diary.length },
    { label: 'Conversas do chat', count: chat.conversations.length },
    { label: 'Capítulos lidos', count: new Set(bible.readChapters).size },
    { label: 'Marcos da jornada', count: profile.milestones.length },
    { label: 'Foto de perfil', count: profile.photoUri ? 1 : 0 },
  ]
}

/** Pede o arquivo. Sem e-mail, pede para cadastrar antes. */
export function DownloadDataCard({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const { profile } = useSession()
  const [confirm, setConfirm] = useState(false)
  const [sent, setSent] = useState(false)
  if (sent) {
    return (
      <Card style={{ gap: 4 }} accessibilityLiveRegion="polite">
        <AppText variant="bodyStrong">Pedido recebido</AppText>
        <AppText variant="small" tone="secondary">
          {`O arquivo chega em ${profile.email} quando estiver pronto.`}
        </AppText>
      </Card>
    )
  }
  if (!profile.email) {
    return (
      <Card style={{ gap: 8 }}>
        <AppText variant="bodyStrong">Baixar meus dados</AppText>
        <AppText variant="small" tone="secondary">
          O arquivo é enviado por e-mail. Cadastre um e-mail na sua conta para pedir.
        </AppText>
        <Button label="Cadastrar e-mail" variant="soft" size="sm" onPress={() => router.push('/configuracoes/conta')} />
      </Card>
    )
  }
  if (!confirm) return <ListRow label="Baixar meus dados" sub="Anotações, progresso, pedidos, gravações" onPress={() => setConfirm(true)} />
  return (
    <ConfirmCard
      title="Confirmar download?"
      message={`Vamos juntar tudo em um arquivo e enviar para ${profile.email}.`}
      confirmLabel="Confirmar"
      danger={false}
      onCancel={() => setConfirm(false)}
      onConfirm={() => {
        setSent(true)
        toast('O arquivo chegará por e-mail')
        onDone?.()
      }}
    />
  )
}

export function MyDataScreen() {
  const s = useSettings()
  return (
    <Page title="Meus dados">
      <Card style={{ paddingVertical: 4 }}>
        <ListRow label="Ver o que está guardado" sub="Resumo por categoria" onPress={() => router.push('/configuracoes/dados-guardados')} />
      </Card>
      <DownloadDataCard />
      <Card style={{ paddingVertical: 4 }}>
        {s.faithConsent ? (
          <ListRow label="Retirar consentimento" sub="Seus dados religiosos deixarão de ser usados" danger onPress={() => router.push('/configuracoes/consentimento')} />
        ) : (
          <ListRow label="Consentimento retirado" sub="Toque para dar o consentimento de novo" onPress={() => router.push('/configuracoes/consentimento')} />
        )}
      </Card>
      {IS_PREVIEW ? (
        <AppText variant="small" tone="secondary">
          Na prévia, o pedido do arquivo não sai do aparelho.
        </AppText>
      ) : null}
    </Page>
  )
}

export function DataSummaryScreen() {
  const { colors } = useTheme()
  const counts = useDataCounts()
  const total = counts.reduce((a, c) => a + c.count, 0)
  return (
    <Page title="Dados armazenados">
      {total === 0 ? (
        <Card>
          <AppText variant="body" tone="secondary">
            Ainda não há nada guardado além do seu nome e telefone.
          </AppText>
        </Card>
      ) : null}
      <Card style={{ paddingVertical: 4 }}>
        {counts.map((c, i) => (
          <View key={c.label} accessible accessibilityLabel={`${c.label}: ${c.count}${c.extra ? `, ${c.extra}` : ''}`} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 8, borderBottomWidth: i < counts.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontFamily: fonts.medium }}>
                {c.label}
              </AppText>
              {c.extra ? (
                <AppText variant="small" tone="secondary">
                  {c.extra}
                </AppText>
              ) : null}
            </View>
            <AppText variant="bodyStrong" tone="secondary">
              {String(c.count)}
            </AppText>
          </View>
        ))}
      </Card>
      <AppText variant="small" tone="secondary">
        Também ficam guardados o nome, o telefone, a tradição escolhida e as células e igrejas que você participa.
      </AppText>
    </Page>
  )
}

const CONSENT_LOSES = ['Sugestões personalizadas de leitura', 'Conteúdo de fé baseado no seu perfil', 'Resumos adaptados ao seu progresso']

export function RevokeConsentScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const s = useSettings()
  const [step, setStep] = useState<1 | 2 | 'done'>(1)

  if (!s.faithConsent && step !== 'done') {
    return (
      <Page title="Consentimento">
        <Card style={{ gap: 6 }}>
          <AppText variant="bodyStrong">Consentimento retirado</AppText>
          <AppText variant="body" tone="secondary">
            Autorize de novo o uso dos seus dados religiosos (tradição, hábitos de leitura e oração) para personalizar sua experiência. Esses dados nunca são vendidos.
          </AppText>
        </Card>
        <Button
          label="Autorizar de novo"
          onPress={() => {
            s.update({ faithConsent: true })
            toast('Consentimento ativado')
            router.back()
          }}
        />
      </Page>
    )
  }

  if (step === 'done') {
    return (
      <Page title="Consentimento retirado">
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={28} color={colors.primary} strokeWidth={2.5} />
          </View>
          <AppText variant="bodyStrong">Consentimento retirado.</AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
            Você pode voltar às configurações a qualquer momento para reativar.
          </AppText>
        </View>
        <Button label="Voltar" onPress={() => router.back()} />
      </Page>
    )
  }

  return (
    <Page title="Retirar consentimento">
      <AppText variant="body" tone="secondary">
        Ao retirar o consentimento, o seguinte deixará de funcionar:
      </AppText>
      <Card style={{ gap: 4 }}>
        {CONSENT_LOSES.map((t) => (
          <XItem key={t} text={t} />
        ))}
      </Card>
      {step === 1 ? (
        <Button label="Continuar" variant="dangerSoft" onPress={() => setStep(2)} />
      ) : (
        <ConfirmCard
          title="Tem certeza?"
          message="Essa ação pode ser revertida nas configurações."
          confirmLabel="Retirar"
          onCancel={() => setStep(1)}
          onConfirm={() => {
            s.update({ faithConsent: false })
            setStep('done')
          }}
        />
      )}
    </Page>
  )
}

export function BlockScreen() {
  const toast = useToast()
  const { cell } = useCell()
  const s = useSettings()
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null)
  const others = (cell?.members ?? []).filter((m) => !m.isMe && !s.blocked.some((b) => b.id === m.id))

  return (
    <Page title="Bloquear ou denunciar">
      <AppText variant="body" tone="secondary">
        Se alguém na sua célula está te incomodando, você pode bloqueá-la ou denunciá-la. O que a pessoa bloqueada publica some para você.
      </AppText>
      {confirm ? (
        <ConfirmCard
          title={`Bloquear ${confirm.name}?`}
          message="Os avisos, pedidos e fotos dessa pessoa somem para você. Você pode desbloquear depois."
          confirmLabel="Bloquear"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            s.block(confirm.id, confirm.name)
            setConfirm(null)
            toast('Bloqueado')
          }}
        />
      ) : null}
      {!cell ? (
        <Card>
          <AppText variant="body" tone="secondary">
            Você ainda não participa de uma célula. Quando entrar em uma, os membros aparecem aqui.
          </AppText>
        </Card>
      ) : others.length === 0 ? (
        <EmptyState text="Não há outras pessoas na célula para bloquear." />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {others.map((m, i) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: i < others.length - 1 ? 1 : 0, borderBottomColor: 'transparent' }}>
              <Avatar name={m.name} size={36} />
              <AppText variant="body" style={{ flex: 1, fontFamily: fonts.medium }}>
                {m.name}
              </AppText>
              <Button label="Bloquear" variant="soft" size="sm" onPress={() => setConfirm({ id: m.id, name: m.name })} accessibilityHint={`Bloquear ${m.name}`} />
            </View>
          ))}
        </Card>
      )}
      <Button label="Denunciar alguém" variant="outline" onPress={() => router.push('/configuracoes/denunciar')} />

      <SectionLabel>Bloqueados</SectionLabel>
      {s.blocked.length === 0 ? (
        <EmptyState text="Ninguém bloqueado." />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {s.blocked.map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <AppText variant="body" style={{ flex: 1, fontFamily: fonts.medium }}>
                {b.name}
              </AppText>
              <Button
                label="Desbloquear"
                variant="soft"
                size="sm"
                accessibilityHint={`Desbloquear ${b.name}`}
                onPress={() => {
                  s.unblock(b.id)
                  toast('Desbloqueado')
                }}
              />
            </View>
          ))}
        </Card>
      )}
    </Page>
  )
}

export function ReportScreen() {
  const s = useSettings()
  const { cell } = useCell()
  const people = (cell?.members ?? []).filter((m) => !m.isMe)
  const [who, setWho] = useState<string | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(false)
  const [sent, setSent] = useState(false)
  const person = people.find((p) => p.id === who)

  if (sent) {
    return (
      <Page title="Denúncia enviada">
        <Card style={{ gap: 6 }} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">Recebemos sua denúncia</AppText>
          <AppText variant="body" tone="secondary">
            A equipe do app vai analisar.
          </AppText>
        </Card>
        <Button label="Voltar" variant="outline" onPress={() => router.back()} />
      </Page>
    )
  }

  return (
    <Page title="Denunciar">
      {people.length > 0 ? (
        <>
          <SectionLabel>Quem você quer denunciar</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Pessoa">
            {people.map((p) => (
              <Chip key={p.id} label={p.name} selected={who === p.id} onPress={() => setWho(p.id)} />
            ))}
          </View>
        </>
      ) : (
        <AppText variant="body" tone="secondary">
          Para denunciar um aviso, pedido ou foto, toque em Denunciar no próprio conteúdo. Aqui você descreve outro problema para a equipe do app.
        </AppText>
      )}
      <SectionLabel>Motivo da denúncia</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Motivo">
        {REPORT_REASONS.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <TextField label="Detalhe (opcional)" value={detail} onChangeText={setDetail} multiline placeholder="Conte o que aconteceu" />
      {person ? <SelectCard kind="checkbox" label={`Também bloquear ${person.name}`} description="O que essa pessoa publica some para você." selected={alsoBlock} onPress={() => setAlsoBlock((v) => !v)} /> : null}
      <Button
        label="Denunciar"
        disabled={!reason || (people.length > 0 && !who)}
        onPress={() => {
          s.report({ reason: reason!, detail: detail.trim(), target: person?.name })
          if (person && alsoBlock) s.block(person.id, person.name)
          setSent(true)
        }}
      />
    </Page>
  )
}

export function SignOutScreen() {
  const session = useSession()
  const [wipe, setWipe] = useState(false)
  return (
    <Page title="Sair da conta">
      <AppText variant="body" tone="secondary">
        Você será desconectado deste aparelho. Seus dados ficam salvos na nuvem.
      </AppText>
      <SelectCard kind="checkbox" label="Apagar dados baixados neste aparelho" description="Gravações de culto guardadas no aparelho serão removidas. A Bíblia offline fica." selected={wipe} onPress={() => setWipe((v) => !v)} />
      <Button
        label="Sair da conta"
        variant="outline"
        icon="logout"
        onPress={() => {
          session.signOut()
          router.replace('/entrar')
        }}
      />
    </Page>
  )
}

const DELETES = ['Perfil e foto', 'Histórico de leitura e progresso', 'Anotações e notas bíblicas', 'Pedidos de oração e diário', 'Gravações de culto', 'Dados de célula e célula que você lidera']

export function DeleteAccountScreen() {
  const { colors } = useTheme()
  const { cell } = useCell()
  const s = useSettings()
  const [step, setStep] = useState<1 | 2>(1)
  const [phrase, setPhrase] = useState('')
  const required = 'excluir minha conta'
  const me = cell?.members.find((m) => m.isMe)
  const othersActive = (cell?.members ?? []).filter((m) => !m.isMe && m.active).length
  const mustPassLeadership = me?.role === 'lider' && othersActive > 0 && !cell?.archived

  if (s.deletionAt) return <AccountDeletedScreen />

  if (step === 2) {
    const ok = phrase.trim().toLowerCase() === required
    return (
      <Page title="Confirmar exclusão" onBack={() => setStep(1)}>
        <AppText variant="body">{`Para confirmar, digite "${required}" no campo abaixo.`}</AppText>
        <TextField label="Frase de confirmação" value={phrase} onChangeText={setPhrase} placeholder={required} autoCapitalize="none" autoCorrect={false} />
        <AppText variant="small" tone="secondary">
          {`Seus dados serão apagados em até ${DELETE_DAYS} dias. Gravações, anotações, histórico de leitura e pedidos de oração serão perdidos permanentemente.`}
        </AppText>
        <Button
          label="Excluir conta permanentemente"
          variant="danger"
          disabled={!ok}
          onPress={() => {
            s.scheduleDeletion()
            router.replace('/configuracoes/exclusao')
          }}
        />
      </Page>
    )
  }

  return (
    <Page title="Excluir conta">
      {mustPassLeadership ? (
        <Card style={{ gap: 8, borderColor: colors.primary, backgroundColor: colors.primarySoft }}>
          <AppText variant="bodyStrong">Você é líder da célula</AppText>
          <AppText variant="body" tone="secondary">
            {`Antes de excluir a conta, passe a liderança de ${cell!.name} para outro membro ou arquive a célula.`}
          </AppText>
          <Button label="Passar liderança ou arquivar" variant="primary" size="sm" onPress={() => router.push('/celula/opcoes')} />
        </Card>
      ) : null}
      <AppText variant="body" tone="secondary">
        Antes de excluir, você pode baixar tudo o que está guardado.
      </AppText>
      <DownloadDataCard />
      <Card style={{ gap: 4 }}>
        <AppText variant="bodyStrong">O que será apagado:</AppText>
        {DELETES.map((t) => (
          <XItem key={t} text={t} />
        ))}
      </Card>
      <Button label="Continuar com a exclusão" variant="dangerSoft" disabled={mustPassLeadership} onPress={() => setStep(2)} />
    </Page>
  )
}

export function AccountDeletedScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const s = useSettings()
  if (!s.deletionAt) {
    return (
      <Page title="Exclusão cancelada">
        <AppText variant="body" tone="secondary">
          Sua conta continua ativa.
        </AppText>
        <Button label="Voltar" onPress={() => router.replace('/eu')} />
      </Page>
    )
  }
  return (
    <Page title="Conta marcada para exclusão" onBack={() => router.replace('/eu')}>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={32} color={colors.danger} />
        </View>
        <AppText variant="bodyStrong">Conta marcada para exclusão</AppText>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
          {`Sua conta será excluída em ${longDate(s.deletionAt)} (${DELETE_DAYS} dias).`}
        </AppText>
      </View>
      <Card style={{ gap: 4 }}>
        <AppText variant="bodyStrong">O que acontece na exclusão:</AppText>
        {['Perfil, foto e dados pessoais', 'Histórico de leitura e progresso', 'Anotações bíblicas e diário', 'Pedidos de oração', 'Gravações de culto'].map((t) => (
          <XItem key={t} text={t} />
        ))}
      </Card>
      <Button
        label="Cancelar exclusão"
        onPress={() => {
          s.cancelDeletion()
          toast('Exclusão cancelada')
          router.replace('/eu')
        }}
      />
    </Page>
  )
}
