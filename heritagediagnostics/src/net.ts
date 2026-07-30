import NetInfo from '@react-native-community/netinfo';

// Returns an unsubscribe function. net.web.ts mirrors this signature.
export const onConnectivityChange = (handler: (online: boolean) => void) =>
  NetInfo.addEventListener(state => handler(Boolean(state.isConnected)));
