// Notification bell for every role in the app — patient, PRO, agent and lab all
// see the same bell in the header.
//
// History comes from the API (survives a restart) and new items arrive over the
// socket (land without a refresh). Both feed the same React Query cache, so the
// list can never drift from the server.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '../client';
import { connectLive } from '../api/live';
import Icon from './Icon';
import { Portal } from './Portal';
import { useSession } from '../store/session';
import { C, styles, T } from '../theme';
import { tr } from '../translations';

type Note = {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const timeAgo = (iso: string) => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'अभी';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} मिनट पहले`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} घंटे पहले`;
  return `${Math.floor(seconds / 86400)} दिन पहले`;
};

export default function NotificationBell() {
  const { lang } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Note | null>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Note[]>('/notifications')).data,
    refetchInterval: 60_000,   // fallback if the socket drops
  });

  // The feed is unread-only, so marking one read used to delete it from under the
  // finger that tapped it. Instead: mark it read on the server, remember it here,
  // and keep it on screen (styled as read) until the panel is closed. The refresh
  // is deferred to close time for the same reason.
  const [readNow, setReadNow] = useState<Set<string>>(new Set());

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_res, id) => setReadNow(prev => new Set(prev).add(id)),
  });

  const closePanel = () => {
    setOpen(false);
    setReadNow(new Set());
    // Now that the panel is shut, drop the ones that were read while it was open.
    client.invalidateQueries({ queryKey: ['notifications'] });
  };

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof connectLive>> = null;
    let alive = true;

    const onNote = (note: Note) => {
      client.invalidateQueries({ queryKey: ['notifications'] });
      setToast(note);
      setTimeout(() => setToast(current => (current?._id === note._id ? null : current)), 5000);
    };

    connectLive().then(connection => {
      if (!connection || !alive) return;
      socket = connection;
      connection.on('notification:new', onNote);
    });

    return () => {
      alive = false;
      socket?.off('notification:new', onNote);
    };
  }, [client]);

  // Anything read while the sheet is open stays listed, just styled as read.
  const notes = (data ?? []).map(n => (readNow.has(n._id) ? { ...n, read: true } : n));
  const unread = notes.filter(note => !note.read).length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${tr('notifications', lang)}${unread ? `, ${unread} नई` : ''}`}
        style={styles.roundAction}>
        <Icon name="bell" size={17} color={C.white} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4,
            backgroundColor: C.red, borderWidth: 1.5, borderColor: C.maroon,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ ...T.num, color: C.white, fontSize: 9.5 }}>
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Live toast — what just happened, without opening anything. */}
      <Portal id="notif-toast" visible={Boolean(toast) && !open}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 78, left: 12, right: 12,
            backgroundColor: C.white, borderRadius: 12, padding: 13,
            borderLeftWidth: 3, borderLeftColor: C.red,
            borderWidth: 1, borderColor: C.borderSoft,
            elevation: 6, shadowColor: '#2A1C14', shadowOpacity: 0.18,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            flexDirection: 'row', gap: 9, alignItems: 'center',
          }}>
          <Icon name="bell" size={16} color={C.red} />
          <Text style={{ ...T.small, color: C.text, flex: 1 }}>{toast?.message}</Text>
        </View>
      </Portal>

      <Portal id="notif-sheet" visible={open}>
        <Pressable
          onPress={closePanel}
          style={{ flex: 1, backgroundColor: 'rgba(31,27,26,.5)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={event => event.stopPropagation()}
            style={{
              backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
              padding: 18, maxHeight: '78%',
            }}>
            <View style={styles.between}>
              <Text style={styles.title}>{tr('notifications', lang)}</Text>
              <Pressable onPress={closePanel} hitSlop={10} accessibilityLabel="बंद करें">
                <Icon name="close" size={20} color={C.gray} />
              </Pressable>
            </View>

            <ScrollView>
              {notes.length === 0 && (
                <Text style={[styles.muted, { textAlign: 'center', paddingVertical: 30 }]}>
                  {tr('noNotifications', lang)}
                </Text>
              )}

              {notes.map(note => (
                <Pressable
                  key={note._id}
                  onPress={() => !note.read && markRead.mutate(note._id)}
                  style={{
                    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
                    padding: 13, marginBottom: 8, borderRadius: 11,
                    backgroundColor: note.read ? C.white : '#FFFBF4',
                    borderWidth: 1, borderColor: note.read ? C.borderSoft : C.gold,
                  }}>
                  <View style={{
                    width: 7, height: 7, borderRadius: 4, marginTop: 6,
                    backgroundColor: note.read ? 'transparent' : C.red,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...T.small, color: C.text, fontWeight: note.read ? '400' : '600' }}>
                      {note.message}
                    </Text>
                    <Text style={[styles.muted, { marginTop: 2 }]}>{timeAgo(note.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Portal>
    </>
  );
}
