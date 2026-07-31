// All server state lives here. Screens call these hooks; nothing else touches axios.
//
// Polling is the MVP for "real-time-ish" updates. The upgrade path to websockets
// is to keep these hooks and push invalidations into the query client instead of
// re-fetching on an interval — no screen has to change.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../client';
import { AdminStats, LatestOrder, Order, Person, StaffRole, TestItem } from '../models';
import { OrderStatus, queueParam } from '../constants/status';
import { PickedFile } from '../media';

const POLL_MS = 20_000;

export const keys = {
  latest: ['orders', 'latest'] as const,
  myOrders: ['orders', 'mine'] as const,
  queue: (role: StaffRole) => ['orders', 'queue', role] as const,
  roleHistory: (role: StaffRole) => ['orders', 'role-history', role] as const,
  order: (id: string) => ['orders', id] as const,
  history: (id: string) => ['orders', id, 'history'] as const,
  agents: ['staff', 'agents'] as const,
  stats: ['admin', 'stats'] as const,
};

/* ------------------------------------------------------------- patient ---- */

// `enabled` lets the caller poll only while the screen is focused.
export function useLatestOrder(focused = true) {
  return useQuery({
    queryKey: keys.latest,
    queryFn: async () => (await api.get<LatestOrder>('/orders/my/latest')).data,
    refetchInterval: focused ? POLL_MS : false,
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: keys.myOrders,
    queryFn: async () => (await api.get<Order[]>('/orders/my')).data,
  });
}

export type ProContact = { id: string; name: string; phone: string } | null;

export function useProContact(enabled = true) {
  return useQuery({
    queryKey: ['staff', 'pro-contact'],
    queryFn: async () => (await api.get<ProContact>('/staff/pro-contact')).data,
    enabled,
    staleTime: 60_000,
  });
}

// On web the picker hands back a real File, which FormData knows how to encode.
// On a device there is no File, so React Native's {uri, type, name} shape is used.
function appendFile(form: FormData, field: string, file: PickedFile, fallbackName: string) {
  if (file.file) {
    // React Native's FormData type only declares append(name, value); the browser's
    // takes a filename too, and on web this IS the browser's FormData.
    (form.append as (n: string, v: unknown, f?: string) => void)(field, file.file, file.name || fallbackName);
    return;
  }
  form.append(field, {
    uri: file.uri,
    type: file.type || 'application/octet-stream',
    name: file.name || fallbackName,
  } as unknown as Blob);
}

export function useSubmitPrescription() {
  const client = useQueryClient();
  return useMutation({
    // One or many pages. They all go up under `prescriptions`; the server keeps the
    // first as the order's cover image so older screens still have something to show.
    mutationFn: async (photos: PickedFile | PickedFile[]) => {
      const list = Array.isArray(photos) ? photos : [photos];
      const form = new FormData();
      list.forEach((photo, i) => appendFile(form, 'prescriptions', photo, `prescription-${i + 1}.jpg`));
      const { data } = await api.post<Order>('/orders', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Uploading a photo to a possibly-cold backend: give it a full minute so the
        // send completes rather than timing out client-side while the server saves
        // the order anyway (which is what created phantom "new prescription" rows).
        timeout: 60000,
      });
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.latest });
      client.invalidateQueries({ queryKey: keys.myOrders });
    },
  });
}

/* --------------------------------------------------------------- staff ---- */

export function useQueue(role: StaffRole, focused = true) {
  return useQuery({
    queryKey: keys.queue(role),
    queryFn: async () => {
      // Admin sees everything; the other roles get their own work queue.
      const params = role === 'admin' ? {} : { status: queueParam(role) };
      return (await api.get<Order[]>('/orders', { params })).data;
    },
    refetchInterval: focused ? POLL_MS : false,
  });
}

export function useOrderHistory(role: StaffRole, focused = true) {
  return useQuery({
    queryKey: keys.roleHistory(role),
    queryFn: async () => (await api.get<Order[]>('/orders/history')).data,
    refetchInterval: focused ? POLL_MS : false,
  });
}

/* ------------------------------------------------------------- profile ---- */

export type Profile = {
  id: string; role: string; name?: string; phone?: string;
  age?: number; village?: string; address?: string; voiceGuidance?: boolean; createdAt?: string;
};

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get<Profile>('/auth/me')).data,
    enabled,
  });
}

// Name / age / village / address. The phone is the login identity and stays put.
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; age?: number; village?: string; address?: string }) =>
      (await api.patch('/me/settings', body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// A signed-in patient can set a new password without knowing the old one — their
// session token is the proof of identity.
export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => (await api.patch('/me/password', { password })).data,
  });
}

// The live price list the PRO picks tests from. Cached a while — rates rarely
// change mid-shift, and the PRO reopens the picker often.
export function useTestCatalog(enabled = true) {
  return useQuery({
    queryKey: ['test-catalog'],
    queryFn: async () => (await api.get<TestItem[]>('/test-catalog')).data,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useAgents(zone?: string) {
  return useQuery({
    queryKey: [...keys.agents, zone ?? 'all'],
    queryFn: async () => (await api.get<Person[]>('/staff/agents', { params: { zone } })).data,
  });
}

export function useAdminStats(focused = true) {
  return useQuery({
    queryKey: keys.stats,
    queryFn: async () => (await api.get<AdminStats>('/admin/stats/today')).data,
    refetchInterval: focused ? POLL_MS : false,
  });
}

export function useStatusHistory(orderId?: string) {
  return useQuery({
    queryKey: keys.history(orderId || ''),
    queryFn: async () => (await api.get(`/orders/${orderId}/status-history`)).data,
    enabled: Boolean(orderId),
  });
}

/* ------------------------------------------------------------- actions ---- */

type ActionArgs = { orderId: string; action: string; body?: Record<string, unknown> };

// Every staff action goes through here so cache invalidation is uniform: the
// order moved, so the queue, the stats and the patient's tracker are all stale.
export function useOrderAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, action, body }: ActionArgs) =>
      (await api.patch<Order>(`/orders/${orderId}/${action}`, body || {})).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: keys.stats });
      client.invalidateQueries({ queryKey: keys.agents });
    },
  });
}

export function useUploadReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: PickedFile }) => {
      const form = new FormData();
      appendFile(form, 'report', file, 'report.pdf');
      const { data } = await api.post<Order>(`/orders/${orderId}/upload-report`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export const statusIn = (order: Order, ...statuses: OrderStatus[]) => statuses.includes(order.status);
