import { router, useLocalSearchParams } from 'expo-router'
import { useRemoteState } from '../../../state/connection'
import { ErrorState, SkeletonCard } from '../../../components'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { AppText, Button, Card, Chip, EmptyState, Page, SelectCard, Tag, TextField, useToast } from '../../../components'
import { Icon } from '../../../components/Icon'
import { useTheme } from '../../../theme/ThemeProvider'
import { fonts } from '../../../theme/typography'
import { useChurch } from '../ChurchContext'
import { DENOMINATIONS, DIRECTORY, searchDirectory } from '../data'
import { ACCESS_ITEMS, accessState } from './format'

export function SearchChurchScreen() {
  const { colors } = useTheme()
  const [q, setQ] = useState('')
  const [libras, setLibras] = useState(false)
  const results = searchDirectory(q, libras)
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
      {q.trim() ? (
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
          accessibilityLabel={`${c.name}, ${c.city}, CNPJ ${c.cnpj}${c.accessibility.libras ? ', tem intérprete de Libras' : ''}`}
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
          <AppText variant="small" tone="secondary" style={{ fontFamily: fonts.medium }}>{`CNPJ ${c.cnpj}`}</AppText>
        </Pressable>
      ))}
      <Button label="Cadastrar à mão" variant="outline" onPress={() => router.push('/igreja/cadastrar')} />
      <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
        Nome e endereço vêm dos dados públicos do CNPJ.
      </AppText>
    </Page>
  )
}

export function ConfirmChurchScreen() {
  const { colors } = useTheme()
  const toast = useToast()
  const { addChurch, churches } = useChurch()
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = DIRECTORY.find((x) => x.id === id)
  const [relation, setRelation] = useState<'frequento' | 'visito'>(churches.length ? 'visito' : 'frequento')
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
        <AppText variant="small" tone="secondary">{`CNPJ ${c.cnpj}`}</AppText>
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
            { id: `manual-${Date.now()}`, name: name.trim(), city: city.trim(), neighborhood: neighborhood.trim(), address: full, denomination: denom ?? undefined, source: 'manual', services: [], accessibility: {}, events: [] },
            churches.length ? 'visito' : 'frequento',
          )
          toast('Igreja cadastrada')
          router.dismissTo('/igreja')
        }}
      />
    </Page>
  )
}
