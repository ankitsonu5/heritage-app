// Notification bell + live toasts.
//
// The bell's history comes from the API (so it survives a refresh) and new items
// arrive over the socket (so they land without one). The two are kept in the same
// React Query cache, which means there is one source of truth rather than a list
// that drifts from the server the longer the tab stays open.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { api, API_ORIGIN, getToken } from './api';
import { Icon } from './Icon';
import { useLang } from './i18n';

export type Note = {
  _id: string;
  type: string;
  message: string;      // Hindi
  messageEn?: string;
  read: boolean;
  createdAt: string;
};

const timeAgo = (iso: string, lang: 'en' | 'hi') => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const en = lang === 'en';
  if (seconds < 60) return en ? 'just now' : 'अभी';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return en ? `${m} min ago` : `${m} मिनट पहले`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return en ? `${h} h ago` : `${h} घंटे पहले`;
  }
  const d = Math.floor(seconds / 86400);
  return en ? `${d} d ago` : `${d} दिन पहले`;
};

let socket: Socket | null = null;

export function Notifications({ enabled }: { enabled: boolean }) {
  const { t, lang } = useLang();
  const client = useQueryClient();

  // The server wrote both languages when the event happened; we just pick one.
  const say = (note: Note) => (lang === 'en' ? note.messageEn || note.message : note.message);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Note[]>([]);
  const [connected, setConnected] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // The bell is a LIVE feed. By default it asks the server only for what has not
  // been seen — a dashboard left open all day had thirty-odd items in it, and the
  // one that had just arrived was buried. History is one click away.
  const [showAll, setShowAll] = useState(false);

  const { data } = useQuery({
    queryKey: ['notifications', showAll],
    queryFn: async () => (await api.get<Note[]>('/notifications', {
      params: showAll ? { all: 1 } : undefined,
    })).data,
    enabled,
    refetchInterval: 60_000,   // fallback if the socket is down
  });

  // The feed is unread-only, so refreshing right after marking one read deleted it
  // from under the cursor that clicked it. Mark it on the server, remember it here,
  // and leave it on screen (styled as read) until the panel is closed.
  const [readNow, setReadNow] = useState<Set<string>>(new Set());

  const markRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_res, id) => setReadNow(prev => new Set(prev).add(id)),
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => setReadNow(prev => {
      const next = new Set(prev);
      (data ?? []).forEach(n => next.add(n._id));
      return next;
    }),
  });

  const closePanel = () => {
    setOpen(false);
    setReadNow(new Set());
    client.invalidateQueries({ queryKey: ['notifications'] });
  };

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    socket = io(API_ORIGIN || undefined, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification:new', (note: Note) => {
      client.invalidateQueries({ queryKey: ['notifications'] });

      // Toast, then retire it. Stacking more than three turns a busy morning into
      // a wall of cards nobody reads.
      setToasts(current => [note, ...current].slice(0, 3));
      setTimeout(() => setToasts(current => current.filter(t => t._id !== note._id)), 6000);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [client, enabled]);

  // Click anywhere else to dismiss the panel.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node)) closePanel();
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Anything read while the panel is open stays listed, just styled as read.
  const notes = (data ?? []).map(n => (readNow.has(n._id) ? { ...n, read: true } : n));
  const unread = notes.filter(n => !n.read).length;

  if (!enabled) return null;

  return (
    <>
      <div className="bell-wrap" ref={panel}>
        {/* Bell first, then the live/offline pill — swapped on request. */}
        <button className="bell" onClick={() => (open ? closePanel() : setOpen(true))} aria-label={t('notifications')}>
          <Icon name="bell" size={18} />
          {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        </button>

        <span className={`live ${connected ? 'on' : 'off'}`} title={connected ? 'Live' : 'Reconnecting…'}>
          <i /> {connected ? t('live') : t('offline')}
        </span>

        {open && (
          <div className="notif-panel">
            <header>
              <strong>{t('notifications')}</strong>
              <span className="notif-actions">
                {unread > 0 && (
                  <button className="link" onClick={() => markAllRead.mutate()}>
                    {t('markAllRead')}
                  </button>
                )}
                <button className="link" onClick={() => setShowAll(v => !v)}>
                  {showAll ? t('showNew') : t('showAll')}
                </button>
              </span>
            </header>

            <div className="notif-list">
              {notes.length === 0 && (
                <p className="muted empty">
                  {showAll ? t('noNotifications') : t('allCaughtUp')}
                </p>
              )}
              {notes.map(note => (
                <button
                  key={note._id}
                  className={`notif ${note.read ? '' : 'unread'}`}
                  onClick={() => !note.read && markRead.mutate(note._id)}>
                  <span className="dot" />
                  <span>
                    {say(note)}
                    <em>{timeAgo(note.createdAt, lang)}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="toasts">
        {toasts.map(note => (
          <div key={note._id} className="toast">
            <span className="toast-icon"><Icon name="bell" size={15} /></span>
            <p>{say(note)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
