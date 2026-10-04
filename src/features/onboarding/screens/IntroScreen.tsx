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
    art: 'Ilustração: uma pessoa sentada lendo um livro aberto, com a luz da manhã.',
  },
  {
    title: 'Tire dúvidas sobre a Bíblia',
    text: 'Pergunte sobre qualquer passagem e receba a resposta com os versículos.',
    art: 'Ilustração: uma pessoa com o celular na mão e balões de conversa saindo de um livro aberto.',
  },
  {
    title: 'Grave o culto e guarde o resumo',
    text: 'O app transcreve a pregação e separa os pontos principais e os versículos citados.',
    art: 'Ilustração: pessoas sentadas vistas de costas e ondas de som que viram linhas de texto.',
  },
  {
    title: 'Ore com um guia e registre seus pedidos',
    text: 'Momentos de oração guiados, diário e pedidos que você marca como respondidos.',
    art: 'Ilustração: uma pessoa de olhos fechados e mãos juntas, num lugar tranquilo ao ar livre.',
  },
  {
    title: 'Organize a sua célula',
    text: 'Convide as pessoas, monte a escala e o roteiro e acompanhe os pedidos do grupo.',
    art: 'Ilustração: um grupo pequeno sentado em roda numa sala.',
  },
]

/** Apresentação em 5 passos, depois do splash. A pessoa arrasta para o lado ou toca nos pontos. */
export function IntroScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  // A ilustração ocupa a metade de cima da tela.
  const artH = Math.round(height / 2)
  const { setDraft } = useOnboarding()
  const [index, setIndex] = useState(0)
  const scroll = useRef<ScrollView>(null)
  // Passo pedido pelo toque num ponto: enquanto a rolagem anima, os passos do meio não acendem.
  const target = useRef<number | null>(null)

  // onScroll em vez de onMomentumScrollEnd: no arraste da web o fim do momento nem sempre dispara.
  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.max(0, Math.min(INTRO_STEPS.length - 1, Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1))))
    if (target.current !== null) {
      if (i === target.current) target.current = null
      return
    }
    if (i !== index) setIndex(i)
  }

  function goTo(i: number) {
    target.current = i === index ? null : i
    setIndex(i)
    scroll.current?.scrollTo({ x: i * width, animated: true })
  }

  function start(mode: 'create' | 'login') {
    setDraft({ mode })
    router.push('/entrar')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => (target.current = null)}
        style={{ flex: 1 }}
        accessibilityLabel="Apresentação do app"
      >
        {INTRO_STEPS.map((s, i) => (
          <View key={s.title} style={{ width, flex: 1 }} importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={i !== index}>
            <View accessible accessibilityRole="image" accessibilityLabel={s.art} style={{ width, height: artH }}>
              <IntroArt step={i} width={width} height={artH} />
            </View>
            <View style={{ flex: 1, gap: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
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
