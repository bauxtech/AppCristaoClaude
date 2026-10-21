import { setAudioModeAsync } from 'expo-audio'
import * as Speech from 'expo-speech'
import { Platform } from 'react-native'

// No iPhone, a voz do aparelho fica muda com a chave de silencioso ligada (QA de 21/10: "o play sobe, mas não
// se escuta"). Ouvir a Bíblia é uma escolha da pessoa, como um podcast: toca mesmo no silencioso.
// A voz (21/10, "menos cara de IA"): sem escolha da pessoa, o app usa a melhor voz em português instalada
// no celular (Premium ou Melhorada no iPhone; a de melhor qualidade, sem precisar de internet, no Android).

export interface VoiceOption {
  id: string
  label: string
  score: number
}

const norm = (lang: string | undefined) => (lang ?? '').toLowerCase().replace('_', '-')

/** Nota da voz: português do Brasil primeiro, depois a qualidade. Voz que não é de português fica de fora (null). */
export function rankVoice(v: Pick<Speech.Voice, 'identifier' | 'quality' | 'language'>): number | null {
  const lang = norm(v.language)
  if (!lang.startsWith('pt')) return null
  const id = v.identifier.toLowerCase()
  let s = lang === 'pt-br' ? 100 : 50
  if (id.includes('premium')) s += 30
  if (v.quality === 'Enhanced') s += 20
  // Vozes engraçadas ou antigas do iPhone (Eloquence, efeitos) soam piores que a padrão.
  if (id.includes('eloquence') || id.includes('speech.synthesis')) s -= 60
  // No Android, voz "network" só fala com internet: a Bíblia sem internet ficaria muda.
  if (id.includes('network')) s -= 40
  return s
}

/** Vozes em português do celular, da melhor para a pior, com nome para a tela de configurações. */
export function voiceOptions(list: Speech.Voice[], os: string = Platform.OS): VoiceOption[] {
  const ranked = list.flatMap((v) => {
    const score = rankVoice(v)
    return score == null ? [] : [{ v, score }]
  })
  ranked.sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name))
  return ranked.map(({ v, score }, i) => {
    const id = v.identifier.toLowerCase()
    const quality = id.includes('premium') ? 'Premium' : v.quality === 'Enhanced' ? 'Melhorada' : ''
    // No Android os nomes vêm como códigos ("pt-br-x-afs-local"): viram "Voz 1", "Voz 2".
    const base = os === 'ios' ? v.name : `Voz ${i + 1}`
    const extra = [norm(v.language) !== 'pt-br' ? 'Portugal' : '', quality, id.includes('network') ? 'precisa de internet' : ''].filter(Boolean).join(', ')
    return { id: v.identifier, label: extra ? `${base} (${extra})` : base, score }
  })
}

let cache: Speech.Voice[] | null = null

/** Lista de vozes do celular. refresh: procura de novo (a pessoa pode ter baixado uma voz). */
export async function deviceVoices(refresh = false): Promise<Speech.Voice[]> {
  if (cache && !refresh) return cache
  try {
    cache = (await Speech.getAvailableVoicesAsync?.()) ?? []
  } catch {
    cache = []
  }
  return cache
}

/** A voz escolhida, se ainda existe no celular; senão, a melhor instalada. Sem nenhuma, o celular decide. */
export async function voiceFor(chosen: string | null | undefined): Promise<string | undefined> {
  const list = await deviceVoices()
  if (chosen && list.some((v) => v.identifier === chosen)) return chosen
  return voiceOptions(list)[0]?.id
}

/** Liga o som (inclusive no silencioso do iPhone) e devolve a voz que deve falar. */
export async function prepareSpeech(chosen?: string | null): Promise<string | undefined> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false })
  } catch {
    // Sem o módulo de áudio (web), a voz toca como o aparelho deixar.
  }
  return voiceFor(chosen)
}
