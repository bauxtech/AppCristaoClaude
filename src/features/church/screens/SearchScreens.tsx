import { router, useLocalSearchParams } from 'expo-router'
import { useRemoteState } from '../../../state/connection'
import { ErrorState, SkeletonCard } from '../../../components'
import { useEffect, useState } from 'react'
import { IS_REMOTE } from '../../../lib/supabase'
import { currentUserId } from '../../../lib/sync'
import { uuid } from '../../../lib/uuid'
import { fetchChurch, searchChurches, type SearchResult } from '../sync'
import type { Church } from '../data'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, EmptyState, Page, SelectCard, Tag, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useChurch } from '../ChurchContext'
import { DENOMINATIONS, DIRECTORY, searchDirectory } from '../data'
import { ACCESS_ITEMS, accessState } from './format'

/** Igrejas da última busca, para a tela de confirmar abrir sem buscar de novo. */
const found = new Map<string, Church>()

const SEARCH_TEXT: Record<Exclude<SearchResult['kind'], 'ok'>, string> = {
  invalid: 'Esse CNPJ não é válido. Confira os números.',
  not_found: 'Não achamos esse CNPJ na Receita.',
  not_religious: 'Esse CNPJ não é de uma organização religiosa. Confira o número ou cadastre à mão.',
  inactive: 'Esse CNPJ não está ativo na Receita. Cadastre à mão, se a igreja funciona.',
  limit: 'Você chegou ao limite de buscas por CNPJ de hoje. Tente amanhã ou busque pelo nome.',
  failed: 'Não foi possível buscar agora. Confira a internet e tente de novo.',
}

/** Com servidor: busca no banco (nome ou cidade) ou na Receita (CNPJ completo), um pouco depois de a pessoa parar de digitar. */
function useRemoteSearch(q: string) {
  const [state, setState] = useState<{ q: string; result: SearchResult } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!IS_REMOTE) return
    const text = q.trim()
    if (text.length < 2) return setState(null)
    let alive = true
    setBusy(true)
    const t = setTimeout(() => {
      searchChurches(text, currentUserId()).then((result) => {
        if (!alive) return
        if (result.kind === 'ok') result.list.forEach((c) => found.set(c.id, c))
        setState({ q: text, result })
        setBusy(false)
      })
    }, 500)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])
  return { state, busy }
}

export function SearchChurchScreen() {
  const { colors } = useTheme()
  const [q, setQ] = useState('')
  const [libras, setLibras] = useState(false)
  const search = useRemoteSearch(q)
  const remoteList = search.state?.result.kind === 'ok' ? search.state.result.list : []
  const results = IS_REMOTE ? remoteList.filter((c) => !libras || c.accessibility.libras) : searchDirectory(q, libras)
  const failure = IS_REMOTE && search.state && search.state.result.kind !== 'ok' ? SEARCH_TEXT[search.state.result.kind] : null
  const remote = useRemoteState()
  if (q.trim() && (!remote.online || remote.loading || remote.error)) {
    return (
      <Page title="Buscar igreja">
        <TextField label="Nome, cidade ou CNPJ" value={q} onChangeText={setQ} placeholder="Ex.: Batista Central" autoCorrect={false} />
        {remote.loading ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        ) : (
          <ErrorState message={remote.online ? 'Não foi possível buscar.' : 'A busca precisa de internet.'} onRetry={remote.retry} />
        )}
        <Button label="Cadastrar à mão" variant="outline" onPress={() => router.push('/igreja/cadastrar')} />
      </Page>
    )
  }
  return (
    <Page title="Buscar igreja">
      <TextField label="Nome, cidade ou CNPJ" value={q} onChangeText={setQ} placeholder="Ex.: Batista Central" autoFocus autoCorrect={false} />
      <View style={{ flexDirection: 'row' }}>
        <Chip label="Tem intérprete de Libras" selected={libras} onPress={() => setLibras((v) => !v)} />
      </View>
      {search.busy ? <SkeletonCard lines={2} /> : null}
      {failure ? (
        <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <AppText variant="body">{failure}</AppText>
        </Card>
      ) : null}
      {q.trim() && !search.busy && !failure ? (
        results.length === 0 ? (
          <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
            <AppText variant="bodyStrong">{`Nenhuma igreja encontrada para "${q.trim()}"`}</AppText>
            <AppText variant="body" tone="secondary">
              Confira o nome ou cadastre à mão.
            </AppText>
          </Card>
        ) : (
          <AppText variant="label" tone="secondary" accessibilityLiveRegion="polite">{`${results.length} ${results.length === 1 ? 'RESULTADO' : 'RESULTADOS'}`}</AppText>
        )
      ) : null}
      {results.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: '/igreja/confirmar', params: { id: c.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${c.name}, ${c.city}${c.cnpj ? `, CNPJ ${c.cnpj}` : ', cadastrada à mão'}${c.accessibility.libras ? ', tem intérprete de Libras' : ''}`}
          style={({ pressed }) => ({ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 4, opacity: pressed ? 0.8 : 1 })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {c.name}
            </AppText>
            {c.accessibility.libras ? <Tag label="Libras" /> : null}
          </View>
          <AppText variant="small" tone="secondary">
            {c.city}
          </AppText>
          <AppText variant="small" tone="secondary" style={{ fontFamily: fonts.medium }}>{c.cnpj ? `CNPJ ${c.cnpj}` : 'Cadastrada à mão'}</AppText>
        </Pressable>
      ))}
      <Button label="Cadastrar à mão" variant="outline" onPress={() => router.push('/igreja/cadastrar')} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        {IS_REMOTE ? 'Digite o nome, a cidade ou o CNPJ completo. Pelo CNPJ, nome e endereço vêm dos dados públicos da Receita.' : 'Nome e endereço vêm dos dados públicos do CNPJ.'}
      </AppText>
    </Page>
  )
}

export function ConfirmChurchScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { addChurch, churches } = useChurch()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loaded, setLoaded] = useState<Church | null>(() => (IS_REMOTE ? (found.get(id) ?? null) : (DIRECTORY.find((x) => x.id === id) ?? null)))
  const [loading, setLoading] = useState(IS_REMOTE && !loaded)
  useEffect(() => {
    if (!IS_REMOTE || loaded) return
    fetchChurch(id, currentUserId()).then((c) => {
      setLoaded(c)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  const c = loaded
  const [relation, setRelation] = useState<'frequento' | 'visito'>(churches.length ? 'visito' : 'frequento')
  if (loading) {
    return (
      <Page title="Confirmar igreja">
        <SkeletonCard lines={3} />
      </Page>
    )
  }
  if (!c) {
    return (
      <Page title="Confirmar igreja">
        <EmptyState text="Igreja não encontrada." />
      </Page>
    )
  }
  return (
    <Page title="Confirmar igreja">
      <Card style={{ gap: 8 }}>
        <AppText variant="title">{c.name}</AppText>
        <AppText variant="body" tone="secondary">
          {c.address}
        </AppText>
        <AppText variant="small" tone="secondary">{c.cnpj ? `CNPJ ${c.cnpj}` : 'Cadastrada à mão'}</AppText>
        <View style={{ borderRadius: 12, backgroundColor: colors.primarySoft, padding: 12, gap: 6 }}>
          <AppText variant="small" style={{ fontFamily: fonts.semibold, color: colors.primary }}>
            Acessibilidade
          </AppText>
          {ACCESS_ITEMS.map((it) => (
            <View key={it.key} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessible accessibilityLabel={`${it.label}: ${accessState(c.accessibility, it.key)}`}>
              <Icon name={c.accessibility[it.key] ? 'check' : c.accessibility[it.key] === false ? 'close' : 'info'} size={12} color={colors.text} strokeWidth={3} />
              <AppText variant="small">{`${it.label}: ${accessState(c.accessibility, it.key).toLowerCase()}`}</AppText>
            </View>
          ))}
        </View>
      </Card>
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Esta igreja é">
        <SelectCard kind="radio" label="Frequento" description="A igreja principal, que aparece na aba Igreja" selected={relation === 'frequento'} onPress={() => setRelation('frequento')} />
        <SelectCard kind="radio" label="Visito" description="Fica em Minhas igrejas" selected={relation === 'visito'} onPress={() => setRelation('visito')} />
      </View>
      <Button
        label="Vincular igreja"
        onPress={() => {
          addChurch(c, relation)
          toast('Igreja vinculada')
          router.dismissTo('/igreja')
        }}
      />
      <Button label="Não é essa" variant="text" onPress={() => router.back()} />
    </Page>
  )
}

export function ManualChurchScreen() {
  const toast = useToast()
  const { addChurch, churches } = useChurch()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [address, setAddress] = useState('')
  const [denom, setDenom] = useState<string | null>(null)
  return (
    <Page title="Cadastrar à mão">
      <TextField label="Nome da igreja (obrigatório)" value={name} onChangeText={setName} placeholder="Ex.: Igreja Batista do Bairro" maxLength={100} />
      <TextField label="Cidade (obrigatório)" value={city} onChangeText={setCity} placeholder="Ex.: São Paulo, SP" maxLength={60} />
      <TextField label="Bairro" value={neighborhood} onChangeText={setNeighborhood} maxLength={60} />
      <TextField label="Endereço" value={address} onChangeText={setAddress} placeholder="Ex.: Rua das Flores, 1234" maxLength={120} />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Denominação">
        <AppText variant="bodyStrong">Denominação</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DENOMINATIONS.map((d) => (
            <Chip key={d} label={d} selected={denom === d} onPress={() => setDenom(denom === d ? null : d)} />
          ))}
        </View>
      </View>
      <Button
        label="Salvar"
        disabled={!name.trim() || !city.trim()}
        onPress={() => {
          const full = [address.trim(), neighborhood.trim(), city.trim()].filter(Boolean).join(', ')
          addChurch(
            { id: IS_REMOTE ? uuid() : `manual-${Date.now()}`, ...(IS_REMOTE ? { mine: true } : {}), name: name.trim(), city: city.trim(), neighborhood: neighborhood.trim(), address: full, denomination: denom ?? undefined, source: 'manual', services: [], accessibility: {}, events: [] },
            churches.length ? 'visito' : 'frequento',
          )
          toast('Igreja cadastrada')
          router.dismissTo('/igreja')
        }}
      />
    </Page>
  )
}
