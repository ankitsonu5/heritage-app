// Lab receiving desk: confirm the sample arrived, then upload the report PDF.
//
// The report is a real uploaded file. The old build took a client-supplied URL
// string, which meant a lab user could point a patient's report at any address.

import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useOrderAction, useQueue, useUploadReport } from '../../api/hooks';
import { pickPdf, PickedFile } from '../../media';
import { Empty, ErrorState, Loading } from '../../components/States';
import { OrderHistory } from '../../components/OrderHistory';
import { STATUS } from '../../constants/status';
import { errorMessage } from '../../client';
import { Order } from '../../models';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';
import { clearWorkflow, readWorkflow, workflowKey, writeWorkflow } from '../../workflow';

export default function LabScreen() {
  const { lang, accountId } = useSession();
  const focused = useIsFocused();

  const queue = useQueue('lab', focused);
  const action = useOrderAction();
  const uploadReport = useUploadReport();

  const [selected, setSelected] = useState<Order | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });
  const [selectionRestored, setSelectionRestored] = useState(false);
  const savedOrderId = useRef<string | undefined>(undefined);
  const selectionKey = useMemo(() => workflowKey(accountId, 'lab'), [accountId]);

  useEffect(() => {
    setSelectionRestored(false);
    savedOrderId.current = undefined;
    readWorkflow<{ selectedOrderId?: string }>(selectionKey).then(saved => {
      savedOrderId.current = saved?.selectedOrderId;
      setSelectionRestored(true);
    });
  }, [selectionKey]);

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  // Both lab steps are announcements to the outside world: "received" tells the
  // agent their job is done, and the report is sent to the patient the instant it
  // uploads. Neither should be one stray tap away.
  const ask = (title: string, message: string, acceptText: string, onAccept: () => void) =>
    setAlert({ visible: true, type: 'warning', title, message, acceptText, onAccept });

  const pick = async () => {
    try {
      const picked = await pickPdf();
      if (picked) setFile(picked);
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  const receive = async (order: Order) => {
    try {
      const updated = await action.mutateAsync({ orderId: order._id, action: 'lab-confirm' });
      setSelected(updated);
      show('success', tr('updated', lang));
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  const send = async () => {
    if (!selected || !file?.uri) return show('warning', tr('pickReport', lang));
    try {
      // The backend fans out SMS + push + email to the patient on this transition.
      await uploadReport.mutateAsync({ orderId: selected._id, file });
      setSelected(null);
      setFile(null);
      savedOrderId.current = undefined;
      await clearWorkflow(selectionKey);
      show('success', tr('updated', lang));
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  const orders = queue.data ?? [];

  useEffect(() => {
    if (!selectionRestored || queue.isPending) return;
    const wanted = selected?._id || savedOrderId.current;
    if (!wanted) return;
    const fresh = orders.find(order => order._id === wanted);
    if (fresh) setSelected(fresh);
    else {
      setSelected(null);
      savedOrderId.current = undefined;
      void clearWorkflow(selectionKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionRestored, queue.isPending, queue.data]);

  useEffect(() => {
    if (selectionRestored) void writeWorkflow(selectionKey, { selectedOrderId: selected?._id });
  }, [selectionKey, selectionRestored, selected?._id]);
  // Grouped by tube type — that is how the receiving desk physically sorts them.
  const byTube = orders.reduce<Record<string, Order[]>>((groups, order) => {
    const key = order.labTube || '—';
    (groups[key] ||= []).push(order);
    return groups;
  }, {});

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.title}>{tr('lab', lang)}</Text>

        {queue.isPending && <Loading lang={lang} />}
        {queue.isError && (
          <ErrorState lang={lang} message={errorMessage(queue.error)} onRetry={() => queue.refetch()} />
        )}
        {!queue.isPending && !queue.isError && orders.length === 0 && <Empty lang={lang} />}

        {Object.entries(byTube).map(([tube, group]) => (
          <View key={tube}>
            <Text style={styles.sectionTitle}>{tube} · {group.length}</Text>
            {group.map(order => (
              <Card
                key={order._id}
                onPress={() => setSelected(order)}
                accent={selected?._id === order._id ? C.green : undefined}>
                <View style={styles.between}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{order.orderId}</Text>
                    <Text style={styles.muted}>{order.patient?.name}</Text>
                    <Text style={styles.muted}>{order.tests.join(', ') || '—'}</Text>
                  </View>
                  <Chip status={order.status} label={tr(order.status, lang)} />
                </View>

                {order.status === STATUS.SAMPLE_COLLECTED && (
                  <Button
                    title={`✓ ${tr('confirmReceived', lang)}`}
                    busy={action.isPending}
                    onPress={() => ask(
                      tr('confirmReceivedTitle', lang),
                      tr('confirmReceivedMsg', lang, order.orderId),
                      tr('receivedYes', lang),
                      () => receive(order),
                    )}
                  />
                )}
              </Card>
            ))}
          </View>
        ))}

        {selected?.status === STATUS.LAB_RECEIVED && (
          <Card accent={C.red}>
            <Text style={styles.title}>{selected.orderId}</Text>
            <Text style={styles.subtitle}>{selected.patient?.name} · {selected.tests.join(', ')}</Text>

            <Button secondary title={`📎 ${tr('pickReport', lang)}`} onPress={pick} />
            {file && <Text style={styles.muted}>{file.name}</Text>}

            {/* Uploading sends the report straight to the patient. */}
            <Button
              disabled={!file}
              title={tr('uploadReport', lang)}
              busy={uploadReport.isPending}
              onPress={() => ask(
                tr('confirmReportTitle', lang),
                tr('confirmReportMsg', lang, selected.patient?.name ?? ''),
                tr('reportYes', lang),
                send,
              )}
            />
          </Card>
        )}
        <OrderHistory role="lab" focused={focused} />
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
