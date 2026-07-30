// The step tracker. The step index comes from the server (derived from the order's
// real status), and the screen polls while focused, so a PRO confirming an order
// updates the patient's tracker within ~20s without them touching anything.

import { useIsFocused } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useLatestOrder, useMyOrders } from '../../api/hooks';
import { Empty, ErrorState, Loading } from '../../components/States';
import { STATUS, STEPS, stepIndexOf } from '../../constants/status';
import { errorMessage } from '../../client';
import { useSession } from '../../store/session';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';
import { speak } from '../../speech';

export default function StatusScreen() {
  const { lang, voiceGuidance } = useSession();
  const focused = useIsFocused();

  const latest = useLatestOrder(focused);
  const history = useMyOrders();

  if (latest.isPending) return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><Loading lang={lang} /></ScrollView>;

  if (latest.isError) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <ErrorState lang={lang} message={errorMessage(latest.error)} onRetry={() => latest.refetch()} />
      </ScrollView>
    );
  }

  const latestOrder = latest.data;
  const isPast = (status: string) => status === STATUS.REPORT_READY || status === STATUS.CANCELLED;
  // A completed latest order is history, not a live tracker. The previous version
  // always removed the latest row, so the patient's most recent report never
  // appeared in Past orders. Only terminal orders belong in the history table.
  const current = latestOrder && !isPast(latestOrder.order.status) ? latestOrder : null;
  const orders = (history.data ?? []).filter(order => isPast(order.status));

  // stepIndexOf() is the client mirror of the server's mapping; using the server's
  // value directly keeps them honest if they ever disagree.
  const activeStep = current ? current.stepIndex ?? stepIndexOf(current.order.status) : 0;
  const cancelled = current?.order.status === STATUS.CANCELLED;

  const readAloud = () => {
    if (!current) return speak(tr('noOrders', lang), lang);
    speak(`${tr('status', lang)}: ${tr(current.order.status, lang)}`, lang);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.between}>
        <Text style={styles.title}>{tr('status', lang)}</Text>
        {voiceGuidance && (
          <Button compact secondary icon="speaker" onPress={readAloud} />
        )}
      </View>

      {!current ? (
        <Text style={styles.muted}>{tr('noActiveOrder', lang)}</Text>
      ) : (
        <Card accent={cancelled ? C.gray : C.red}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{current.order.orderId}</Text>
              <Text style={styles.muted}>
                {current.order.tests.join(', ') || tr('testsAwaiting', lang)}
              </Text>
            </View>
            <Chip status={current.order.status} label={tr(current.order.status, lang)} />
          </View>

          {cancelled ? (
            <Text style={[styles.muted, { marginTop: 12 }]}>
              {current.order.cancelReason || tr('cancelled', lang)}
            </Text>
          ) : (
            <View style={{ marginTop: 18 }}>
              {STEPS.map((step, index) => {
                const done = index < activeStep;
                const active = index === activeStep;
                const color = done ? C.green : active ? C.red : C.border;
                return (
                  <View key={step} style={{ flexDirection: 'row', minHeight: 62 }}>
                    <View style={{ width: 42, alignItems: 'center' }}>
                      <View style={{
                        width: 30, height: 30, borderRadius: 15, backgroundColor: color,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: C.white, fontWeight: '800' }}>{done ? '✓' : index + 1}</Text>
                      </View>
                      {index < STEPS.length - 1 && (
                        <View style={{ width: 3, flex: 1, backgroundColor: done ? C.green : C.border }} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, {
                        color: active ? C.red : done ? C.text : C.gray,
                        marginTop: 3,
                      }]}>
                        {tr(step, lang)}
                      </Text>
                      {step === 'agent_assigned' && current.order.pickupSlot ? (
                        <Text style={styles.muted}>{current.order.pickupSlot}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}

      <Text style={styles.sectionTitle}>{tr('history', lang)}</Text>
      {history.isPending && <Loading lang={lang} />}
      {history.isError && (
        <ErrorState lang={lang} message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      )}
      {!history.isPending && !history.isError && orders.length === 0 && <Empty lang={lang} />}
      {!history.isPending && !history.isError && orders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ minWidth: 740, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#FBF3E7', borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={[styles.label, { width: 110, padding: 10, fontSize: 15 }]}>{tr('date', lang)}</Text>
              <Text style={[styles.label, { width: 125, padding: 10, fontSize: 15 }]}>{tr('orderNumber', lang)}</Text>
              <Text style={[styles.label, { width: 250, padding: 10, fontSize: 15 }]}>{tr('testList', lang)}</Text>
              <Text style={[styles.label, { width: 90, padding: 10, fontSize: 15 }]}>{tr('amount', lang)}</Text>
              <Text style={[styles.label, { width: 160, padding: 10, fontSize: 15 }]}>{tr('status', lang)}</Text>
            </View>
            {orders.map((order, index) => (
              <View
                key={order._id}
                style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
                  borderBottomWidth: index === orders.length - 1 ? 0 : 1,
                  borderBottomColor: C.borderSoft,
                }}>
                <Text style={[styles.muted, { width: 110, padding: 10, marginTop: 0 }]}>
                  {new Date(order.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
                </Text>
                <Text style={[styles.muted, { width: 125, padding: 10, marginTop: 0, color: C.text }]}>{order.orderId}</Text>
                <Text style={[styles.muted, { width: 250, padding: 10, marginTop: 0, color: C.text }]}>{order.tests.join(', ') || '—'}</Text>
                <Text style={[styles.muted, { width: 90, padding: 10, marginTop: 0, color: C.text }]}>₹{order.amount || 0}</Text>
                <View style={{ width: 160, padding: 10 }}>
                  <Chip status={order.status} label={tr(order.status, lang)} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}
