// Mocks usados nos testes. Nada aqui entra no app.
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
  }
})
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Redirect: () => null,
}))
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), pause: jest.fn(), resume: jest.fn() }))
jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  getEnrolledLevelAsync: jest.fn(async () => 3),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}))
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({}), VideoView: () => null }))
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: false, canAskAgain: true }, jest.fn()],
}))
jest.mock('expo-audio', () => ({
  AudioQuality: { MEDIUM: 64 },
  IOSOutputFormat: { MPEG4AAC: 'aac ' },
  getRecordingPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => {}),
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), setPlaybackRate: jest.fn() }),
  useAudioPlayerStatus: () => ({ currentTime: 0, duration: 0, playing: false }),
  useAudioRecorder: () => ({ prepareToRecordAsync: jest.fn(async () => {}), record: jest.fn(), pause: jest.fn(), stop: jest.fn(async () => {}), getStatus: () => ({ durationMillis: 0 }), uri: null }),
  useAudioRecorderState: () => ({ durationMillis: 0 }),
}))
