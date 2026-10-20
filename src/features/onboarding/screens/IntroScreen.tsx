import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Button } from '../../../components'
import { useTheme } from '../../../theme/ThemeProvider'
import { IntroArt } from '../IntroArt'
import { useOnboarding } from '../OnboardingContext'

// Ordem pelos diferenciais do acasa (QA de 20/10): culto, célula e o site da célula primeiro.
export const INTRO_STEPS = [
  {
    title: 'Grave o culto e guarde o resumo',
    text: 'O app transcreve a pregação e separa os pontos principais e os versículos citados.',
    art: 'Ilustração: um microfone ao lado de uma folha com o texto da pregação.',
    pic: 2,
  },
  {
    title: 'Organize a sua célula',
    text: 'Escala, roteiro, presença e os pedidos de oração do grupo, tudo pelo celular.',
    art: 'Ilustração: cinco pessoas em volta de uma mesa.',
    pic: 4,
  },
  {
    title: 'Um site para a sua célula',
    text: 'Uma página com o nome, a capa e o bairro do grupo, para quem ainda não conhece pedir para participar.',
    art: 'Ilustração: uma página de internet com capa, logo e um botão.',
    pic: 5,
  },
  {
    title: 'Tire dúvidas sobre a Bíblia',
    text: 'Pergunte sobre qualquer passagem e receba a resposta com o versículo e a fonte.',
    art: 'Ilustração: um balão de pergunta e um balão de resposta com um versículo marcado.',
    pic: 1,
  },
  {
    title: 'Bíblia e oração todo dia',
    text: 'A Bíblia completa sem internet, planos de leitura, oração guiada e diário.',
    art: 'Ilustração: uma Bíblia aberta e uma barra de progresso.',
    pic: 0,
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
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
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
            {/* Rola na vertical quando a tela é baixa ou a fonte do sistema é grande: o texto nunca fica cortado. */}
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 32,
                paddingVertical: 16,
                gap: 24,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View accessible accessibilityRole="image" accessibilityLabel={s.art}>
                <IntroArt step={s.pic} />
              </View>
              <View
                style={{
                  gap: 10,
                  alignItems: 'center',
                  alignSelf: 'stretch',
                  maxWidth: 520,
                  width: '100%',
                }}
              >
                <AppText variant="screenTitle" accessibilityRole="header" style={{ textAlign: 'center' }}>
                  {s.title}
                </AppText>
                <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                  {s.text}
                </AppText>
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Indicador de passos: tocar num ponto também muda de passo (ajuda quem usa leitor de tela). */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          paddingVertical: 8,
        }}
        accessibilityRole="tablist"
        accessibilityLabel="Passos da apresentação"
      >
        {INTRO_STEPS.map((s, i) => (
          <Pressable
            key={s.title}
            onPress={() => goTo(i)}
            accessibilityRole="tab"
            accessibilityLabel={`Passo ${i + 1} de ${INTRO_STEPS.length}: ${s.title}`}
            accessibilityState={{ selected: i === index }}
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: i === index ? 24 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: i === index ? colors.primary : colors.lineStrong,
              }}
            />
          </Pressable>
        ))}
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 20,
          gap: 10,
        }}
      >
        <Button label="Criar conta" onPress={() => start('create')} />
        <Button label="Entrar" variant="outline" onPress={() => start('login')} />
      </View>
    </View>
  )
}
