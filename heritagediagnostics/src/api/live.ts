// Live sync. The server pushes every order change over Socket.io, so a PRO
// confirming an order updates the patient's tracker and the admin dashboard
// immediately, with no refresh.
//
// Polling is deliberately kept underneath (React Query's refetchInterval). A
// dropped socket then means "updates arrive within ~20s" instead of "updates
// stop" — the right failure mode for an app used where the signal is bad.

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from '../config';
import { keys } from './hooks';

let socket: Socket | null = null;

export async function connectLive(): Promise<Socket | null> {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;

  if (socket?.connected) return socket;
  socket?.disconnect();

  // The socket carries the same JWT as the REST calls; the server refuses the
  // handshake without it, so nobody can just listen in on the order stream.
  socket = io(API_BASE_URL || '/', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectLive() {
  socket?.disconnect();
  socket = null;
}

// Any screen showing order data can call this. Rather than patching lists by
// hand, an event simply invalidates the queries — React Query refetches, and
// there is one code path for "data changed" instead of two.
export function useLiveOrders(enabled = true) {
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const refresh = () => {
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: keys.stats });
    };

    connectLive().then(connection => {
      if (!connection || !active) return;
      connection.on('order:new', refresh);
      connection.on('order:updated', refresh);
    });

    return () => {
      active = false;
      socket?.off('order:new', refresh);
      socket?.off('order:updated', refresh);
    };
  }, [client, enabled]);
}
