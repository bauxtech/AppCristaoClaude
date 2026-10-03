import { Pressable, View } from 'react-native'
import { AppText, IconButton, MIN_TOUCH } from '../../components'
import { Icon } from '../../components/Icon'
import { useTheme } from '../../theme/ThemeProvider'
import { fonts } from '../../theme/typography'
import { useAudio } from './AudioContext'

/** Barra fixa acima das abas enquanto algo está sendo lido em voz alta. */
export function MiniPlayer() {
  const { colors } = useTheme()
  const { track, playing, speed, toggle, cycleSpeed, close } = useAudio()
  if (!track) return null
  const speedLabel = `${String(speed).replace('.', ',')}x`
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 16,
        paddingRight: 4,
        minHeight: 60,
        backgroundColor: colors.darkSurface,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      <AppText numberOfLines={1} style={{ flex: 1, color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 14 }}>
        {track.title}
      </AppText>
      <Pressable
        onPress={cycleSpeed}
        accessibilityRole="button"
        accessibilityLabel={`Velocidade ${speedLabel}. Toque para mudar`}
        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 }}>{speedLabel}</AppText>
      </Pressable>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Parar leitura' : 'Tocar leitura do começo'}
        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={playing ? 'stop' : 'play'} size={22} color="#FFFFFF" />
      </Pressable>
      <IconButton icon="close" label="Fechar leitura em voz alta" onPress={close} color="#FFFFFF" />
    </View>
  )
}
