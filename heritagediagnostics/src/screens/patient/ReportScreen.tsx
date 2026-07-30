import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useMyOrders } from '../../api/hooks';
import { Empty, ErrorState, Loading } from '../../components/States';
import { STATUS } from '../../constants/status';
import { errorMessage, mediaUrl } from '../../client';
import { downloadPdf, reportFileName } from '../../download';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';

export default function ReportScreen() {
  const { lang } = useSession();
  const orders = useMyOrders();
  const [downloading, setDownloading] = useState<string>();
  const [alert, setAlert] = useState<SweetAlertState>({
    visible: false, type: 'info', title: '', message: '',
  });

  const download = async (orderId: string, reportUrl: string) => {
    setDownloading(orderId);
    try {
      await downloadPdf(
        mediaUrl(reportUrl),
        reportFileName(orderId),
        tr('reportDownloadDescription', lang),
      );
      setAlert({
        visible: true,
        type: 'success',
        title: tr('success', lang),
        message: tr('reportDownloaded', lang),
      });
    } catch {
      setAlert({
        visible: true,
        type: 'error',
        title: tr('error', lang),
        message: tr('reportDownloadFailed', lang),
      });
    } finally {
      setDownloading(undefined);
    }
  };

  if (orders.isPending) return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"><Loading lang={lang} /></ScrollView>;

  if (orders.isError) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <ErrorState lang={lang} message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
      </ScrollView>
    );
  }

  const ready = (orders.data ?? []).filter(order => order.status === STATUS.REPORT_READY && order.reportUrl);

  return (
    <>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.title}>{tr('report', lang)}</Text>

      {ready.length === 0 ? (
        <Empty lang={lang} message={tr('noReport', lang)} />
      ) : (
        ready.map(order => (
          <Card key={order._id} accent={C.green}>
            <View style={styles.between}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{order.tests.join(', ') || tr('report', lang)}</Text>
                <Text style={styles.muted}>{order.orderId} · ₹{order.amount}</Text>
              </View>
              <Chip status={order.status} label={tr(order.status, lang)} />
            </View>
            <Button
              icon="download"
              title={tr('download', lang)}
              busy={downloading === order._id}
              onPress={() => download(order.orderId, order.reportUrl as string)}
            />
          </Card>
        ))
      )}
    </ScrollView>
    <SweetAlert
      state={alert}
      confirmText={tr('ok', lang)}
      onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
    />
    </>
  );
}
