import { useIsFocused, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import { useLatestOrder, useMyOrders } from '../../api/hooks';
import Icon from '../../components/Icon';
import { useTabs } from '../../navigation/PatientTabs';
import { STATUS } from '../../constants/status';
import { useSession } from '../../store/session';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';
import { speak } from '../../speech';

import { PRO_DESK_PHONE } from '../../config';

export default function HomeScreen() {
  const { lang, name, voiceGuidance } = useSession();
  const navigation = useNavigation<any>();
  const tabs = useTabs();
  const focused = useIsFocused();

  const latest = useLatestOrder(focused);
  const orders = useMyOrders();

  const active = latest.data && latest.data.order.status !== STATUS.REPORT_READY
    && latest.data.order.status !== STATUS.CANCELLED
    ? latest.data.order
    : null;

  // The badge is a real count of reports the patient has not opened yet.
  const readyCount = (orders.data ?? []).filter(order => order.status === STATUS.REPORT_READY).length;

  // First name only, so the greeting stays one clean line ("Hello, Sakshi")
  // instead of wrapping a full name and a whole sentence across three lines.
  const firstName = name?.trim().split(/\s+/)[0];
  const hello = firstName ? `${tr('hello', lang)}, ${firstName}` : tr('greeting', lang);
  const speakGreeting = `${tr('greeting', lang)} ${name ?? ''}. ${tr('sendRx', lang)}`;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{hello} 👋</Text>
          <Text style={styles.subtitle}>{tr('healthTagline', lang)}</Text>
        </View>
        {voiceGuidance && (
          <Button compact secondary icon="speaker" onPress={() => speak(speakGreeting, lang)} />
        )}
      </View>

      <Card onPress={() => navigation.navigate('Camera')} accent={C.red}>
        <View style={styles.row}>
          <View style={{
            width: 48, height: 48, borderRadius: 14, backgroundColor: '#F8E8E8',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="camera" size={26} color={C.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { fontSize: 19 }]}>{tr('sendRx', lang)}</Text>
            <Text style={styles.muted}>{tr('photoHint', lang)}</Text>
          </View>
          <Icon name="chevron" size={20} color={C.red} />
        </View>
      </Card>

      {/* Only rendered when an order is genuinely in flight. */}
      {active && (
        <Card onPress={() => tabs.go('status')} accent={C.gold}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{active.orderId}</Text>
              <Text style={styles.muted}>{active.tests.join(', ') || tr('testsAwaiting', lang)}</Text>
            </View>
            <Chip status={active.status} label={tr(active.status, lang)} />
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Card onPress={() => tabs.go('status')}>
            <Icon name="status" size={26} color={C.gold} />
            <Text style={[styles.label, { marginTop: 8 }]}>{tr('status', lang)}</Text>
            <Text style={styles.muted}>{active?.orderId || '—'}</Text>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card onPress={() => tabs.go('report')}>
            <Icon name="report" size={26} color={C.green} />
            <Text style={[styles.label, { marginTop: 8 }]}>{tr('report', lang)}</Text>
            <Text style={styles.muted}>
              {readyCount > 0
                ? `${readyCount} ${tr('reportReady', lang)}`
                : tr('noReport', lang)}
            </Text>
          </Card>
        </View>
      </View>

      <Button
        secondary
        icon="phone"
        title={tr('callPro', lang)}
        onPress={() => Linking.openURL(`tel:${PRO_DESK_PHONE}`)}
      />
    </ScrollView>
  );
}
