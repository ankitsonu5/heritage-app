// Push notifications — the part that makes the phone ring while the app is closed.
//
// Socket.io (src/api/live.ts) only ever fires while the app is open and focused, which
// is the one moment the user does not need telling. Everything here is about the other
// case: a prescription arrives, the PRO's phone is in their pocket, and it has to ring
// the way WhatsApp rings.
//
// Three states the phone can be in, all of which have to work:
//   • foreground — FCM does NOT draw a notification; we draw it ourselves via notifee
//   • background — Android draws it from the `notification` block the server sends
//   • killed     — same, and the tap has to survive a cold start
//
// The one that gets forgotten is "killed": the handler must be registered at module
// scope from index.js, not inside a component, because there is no component tree yet.

import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import firebase from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

import { api } from './client';

// Must match the backend's push.js CHANNEL_ID and the manifest's
// default_notification_channel_id. If any of the three drift apart, Android silently
// files the notification under a low-importance default: it is "delivered" and mute,
// which is the worst kind of bug because nothing anywhere reports an error.
// A channel's sound/importance cannot be changed after Android creates it. Some
// existing installs have the original channel cached as silent, so v2 deliberately
// creates a fresh channel and restores the expected message tone on upgrade.
export const CHANNEL_ID = 'heritage-alerts-v2';

/** Payload the server attaches (push.js `data`), so a tap can open the right order. */
export type PushData = { type?: string; orderId?: string; order?: string };

// Android already has google-services.json. The iOS Firebase app is optional for
// the first EAS testing build and becomes available automatically once the matching
// GoogleService-Info.plist is added to the Xcode target.
const firebaseReady = () => Platform.OS === 'android' || firebase.apps.length > 0;

/**
 * Create the channel. On Android 8+ sound/vibration/heads-up are properties of the
 * CHANNEL, not of the message — a HIGH-importance channel is what makes the banner
 * pop over whatever the user is doing and the phone make noise. Setting priority on
 * the message alone does nothing on modern Android.
 *
 * Once created, a channel's importance is owned by the user forever: re-creating it
 * with different settings does not override someone who turned it down, which is
 * exactly the behaviour we want.
 */
export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Orders & reports (sound)',
    description: 'New prescriptions, pickups, and reports',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PRIVATE,   // medical data — no preview on a lock screen
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });
}

/**
 * Android 13+ shows no notification at all until POST_NOTIFICATIONS is granted, and it
 * must be requested at runtime. On 12 and below the permission is granted at install
 * and this is a no-op, so it is safe to call unconditionally.
 *
 * @returns whether notifications may be shown
 */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  if (!firebaseReady()) return false;

  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/** Hand the device's FCM token to the server so it can be addressed. */
async function registerToken(token: string) {
  try {
    await api.post('/me/push-token', { token });
  } catch (error) {
    // Never surface this. A failed registration means quiet notifications, not a
    // broken session — and the refresh listener will try again on its own.
    console.warn('[push] could not register token:', error);
  }
}

/**
 * Called after sign-in. Asks permission, registers the token, and keeps it fresh.
 *
 * @returns an unsubscribe for the token-refresh listener
 */
export async function start(): Promise<() => void> {
  if (!firebaseReady()) {
    console.warn('[push] iOS Firebase configuration is not installed; using the in-app notification feed.');
    return () => {};
  }

  await ensureChannel();

  const granted = await requestPermission();
  if (!granted) {
    console.log('[push] notifications denied — the phone will stay silent.');
    return () => {};
  }

  try {
    const token = await messaging().getToken();
    if (token) await registerToken(token);
  } catch (error) {
    console.warn('[push] could not obtain a token:', error);
  }

  // A token is not a login-time fact: Android reissues it on reinstall, on a storage
  // wipe, and on its own schedule. Without this listener the phone goes quiet weeks
  // later and nothing anywhere explains why.
  return messaging().onTokenRefresh(registerToken);
}

/** Called on sign-out, so a handed-over phone stops buzzing for the previous user. */
export async function stop() {
  try {
    await api.delete('/me/push-token');
  } catch {
    // Signing out must not be blocked by a network failure.
  }
  if (firebaseReady()) {
    try {
      await messaging().deleteToken();
    } catch {
      // Best effort; the server-side clear above is what actually matters.
    }
  }
}

/**
 * Draw the notification while the app is in the foreground.
 *
 * FCM deliberately does not display anything when the app is focused — it assumes the
 * app will show its own UI. Without this, an open app is the one case where nothing
 * appears and nothing rings.
 *
 * The in-app bell also updates over the socket at the same moment, so this does double
 * up — deliberately. A banner over an open app is what every messaging app does, and a
 * silent badge is exactly the "pata hi nahi chala" this whole change exists to fix.
 */
export function onForegroundMessage() {
  if (!firebaseReady()) return () => {};
  return messaging().onMessage(async (message: FirebaseMessagingTypes.RemoteMessage) => {
    await notifee.displayNotification({
      title: message.notification?.title ?? 'Heritage Diagnostics',
      body: message.notification?.body ?? '',
      data: (message.data ?? {}) as Record<string, string>,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        smallIcon: 'ic_notification',
        color: '#5E111B',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  });
}

/**
 * Wire notification taps to a handler.
 *
 * Covers all three ways a tap can arrive: notifee's own event (a banner we drew),
 * FCM's background-open, and the cold-start case where the app was killed and the tap
 * is what launched it.
 */
export function onNotificationTap(handle: (data: PushData) => void) {
  if (!firebaseReady()) return () => {};
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) handle((detail.notification?.data ?? {}) as PushData);
  });

  const unsubscribeOpened = messaging().onNotificationOpenedApp(message => {
    handle((message?.data ?? {}) as PushData);
  });

  // The app was dead and the tap launched it. This resolves once, at startup.
  messaging()
    .getInitialNotification()
    .then(message => {
      if (message) handle((message.data ?? {}) as PushData);
    })
    .catch(() => {});

  return () => {
    unsubscribeNotifee();
    unsubscribeOpened();
  };
}
