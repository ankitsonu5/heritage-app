import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

import { api, clearSession, restoreSession, setSession } from '../client';
import { Role } from '../models';
import * as push from '../push';
import { Lang } from '../translations';

type SessionState = {
  role: Role | null;
  accountId?: string;
  name?: string;
  booting: boolean;
  lang: Lang;
  voiceGuidance: boolean;
  signIn: (token: string, role: Role, accountId?: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLang: (lang: Lang) => void;
  setVoiceGuidance: (on: boolean) => void;
};

const SessionContext = createContext<SessionState | null>(null);

// How long the brand splash stays up on a cold start.
const SPLASH_MS = 3000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role | null>(null);
  const [accountId, setAccountId] = useState<string>();
  const [name, setName] = useState<string>();
  const [booting, setBooting] = useState(true);
  // English is the default; the header toggle switches to Hindi, and the choice is
  // remembered across restarts.
  const [lang, setLanguage] = useState<Lang>('en');
  const [voiceGuidance, setVoice] = useState(true);

  // Undoes push.start()'s token-refresh listener. Kept in a ref because it outlives
  // any single render and must survive until the next sign-out.
  const stopPush = useRef<() => void>(() => {});

  const beginPush = useCallback(async () => {
    stopPush.current();
    stopPush.current = await push.start();
  }, []);

  const signOut = useCallback(async () => {
    // Before clearSession(): telling the server to forget this device is an
    // authenticated call, and clearing the token first would make it a 401. A phone
    // that stays registered keeps buzzing for the next shift's orders.
    stopPush.current();
    stopPush.current = () => {};
    await push.stop();

    await clearSession();
    queryClient.clear();
    setRole(null);
    setAccountId(undefined);
    setName(undefined);
  }, [queryClient]);

  // Cold start: restore a valid session and skip login entirely. The old app
  // always landed on the login screen even with a good token in storage.
  useEffect(() => {
    let cancelled = false;
    let splashTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const [stored, storedLang, storedVoice] = await Promise.all([
        restoreSession(),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('voiceGuidance'),
        // Hold the splash for a beat even when the session restores instantly.
        // Without this the logo flickers for ~100ms, which reads as a glitch
        // rather than a brand.
        new Promise(resolve => { splashTimer = setTimeout(resolve, SPLASH_MS); }),
      ]);
      if (cancelled) return;
      if (storedLang === 'hi' || storedLang === 'en') setLanguage(storedLang);
      if (storedVoice !== null) setVoice(storedVoice === 'true');
      if (stored) {
        setRole(stored.role as Role);
        setAccountId(stored.accountId);
        setName(stored.name);
        // A restored session never passes through signIn, so without this the phone
        // would only ever register a token on the day it was first logged in — and
        // stay silent for every launch after that.
        beginPush();
      }
      setBooting(false);
    })();
    return () => {
      cancelled = true;
      if (splashTimer) clearTimeout(splashTimer);
    };
  }, [queryClient, beginPush]);

  const signIn = useCallback(async (token: string, nextRole: Role, nextAccountId?: string, nextName?: string) => {
    // Query keys are intentionally simple; clearing prevents one patient/agent's
    // cached orders from flashing inside the next account after logout/login.
    queryClient.clear();
    await setSession(token, nextRole, nextAccountId, nextName);
    setRole(nextRole);
    setAccountId(nextAccountId);
    setName(nextName);
    // After setSession: registering the token is an authenticated call, so the token
    // has to be in storage before this runs. Not awaited — the permission dialog must
    // not hold up the jump to the home screen.
    beginPush();
  }, [queryClient, beginPush]);

  const setLang = useCallback((next: Lang) => {
    setLanguage(next);
    AsyncStorage.setItem('language', next);
  }, []);

  const setVoiceGuidance = useCallback((on: boolean) => {
    setVoice(on);
    AsyncStorage.setItem('voiceGuidance', String(on));
    api.patch('/me/settings', { voiceGuidance: on }).catch(() => {
      // Preference is already stored locally; syncing it is best-effort.
    });
  }, []);

  const value = useMemo(
    () => ({ role, accountId, name, booting, lang, voiceGuidance, signIn, signOut, setLang, setVoiceGuidance }),
    [role, accountId, name, booting, lang, voiceGuidance, signIn, signOut, setLang, setVoiceGuidance],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
