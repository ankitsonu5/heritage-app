/* global jest */
const mockMemory = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(key => Promise.resolve(mockMemory.has(key) ? mockMemory.get(key) : null)),
  setItem: jest.fn((key, value) => { mockMemory.set(key, value); return Promise.resolve(); }),
  removeItem: jest.fn(key => { mockMemory.delete(key); return Promise.resolve(); }),
  clear: jest.fn(() => { mockMemory.clear(); return Promise.resolve(); }),
}));

jest.mock('react-native-tts', () => ({
  stop: jest.fn(), setDefaultLanguage: jest.fn(), setDefaultRate: jest.fn(), speak: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn() }));

jest.mock('@react-native-documents/picker', () => ({
  __esModule: true,
  pick: jest.fn(),
  types: { pdf: 'application/pdf' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: jest.fn(() => false),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: { apps: [] },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(() => ({
    requestPermission: jest.fn(async () => 0),
    getToken: jest.fn(async () => ''),
    deleteToken: jest.fn(async () => {}),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(async () => null),
  })), { AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 } }),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => ''),
    displayNotification: jest.fn(async () => {}),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PRIVATE: 0 },
  EventType: { PRESS: 1 },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    config: jest.fn(() => ({ fetch: jest.fn() })),
    fs: {
      dirs: { DocumentDir: '/documents', LegacyDownloadDir: '/downloads' },
      exists: jest.fn(async () => false),
      unlink: jest.fn(async () => {}),
    },
    ios: { openDocument: jest.fn(async () => {}) },
  },
}));

// Keep test output readable: the app logs network failures by design.
global.__DEV__ = true;
