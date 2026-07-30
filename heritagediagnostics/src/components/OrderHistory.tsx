import React from 'react';
import { Text, View } from 'react-native';

import { useOrderHistory } from '../api/hooks';
import { errorMessage } from '../client';
import { STATUS } from '../constants/status';
import { StaffRole } from '../models';
import { useSession } from '../store/session';
import { Card, Chip, styles } from '../theme';
import { tr } from '../translations';
import { ErrorState, Loading } from './States';

export function OrderHistory({ role, focused }: { role: StaffRole; focused: boolean }) {
  const { lang } = useSession();
  const history = useOrderHistory(role, focused);
  // Keep the PRO screen correct even while a phone is briefly talking to an older
  // API deployment: an assigned/collected order is still live, not a past order.
  const orders = (history.data ?? []).filter(order => role !== 'pro' || (
    order.status === STATUS.REPORT_READY || order.status === STATUS.CANCELLED
  ));

  return (
    <View>
      <Text style={styles.sectionTitle}>{tr('history', lang)}</Text>
      {history.isPending && <Loading lang={lang} />}
      {history.isError && (
        <ErrorState lang={lang} message={errorMessage(history.error)} onRetry={() => history.refetch()} />
      )}
      {!history.isPending && !history.isError && orders.length === 0 && (
        <Text style={styles.muted}>{tr('noOrders', lang)}</Text>
      )}
      {orders.map(order => (
        <Card key={order._id}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{order.orderId} · {order.patient?.name || '—'}</Text>
              <Text style={styles.muted}>{order.tests.join(', ') || '—'}</Text>
              <Text style={styles.muted}>
                {new Date(order.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}
              </Text>
            </View>
            <Chip status={order.status} label={tr(order.status, lang)} />
          </View>
        </Card>
      ))}
    </View>
  );
}
