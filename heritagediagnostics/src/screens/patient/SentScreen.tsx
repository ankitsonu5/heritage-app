import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTabs } from '../../navigation/PatientTabs';
import { useSession } from '../../store/session';
import { Button, C, styles } from '../../theme';
import { tr } from '../../translations';
import { speak } from '../../speech';

export default function SentScreen() {
  const { lang, voiceGuidance } = useSession();
  const navigation = useNavigation<any>();
  const tabs = useTabs();

  useEffect(() => {
    if (voiceGuidance) speak(tr('sent', lang), lang);
  }, [lang, voiceGuidance]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <View style={{
          width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5EE',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: C.green, fontSize: 60 }}>✓</Text>
        </View>
        <Text style={[styles.title, { textAlign: 'center', marginTop: 18 }]}>{tr('sent', lang)}</Text>
      </View>
      {/* Back to the tabs, then onto the one asked for. Status and Home are tabs,
          not stack routes, so they are switched rather than pushed. */}
      <Button
        title={tr('status', lang)}
        onPress={() => { tabs.go('status'); navigation.navigate('Tabs'); }}
      />
      <Button
        secondary
        title={tr('home', lang)}
        onPress={() => { tabs.go('home'); navigation.navigate('Tabs'); }}
      />
    </ScrollView>
  );
}
