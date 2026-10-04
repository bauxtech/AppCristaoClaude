import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { IntroArt } from '../IntroArt'
import { useOnboarding } from '../OnboardingContext'

export const INTRO_STEPS = [
  {
    title: 'Leia a Bíblia todo dia',
    text: 'Plano de leitura, passagem do dia e o seu progresso nos 66 livros.',
    art: 'Ilustração: uma Bíblia aberta e uma barra de progresso.',
  },
  {
    title: 'Tire dúvidas sobre a Bíblia',
    text: 'Pergunte sobre qualquer passagem e receba a resposta com os versículos.',
    art: 'Ilustração: um balão de pergunta e um balão de resposta com um versículo marcado.',
  },
  {
    title: 'Grave o culto e guarde o resumo',
    text: 'O app transcreve a pregação e separa os pontos principais e os versículos citados.',
    art: 'Ilustração: um microfone ao lado de uma folha com o texto da pregação.',
  },
  {
    title: 'Ore com um guia e registre seus pedidos',
    text: 'Momentos de oração guiados, diário e pedidos que você marca como respondidos.',
    art: 'Ilustração: um coração ao lado de uma lista de pedidos, com o primeiro marcado como respondido.',
  },
  {
    title: 'Organize a sua célula',
    text: 'Convide as pessoas, monte a escala e o roteiro e acompanhe os pedidos do grupo.',
    art: 'Ilustração: cinco pessoas em volta de uma mesa.',
  },
]

/** Apresentação em 5 passos, depois do splash. A pessoa arrasta para o lado ou toca nos pontos. */
export function IntroScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { setDraft } = useOnboarding()
  const [index, setIndex] = useState(0)
  const scroll = useRef<ScrollView>(null)

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1))
    if (i !== index) setIndex(Math.max(0, Math.min(INTRO_STEPS.length - 1, i)))
  }

  function goTo(i: number) {
    setIndex(i)
    scroll.current?.scrollTo({ x: i * width, animated: true })
  }

  function start(mode: 'create' | 'login') {
    setDraft({ mode })
    router.push('/entrar')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}
        accessibilityLabel="Apresentação do app"
      >
        {INTRO_STEPS.map((s, i) => (
          <View key={s.title} style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 24 }} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={i !== index}>
            <View accessible accessibilityRole="image" accessibilityLabel={s.art}>
              <IntroArt step={i} />
            </View>
            <View style={{ gap: 10, alignItems: 'center' }}>
              <AppText variant="screenTitle" accessibilityRole="header" style={{ textAlign: 'center' }}>
                {s.title}
              </AppText>
              <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                {s.text}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Indicador de passos: tocar num ponto também muda de passo (ajuda quem usa leitor de tela). */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 }} accessibilityRole="tablist" accessibilityLabel="Passos da apresentação">
        {INTRO_STEPS.map((s, i) => (
          <Pressable
            key={s.title}
            onPress={() => goTo(i)}
            accessibilityRole="tab"
            accessibilityLabel={`Passo ${i + 1} de ${INTRO_STEPS.length}: ${s.title}`}
            accessibilityState={{ selected: i === index }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: i === index ? 24 : 10, height: 10, borderRadius: 5, backgroundColor: i === index ? colors.primary : colors.lineStrong }} />
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: insets.bottom + 20, gap: 10 }}>
        <Button label="Criar conta" onPress={() => start('create')} />
        <Button label="Entrar" variant="outline" onPress={() => start('login')} />
      </View>
    </View>
  )
}
