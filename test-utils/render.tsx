import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { ToastProvider } from '../src/components'
import { AudioProvider } from '../src/features/audio/AudioContext'
import { BibleProvider } from '../src/features/bible/BibleContext'
import { CellProvider } from '../src/features/cell/CellContext'
import { ChurchProvider } from '../src/features/church/ChurchContext'
import { ChatProvider } from '../src/features/chat/ChatContext'
import { SermonProvider } from '../src/features/sermon/SermonContext'
import { PrayerProvider } from '../src/features/prayer/PrayerContext'
import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext'
import { SessionProvider, type CellStatus } from '../src/state/session'
import { ThemeProvider } from '../src/theme/ThemeProvider'

/** Renderiza com todos os provedores do app. */
export function renderApp(ui: ReactElement, opts: { onboarded?: boolean; sampleData?: boolean; cellStatus?: CellStatus; prayer?: Parameters<typeof PrayerProvider>[0]['initial']; cells?: Parameters<typeof CellProvider>[0]['initial']; church?: Parameters<typeof ChurchProvider>[0]['initial']; sermons?: Parameters<typeof SermonProvider>[0]['initial']; chat?: Parameters<typeof ChatProvider>[0]['initial'] } = {}) {
  return render(
    <ThemeProvider>
      <SessionProvider initialOnboarded={opts.onboarded ?? false} initialCellStatus={opts.cellStatus} initialSampleData={opts.sampleData ?? true}>
        <BibleProvider>
          <PrayerProvider initial={opts.prayer ?? {}}>
            <CellProvider initial={opts.cells ?? { cells: [], currentId: null }}>
              <ChurchProvider initial={opts.church ?? {}}>
                <SermonProvider initial={opts.sermons ?? []}>
                  <ChatProvider initial={opts.chat ?? {}}>
                    <AudioProvider>
                      <ToastProvider>
                        <OnboardingProvider>{ui}</OnboardingProvider>
                      </ToastProvider>
                    </AudioProvider>
                  </ChatProvider>
                </SermonProvider>
              </ChurchProvider>
            </CellProvider>
          </PrayerProvider>
        </BibleProvider>
      </SessionProvider>
    </ThemeProvider>,
  )
}
