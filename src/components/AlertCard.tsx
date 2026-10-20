import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { AppText } from './AppText'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'

/**
 * Cartão de alerta do app inteiro (QA de 20/10): fundo de cartão, faixa colorida à esquerda e ícone.
 * O tom fica na faixa e no ícone, nunca só na cor: o título diz o que aconteceu. A ação é sempre um botão de contorno.
 *  - info: novidade ou orientação (verde)
 *  - attention: algo esperando a pessoa, como pedidos de entrada (âmbar)
 *  - danger: algo que precisa de ação para não perder acesso (vermelho)
 */
export function AlertCard({
  tone,
  icon,
  title,
  children,
  right,
  action,
}: {
  tone: 'info' | 'attention' | 'danger'
  icon?: IconName
  title: string
  children?: ReactNode
  right?: ReactNode
  action?: { label: string; onPress: () => void }
}) {
  const { colors } = useTheme()
  const color = tone === 'danger' ? colors.danger : tone === 'attention' ? colors.accent : colors.primary
  const soft = tone === 'danger' ? colors.dangerSoft : tone === 'attention' ? colors.bg : colors.primarySoft
  const name: IconName = icon ?? (tone === 'danger' ? 'alert' : tone === 'attention' ? 'bell' : 'info')
  return (
    <View
      accessibilityLiveRegion={tone === 'danger' ? 'polite' : undefined}
      style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4, borderLeftColor: color, borderRadius: 16, padding: 16 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: soft, borderWidth: tone === 'attention' ? 1 : 0, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={name} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
            {title}
          </AppText>
          {right}
        </View>
        {typeof children === 'string' ? (
          <AppText variant="small" tone="secondary">
            {children}
          </AppText>
        ) : (
          children
        )}
        {action ? <Button label={action.label} variant="outline" size="sm" onPress={action.onPress} style={{ alignSelf: 'flex-start', marginTop: 4 }} /> : null}
      </View>
    </View>
  )
}
