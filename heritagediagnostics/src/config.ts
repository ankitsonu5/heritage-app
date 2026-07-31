// Build-time configuration. Bare React Native has no process.env at runtime, so
// deployment values live here rather than being read from the environment.
//
// Android emulator reaches the host machine through 10.0.2.2. For a physical
// phone, set API_BASE_URL to the computer's LAN IP (e.g. http://192.168.1.5:5000)
// or to the deployed HTTPS URL, then rebuild.

import { Platform } from 'react-native';

// Where the APK talks to the server.
//
// A phone cannot reach "localhost" — that is the phone itself. In a release build
// (the APK you install), this must be an address the phone can actually reach:
// your computer's LAN address while testing, or the deployed HTTPS URL later.
// `npm start` in backend/ prints the right LAN address on boot.
//
// The deployed backend. The APK talks to this — a phone cannot reach "localhost",
// and a LAN address only works on the same Wi-Fi as the laptop.
export const PRODUCTION_API_URL = 'https://dapp.heritageimshospital.com';

export const API_BASE_URL = __DEV__
  // Debug builds: the Android emulator reaches the host through 10.0.2.2.
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000')
  : PRODUCTION_API_URL;

// The number the patient's "Call PRO" button dials.
export const PRO_DESK_PHONE = '+919999999999';

// How often focused screens re-fetch. The upgrade path to true real-time is to
// swap this polling for websocket-driven cache invalidation.
export const POLL_INTERVAL_MS = 20_000;

/* ------------------------------------------------------------ dev testing --- */

// 'password' -> patients register with a password and sign in with it (today).
// 'otp'      -> patients receive an SMS code instead.
//
// The OTP screens and the server's send-otp/verify-otp endpoints are both still
// live and still tested, so switching to SMS later is this one line plus an SMS
// gateway key in the backend's .env — not a rewrite.
export const AUTH_MODE: 'password' | 'otp' = 'password';

// The master switch. Every testing shortcut in the app is gated on this, and
// __DEV__ is false in a release build — so none of it can ship.
// No demo accounts exist any more, so there is nothing to shortcut to. Every
// login goes through the real screens.
export const DEV_TOOLS = false;

