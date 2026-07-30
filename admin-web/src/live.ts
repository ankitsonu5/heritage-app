// Live sync for the dashboard. The admin sees a PRO confirm, an agent collect, or
// a lab upload the moment it happens — no refresh, no polling delay.
//
// Polling stays on underneath as a fallback, so a dropped socket degrades to a
// slower dashboard rather than a stale one.

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { API_ORIGIN, getToken } from './api';

let socket: Socket | null = null;

export function useLiveOrders(enabled: boolean) {
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      socket?.disconnect();
      socket = null;
      return;
    }

    const token = getToken();
    if (!token) return;

    // Absolute in the .exe and in the hosted web build; empty in dev, where passing
    // undefined lets Socket.io default to this origin and Vite proxies /socket.io.
    socket = io(API_ORIGIN || undefined, { auth: { token }, transports: ['websocket'] });

    const refresh = () => {
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['overview'] });
      client.invalidateQueries({ queryKey: ['stats'] });
      // A new order means a new patient may exist too.
      client.invalidateQueries({ queryKey: ['patients'] });
    };

    socket.on('order:new', refresh);
    socket.on('order:updated', refresh);

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [client, enabled]);
}
