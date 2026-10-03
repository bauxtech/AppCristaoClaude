import { router } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { Button, Icon, SelectCard } from '../../../components'
import type { IconName } from '../../../components/Icon'
import { getItem, setItem } from '../../../lib/storage'
import { useTheme } from '../../../theme/ThemeProvider'
import { HeroIcon, OnboardingScaffold } from '../OnboardingScaffold'

type Option = 'screenReader' | 'libras' | 'captions' | 'largeText' | 'highContrast'

const OPTIONS: { key: Option; label: string; description?: string; icon: IconName }[] = [
  { key: 'screenReader', label: 'Leitor de tela', description: 'VoiceOver no iPhone, TalkBack no Android', icon: 'eye' },
  { key: 'libras', label: 'Intérprete de Libras em vídeo', icon: 'hand' },
  { key: 'captions', label: 'Legenda em tempo real', icon: 'captions' },
  { key: 'largeText', label: 'Fonte grande', icon: 'type' },
  { key: 'highContrast', label: 'Alto contraste', icon: 'contrast' },
]

/** Primeira tela: acessibilidade antes de tudo. Fonte grande e alto contraste valem na hora. */
export function WelcomeScreen() {
  const { colors, largeText, setLargeText, highContrast, setHighContrastOverride } = useTheme()
  const [prefs, setPrefs] = useState<Record<Option, boolean>>(() =>
    getItem('a11yPrefs', { screenReader: false, libras: false, captions: false, largeText, highContrast }),
  )

  function toggle(k: Option) {
    const next = { ...prefs, [k]: !prefs[k] }
    setPrefs(next)
    setItem('a11yPrefs', next)
    if (k === 'largeText') setLargeText(next.largeText)
    if (k === 'highContrast') setHighContrastOverride(next.highContrast)
  }

  return (
    <OnboardingScaffold
      title="Bem-vindo"
      subtitle="Antes de começar, escolha as opções de acessibilidade que funcionam melhor para você. Você pode mudar isso a qualquer momento."
      hero={
        <HeroIcon>
          <Icon name="home" size={28} color={colors.primary} />
        </HeroIcon>
      }
      footer={<Button label="Continuar" onPress={() => router.push('/entrar')} />}
    >
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => (
          <SelectCard key={o.key} kind="checkbox" icon={o.icon} label={o.label} description={o.description} selected={prefs[o.key]} onPress={() => toggle(o.key)} />
        ))}
      </View>
    </OnboardingScaffold>
  )
}
