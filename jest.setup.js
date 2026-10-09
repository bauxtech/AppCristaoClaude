// Mocks usados nos testes. Nada aqui entra no app.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  const Ctx = React.createContext(inset)
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => React.useContext(Ctx),
    SafeAreaInsetsContext: Ctx,
  }
})
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  // Nos testes a tela já está em foco: roda o efeito uma vez.
  useFocusEffect: (fn) => require('react').useEffect(() => fn(), [fn]),
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
jest.mock('expo-notifications', () => ({
  AndroidImportance: { LOW: 2, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[teste]' })),
}))
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}))
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), getOfferings: jest.fn(), purchasePackage: jest.fn(), restorePurchases: jest.fn() },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}))
// Armazenamento seguro: os testes que precisam dele põem um objeto em globalThis.__secureStore.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
  getItem: (k) => (globalThis.__secureStore ? (globalThis.__secureStore[k] ?? null) : null),
  setItem: (k, v) => {
    if (globalThis.__secureStore) globalThis.__secureStore[k] = v
  },
}))
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(async () => true), signIn: jest.fn(), signOut: jest.fn(async () => {}) },
  isSuccessResponse: (r) => r?.type === 'success',
  isErrorWithCode: (e) => !!e?.code,
  statusCodes: { SIGN_IN_CANCELLED: 'cancelled', IN_PROGRESS: 'in_progress' },
}))

