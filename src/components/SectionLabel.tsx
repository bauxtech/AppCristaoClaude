import { AppText } from './AppText'

/** Rótulo de seção em caixa alta, como "PASSAGEM DO DIA". Anunciado como título. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" tone="secondary" accessibilityRole="header" style={{ marginBottom: 12 }}>
      {children}
    </AppText>
  )
}
