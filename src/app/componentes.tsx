import { router } from 'expo-router'
import { PreviewOnly } from '../features/subscription/AccessGuard'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { AppText, Button, Card, Chip, IconButton, ListRow, SectionLabel, Switch, Tag, TopBar, useToast } from '../components'
import { ProgressBar } from '../components/ProgressBar'
import { useTheme, type AppearancePreference } from '../theme/ThemeProvider'
import { verseText } from '../features/bible/text'

/** Vitrine dos componentes, para revisar no celular em todos os modos. Não é uma tela do produto. */
export default function ComponentesRoute() {
  return (
    <PreviewOnly>
      <Componentes />
    </PreviewOnly>
  )
}

function Componentes() {
  const { colors, preference, setPreference, highContrast, setHighContrastOverride } = useTheme()
  const toast = useToast()
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const [chip, setChip] = useState<string | null>('Gratidão')

  const modes: { id: AppearancePreference; label: string }[] = [
    { id: 'system', label: 'Do celular' },
    { id: 'light', label: 'Claro' },
    { id: 'dark', label: 'Escuro' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title="Componentes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <Card>
          <SectionLabel>Modo</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {modes.map((m) => (
              <Chip key={m.id} label={m.label} selected={preference === m.id} onPress={() => setPreference(m.id)} />
            ))}
          </View>
          <ListRow label="Alto contraste" right={<Switch label="Alto contraste" value={highContrast} onChange={(v) => setHighContrastOverride(v)} />} />
        </Card>

        <Card>
          <SectionLabel>Botões</SectionLabel>
          <View style={{ gap: 12 }}>
            <Button label="Principal" onPress={() => toast('Principal')} />
            <Button label="Suave" variant="soft" onPress={() => toast('Suave')} />
            <Button label="Contorno" variant="outline" onPress={() => toast('Contorno')} />
            <Button label="Com ícone" icon="volume" variant="outline" onPress={() => toast('Com ícone')} />
            <Button label="Só texto" variant="text" onPress={() => toast('Só texto')} style={{ alignSelf: 'flex-start' }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Pequeno" size="sm" variant="soft" onPress={() => toast('Pequeno')} style={{ flex: 1 }} />
              <Button label="Desativado" size="sm" disabled onPress={() => {}} style={{ flex: 1 }} />
            </View>
          </View>
        </Card>

        <Card>
          <SectionLabel>Barra de topo</SectionLabel>
          <View style={{ marginHorizontal: -20, marginBottom: -20 }}>
            <TopBar title="Título da tela" onBack={() => toast('Voltar')} right={<IconButton icon="bell" label="Avisos" badge={3} onPress={() => toast('Avisos')} />} />
          </View>
        </Card>

        <Card style={{ paddingVertical: 8 }}>
          <SectionLabel>Linhas de lista</SectionLabel>
          <ListRow label="Linha simples" onPress={() => toast('Linha simples')} divider />
          <ListRow label="Com descrição" sub="Texto de apoio em 14" onPress={() => toast('Com descrição')} divider />
          <ListRow icon="people" label="Com ícone" sub="Quarta, 20h" onPress={() => toast('Com ícone')} divider />
          <ListRow label="Com chave" right={<Switch label="Com chave" value={on} onChange={setOn} />} divider />
          <ListRow label="Excluir conta" danger onPress={() => toast('Excluir conta')} />
        </Card>

        <Card>
          <SectionLabel>Chaves</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <Switch label="Ligada" value={on} onChange={setOn} />
            <AppText variant="small" tone="secondary">{on ? 'Ligada' : 'Desligada'}</AppText>
            <Switch label="Desligada" value={off} onChange={setOff} />
            <AppText variant="small" tone="secondary">{off ? 'Ligada' : 'Desligada'}</AppText>
          </View>
        </Card>

        <Card>
          <SectionLabel>Etiquetas</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Tag label="Em andamento" />
            <Tag label="2 novos" tone="accent" />
            <Tag label="3 dias atrasado" tone="danger" />
            <Tag label="Inativo" tone="neutral" />
            <Tag label="Oração" tone="solid" />
          </View>
        </Card>

        <Card>
          <SectionLabel>Opções</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Ansiedade', 'Gratidão', 'Cansaço', 'Medo'].map((m) => (
              <Chip key={m} label={m} selected={chip === m} onPress={() => setChip(chip === m ? null : m)} />
            ))}
          </View>
        </Card>

        <Card>
          <SectionLabel>Textos</SectionLabel>
          <AppText variant="screenTitle">Título da aba, 24</AppText>
          <AppText variant="title">Título de cartão, 17</AppText>
          <AppText variant="body">Corpo do texto, 16. Respeita o tamanho de fonte do celular.</AppText>
          <AppText variant="small" tone="secondary">Texto de apoio, 14</AppText>
          <AppText variant="bible" style={{ marginTop: 8 }}>
            {`"${verseText('Salmos', 23, 1)}"`}
          </AppText>
          <AppText variant="bibleRef" tone="secondary">Texto bíblico em Literata, 19</AppText>
        </Card>

        <Card>
          <SectionLabel>Progresso</SectionLabel>
          <ProgressBar value={34} max={90} label="Dia 34 de 90" />
        </Card>
      </ScrollView>
    </View>
  )
}
