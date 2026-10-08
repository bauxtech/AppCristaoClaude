import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio'

/**
 * Voz em AAC mono, 24 kbps a 16 kHz: cerca de 11 MB por hora. A transcrição aceita até 25 MB por arquivo,
 * então cabe um culto de até 2 horas. A transcrição trabalha em 16 kHz, então a qualidade da fala não muda.
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
