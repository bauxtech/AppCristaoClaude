import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import { Image, Share, View } from 'react-native'
import { AppText, Button, Card, Icon, ListRow, Page, SectionLabel, Switch, TextField, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { checkSlugRemote, cleanSlugInput, publicUrl, removePageImageRemote, setSlugRemote, SLUG_MESSAGE, slugFormatOk, uploadPageImageRemote, WEB_BASE, type PageImage, type SlugStatus } from '../webPage'
import { CellGuard } from './Guard'

/** Campo do endereço da página, com a conferência de que está livre enquanto o líder digita. */
export function SlugField({ value, onChange, cellId, current, onStatus }: { value: string; onChange: (v: string) => void; cellId?: string; current?: string | null; onStatus?: (s: SlugStatus | 'checking' | null) => void }) {
  const { colors } = useTheme()
  const [status, setStatus] = useState<SlugStatus | 'checking' | null>(null)

  useEffect(() => {
    if (!value || value === current) {
      setStatus(null)
      onStatus?.(null)
      return
    }
    if (!slugFormatOk(value)) {
      setStatus('invalid')
      onStatus?.('invalid')
      return
    }
    setStatus('checking')
    onStatus?.('checking')
    let alive = true
    const t = setTimeout(() => {
      void checkSlugRemote(value, cellId).then((s) => {
        if (!alive) return
        setStatus(s)
        onStatus?.(s)
      })
    }, 500)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // onStatus muda a cada render de quem usa: a conferência depende só do texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, cellId, current])

  const message = status === 'checking' ? 'Conferindo se está livre' : status === 'ok' ? 'Endereço livre' : status ? SLUG_MESSAGE[status] : null

  return (
    <View style={{ gap: 6 }}>
      <TextField
        label="Endereço da página"
        value={value}
        onChangeText={(t) => onChange(cleanSlugInput(t))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        placeholder="nome-da-celula"
        hint={`${WEB_BASE}${value || 'nome-da-celula'}`}
        error={status && status !== 'ok' && status !== 'checking' ? message! : undefined}
      />
      {status === 'ok' || status === 'checking' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLiveRegion="polite">
          {status === 'ok' ? <Icon name="checkCircle" size={16} color={colors.primary} /> : null}
          <AppText variant="small" tone={status === 'ok' ? 'brand' : 'secondary'}>
            {message}
          </AppText>
        </View>
      ) : null}
    </View>
  )
}

export function WebPageScreen() {
  return <CellGuard title="Página na internet" action="editCell">{(cell) => <WebPage cell={cell} />}</CellGuard>
}

const LOGO_ERROR = {
  too_big: 'A imagem passa de 1 MB. Escolha uma imagem menor.',
  no_access: 'Só o líder de uma célula ativa troca o logo.',
  failed: 'Não foi possível enviar o logo. Confira a internet e tente de novo.',
}

function WebPage({ cell }: { cell: Cell }) {
  const { colors } = useTheme()
  const toast = useToast()
  const { update } = useCell()
  const [slug, setSlug] = useState(cell.webSlug ?? '')
  const [status, setStatus] = useState<SlugStatus | 'checking' | null>(null)
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bio, setBio] = useState(cell.webBio ?? '')
  const showSchedule = cell.webShowSchedule ?? true
  // Sem endereço próprio, vale o link pelo código de convite.
  const link = publicUrl(cell)

  async function saveSlug() {
    setSaving(true)
    setError(null)
    const r = await setSlugRemote(cell.id, slug)
    setSaving(false)
    if (r !== 'ok') return setError(SLUG_MESSAGE[r])
    update((c) => ({ ...c, webSlug: slug }))
    toast('Endereço da página salvo')
  }

  // Capa larga (3 por 1, como LinkedIn e Dribbble) e logo quadrado.
  const IMAGE = {
    logo: { aspect: [1, 1] as [number, number], name: 'logo', changed: 'Logo da célula trocado', removed: 'Logo removido' },
    capa: { aspect: [3, 1] as [number, number], name: 'capa', changed: 'Capa da página trocada', removed: 'Capa removida' },
  }

  async function pickImage(kind: PageImage) {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: IMAGE[kind].aspect, quality: 0.6 })
    const a = !res.canceled ? res.assets[0] : null
    if (!a) return
    setLogoBusy(true)
    setError(null)
    const r = await uploadPageImageRemote(kind, cell.id, a.uri, a.mimeType ?? 'image/jpeg', kind === 'logo' ? cell.logoPath : cell.webCoverPath)
    setLogoBusy(false)
    if (!r.ok) return setError(LOGO_ERROR[r.reason])
    update((c) => (kind === 'logo' ? { ...c, logoUrl: r.url, logoPath: r.path, logoHidden: false } : { ...c, webCoverUrl: r.url, webCoverPath: r.path, webCoverHidden: false }))
    toast(IMAGE[kind].changed)
  }

  async function removeImage(kind: PageImage) {
    setLogoBusy(true)
    const r = await removePageImageRemote(kind, cell.id, kind === 'logo' ? cell.logoPath : cell.webCoverPath)
    setLogoBusy(false)
    if (r !== 'ok') return setError(LOGO_ERROR[r])
    update((c) => (kind === 'logo' ? { ...c, logoUrl: null, logoPath: null } : { ...c, webCoverUrl: null, webCoverPath: null }))
    toast(IMAGE[kind].removed)
  }

  return (
    <Page title="Página na internet">
      <AppText variant="body" tone="secondary">
        A página mostra nome, tipo, o texto sobre a célula, bairro e, se você quiser, dia e horário. Endereço, roteiro e pedidos de oração ficam só no app. Quem quer participar deixa nome e telefone e recebe o código para entrar pelo app.
      </AppText>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Sobre a célula</SectionLabel>
        <TextField
          label="Texto da página"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={300}
          placeholder="Quem somos, como é o encontro"
          hint={`${bio.length} de 300 letras. Não coloque endereço nem telefone: a página é pública.`}
        />
        <Button
          label="Salvar texto"
          onPress={() => {
            update((c) => ({ ...c, webBio: bio.trim() }))
            toast('Texto da página salvo')
          }}
          disabled={bio.trim() === (cell.webBio ?? '').trim()}
        />
        <ListRow
          label="Mostrar dia e horário na página"
          right={<Switch label="Mostrar dia e horário na página" value={showSchedule} onChange={(v) => update((c) => ({ ...c, webShowSchedule: v }))} />}
        />
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Link da página</SectionLabel>
        <AppText variant="bodyStrong" selectable>
          {link.replace('https://', '')}
        </AppText>
        {cell.webSlug ? null : (
          <AppText variant="small" tone="secondary">
            Este é o link pelo código de convite. Escolha um endereço abaixo para ter um link com o nome da célula.
          </AppText>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label="Copiar link"
            icon="copy"
            variant="soft"
            size="sm"
            onPress={async () => {
              await Clipboard.setStringAsync(link)
              toast('Link copiado')
            }}
          />
          <Button label="Compartilhar" icon="external" variant="soft" size="sm" onPress={() => Share.share({ message: `${cell.name}: ${link}` }).catch(() => {})} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>{cell.webSlug ? 'Trocar o endereço' : 'Escolher o endereço'}</SectionLabel>
        <SlugField value={slug} onChange={setSlug} cellId={cell.id} current={cell.webSlug} onStatus={setStatus} />
        {cell.webSlug ? (
          <AppText variant="small" tone="secondary">
            Se trocar, o endereço antigo leva para o novo por 30 dias.
          </AppText>
        ) : null}
        <Button label={saving ? 'Salvando' : 'Salvar endereço'} onPress={saveSlug} disabled={saving || status !== 'ok' || slug === cell.webSlug} />
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Capa e logo</SectionLabel>
        {/* Prévia de como fica o topo da página: capa larga e o logo por cima, no canto. */}
        <View accessible accessibilityLabel={`Prévia do topo da página: ${cell.webCoverUrl ? 'com capa' : 'sem capa'} e ${cell.logoUrl ? 'com logo' : 'sem logo'}`} style={{ paddingBottom: 28 }}>
          <View style={{ aspectRatio: 3, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            {cell.webCoverUrl ? <Image source={{ uri: cell.webCoverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Icon name="image" size={24} color={colors.primary} />}
          </View>
          <View style={{ position: 'absolute', left: 16, bottom: 0, width: 64, height: 64, borderRadius: 16, borderWidth: 3, borderColor: colors.card, backgroundColor: colors.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {cell.logoUrl ? <Image source={{ uri: cell.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Icon name="people" size={22} color={colors.textSecondary} />}
          </View>
        </View>
        {cell.webCoverHidden ? (
          <AppText variant="small" tone="danger">
            A equipe do acasa tirou a capa da página depois de uma denúncia. Você pode enviar outra.
          </AppText>
        ) : null}
        {cell.logoHidden ? (
          <AppText variant="small" tone="danger">
            A equipe do acasa tirou o logo da página depois de uma denúncia. Você pode enviar outro.
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={logoBusy ? 'Enviando' : cell.webCoverUrl ? 'Trocar capa' : 'Escolher capa'} icon="upload" variant="soft" size="sm" onPress={() => pickImage('capa')} disabled={logoBusy} />
          {cell.webCoverUrl ? <Button label="Remover capa" variant="text" size="sm" onPress={() => removeImage('capa')} disabled={logoBusy} /> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={logoBusy ? 'Enviando' : cell.logoUrl ? 'Trocar logo' : 'Escolher logo'} icon="upload" variant="soft" size="sm" onPress={() => pickImage('logo')} disabled={logoBusy} />
          {cell.logoUrl ? <Button label="Remover logo" variant="text" size="sm" onPress={() => removeImage('logo')} disabled={logoBusy} /> : null}
        </View>
        <AppText variant="small" tone="secondary">
          Capa larga e logo quadrado, até 1 MB cada. Ficam públicos na internet: quem abre a página pode denunciar, e a equipe do acasa pode tirar do ar.
        </AppText>
      </Card>

      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </Page>
  )
}
