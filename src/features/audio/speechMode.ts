import { setAudioModeAsync } from 'expo-audio'

// No iPhone, a voz do aparelho fica muda com a chave de silencioso ligada (QA de 21/10: "o play sobe, mas não
// se escuta"). Ouvir a Bíblia é uma escolha da pessoa, como um podcast: toca mesmo no silencioso.
export async function prepareSpeech() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false })
  } catch {
    // Sem o módulo de áudio (web), a voz toca como o aparelho deixar.
  }
}
