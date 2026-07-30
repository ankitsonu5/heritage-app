// Admin on mobile: live aggregates + a filterable order list.
//
// The wide-table admin experience lives in the separate web dashboard (admin-web/),
// which talks to the same API. This screen is the on-call view.

import { useIsFocused } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAdminStats, useQueue } from '../../api/hooks';
import { Empty, ErrorState, Loading } from '../../components/States';
import { ALL_STATUSES, OrderStatus } from '../../constants/status';
import { errorMessage } from '../../client';
import { useSession } from '../../store/session';
import { Button, C, Card, Chip, styles } from '../../theme';
import { tr } from '../../translations';

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={{ width: '48%', backgroundColor: C.white, padding: 14, borderRadius: 14 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ color, fontSize: 27, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const { lang } = useSession();
  const focused = useIsFocused();

  const stats = useAdminStats(focused);
  const queue = useQueue('admin', focused);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const orders = (queue.data ?? []).filter(order => filter === 'all' || order.status === filter);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={styles.title}>{tr('admin', lang)}</Text>

      {stats.isPending && <Loading lang={lang} />}
      {stats.isError && (
        <ErrorState lang={lang} message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />
      )}

      {stats.data && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 }}>
          <Stat label={tr('statNew', lang)} value={stats.data.newPrescriptions} color={C.red} />
          <Stat label={tr('statConfirmed', lang)} value={stats.data.confirmed} color={C.wine} />
          <Stat label={tr('statLab', lang)} value={stats.data.inLab} color={C.gold} />
          <Stat label={tr('statCash', lang)} value={`₹${stats.data.cashCollected}`} color={C.green} />
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', ...ALL_STATUSES] as const).map(option => (
            <Pressable
              key={option}
              onPress={() => setFilter(option as OrderStatus | 'all')}
              style={{
                paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, borderWidth: 1.5,
                borderColor: filter === option ? C.red : C.gold,
                backgroundColor: filter === option ? C.red : C.white,
              }}>
              <Text style={{ fontWeight: '800', color: filter === option ? C.white : C.maroon }}>
                {option === 'all' ? tr('allOrders', lang) : tr(option, lang)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {queue.isPending && <Loading lang={lang} />}
      {queue.isError && (
        <ErrorState lang={lang} message={errorMessage(queue.error)} onRetry={() => queue.refetch()} />
      )}
      {!queue.isPending && orders.length === 0 && <Empty lang={lang} />}

      {orders.map(order => (
        <Card key={order._id}>
          <View style={styles.between}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{order.orderId} · {order.patient?.name}</Text>
              <Text style={styles.muted}>{order.tests.join(', ') || '—'} · ₹{order.amount}</Text>
              <Text style={styles.muted}>
                {order.assignedAgent?.name || '—'} · {order.pickupSlot || '—'}
              </Text>
            </View>
            <Chip status={order.status} label={tr(order.status, lang)} />
          </View>
        </Card>
      ))}

      <Button secondary icon="refresh"
        title={tr('refresh', lang)} onPress={() => { stats.refetch(); queue.refetch(); }} />
    </ScrollView>
  );
}
