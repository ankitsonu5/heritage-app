// Stub for native-only modules in the web build (see vite.config.mjs aliases).
// Nothing on the web path should actually call into these — the real behaviour
// lives in media.web.ts, net.web.ts and tts.web.ts — so a call here is a bug and
// should be loud rather than silently doing nothing.

const notOnWeb = (name: string) => () => {
  throw new Error(`${name} is not available on web; use the .web.ts variant`);
};

export const launchCamera = notOnWeb('launchCamera');
export const launchImageLibrary = notOnWeb('launchImageLibrary');

export const types = { pdf: 'application/pdf', allFiles: '*/*' };
export const isCancel = () => false;
export const pickSingle = notOnWeb('pickSingle');

// @react-native-documents/picker surface (new API). media.web.ts has its own
// pickPdf, so these are only here for the transitive import graph.
export const pick = notOnWeb('pick');
export const errorCodes = { OPERATION_CANCELED: 'OPERATION_CANCELED' };
export const isErrorWithCode = () => false;

export const addEventListener = () => () => {};
export const fetch = () => Promise.resolve({ isConnected: true });

// Push/Firebase surfaces. The browser uses the socket-backed notification bell,
// so native FCM and Notifee must remain inert here.
export const AndroidImportance = { HIGH: 4 };
export const AndroidVisibility = { PRIVATE: 0 };
export const EventType = { PRESS: 1 };
export const FirebaseMessagingTypes = {};

const nativeModule = Object.assign(
  () => ({
    requestPermission: async () => 0,
    getToken: async () => '',
    deleteToken: async () => {},
    onTokenRefresh: () => () => {},
    onMessage: () => () => {},
    onNotificationOpenedApp: () => () => {},
    getInitialNotification: async () => null,
    setBackgroundMessageHandler: () => {},
  }),
  {
    apps: [],
    AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
    createChannel: async () => '',
    displayNotification: async () => {},
    onForegroundEvent: () => () => {},
    stop: () => {},
    speak: () => {},
    setDefaultLanguage: () => {},
    setDefaultRate: () => {},
  },
);

export default nativeModule;
