import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import { Image, Share, View } from 'react-native'
import { AppText, Button, Card, Icon, Page, SectionLabel, TextField, useToast } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { useCell } from '../CellContext'
import type { Cell } from '../data'
import { checkSlugRemote, cleanSlugInput, removeLogoRemote, setSlugRemote, SLUG_MESSAGE, slugFormatOk, uploadLogoRemote, WEB_BASE, webUrl, type SlugStatus } from '../webPage'
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
  const link = cell.webSlug ? webUrl(cell.webSlug) : null

  async function saveSlug() {
    setSaving(true)
    setError(null)
    const r = await setSlugRemote(cell.id, slug)
    setSaving(false)
    if (r !== 'ok') return setError(SLUG_MESSAGE[r])
    update((c) => ({ ...c, webSlug: slug }))
    toast('Endereço da página salvo')
  }

  async function pickLogo() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 })
    const a = !res.canceled ? res.assets[0] : null
    if (!a) return
    setLogoBusy(true)
    setError(null)
    const r = await uploadLogoRemote(cell.id, a.uri, a.mimeType ?? 'image/jpeg', cell.logoPath)
    setLogoBusy(false)
    if (!r.ok) return setError(LOGO_ERROR[r.reason])
    update((c) => ({ ...c, logoUrl: r.url, logoPath: r.path, logoHidden: false }))
    toast('Logo da célula trocado')
  }

  async function removeLogo() {
    setLogoBusy(true)
    const r = await removeLogoRemote(cell.id, cell.logoPath)
    setLogoBusy(false)
    if (r !== 'ok') return setError(LOGO_ERROR[r])
    update((c) => ({ ...c, logoUrl: null, logoPath: null }))
    toast('Logo removido')
  }

  return (
    <Page title="Página na internet">
      <AppText variant="body" tone="secondary">
        Quem não tem o app vê a página da célula: nome, dia, horário e bairro. O endereço completo aparece só para quem deixa nome e telefone.
      </AppText>

      <Card style={{ gap: 12 }}>
        <SectionLabel>Link da página</SectionLabel>
        {link ? (
          <>
            <AppText variant="bodyStrong" selectable>
              {link.replace('https://', '')}
            </AppText>
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
          </>
        ) : (
          <AppText variant="body" tone="secondary">
            Escolha um endereço para a página. Duas células podem ter o mesmo nome, mas cada endereço é de uma só.
          </AppText>
        )}
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
        <SectionLabel>Logo da célula</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {cell.logoUrl ? (
              <Image source={{ uri: cell.logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={`Logo da célula ${cell.name}`} />
            ) : (
              <Icon name="image" size={24} color={colors.textSecondary} />
            )}
          </View>
          <AppText variant="small" tone="secondary" style={{ flex: 1 }}>
            {cell.logoUrl ? 'Aparece no topo da página.' : 'Sem logo, a página mostra só o nome da célula. Imagem quadrada, até 1 MB.'}
          </AppText>
        </View>
        {cell.logoHidden ? (
          <AppText variant="small" tone="danger">
            A equipe do acasa tirou o logo da página depois de uma denúncia. Você pode enviar outro.
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label={logoBusy ? 'Enviando' : cell.logoUrl ? 'Trocar logo' : 'Escolher logo'} icon="upload" variant="soft" size="sm" onPress={pickLogo} disabled={logoBusy} />
          {cell.logoUrl ? <Button label="Remover logo" variant="text" size="sm" onPress={removeLogo} disabled={logoBusy} /> : null}
        </View>
        <AppText variant="small" tone="secondary">
          O logo fica público na internet. Quem abre a página pode denunciar, e a equipe do acasa pode tirar do ar.
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
