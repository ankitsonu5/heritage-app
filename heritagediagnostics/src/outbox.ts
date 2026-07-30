// Offline outbox for the collection agent.
//
// An agent standing in a village with no signal still needs "sample लिया" and
// "cash मिल गया" to stick. Those two actions are queued locally and replayed when
// the network returns, so the tap is never lost and never silently ignored.
//
// This is safe only because the endpoints it queues are idempotent: sample-taken
// and cash-taken SET a value (they are not toggles), so replaying one twice lands
// in the same state as replaying it once. Do not queue a non-idempotent action here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, isOffline } from './client';

const KEY = 'outbox.v1';

export type OutboxEntry = {
  id: string;
  orderId: string;
  action: 'sample-taken' | 'cash-taken';
  value: boolean;
  queuedAt: number;
};

const read = async (): Promise<OutboxEntry[]> => {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
  } catch {
    return [];
  }
};

const write = (entries: OutboxEntry[]) => AsyncStorage.setItem(KEY, JSON.stringify(entries));

export const pending = read;

export const pendingFor = async (orderId: string) =>
  (await read()).filter(entry => entry.orderId === orderId);

// Queue an action, replacing any earlier queued value for the same order+action —
// the agent's latest tap is the one that counts.
export async function enqueue(orderId: string, action: OutboxEntry['action'], value: boolean) {
  const entries = (await read()).filter(e => !(e.orderId === orderId && e.action === action));
  entries.push({
    id: `${orderId}:${action}`,
    orderId,
    action,
    value,
    queuedAt: Date.now(),
  });
  await write(entries);
}

export type FlushResult = { sent: number; remaining: number };

// Replay the queue oldest-first. Stops at the first network failure and keeps the
// rest queued; a rejection from the server (4xx) drops the entry, because retrying
// it forever would wedge the queue behind a request that will never succeed.
export async function flush(): Promise<FlushResult> {
  const entries = (await read()).sort((a, b) => a.queuedAt - b.queuedAt);
  if (!entries.length) return { sent: 0, remaining: 0 };

  const left: OutboxEntry[] = [];
  let sent = 0;

  for (const [index, entry] of entries.entries()) {
    try {
      await api.patch(`/orders/${entry.orderId}/${entry.action}`, { value: entry.value });
      sent += 1;
    } catch (error) {
      if (isOffline(error)) {
        // Still no network — keep this entry and everything after it.
        left.push(...entries.slice(index));
        break;
      }
      // The server refused it (order no longer editable, not our pickup, …).
      // Dropping it is correct: replaying cannot change the answer.
      console.warn(`[outbox] dropped ${entry.id}:`, error);
    }
  }

  await write(left);
  return { sent, remaining: left.length };
}

export const clear = () => AsyncStorage.removeItem(KEY);
