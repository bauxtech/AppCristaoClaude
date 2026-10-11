import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio'

/**
 * Voz em AAC mono, 24 kbps a 16 kHz: cerca de 11 MB por hora. O app envia até 50 MB (umas 4 horas)
 * e o servidor divide em partes de até 10 minutos para a transcrição. A transcrição trabalha em 16 kHz, então a qualidade da fala não muda.
 */
export const VOICE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 24000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 24000 },
}
