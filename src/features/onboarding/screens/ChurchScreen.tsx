import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Button, Card, Chip, SelectCard, TextField } from '../../../components'
import { useSession } from '../../../state/session'
import { searchChurches } from '../data'
import { OnboardingScaffold } from '../OnboardingScaffold'

export function ChurchScreen() {
  const { updateProfile } = useSession()
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [manual, setManual] = useState({ name: '', city: '', denomination: '' })

  const results = searchChurches(query)

  function next() {
    if (mode === 'search') {
      const church = results.find((c) => c.id === selected)
      updateProfile({ church: church?.name ?? null })
    } else {
      updateProfile({ church: manual.name.trim() || null })
    }
    router.push('/celula-inicio')
  }

  return (
    <OnboardingScaffold
      title="Sua igreja"
      subtitle="Opcional. Vincula cultos, cursos e horários."
      step="igreja"
      onBack={() => router.back()}
      footer={
        <>
          <Button label="Continuar" onPress={next} />
          <Button label="Pular" variant="text" onPress={() => router.push('/celula-inicio')} style={{ alignSelf: 'center' }} />
        </>
      }
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Buscar" selected={mode === 'search'} onPress={() => setMode('search')} />
        <Chip label="Cadastrar à mão" selected={mode === 'manual'} onPress={() => setMode('manual')} />
      </View>

      {mode === 'search' ? (
        <View style={{ gap: 12 }}>
          <TextField
            label="Buscar igreja"
            value={query}
            onChangeText={(v) => {
              setQuery(v)
              setSelected(null)
            }}
            placeholder="Nome, cidade ou CNPJ"
            hint="Nome e endereço vêm dos dados públicos do CNPJ."
            returnKeyType="search"
          />
          {query.trim() && results.length === 0 ? (
            <Card style={{ gap: 8 }} accessibilityLiveRegion="polite">
              <AppText variant="bodyStrong">Nenhuma igreja encontrada</AppText>
              <AppText variant="body" tone="secondary">
                Confira o nome ou cadastre sua igreja à mão.
              </AppText>
              <Button label="Cadastrar à mão" variant="outline" onPress={() => setMode('manual')} />
            </Card>
          ) : null}
          {results.map((c) => (
            <SelectCard key={c.id} kind="radio" label={c.name} description={`${c.city} · CNPJ ${c.cnpj}`} selected={selected === c.id} onPress={() => setSelected(c.id)} />
          ))}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <TextField label="Nome da igreja" value={manual.name} onChangeText={(v) => setManual((m) => ({ ...m, name: v }))} placeholder="Ex.: Igreja Batista Central" />
          <TextField label="Cidade" value={manual.city} onChangeText={(v) => setManual((m) => ({ ...m, city: v }))} placeholder="Ex.: São Paulo, SP" />
          <TextField label="Denominação" value={manual.denomination} onChangeText={(v) => setManual((m) => ({ ...m, denomination: v }))} placeholder="Ex.: Batista" />
        </View>
      )}
    </OnboardingScaffold>
  )
}
