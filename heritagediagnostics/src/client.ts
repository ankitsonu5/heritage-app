import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';

import { API_BASE_URL } from './config';

export { API_BASE_URL };

// 30s, not 15s: the backend is on a free Render instance that spins down when idle
// and takes ~30-50s to wake. At 15s the first request after a quiet spell timed out
// on the phone while the server carried on and processed it — so a prescription that
// looked like it "failed" had actually been submitted, and reappeared as a phantom
// order on the next login. A longer wait lets the client see the real result.
export const api = axios.create({ baseURL: `${API_BASE_URL}/api`, timeout: 30000 });

const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';
const ACCOUNT_ID_KEY = 'accountId';
const ACCOUNT_NAME_KEY = 'accountName';

let cachedToken: string | null = null;

api.interceptors.request.use(async request => {
  const token = cachedToken ?? (await AsyncStorage.getItem(TOKEN_KEY));
  cachedToken = token;
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    // A 401 no longer kicks the user out. They stay signed in until they tap Log
    // out — losing a session mid-task on a flaky network or a Render cold start is
    // exactly what they asked us to stop.
    //
    // The one real cause we can fix silently is a request that raced ahead of the
    // token being written to storage: re-read it and replay the call once. A truly
    // expired token still fails here, but the session is only torn down on the next
    // cold start, where restoreSession() re-checks it against /auth/me.
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      cachedToken = token;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export type Session = { token: string; role: string; accountId?: string; name?: string };

export async function setSession(token: string, role: string, accountId?: string, name?: string) {
  cachedToken = token;
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(ROLE_KEY, role),
    accountId ? AsyncStorage.setItem(ACCOUNT_ID_KEY, accountId) : AsyncStorage.removeItem(ACCOUNT_ID_KEY),
    name ? AsyncStorage.setItem(ACCOUNT_NAME_KEY, name) : AsyncStorage.removeItem(ACCOUNT_NAME_KEY),
  ]);
}

export async function clearSession() {
  cachedToken = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(ROLE_KEY),
    AsyncStorage.removeItem(ACCOUNT_ID_KEY),
    AsyncStorage.removeItem(ACCOUNT_NAME_KEY),
  ]);
}

// Auto-login on cold start: returns the stored session, or null if there is none.
// The token is only trusted after GET /auth/me confirms it — an expired one is
// discarded here rather than blowing up on the first screen.
export async function restoreSession(): Promise<Session | null> {
  const [token, role, accountId, name] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(ROLE_KEY),
    AsyncStorage.getItem(ACCOUNT_ID_KEY),
    AsyncStorage.getItem(ACCOUNT_NAME_KEY),
  ]);
  if (!token || !role) return null;
  cachedToken = token;
  try {
    const { data } = await api.get('/auth/me');
    const restored = { token, role: data.role, accountId: data.id, name: data.name };
    await setSession(token, data.role, data.id, data.name);
    return restored;
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    // Offline, a Render cold start, or a temporary 5xx must not erase a valid
    // login. Keep the stored identity and let normal screen queries retry. Only
    // an explicit auth/account rejection proves that the session is unusable.
    if (!status || status >= 500) return { token, role, accountId: accountId || undefined, name: name || undefined };
    if ([401, 403, 404].includes(status)) {
      await clearSession();
      return null;
    }
    return { token, role, accountId: accountId || undefined, name: name || undefined };
  }
}

export const mediaUrl = (value?: string) =>
  (value?.startsWith('http') ? value : `${API_BASE_URL}${value || ''}`);

export const errorMessage = (error: unknown) => {
  const response = (error as AxiosError<{ message?: string }>).response;
  if (response?.data?.message) return response.data.message;
  if ((error as AxiosError).code === 'ECONNABORTED') return 'सर्वर से जवाब नहीं आया।';
  if (!response) return 'इंटरनेट या सर्वर से संपर्क नहीं हो पाया।';
  return 'कुछ गलत हुआ। दोबारा कोशिश करें।';
};

export const isOffline = (error: unknown) => !(error as AxiosError).response;
