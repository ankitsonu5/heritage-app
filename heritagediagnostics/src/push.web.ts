// Browser notifications arrive through the existing Socket.io-backed in-app feed.
// Native Firebase/Notifee do not run on web, so keep the shared session/navigation
// integration callable without pulling native modules into the web bundle.

export type PushData = { type?: string; orderId?: string; order?: string };

export const ensureChannel = async () => {};
export const requestPermission = async () => false;
export const start = async (): Promise<() => void> => () => {};
export const stop = async () => {};
export const onForegroundMessage = () => () => {};
export const onNotificationTap = (_handle: (data: PushData) => void) => () => {};
