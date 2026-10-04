import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { AppText } from './AppText'
import { Button } from './Button'

/**
 * Fileira de capas que rola para o lado, com a próxima aparecendo pela metade na borda.
 * Cabeçalho com o nome da seção e "Ver todos". `gutter` é a margem lateral da tela onde ele está.
 */
export function Carousel({ title, onSeeAll, seeAllHint, tabs, children, gutter = 16 }: { title: string; onSeeAll?: () => void; seeAllHint?: string; tabs?: ReactNode; children: ReactNode; gutter?: number }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </AppText>
        {onSeeAll ? <Button label="Ver todos" variant="text" size="sm" onPress={onSeeAll} accessibilityHint={seeAllHint ?? `Abre ${title.toLowerCase()}`} /> : null}
      </View>
      {tabs}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: 12 }} accessibilityLabel={title}>
        {children}
      </ScrollView>
    </View>
  )
}
