import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio'

/** Voz em AAC mono, 64 kbps: cerca de 29 MB por hora. Suficiente para transcrever uma pregação. */
export const VOICE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
}
