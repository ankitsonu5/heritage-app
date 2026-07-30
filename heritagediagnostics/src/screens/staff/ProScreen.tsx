// PRO desk: review the prescription, call the patient, confirm tests + amount,
// then hand it to the least-loaded agent in the patient's zone.

import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useAgents, useOrderAction, useQueue, useTestCatalog } from '../../api/hooks';
import Icon from '../../components/Icon';
import { OrderHistory } from '../../components/OrderHistory';
import { Empty, ErrorState, Loading } from '../../components/States';
import { QUEUE, STATUS } from '../../constants/status';
import { errorMessage, mediaUrl } from '../../client';
import { Order } from '../../models';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, Card, Chip, Field, styles } from '../../theme';
import { tr } from '../../translations';
import { clearWorkflow, readWorkflow, workflowKey, writeWorkflow } from '../../workflow';

// Full-day two-hour windows. The missing afternoon/evening windows left the PRO
// with no honest time to offer patients between 14:00–16:00 or after 18:00.
const SLOTS = [
  '08:00–10:00', '10:00–12:00', '12:00–14:00',
  '14:00–16:00', '16:00–18:00', '18:00–20:00',
];

export default function ProScreen() {
  const { lang, accountId } = useSession();
  const focused = useIsFocused();

  const queue = useQueue('pro', focused);
  const action = useOrderAction();

  const [selected, setSelected] = useState<Order | null>(null);
  // Test IDs the PRO has ticked from the catalog, plus one manual "Other" test.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [testSearch, setTestSearch] = useState('');
  const [otherName, setOtherName] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [slot, setSlot] = useState(SLOTS[1]);
  const [zoom, setZoom] = useState(false);
  const [zoomAt, setZoomAt] = useState(0);
  // Have we opened the dialer for this order? Only changes the button's wording.
  const [dialed, setDialed] = useState(false);
  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });
  const [draftRestored, setDraftRestored] = useState(false);
  const savedOrderId = useRef<string | undefined>(undefined);
  const draftKey = useMemo(() => workflowKey(accountId, 'pro'), [accountId]);

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  // Ask before the steps that commit real money or send a person somewhere.
  const ask = (title: string, message: string, acceptText: string, onAccept: () => void) =>
    setAlert({ visible: true, type: 'warning', title, message, acceptText, onAccept });

  // Zone is not a filter — the PRO picks whoever is free, so ask for all agents.
  const agents = useAgents();
  const catalog = useTestCatalog(focused);
  const catalogList = catalog.data ?? [];

  type ProDraft = {
    selectedOrderId?: string; pickedIds?: string[]; otherName?: string;
    otherAmount?: string; testSearch?: string; slot?: string; dialed?: boolean;
  };

  useEffect(() => {
    setDraftRestored(false);
    savedOrderId.current = undefined;
    readWorkflow<ProDraft>(draftKey).then(draft => {
      savedOrderId.current = draft?.selectedOrderId;
      setPicked(new Set(draft?.pickedIds ?? []));
      setOtherName(draft?.otherName ?? '');
      setOtherAmount(draft?.otherAmount ?? '');
      setTestSearch(draft?.testSearch ?? '');
      setSlot(draft?.slot && SLOTS.includes(draft.slot) ? draft.slot : SLOTS[1]);
      setDialed(Boolean(draft?.dialed));
      setDraftRestored(true);
    });
  }, [draftKey]);

  const select = (order: Order) => {
    setSelected(order);
    setPicked(new Set());
    setTestSearch('');
    setOtherName('');
    setOtherAmount('');
    // Each order starts from the default slot. Without this the previous order's
    // pick silently carried over to the next one.
    setSlot(order.pickupSlot && SLOTS.includes(order.pickupSlot) ? order.pickupSlot : SLOTS[1]);
    setDialed(false);
  };

  const togglePick = (id: string) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Live total: the ticked catalog rates plus the optional manual test.
  const otherAmt = otherName.trim() ? (Number(otherAmount) || 0) : 0;
  const total = catalogList.filter(t => picked.has(t._id)).reduce((s, t) => s + t.amount, 0) + otherAmt;
  const selectedTests = catalogList.filter(test => picked.has(test._id));
  const searchNeedle = testSearch.trim().toLocaleLowerCase();
  const matchingTests = searchNeedle
    ? catalogList
      .filter(test => !picked.has(test._id))
      .filter(test => `${test.name} ${test.category || ''}`.toLocaleLowerCase().includes(searchNeedle))
      .slice(0, 20)
    : [];

  // Prescription pages: the new multi-page list, falling back to the single image
  // that every order created before multi-upload still carries.
  const pages = selected?.prescriptionUrls?.length
    ? selected.prescriptionUrls
    : (selected?.prescriptionUrl ? [selected.prescriptionUrl] : []);

  const run = async (name: string, body?: Record<string, unknown>) => {
    if (!selected) return;
    try {
      const updated = await action.mutateAsync({ orderId: selected._id, action: name, body });
      setSelected(updated);
      show('success', tr('updated', lang));
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  // Dialling is NOT the same as reaching the patient. The number may ring out, go
  // to voicemail, or be picked up by the wrong person — so opening the dialer only
  // opens the dialer. Nothing moves until the PRO says they actually spoke, which
  // is the one thing the app cannot observe for itself.
  const dial = async () => {
    if (!selected?.patient?.phone) return;
    setDialed(true);
    await Linking.openURL(`tel:${selected.patient.phone}`);
  };

  // "Called" is server state, and the confirm step depends on it.
  const markSpoke = () => run('pro-call');

  const confirm = () => {
    const testIds = [...picked];
    const otherTests = otherName.trim() ? [{ name: otherName.trim(), amount: otherAmt }] : [];
    if (!testIds.length && !otherTests.length) return show('warning', tr('selectTests', lang));
    ask(
      tr('confirmTestsTitle', lang),
      tr('confirmTestsMsg', lang, String(total)),
      tr('confirmTestsYes', lang),
      // No amount is sent — the server prices the tests from the catalog.
      () => run('pro-confirm', { testIds, otherTests }),
    );
  };

  // Do not trust an older/deployed API to filter perfectly: completed work can
  // never be a "New order", even if it is accidentally returned by /orders.
  const orders = (queue.data ?? []).filter(order => QUEUE.pro.includes(order.status));

  // Reopen the same server order after logout/restart. If the order has moved to
  // another role's queue, discard the stale local draft instead of showing a
  // phantom assignment or an old patient's details.
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
    void writeWorkflow<ProDraft>(draftKey, {
      selectedOrderId: selected?._id,
      pickedIds: [...picked], otherName, otherAmount, testSearch, slot, dialed,
    });
  }, [draftKey, draftRestored, selected?._id, picked, otherName, otherAmount, testSearch, slot, dialed]);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.between}>
          <Text style={styles.title}>{tr('newOrders', lang)}</Text>
          {orders.length > 0 && <Chip status={STATUS.SUBMITTED} label={`${orders.length} ${lang === 'hi' ? 'नई' : 'new'}`} />}
        </View>

        {queue.isPending && <Loading lang={lang} />}
        {queue.isError && (
          <ErrorState lang={lang} message={errorMessage(queue.error)} onRetry={() => queue.refetch()} />
        )}
        {!queue.isPending && !queue.isError && orders.length === 0 && <Empty lang={lang} />}

        {orders.map(order => (
          <Card
            key={order._id}
            onPress={() => select(order)}
            accent={selected?._id === order._id ? C.green : undefined}>
            <View style={styles.between}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{order.patient?.name || order.orderId}</Text>
                <Text style={styles.muted}>{order.orderId} · {order.patient?.village || '—'}</Text>
                <Text style={styles.muted}>{order.patient?.phone}</Text>
              </View>
              <Chip status={order.status} label={tr(order.status, lang)} />
            </View>
          </Card>
        ))}

        {selected && (
          <Card accent={C.red}>
            <Text style={styles.title}>{selected.orderId}</Text>
            <Text style={styles.subtitle}>
              {selected.patient?.name} · {selected.patient?.phone}{'\n'}
              {selected.patient?.address || selected.patient?.village}
            </Text>

            {/* Every page of the prescription. Old orders carry a single image in
                prescriptionUrl; new ones list them all in prescriptionUrls. */}
            {pages.length > 0 && (
              <>
                <Pressable onPress={() => { setZoomAt(0); setZoom(true); }}>
                  <Image
                    source={{ uri: mediaUrl(pages[0]) }}
                    resizeMode="contain"
                    style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: '#2B2525' }}
                  />
                </Pressable>

                {pages.length > 1 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {pages.map((url, i) => (
                      <Pressable key={url} onPress={() => { setZoomAt(i); setZoom(true); }}>
                        <Image
                          source={{ uri: mediaUrl(url) }}
                          style={{
                            width: 64, height: 64, borderRadius: 9, backgroundColor: '#2B2525',
                            borderWidth: 1.5, borderColor: C.gold,
                          }}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}

            {!selected.proCalled ? (
              <>
                <Button icon="phone" title={dialed ? tr('callAgain', lang) : tr('call', lang)} onPress={dial} />

                {/* The gate. Only the PRO knows whether the patient actually
                    answered, so only the PRO can open the next step. */}
                <View style={{
                  backgroundColor: '#FBF3E7', borderRadius: 12, padding: 13, marginVertical: 8,
                  borderWidth: 1.5, borderColor: C.gold,
                }}>
                  <Text style={[styles.label, { color: C.maroon }]}>{tr('spokeQuestion', lang)}</Text>
                  <Text style={[styles.muted, { marginBottom: 8 }]}>{tr('spokeHint', lang)}</Text>
                  <Button title={tr('spokeYes', lang)} onPress={markSpoke} busy={action.isPending} />
                </View>
              </>
            ) : (
              <Text style={{ ...styles.label, color: C.green, marginVertical: 8 }}>{tr('called', lang)}</Text>
            )}

            {/* Once assigned, say plainly WHO it went to — the PRO had no way of
                telling which agent had been given the pickup. */}
            {selected.assignedAgent && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: '#E8F5EE', borderRadius: 12, padding: 13, marginVertical: 8,
                borderWidth: 1.5, borderColor: C.green,
              }}>
                <Icon name="check" size={20} color={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...styles.label, color: C.green }}>
                    {tr('assignedTo', lang)}: {selected.assignedAgent.name}
                  </Text>
                  <Text style={styles.muted}>
                    {selected.assignedAgent.zone} · {selected.pickupSlot}
                  </Text>
                </View>
              </View>
            )}

            {selected.proCalled && !selected.proConfirmed && (
              <>
                <Text style={styles.sectionTitle}>{tr('chooseTests', lang)}</Text>
                {catalog.isPending && <Loading lang={lang} />}
                {!catalog.isPending && catalogList.length === 0 && (
                  <Empty lang={lang} message={tr('noTestsYet', lang)} />
                )}

                {/* The catalog can grow into the thousands. Search renders at most
                    20 matches; chosen tests stay visible above the results. */}
                <Field value={testSearch} onChangeText={setTestSearch} placeholder={tr('searchTests', lang)} />
                <Text style={[styles.muted, { marginBottom: 8 }]}>{tr('searchHint', lang)}</Text>

                {selectedTests.length > 0 && (
                  <>
                    <Text style={styles.label}>{tr('selectedTests', lang)}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {selectedTests.map(test => (
                        <Pressable
                          key={test._id}
                          onPress={() => togglePick(test._id)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11,
                            backgroundColor: C.red,
                          }}>
                          <Icon name="check" size={15} color={C.white} />
                          <Text style={{ fontWeight: '700', color: C.white }}>
                            {test.name} · ₹{test.amount} ×
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {searchNeedle.length > 0 && matchingTests.length === 0 && (
                  <Text style={[styles.muted, { marginBottom: 10 }]}>{tr('noMatchingTests', lang)}</Text>
                )}
                {matchingTests.map(test => (
                  <Pressable
                    key={test._id}
                    onPress={() => { togglePick(test._id); setTestSearch(''); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: 13, marginBottom: 8, borderRadius: 11,
                      borderWidth: 1.5, borderColor: C.gold, backgroundColor: C.white,
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: C.maroon }}>{test.name}</Text>
                      {test.category ? <Text style={styles.muted}>{test.category}</Text> : null}
                    </View>
                    <Text style={{ fontWeight: '800', color: C.maroon }}>₹{test.amount}  +</Text>
                  </Pressable>
                ))}

                {/* Fallback for a test not in the catalog — name + its own rate. */}
                <Field value={otherName} onChangeText={setOtherName} placeholder={tr('otherTest', lang)} />
                {otherName.trim().length > 0 && (
                  <Field value={otherAmount} onChangeText={setOtherAmount} keyboardType="numeric" placeholder={`${tr('amount', lang)} (₹)`} />
                )}

                {/* Live total — updates as tests are ticked. */}
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: '#FBF3E7', borderRadius: 12, padding: 14, marginVertical: 10,
                  borderWidth: 1.5, borderColor: C.gold,
                }}>
                  <Text style={{ ...styles.label, color: C.maroon }}>{tr('totalAmount', lang)}</Text>
                  <Text style={{ ...styles.title, color: C.maroon, marginBottom: 0 }}>₹{total}</Text>
                </View>

                <Button title={tr('confirm', lang)} onPress={confirm} busy={action.isPending} disabled={total <= 0} />
              </>
            )}

            {selected.status === STATUS.CONFIRMED && (
              <>
                <Text style={styles.sectionTitle}>{tr('pickupSlot', lang)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {SLOTS.map(option => (
                    <Pressable
                      key={option}
                      onPress={() => setSlot(option)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
                        borderColor: slot === option ? C.red : C.gold,
                        backgroundColor: slot === option ? C.red : C.white,
                      }}>
                      <Text style={{ fontWeight: '800', color: slot === option ? C.white : C.maroon }}>
                        {slot === option ? '✓ ' : ''}{option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Spell out the chosen slot so the PRO can see it at a glance,
                    not just infer it from which pill is highlighted. */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
                  backgroundColor: '#FBF3E7', borderRadius: 10, padding: 11,
                  borderWidth: 1, borderColor: C.gold,
                }}>
                  <Icon name="clock" size={18} color={C.gold} />
                  <Text style={{ ...styles.label, color: C.maroon }}>{tr('selectedSlot', lang)}: {slot}</Text>
                </View>

                <Text style={styles.sectionTitle}>{tr('chooseAgent', lang)}</Text>
                {agents.isPending && <Loading lang={lang} />}

                {!agents.isPending && (agents.data ?? []).length === 0 && (
                  <Empty lang={lang} message={tr('noAgents', lang)} />
                )}

                {/* Availability is slot-specific. One agent may handle multiple
                    pickups in a day, but the same two-hour window cannot be booked
                    twice. Their other bookings stay visible for scheduling context. */}
                {(agents.data ?? []).map(agent => {
                  const busySlots = agent.busySlots ?? [];
                  const busy = busySlots.includes(slot);
                  return (
                    <Pressable
                      key={agent._id}
                      disabled={busy || action.isPending}
                      onPress={() => ask(
                        tr('confirmAssignTitle', lang, agent.name),
                        tr('confirmAssignMsg', lang, slot),
                        tr('confirmAssignYes', lang),
                        () => run('assign-agent', { agentId: agent._id, pickupSlot: slot }),
                      )}
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 14, marginBottom: 9, borderRadius: 13,
                        backgroundColor: busy ? '#F3EFE8' : C.white,
                        borderWidth: 1.5, borderColor: busy ? C.borderSoft : C.gold,
                        opacity: busy ? 0.75 : 1,
                      }, pressed && { opacity: 0.7 }]}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: busy ? '#EDE6DA' : '#E8F5EE',
                      }}>
                        <Icon name="user" size={21} color={busy ? C.gray : C.green} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{agent.name}</Text>
                        <Text style={styles.muted}>
                          {agent.zone}
                          {agent.phone ? ` · +91 ${agent.phone}` : ''}
                        </Text>
                        {busySlots.length > 0 && (
                          <Text style={styles.muted}>
                            {tr('agentBookings', lang)}: {busySlots.join(', ')}
                          </Text>
                        )}
                      </View>

                      <Chip
                        status={busy ? 'agent_assigned' : 'report_ready'}
                        label={busy ? tr('agentSlotBusy', lang) : tr('agentSlotFree', lang)}
                      />
                    </Pressable>
                  );
                })}
              </>
            )}

            <Button
              secondary
              title={tr('cancelOrder', lang)}
              onPress={() => run('cancel', { reason: 'PRO cancelled' })}
              busy={action.isPending}
            />
          </Card>
        )}
        <OrderHistory role="pro" focused={focused} />
      </ScrollView>

      {/* Zoomable prescription — the PRO has to read handwriting off it. Swipes
          through every page when the patient sent more than one. */}
      <Modal visible={zoom} transparent onRequestClose={() => setZoom(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000EE' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            // Opens on the page that was tapped, not always the first.
            contentOffset={{ x: zoomAt * Dimensions.get('window').width, y: 0 }}
            style={{ flex: 1 }}>
            {pages.map(url => (
              <Pressable
                key={url}
                onPress={() => setZoom(false)}
                style={{ width: Dimensions.get('window').width, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={{ uri: mediaUrl(url) }} resizeMode="contain" style={{ width: '100%', height: '85%' }} />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={{ color: C.white, textAlign: 'center', paddingBottom: 24 }}>
            {pages.length > 1 ? `${pages.length} ${tr('pages', lang)} · ` : ''}{tr('ok', lang)}
          </Text>
        </View>
      </Modal>

      <SweetAlert
        state={alert}
        cancelText={tr('cancel', lang)}
        confirmText={tr('ok', lang)}
        onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
      />
    </>
  );
}
