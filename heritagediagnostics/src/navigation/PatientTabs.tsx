// The patient's bottom tabs.
//
// This does NOT use @react-navigation/bottom-tabs. On the web that navigator
// leans on react-native-screens, whose container never hid the inactive screen:
// all three tabs rendered at once, stacked absolutely, with Home permanently on
// top — so a tab could be "selected" while the screen underneath never changed,
// and the tab bar's own presses never reached React. Both symptoms are gone with
// a plain switch: one screen rendered at a time, one bar we own.
//
// Camera and Sent still live in the stack above this, so navigation.navigate()
// keeps working for them.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import HomeScreen from '../screens/patient/HomeScreen';
import ProfileScreen from '../screens/patient/ProfileScreen';
import ReportScreen from '../screens/patient/ReportScreen';
import StatusScreen from '../screens/patient/StatusScreen';
import { useSession } from '../store/session';
import { C, styles, T } from '../theme';
import { tr } from '../translations';
import { readWorkflow, workflowKey, writeWorkflow } from '../workflow';

export type TabName = 'home' | 'status' | 'report' | 'profile';

const TABS: { name: TabName; icon: IconName }[] = [
  { name: 'home', icon: 'home' },
  { name: 'status', icon: 'status' },
  { name: 'report', icon: 'report' },
  { name: 'profile', icon: 'user' },
];

const SCREEN: Record<TabName, React.ComponentType> = {
  home: HomeScreen,
  status: StatusScreen,
  report: ReportScreen,
  profile: ProfileScreen,
};

// Lets HomeScreen's cards — and SentScreen, which is a stack route ABOVE the tabs —
// jump to a tab without pretending tabs are stack routes. The provider therefore
// sits above the stack, not inside PatientTabs.
const TabsContext = createContext<{ active: TabName; go: (tab: TabName) => void }>({
  active: 'home',
  go: () => {},
});

export const useTabs = () => useContext(TabsContext);

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const { accountId } = useSession();
  const [active, setActive] = useState<TabName>('home');
  const [restored, setRestored] = useState(false);
  const key = workflowKey(accountId, 'patient-tabs');

  useEffect(() => {
    setRestored(false);
    readWorkflow<{ active?: TabName }>(key).then(saved => {
      if (saved?.active && TABS.some(tab => tab.name === saved.active)) setActive(saved.active);
      setRestored(true);
    });
  }, [key]);

  const go = useCallback((tab: TabName) => {
    setActive(tab);
    void writeWorkflow(key, { active: tab });
  }, [key]);

  useEffect(() => {
    if (restored) void writeWorkflow(key, { active });
  }, [active, key, restored]);

  const value = useMemo(() => ({ active, go }), [active, go]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export default function PatientTabs() {
  const { lang } = useSession();
  const { active, go } = useTabs();
  // The screen's SafeAreaView only claims the top edge, so the bottom inset is ours to
  // deal with. On a phone with gesture navigation the home bar sits exactly where this
  // tab bar is: without the padding, the labels tuck under it and the taps land on the
  // system's gesture area instead of the tab.
  const insets = useSafeAreaInsets();

  const Screen = SCREEN[active];

  return (
      <View style={{ flex: 1 }}>
        {/* One screen at a time — no hidden siblings to fight with. */}
        <View style={{ flex: 1 }}>
          <Screen />
        </View>

        <View style={[styles.nav, { paddingBottom: insets.bottom }]}>
          {TABS.map(tab => {
            const focused = active === tab.name;
            const tint = focused ? C.red : C.gray;
            return (
              <Pressable
                key={tab.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tr(tab.name, lang)}
                onPress={() => go(tab.name)}
                style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.6 }]}>
                <Icon name={tab.icon} size={22} color={tint} />
                <Text style={{ ...T.caption, fontWeight: '600', color: tint, marginTop: 3 }}>
                  {tr(tab.name, lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
  );
}
