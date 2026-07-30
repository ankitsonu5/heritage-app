// The only entry point. There is no "pick your role" launcher — the backend knows
// each account's role and the app routes on what it returns.
//
// Patients sign in with phone + password. Staff (PRO / agent / lab / admin) can
// only SIGN IN — their accounts are created by an admin in the dashboard. If the
// app let anyone sign up as a PRO, anyone who installed the APK could read every
// patient's name, phone, address and report.
//
// The OTP flow is not deleted, only bypassed: set AUTH_MODE = 'otp' in config.ts
// and the code below sends and verifies a real SMS code instead.

import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, errorMessage } from '../client';
import { AUTH_MODE } from '../config';
import { Role } from '../models';
import { useSession } from '../store/session';
import { SweetAlert, SweetAlertState } from '../SweetAlert';
import { Button, C, Field, PasswordField, styles, T } from '../theme';
import { tr } from '../translations';
import { speak } from '../speech';
import logo from '../assets/logo.png';

type Mode = 'login' | 'register' | 'staff';

// A real Indian mobile: ten digits, first one 6-9. Mirrors the server's rule so
// junk like 0000000000 or 1234567890 is stopped before the request leaves the phone.
const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

export default function LoginScreen() {
  const { lang, setLang, signIn } = useSession();
  const [mode, setMode] = useState<Mode>('login');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [village, setVillage] = useState('');
  const [address, setAddress] = useState('');

  const [username, setUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // OTP path — dormant while AUTH_MODE is 'password'.
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  const enter = async (data: { token: string; user: { id?: string; role: string; name?: string } }) =>
    signIn(data.token, data.user.role as Role, data.user.id, data.user.name);

  const switchMode = (next: Mode) => {
    setMode(next);
    setAwaitingOtp(false);
    setOtp('');
    setDevOtp('');
    setShowPassword(false);
  };

  /* ------------------------------------------------------------- patient --- */

  const login = async (asPhone = phone, asPassword = password) => {
    if (!isValidPhone(asPhone)) return show('warning', tr('enterPhone', lang));
    if (!asPassword) return show('warning', tr('passwordRequired', lang));

    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { phone: asPhone, password: asPassword });
      await enter(data);
    } catch (error) {
      show('error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const registerPatient = async () => {
    if (name.trim().length < 2) return show('warning', tr('nameRequired', lang));
    if (!isValidPhone(phone)) return show('warning', tr('enterPhone', lang));
    const parsedAge = Number(age);
    if (!/^\d{1,3}$/.test(age) || !Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      return show('warning', tr('validAge', lang));
    }
    if (!village.trim()) return show('warning', tr('villageRequired', lang));
    if (address.trim().length < 5) return show('warning', tr('addressRequired', lang));
    if (password.length < 6) return show('warning', tr('weakPassword', lang));

    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', {
        phone, name, age: parsedAge, village, address, password,
      });
      await enter(data);   // registering signs you in — no second step
    } catch (error) {
      show('error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  /* ----------------------------------------------------------------- OTP --- */
  // Only reachable when AUTH_MODE === 'otp'.

  const sendOtp = async () => {
    if (!isValidPhone(phone)) return show('warning', tr('enterPhone', lang));
    setBusy(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      setDevOtp(data.devOtp || '');
      setAwaitingOtp(true);
      show('success', tr('otpSent', lang));
    } catch (error) {
      show('error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      await enter(data);
    } catch (error) {
      show('error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------------------------------------- staff --- */

  const staffLogin = async (user = username, pass = staffPassword) => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/staff-login', { username: user.trim().toLowerCase(), password: pass });
      await enter(data);   // role comes from the account, never from a picker
    } catch (error) {
      show('error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const TABS: { key: Mode; label: string }[] = [
    { key: 'login', label: tr('login', lang) },
    { key: 'register', label: tr('register', lang) },
    { key: 'staff', label: tr('staffLogin', lang) },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor={C.maroon} barStyle="light-content" />
      {/* Keeps the focused field above the keyboard — without it the password box
          sat behind the keyboard and the user couldn't see what they typed. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { flexGrow: 1, paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Image source={logo} resizeMode="contain" style={{ width: '100%', height: 84, marginVertical: 6 }} />
        <Text style={[styles.subtitle, { color: C.maroon, textAlign: 'center' }]}>{tr('tagline', lang)}</Text>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
          {TABS.map(tab => (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === tab.key }}
              onPress={() => switchMode(tab.key)}
              style={{
                flex: 1, minHeight: 46, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4,
                backgroundColor: mode === tab.key ? C.red : C.white,
                borderWidth: 1.5, borderColor: mode === tab.key ? C.red : C.border,
              }}>
              <Text style={{ ...T.small, fontWeight: '700', textAlign: 'center', color: mode === tab.key ? C.white : C.maroon }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ------------------------------------------------------------ login */}
        {mode === 'login' && !awaitingOtp && (
          <>
            <Text style={styles.title}>{tr('loginTitle', lang)}</Text>
            <Text style={styles.subtitle}>
              {AUTH_MODE === 'otp' ? tr('otpLogin', lang) : tr('passwordLogin', lang)}
            </Text>

            <Field
              value={phone}
              onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              accessibilityLabel={tr('phone', lang)}
              placeholder={tr('phone', lang)}
            />

            {AUTH_MODE === 'otp' ? (
              <Button title={tr('sendOtp', lang)} onPress={sendOtp} busy={busy} />
            ) : (
              <>
                <PasswordField
                  value={password}
                  onChangeText={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword(v => !v)}
                  accessibilityLabel={tr('password', lang)}
                  placeholder={tr('password', lang)}
                />
                <Button title={tr('login', lang)} onPress={() => login()} busy={busy} />
              </>
            )}

            <Text style={[styles.muted, { textAlign: 'center', marginTop: 12 }]}>{tr('newHere', lang)}</Text>
            <Button secondary title={tr('register', lang)} onPress={() => switchMode('register')} />
          </>
        )}

        {/* ------------------------------------------------------------- OTP */}
        {awaitingOtp && (
          <>
            <Text style={styles.title}>{tr('otp', lang)}</Text>
            <Text style={styles.subtitle}>+91 {phone}</Text>

            {devOtp ? (
              <View style={{
                backgroundColor: '#E8F5EE', borderRadius: 12, padding: 14, marginBottom: 12,
                borderWidth: 1.5, borderColor: C.green,
              }}>
                <Text style={styles.muted}>{tr('yourOtp', lang)}</Text>
                <Text style={{ ...T.num, color: C.green, fontSize: 30, letterSpacing: 6 }}>{devOtp}</Text>
              </View>
            ) : null}

            <Field
              value={otp}
              onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
            />
            <Button title={tr('verify', lang)} onPress={verifyOtp} busy={busy} />
            <Button secondary title={tr('changeNumber', lang)} onPress={() => setAwaitingOtp(false)} />
          </>
        )}

        {/* --------------------------------------------------------- register */}
        {mode === 'register' && (
          <>
            <Text style={styles.title}>{tr('registerTitle', lang)}</Text>
            <Text style={styles.subtitle}>{tr('registerHelp', lang)}</Text>

            <Field value={name} onChangeText={setName} placeholder={tr('fullName', lang)} accessibilityLabel={tr('fullName', lang)} />
            <Field
              value={phone}
              onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder={tr('phone', lang)}
              accessibilityLabel={tr('phone', lang)}
            />
            <Field
              value={age}
              onChangeText={value => setAge(value.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder={tr('age', lang)}
              accessibilityLabel={tr('age', lang)}
            />
            <Field value={village} onChangeText={setVillage} placeholder={tr('city', lang)} accessibilityLabel={tr('city', lang)} />
            <Field
              value={address}
              onChangeText={setAddress}
              multiline
              placeholder={tr('address', lang)}
              accessibilityLabel={tr('address', lang)}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <PasswordField
              value={password}
              onChangeText={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword(v => !v)}
              placeholder={tr('createPassword', lang)}
              accessibilityLabel={tr('createPassword', lang)}
            />
            <Text style={styles.muted}>{tr('passwordHint', lang)}</Text>

            <Button title={tr('registerAction', lang)} onPress={registerPatient} busy={busy} />
            <Button secondary icon="speaker" title={tr('listen', lang)} onPress={() => speak(tr('registerHelp', lang), lang)} />
          </>
        )}

        {/* ------------------------------------------------------------ staff */}
        {mode === 'staff' && (
          <>
            <Text style={styles.title}>{tr('staffLogin', lang)}</Text>
            <Text style={styles.subtitle}>{tr('staffHelp', lang)}</Text>

            <Field
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder={tr('username', lang)}
              accessibilityLabel={tr('username', lang)}
            />
            <PasswordField
              value={staffPassword}
              onChangeText={setStaffPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword(v => !v)}
              placeholder={tr('password', lang)}
              accessibilityLabel={tr('password', lang)}
            />
            <Button title={tr('login', lang)} onPress={() => staffLogin()} busy={busy} />

            {/* Staff accounts are made by the admin — there is deliberately no
                "create account" here. */}
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 10 }]}>
              {tr('staffNoSignup', lang)}
            </Text>
          </>
        )}

                <Pressable onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')} style={{ marginTop: 22, alignSelf: 'center' }}>
          <Text style={{ color: C.maroon, fontWeight: '700' }}>{lang === 'hi' ? 'English' : 'हिंदी'}</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      <SweetAlert
        state={alert}
        confirmText={tr('ok', lang)}
        onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
      />
    </SafeAreaView>
  );
}
