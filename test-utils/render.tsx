import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { ToastProvider } from '../src/components'
import { AudioProvider } from '../src/features/audio/AudioContext'
import { BibleProvider } from '../src/features/bible/BibleContext'
import { OnboardingProvider } from '../src/features/onboarding/OnboardingContext'
import { SessionProvider } from '../src/state/session'
import { ThemeProvider } from '../src/theme/ThemeProvider'

/** Renderiza com todos os provedores do app. */
export function renderApp(ui: ReactElement, opts: { onboarded?: boolean } = {}) {
  return render(
    <ThemeProvider>
      <SessionProvider initialOnboarded={opts.onboarded ?? false}>
        <BibleProvider>
          <AudioProvider>
            <ToastProvider>
              <OnboardingProvider>{ui}</OnboardingProvider>
            </ToastProvider>
          </AudioProvider>
        </BibleProvider>
      </SessionProvider>
    </ThemeProvider>,
  )
}
