// Web build config. Empty base URL means same-origin, so /api and /uploads go
// through the Vite dev proxy (vite.config.mjs) and there is no CORS to configure.
// Everything else mirrors config.ts — see that file for what these mean.
export const API_BASE_URL = '';

export const PRO_DESK_PHONE = '';

export const POLL_INTERVAL_MS = 20_000;

export const PRODUCTION_API_URL = '';

export const AUTH_MODE: 'password' | 'otp' = 'password';

// The Vite dev server defines __DEV__ as true; a production build sets it false,
// so the testing shortcuts drop out of the bundle there too.
// No demo accounts exist any more, so there is nothing to shortcut to. Every
// login goes through the real screens.
export const DEV_TOOLS = false;

