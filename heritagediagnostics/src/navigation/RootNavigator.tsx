// Role-based routing. The role comes from the account (backend), so a patient can
// never reach a staff screen by navigating — the staff routes are not mounted at all.

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { disconnectLive, useLiveOrders } from '../api/live';

import { StaffRole } from '../models';
import { onForegroundMessage, onNotificationTap } from '../push';
import { useSession } from '../store/session';
import { Header, styles } from '../theme';
import { tr } from '../translations';
import { speak } from '../speech';
import { SweetAlert, SweetAlertState } from '../SweetAlert';

import NotificationBell from '../components/NotificationBell';
import LoginScreen from '../screens/LoginScreen';
import SplashScreen from '../screens/SplashScreen';
import PatientTabs, { TabsProvider } from './PatientTabs';
import CameraScreen from '../screens/patient/CameraScreen';
import SentScreen from '../screens/patient/SentScreen';
import AdminScreen from '../screens/staff/AdminScreen';
import AgentScreen from '../screens/staff/AgentScreen';
import LabScreen from '../screens/staff/LabScreen';
import ProScreen from '../screens/staff/ProScreen';

const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// The bell rides in every role's header — patient, PRO, agent and lab alike.
function AppHeader({ title, withVoice }: { title: string; withVoice?: boolean }) {
  const { lang, setLang, signOut, voiceGuidance, setVoiceGuidance } = useSession();
  const [logoutAlert, setLogoutAlert] = useState<SweetAlertState>({
    visible: false, type: 'warning', title: '', message: '',
  });

  const confirmSignOut = () => setLogoutAlert({
    visible: true,
    type: 'warning',
    title: tr('logout', lang),
    message: tr('confirmLogout', lang),
    acceptText: tr('logout', lang),
    onAccept: () => { void signOut(); },
  });

  // One tap flips voice guidance. Turning it ON says so out loud, which is the
  // only confirmation that matters to someone who is using the app by ear.
  const toggleVoice = () => {
    const next = !voiceGuidance;
    setVoiceGuidance(next);
    if (next) speak(tr('voiceOn', lang), lang);
  };

  return <>
    <Header
      title={title}
      lang={lang}
      setLang={setLang}
      onBack={confirmSignOut}
      voiceOn={voiceGuidance}
      onToggleVoice={withVoice ? toggleVoice : undefined}
      actions={<NotificationBell />}
    />
    <SweetAlert
      state={logoutAlert}
      confirmText={tr('ok', lang)}
      cancelText={tr('cancel', lang)}
      onConfirm={() => setLogoutAlert(previous => ({ ...previous, visible: false }))}
    />
  </>;
}

function PatientStack() {
  const { lang } = useSession();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader title={tr('app', lang)} withVoice />
      {/* The provider sits above the stack so SentScreen — a stack route — can
          also switch tabs. */}
      <TabsProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={PatientTabs} />
          <Stack.Screen name="Camera" component={CameraScreen} />
          <Stack.Screen name="Sent" component={SentScreen} />
        </Stack.Navigator>
      </TabsProvider>
    </SafeAreaView>
  );
}

const STAFF_SCREEN: Record<StaffRole, React.ComponentType> = {
  pro: ProScreen,
  agent: AgentScreen,
  lab: LabScreen,
  admin: AdminScreen,
};

function StaffApp({ role }: { role: StaffRole }) {
  const { lang } = useSession();
  const Screen = STAFF_SCREEN[role];
  return (
    // 'bottom' as well as 'top': a staff screen has no tab bar under it, so its scroll
    // runs to the very edge and the last button — "send to lab", "upload report" — ends
    // up under the gesture bar. The patient side handles the same inset on its tab bar
    // instead, which is why that one stays top-only.
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <AppHeader title={tr(role, lang)} />
      {/* Keep the focused input above the keyboard on the staff forms too. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


export default function RootNavigator() {
  const { role, booting } = useSession();
  const queryClient = useQueryClient();

  // One socket for the whole app, live only while signed in.
  useLiveOrders(Boolean(role));
  useEffect(() => {
    if (!role) disconnectLive();
  }, [role]);

  // Tapping a notification lands on the role's own screen, which is already the right
  // place — a PRO's list, an agent's pickups. What it would NOT be is current: the
  // socket was dead while the app was closed, so the cache still holds whatever was on
  // screen hours ago. Refetching on the tap is what makes the notification and the
  // list agree.
  useEffect(() => {
    if (!role) return;
    return onNotificationTap(() => queryClient.invalidateQueries());
  }, [role, queryClient]);

  // FCM shows nothing while the app is focused, so the app draws its own banner.
  useEffect(() => {
    if (!role) return;
    return onForegroundMessage();
  }, [role]);

  // The splash covers the session restore, so a logged-in user never sees the
  // login screen flash before being let in.
  if (booting) return <SplashScreen />;

  // NavigationContainer must contain exactly ONE navigator. Rendering LoginScreen
  // (a plain component) as its direct child left the container without a navigator
  // to attach to, so its state never wired up: the tabs rendered, but every press
  // dispatched into nothing and the screen never changed. The auth split belongs
  // INSIDE a navigator, as separate screens.
  //
  // The outer View also gives the floating switcher a full-height parent to anchor
  // against — NavigationContainer does not provide one.
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!role ? (
            <RootStack.Screen name="Login" component={LoginScreen} />
          ) : role === 'user' ? (
            <RootStack.Screen name="Patient" component={PatientStack} />
          ) : (
            <RootStack.Screen name="Staff">
              {() => <StaffApp role={role as StaffRole} />}
            </RootStack.Screen>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}
