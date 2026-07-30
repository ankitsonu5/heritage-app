// Collection agent: today's pickups, the two checkboxes, and completion.
//
// The agent is the one role that works in genuinely bad signal. Both checkboxes
// write through an outbox: the tap lands locally and syncs when the network comes
// back, so a village with no bars never loses a collection.

import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { useOrderAction, useQueue } from '../../api/hooks';
import { Empty, ErrorState, Loading } from '../../components/States';
import { OrderHistory } from '../../components/OrderHistory';
import { errorMessage, isOffline } from '../../client';
import { Order } from '../../models';
import { onConnectivityChange } from '../../net';
import * as outbox from '../../outbox';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';
import { clearWorkflow, readWorkflow, workflowKey, writeWorkflow } from '../../workflow';

const TUBES = ['EDTA', 'SST', 'FLU'] as const;

export default function AgentScreen() {
  const { lang, accountId } = useSession();
  const focused = useIsFocused();

  const queue = useQueue('agent', focused);
  const action = useOrderAction();

  const [selected, setSelected] = useState<Order | null>(null);
  const [tube, setTube] = useState<(typeof TUBES)[number]>('EDTA');
  // The agent picks how the patient actually paid — cash in hand or already online.
  const [payMode, setPayMode] = useState<'cash' | 'online'>('cash');
  const [queued, setQueued] = useState<outbox.OutboxEntry[]>([]);
  const [online, setOnline] = useState(true);
  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });
  const [draftRestored, setDraftRestored] = useState(false);
  const savedOrderId = useRef<string | undefined>(undefined);
  const draftKey = useMemo(() => workflowKey(accountId, 'agent'), [accountId]);

  useEffect(() => {
    setDraftRestored(false);
    savedOrderId.current = undefined;
    readWorkflow<{ selectedOrderId?: string; tube?: (typeof TUBES)[number]; payMode?: 'cash' | 'online' }>(draftKey)
      .then(draft => {
        savedOrderId.current = draft?.selectedOrderId;
        if (draft?.tube && TUBES.includes(draft.tube)) setTube(draft.tube);
        if (draft?.payMode) setPayMode(draft.payMode);
        setDraftRestored(true);
      });
  }, [draftKey]);

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  // Ask before anything that says work happened. A stray tap used to be enough to
  // tell the lab a sample was on its way, or to record cash that was never handed
  // over — and the agent is doing this one-handed on a doorstep.
  const ask = (title: string, message: string, acceptText: string, onAccept: () => void) =>
    setAlert({ visible: true, type: 'warning', title, message, acceptText, onAccept });

  const refreshQueued = useCallback(async () => setQueued(await outbox.pending()), []);

  // Drain the outbox the moment connectivity returns.
  useEffect(() => {
    const unsubscribe = onConnectivityChange(async connected => {
      setOnline(connected);
      if (!connected) return;
      const { sent } = await outbox.flush();
      await refreshQueued();
      if (sent > 0) {
        queue.refetch();
        show('success', `${sent} ${tr('synced', lang)}`);
      }
    });
    refreshQueued();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Optimistic locally, durable in the outbox, authoritative once the server agrees.
  const check = async (order: Order, field: 'sampleTaken' | 'cashTaken') => {
    const endpoint = field === 'sampleTaken' ? 'sample-taken' : 'cash-taken';
    const value = !order[field];

    setSelected({ ...order, [field]: value });

    try {
      const updated = await action.mutateAsync({
        orderId: order._id, action: endpoint, body: { value },
      });
      setSelected(updated);
    } catch (error) {
      if (isOffline(error)) {
        await outbox.enqueue(order._id, endpoint, value);
        await refreshQueued();
        show('warning', tr('offline', lang));
      } else {
        setSelected(order); // server refused it — put the checkbox back
        show('error', errorMessage(error));
      }
    }
  };

  const complete = async () => {
    if (!selected) return;
    try {
      // Anything still queued must land before the order can leave the agent.
      const { remaining } = await outbox.flush();
      await refreshQueued();
      if (remaining > 0) return show('warning', tr('offline', lang));

      await action.mutateAsync({ orderId: selected._id, action: 'agent-complete', body: { labTube: tube, paymentMode: payMode } });
      setSelected(null);
      savedOrderId.current = undefined;
      await clearWorkflow(draftKey);
      show('success', tr('updated', lang));
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  const orders = queue.data ?? [];

  useEffect(() => {
    if (!draftRestored || queue.isPending) return;
    const wanted = selected?._id || savedOrderId.current;
    if (!wanted) return;
    const fresh = orders.find(order => order._id === wanted);
    if (fresh) setSelected(fresh);
    else {
      setSelected(null);
      savedOrderId.current = undefined;
      void clearWorkflow(draftKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRestored, queue.isPending, queue.data]);

  useEffect(() => {
    if (!draftRestored) return;
    void writeWorkflow(draftKey, { selectedOrderId: selected?._id, tube, payMode });
  }, [draftKey, draftRestored, selected?._id, tube, payMode]);
  // Cash is only owed when the agent marks the payment as cash.
  const cashDue = payMode === 'cash';
  const canComplete = Boolean(selected?.sampleTaken) && (!cashDue || Boolean(selected?.cashTaken));

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.between}>
          <Text style={styles.title}>{tr('pickups', lang)}</Text>
          {!online && <Chip status="cancelled" label={tr('offline', lang)} />}
        </View>

        {queued.length > 0 && (
          <Card accent={C.gold}>
            <Text style={styles.muted}>
              {queued.length} {tr('pendingSync', lang)}
            </Text>
          </Card>
        )}

        {queue.isPending && <Loading lang={lang} />}
        {queue.isError && (
          <ErrorState lang={lang} message={errorMessage(queue.error)} onRetry={() => queue.refetch()} />
        )}
        {!queue.isPending && !queue.isError && orders.length === 0 && <Empty lang={lang} />}

        {orders.map((order, index) => (
          <Card
            key={order._id}
            onPress={() => { setSelected(order); setPayMode((order.paymentMode as 'cash' | 'online') || 'cash'); }}
            accent={selected?._id === order._id ? C.green : undefined}>
            <View style={styles.between}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{order.patient?.name || order.orderId}</Text>
                <Text style={styles.muted}>{order.patient?.address || order.patient?.village}</Text>
                <View style={{
                  alignSelf: 'flex-start', marginTop: 8, marginBottom: 4,
                  paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9,
                  backgroundColor: '#FBF3E7', borderWidth: 1, borderColor: C.gold,
                }}>
                  <Text style={{ fontWeight: '800', color: C.maroon }}>
                    {tr('pickupSlot', lang)}: {order.pickupSlot || '—'}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  {order.tests.join(', ') || '—'} · ₹{order.amount}
                </Text>
              </View>
              {/* The chip is derived from position in the day's queue, not hardcoded. */}
              <Chip
                status={order.status}
                label={index === 0 ? (lang === 'hi' ? 'अगला' : 'Next') : (lang === 'hi' ? 'बाकी' : 'Later')}
              />
            </View>
          </Card>
        ))}

        {selected && (
          <Card accent={C.red}>
            <Text style={styles.title}>{selected.orderId}</Text>
            <Text style={styles.subtitle}>
              {selected.patient?.name}{'\n'}{selected.patient?.address || selected.patient?.village}
            </Text>

            {/* Keep the promised visit time visible after the agent opens the
                pickup; it is the key detail they need before leaving. */}
            <View style={{
              backgroundColor: '#FBF3E7', borderRadius: 12, padding: 13, marginBottom: 10,
              borderWidth: 1.5, borderColor: C.gold,
            }}>
              <Text style={styles.muted}>{tr('pickupSlot', lang)}</Text>
              <Text style={{ ...styles.title, marginBottom: 0, color: C.maroon }}>
                {selected.pickupSlot || '—'}
              </Text>
            </View>

            <Button
              secondary
              title={`📞 ${tr('call', lang)}`}
              onPress={() => selected.patient?.phone && Linking.openURL(`tel:${selected.patient.phone}`)}
            />

            <Button
              secondary={!selected.sampleTaken}
              title={`${selected.sampleTaken ? '✓ ' : ''}${tr('sampleTaken', lang)}`}
              onPress={() => ask(
                tr(selected.sampleTaken ? 'undoSampleTitle' : 'confirmSampleTitle', lang),
                tr(selected.sampleTaken ? 'undoSampleMsg' : 'confirmSampleMsg', lang),
                tr(selected.sampleTaken ? 'undoYes' : 'sampleYes', lang),
                () => check(selected, 'sampleTaken'),
              )}
            />

            {/* The agent records how the patient actually paid. */}
            <Text style={styles.sectionTitle}>{tr('paymentMode', lang)}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {([['cash', tr('payCash', lang)], ['online', tr('payOnline', lang)]] as const).map(([mode, label]) => (
                <Pressable
                  key={mode}
                  onPress={() => setPayMode(mode)}
                  style={{
                    flex: 1, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: payMode === mode ? C.red : C.gold,
                    backgroundColor: payMode === mode ? C.red : C.white,
                  }}>
                  <Text style={{ fontWeight: '800', color: payMode === mode ? C.white : C.maroon }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {cashDue ? (
              <Button
                secondary={!selected.cashTaken}
                title={`${selected.cashTaken ? '✓ ' : ''}${tr('cashTaken', lang)} ₹${selected.amount}`}
                onPress={() => ask(
                  tr(selected.cashTaken ? 'undoCashTitle' : 'confirmCashTitle', lang),
                  selected.cashTaken
                    ? tr('undoCashMsg', lang)
                    : tr('confirmCashMsg', lang, String(selected.amount)),
                  tr(selected.cashTaken ? 'undoYes' : 'cashYes', lang),
                  () => check(selected, 'cashTaken'),
                )}
              />
            ) : (
              <Text style={styles.muted}>{tr('paidOnline', lang)} · ₹{selected.amount}</Text>
            )}

            <Text style={styles.sectionTitle}>{tr('labTube', lang)}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {TUBES.map(option => (
                <Pressable
                  key={option}
                  onPress={() => setTube(option)}
                  style={{
                    flex: 1, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: tube === option ? C.red : C.gold,
                    backgroundColor: tube === option ? C.red : C.white,
                  }}>
                  <Text style={{ fontWeight: '800', color: tube === option ? C.white : C.maroon }}>{option}</Text>
                </Pressable>
              ))}
            </View>

            {/* The point of no return: this hands the order to the lab. */}
            <Button
              disabled={!canComplete}
              title={tr('complete', lang)}
              busy={action.isPending}
              onPress={() => ask(
                tr('confirmCompleteTitle', lang),
                tr('confirmCompleteMsg', lang, tube, payMode === 'cash' ? tr('payCash', lang) : tr('payOnline', lang)),
                tr('completeYes', lang),
                complete,
              )}
            />
          </Card>
        )}
        <OrderHistory role="agent" focused={focused} />
      </ScrollView>

      <SweetAlert
        state={alert}
        cancelText={tr('cancel', lang)}
        confirmText={tr('ok', lang)}
        onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
      />
    </>
  );
}
