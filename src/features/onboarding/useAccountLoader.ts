import { router } from 'expo-router'
import { useState } from 'react'
import { fetchProfile } from '../../lib/account'
import { useSession, type Profile } from '../../state/session'
import { useSettings } from '../settings/SettingsContext'
import { useOnboarding } from './OnboardingContext'

/**
 * Depois do login (código do celular ou Google): traz a conta do banco e decide a próxima tela.
 * Se a leitura falha, não trata como conta nova (o cadastro refeito apagaria o que existe).
 * fill: dados do login que entram só onde a conta ainda não tem (telefone, e-mail, nome do Google).
 */
export function useAccountLoader() {
  const { draft, setDraft } = useOnboarding()
  const { updateProfile, finishOnboarding } = useSession()
  const settings = useSettings()
  const [failedUid, setFailedUid] = useState<string | null>(null)

  async function load(uid: string, fill: Partial<Profile> = {}): Promise<'done' | 'no_account' | 'failed'> {
    const remote = await fetchProfile(uid)
    if (remote === 'failed') {
      setFailedUid(uid)
      return 'failed'
    }
    setFailedUid(null)
    const existing = remote !== 'missing' && !!remote.profile.name
    const missing = (k: keyof Profile) => remote === 'missing' || !remote.profile[k]
    const extra = Object.fromEntries(Object.entries(fill).filter(([k, v]) => v && missing(k as keyof Profile))) as Partial<Profile>
    if (remote !== 'missing' && existing) {
      updateProfile({ ...remote.profile, ...extra }, { fromServer: true })
      settings.update({ faithConsent: remote.faithConsent }, { fromServer: true })
      // Exclusão pedida em outro celular: mostra o prazo e o botão de cancelar.
      if (remote.deletionRequestedAt) {
        settings.scheduleDeletion(new Date(remote.deletionRequestedAt))
        finishOnboarding()
        router.replace('/configuracoes/exclusao')
        return 'done'
      }
      // Conta com nome mas sem termos aceitos passa pelos termos.
      if (!remote.termsAccepted) {
        setDraft({ mode: 'create' })
        router.push('/termos')
        return 'done'
      }
    } else if (Object.keys(extra).length) updateProfile(extra)
    // Entrar: quem tem conta vai direto para o Hoje. Criar conta: segue o cadastro.
    if (draft.mode === 'login') {
      if (!existing) return 'no_account'
      finishOnboarding()
      router.replace('/')
      return 'done'
    }
    router.push(existing ? '/bem-vindo-de-volta' : '/termos')
    return 'done'
  }

  return { load, failedUid }
}
