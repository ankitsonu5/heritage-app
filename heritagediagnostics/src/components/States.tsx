// Loading / error / empty states. The prototype had none of these: any network
// failure left a blank screen with no way forward. Every list uses these instead.

import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button, C, Card, styles } from '../theme';
import { Lang, tr } from '../translations';

export function Loading({ lang }: { lang: Lang }) {
  return (
    <View accessibilityRole="progressbar" style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={C.red} />
      <Text style={styles.muted}>{tr('loading', lang)}</Text>
    </View>
  );
}

export function ErrorState({ lang, message, onRetry }: { lang: Lang; message?: string; onRetry: () => void }) {
  return (
    <Card accent={C.red}>
      <Text style={styles.label}>{tr('error', lang)}</Text>
      <Text style={styles.muted}>{message || tr('loadFailed', lang)}</Text>
      <Button icon="refresh" title={tr('retry', lang)} onPress={onRetry} />
    </Card>
  );
}

export function Empty({ lang, message }: { lang: Lang; message?: string }) {
  return (
    <Card>
      <Text style={styles.muted}>{message || tr('noOrders', lang)}</Text>
    </Card>
  );
}
