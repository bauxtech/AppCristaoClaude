import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { ToastProvider } from '../src/components'
import { AudioProvider } from '../src/features/audio/AudioContext'
import { BibleProvider } from '../src/features/bible/BibleContext'
import { CellProvider } from '../src/features/cell/CellContext'
import { PrayerProvider } from '../src/features/prayer/PrayerContext'
import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext'
import { SessionProvider, type CellStatus } from '../src/state/session'
import { ThemeProvider } from '../src/theme/ThemeProvider'

/** Renderiza com todos os provedores do app. */
export function renderApp(ui: ReactElement, opts: { onboarded?: boolean; cellStatus?: CellStatus; prayer?: Parameters<typeof PrayerProvider>[0]['initial']; cells?: Parameters<typeof CellProvider>[0]['initial'] } = {}) {
  return render(
    <ThemeProvider>
      <SessionProvider initialOnboarded={opts.onboarded ?? false} initialCellStatus={opts.cellStatus}>
        <BibleProvider>
          <PrayerProvider initial={opts.prayer ?? {}}>
            <CellProvider initial={opts.cells ?? { cells: [], currentId: null }}>
              <AudioProvider>
                <ToastProvider>
                  <OnboardingProvider>{ui}</OnboardingProvider>
                </ToastProvider>
              </AudioProvider>
            </CellProvider>
          </PrayerProvider>
        </BibleProvider>
      </SessionProvider>
    </ThemeProvider>,
  )
}
