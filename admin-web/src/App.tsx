import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api, clearToken, errorMessage, fileUrl, getToken, setToken, Order, Overview, Page, Person, Stats, TestItem } from './api';
import { AgentChart, PipelineChart, TrendChart } from './charts';
import { Icon } from './Icon';
import { Lang, LangContext, useLang } from './i18n';
import { useLiveOrders } from './live';
import { Notifications } from './Notifications';
import { ALL_STATUSES, OrderStatus, PIPELINE, STATUS_COLOR, STATUS_LABEL } from './status';
import { AlertProvider, useAlert } from './SweetAlert';
import hospital from './assets/hospital.jpg';
import logo from './assets/logo.png';

const NAV = [
  { key: 'dashboard', label: 'dashboard', icon: 'dashboard' },
  { key: 'orders', label: 'orders', icon: 'orders' },
  { key: 'patients', label: 'users', icon: 'users' },
  // Team management — this is the ONLY place staff accounts are created.
  { key: 'pro', label: 'proTeam', icon: 'pro' },
  { key: 'agent', label: 'agents', icon: 'agents' },
  { key: 'labTeam', label: 'labTeam', icon: 'lab' },
  // Work queues.
  { key: 'labQueue', label: 'labQueue', icon: 'lab' },
  { key: 'labHistory', label: 'history', icon: 'orders' },
  { key: 'collection', label: 'collection', icon: 'collection' },
  // The master price list PROs pick tests from.
  { key: 'catalog', label: 'testCatalog', icon: 'lab' },
] as const;

type NavKey = (typeof NAV)[number]['key'];
type DashboardRole = 'admin' | 'lab';

/* ------------------------------------------------------------------ inputs --- */

// A real Indian mobile: ten digits, first one 6-9. Mirrors the server's rule
// (backend/src/app.js) so obvious junk — 0000000000, 1234567890 — is caught before
// the request goes out; the server stays the source of truth.
const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// Every phone field in the product: ten digits, no more, with the country code
// shown rather than typed. The server enforces the same rule — a stale screen
// must not be able to store a 23-digit "number".
function PhoneInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
}) {
  return (
    <span className="phone">
      <span className="cc">+91</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder || '9876543210'}
      />
    </span>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="eye"
        aria-pressed={show}
        onClick={() => setShow(v => !v)}
        onMouseDown={event => event.preventDefault()}
        title={show ? 'Hide password' : 'Show password'}
        aria-label={show ? 'Hide password' : 'Show password'}>
        <Icon name={show ? 'eye-off' : 'eye'} size={20} color={show ? '#7A1F2A' : '#5E111B'} />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------- login --- */

function Login({ onDone }: { onDone: (role: DashboardRole) => void }) {
  const { t } = useLang();
  const [selectedRole, setSelectedRole] = useState<DashboardRole>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { alert } = useAlert();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/staff-login', {
        username: username.trim().toLowerCase(),
        password,
      });
      if (!['admin', 'lab'].includes(data.user.role)) throw new Error('dashboard_only');
      if (data.user.role !== selectedRole) throw new Error('role_mismatch');
      setToken(data.token);
      onDone(data.user.role as DashboardRole);
    } catch (caught) {
      const localMessage = caught instanceof Error
        ? caught.message === 'dashboard_only'
          ? t('dashboardOnly')
          : caught.message === 'role_mismatch'
            ? t('roleMismatch', selectedRole === 'admin' ? t('adminRole') : t('labRole'))
            : null
        : null;
      alert('error', localMessage || errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center login-bg" style={{ backgroundImage: `url(${hospital})` }}>
      {/* A dark scrim under the glass. Without it the card's frosted panel sits on
          a bright sky and the text loses contrast the moment the photo changes. */}
      <div className="login-scrim" />

      <form className="card login glass" onSubmit={submit}>
        <h1>Heritage Diagnostics</h1>
        <p className="muted">{t('staffDashboard')}</p>
        <div className="role-select" aria-label={t('selectRole')}>
          <button
            type="button"
            className={selectedRole === 'admin' ? 'role-option active' : 'role-option'}
            aria-pressed={selectedRole === 'admin'}
            onClick={() => setSelectedRole('admin')}>
            <Icon name="dashboard" size={18} />
            {t('adminRole')}
          </button>
          <button
            type="button"
            className={selectedRole === 'lab' ? 'role-option active' : 'role-option'}
            aria-pressed={selectedRole === 'lab'}
            onClick={() => setSelectedRole('lab')}>
            <Icon name="lab" size={18} />
            {t('labRole')}
          </button>
        </div>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder={t('username')}
          autoComplete="username"
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder={t('password')}
          autoComplete="current-password"
        />
        <button className="primary" disabled={busy}>{busy ? '…' : t('login')}</button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- dashboard --- */

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function StatCards() {
  const { t } = useLang();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<Stats>('/admin/stats/today')).data,
    refetchInterval: 20_000,
  });

  if (isPending) {
    return <div className="stats">{[0, 1, 2, 3].map(i => <div key={i} className="card stat skeleton" />)}</div>;
  }
  if (isError) {
    return (
      <div className="card error-card">
        {errorMessage(error)} <button onClick={() => refetch()}>{t('retry')}</button>
      </div>
    );
  }

  const cards = [
    { label: t('statNew'), value: data.newPrescriptions, icon: 'orders', tone: 'red' },
    { label: t('statConfirmed'), value: data.confirmed, icon: 'pro', tone: 'wine' },
    { label: t('statInLab'), value: data.inLab, icon: 'lab', tone: 'gold' },
    { label: t('statCash'), value: money(data.cashCollected), icon: 'collection', tone: 'green' },
  ];

  return (
    <div className="stats">
      {cards.map(card => (
        <div key={card.label} className={`card stat tone-${card.tone}`}>
          <span className="stat-icon"><Icon name={card.icon} size={19} /></span>
          <div>
            <span className="muted">{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const { t } = useLang();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: async () => (await api.get<Overview>('/admin/stats/overview', { params: { days: 14 } })).data,
    refetchInterval: 30_000,
  });

  if (isPending) return <div className="chart-grid"><div className="card wide skeleton tall" /><div className="card skeleton tall" /><div className="card skeleton tall" /></div>;
  if (isError) {
    return (
      <div className="card error-card">
        {errorMessage(error)} <button onClick={() => refetch()}>{t('retry')}</button>
      </div>
    );
  }

  // The pipeline is a sequence, so the chart keeps the pipeline's own order —
  // sorting it by count would destroy the thing it exists to show.
  const pipeline = PIPELINE.map(status => ({ status, value: data.byStatus[status] || 0 }));

  return (
    <>
      <div className="chart-grid">
        <div className="card wide">
          <TrendChart data={data.trend} />
        </div>
        <div className="card">
          <PipelineChart rows={pipeline} />
        </div>
        <div className="card">
          <AgentChart rows={data.byAgent} />
        </div>
      </div>

      {/* The charts are never the only way in. */}
      <details className="card">
        <summary>{t('seeTable')}</summary>
        {(() => {
          // Only days that actually had orders — a fortnight of empty "0 · ₹0"
          // rows is noise, not data. As soon as a day sees an order it appears.
          const active = data.trend.filter(row => row.orders > 0);
          return (
            <table>
              <thead><tr><th>{t('date')}</th><th>{t('orders')}</th><th>{t('amount')}</th></tr></thead>
              <tbody>
                {active.length === 0 ? (
                  <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: '18px' }}>{t('noData')}</td></tr>
                ) : active.map(row => (
                  <tr key={row.date}>
                    <td className="mono">{row.date.split('-').reverse().join('/')}</td>
                    <td className="mono">{row.orders}</td>
                    <td className="mono">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </details>
    </>
  );
}

/* ------------------------------------------------------------------ orders --- */

function StatusChip({ status }: { status: string }) {
  const { lang } = useLang();
  const color = STATUS_COLOR[status as OrderStatus] ?? STATUS_COLOR.submitted;
  const label = STATUS_LABEL[status as OrderStatus]?.[lang] ?? status;
  return <span className="chip" style={{ color: color.fg, background: color.bg }}>{label}</span>;
}

function Empty({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <p className="muted">{message}</p>
    </div>
  );
}

function OrdersTable({ fixedStatus }: { fixedStatus?: OrderStatus[] }) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['orders', status, page, fixedStatus],
    queryFn: async () => {
      const { data } = await api.get<Page>('/admin/orders', {
        params: { status: status || undefined, page, limit: 20 },
      });
      return data;
    },
    refetchInterval: 20_000,
  });

  const rows = (query.data?.rows ?? []).filter(
    (order: Order) => !fixedStatus || fixedStatus.includes(order.status as OrderStatus),
  );

  return (
    <>
      {!fixedStatus && (
        <div className="filters">
          <button className={status === '' ? 'pill active' : 'pill'} onClick={() => { setStatus(''); setPage(1); }}>
            {t('all')}
          </button>
          {ALL_STATUSES.map(option => (
            <button
              key={option}
              className={status === option ? 'pill active' : 'pill'}
              onClick={() => { setStatus(option); setPage(1); }}>
              {STATUS_LABEL[option][lang]}
            </button>
          ))}
        </div>
      )}

      {query.isPending && <div className="card skeleton tall" />}
      {query.isError && (
        <div className="card error-card">
          {errorMessage(query.error)} <button onClick={() => query.refetch()}>{t('retry')}</button>
        </div>
      )}

      {query.data && (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>{t('order')}</th><th>{t('patient')}</th><th>{t('village')}</th><th>{t('tests')}</th>
                <th>{t('amount')}</th><th>{t('agent')}</th><th>{t('slot')}</th><th>{t('status')}</th><th>{t('files')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9}><Empty icon="orders" message={t('noOrders')} /></td></tr>
              )}
              {rows.map(order => (
                <tr key={order._id}>
                  <td className="mono strong">{order.orderId}</td>
                  <td>
                    {order.patient?.name || '—'}
                    <span className="muted block mono">+91 {order.patient?.phone}</span>
                  </td>
                  <td>{order.patient?.village || '—'}</td>
                  <td>{order.tests.join(', ') || '—'}</td>
                  <td className="mono">{money(order.amount)}</td>
                  <td>{order.assignedAgent?.name || <span className="muted">—</span>}</td>
                  <td>{order.pickupSlot || <span className="muted">—</span>}</td>
                  <td><StatusChip status={order.status} /></td>
                  <td>
                    <span className="files">
                      {order.prescriptionUrl && (
                        <a className="ghost-btn" href={fileUrl(order.prescriptionUrl)} target="_blank" rel="noreferrer">
                          <Icon name="orders" size={13} /> {t('prescription')}
                        </a>
                      )}
                      {order.reportUrl && (
                        <a className="ghost-btn" href={fileUrl(order.reportUrl)} target="_blank" rel="noreferrer">
                          <Icon name="lab" size={13} /> {t('report')}
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!fixedStatus && query.data.pages > 1 && (
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('prev')}</button>
              <span className="muted">{t('page', query.data.page, query.data.pages, query.data.total)}</span>
              <button disabled={page >= query.data.pages} onClick={() => setPage(p => p + 1)}>{t('next')}</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------ lab desktop --- */

// The LAB desktop deliberately has its own small workspace rather than reusing
// the admin orders table. A LAB account sees only the identifiers needed to match
// a sample, its tube and test names; patient contact/address, prices,
// prescriptions, agents and every admin control stay out of this role.
function LabWorkspace() {
  const { t } = useLang();
  const client = useQueryClient();
  const { alert, confirm } = useAlert();
  const [files, setFiles] = useState<Record<string, File | undefined>>({});

  const queue = useQuery({
    queryKey: ['orders', 'lab'],
    queryFn: async () => (await api.get<Order[]>('/orders')).data,
    refetchInterval: 15_000,
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['orders'] });

  const receive = useMutation({
    mutationFn: async (orderId: string) =>
      (await api.patch<Order>(`/orders/${orderId}/lab-confirm`, {})).data,
    onSuccess: () => {
      refresh();
      alert('success', t('sampleReceivedSuccess'));
    },
    onError: error => alert('error', errorMessage(error)),
  });

  const upload = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File }) => {
      const form = new FormData();
      form.append('report', file, file.name || 'report.pdf');
      return (await api.post<Order>(`/orders/${orderId}/upload-report`, form)).data;
    },
    onSuccess: (_order, variables) => {
      setFiles(previous => ({ ...previous, [variables.orderId]: undefined }));
      refresh();
      alert('success', t('reportUploadedSuccess'));
    },
    onError: error => alert('error', errorMessage(error)),
  });

  if (queue.isPending) return <div className="card skeleton tall" />;
  if (queue.isError) {
    return (
      <div className="card error-card">
        {errorMessage(queue.error)} <button onClick={() => queue.refetch()}>{t('retry')}</button>
      </div>
    );
  }

  const orders = queue.data ?? [];
  if (orders.length === 0) return <div className="card"><Empty icon="lab" message={t('noLabSamples')} /></div>;

  return (
    <div className="lab-grid">
      {orders.map(order => {
        const picked = files[order._id];
        const receiving = receive.isPending && receive.variables === order._id;
        const uploading = upload.isPending && upload.variables?.orderId === order._id;

        return (
          <section className="card lab-order" key={order._id}>
            <div className="lab-order-head">
              <div>
                <span className="mono strong">{order.orderId}</span>
                <h2>{order.patient?.name || t('patient')}</h2>
              </div>
              <StatusChip status={order.status} />
            </div>

            <div className="lab-meta">
              <span><small>{t('tube')}</small><strong>{order.labTube || '—'}</strong></span>
              <span><small>{t('tests')}</small><strong>{order.tests.join(', ') || '—'}</strong></span>
            </div>

            {order.status === 'sample_collected' && (
              <button
                className="primary lab-primary"
                disabled={receive.isPending || upload.isPending}
                onClick={() => confirm(
                  t('confirmLabReceive', order.orderId),
                  () => receive.mutate(order._id),
                )}>
                {receiving ? '…' : t('confirmReceived')}
              </button>
            )}

            {order.status === 'lab_received' && (
              <div className="lab-upload">
                <label>
                  <span>{t('selectPdf')}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file && file.type && file.type !== 'application/pdf') {
                        event.target.value = '';
                        alert('warning', t('pdfOnly'));
                        return;
                      }
                      setFiles(previous => ({ ...previous, [order._id]: file }));
                    }}
                  />
                </label>
                <button
                  className="primary"
                  disabled={!picked || receive.isPending || upload.isPending}
                  onClick={() => picked && confirm(
                    t('confirmReportUpload', order.patient?.name || order.orderId),
                    () => upload.mutate({ orderId: order._id, file: picked }),
                  )}>
                  {uploading ? '…' : t('uploadReport')}
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- staff --- */

// Staff accounts are created HERE and nowhere else. The mobile app has no staff
// sign-up: if it did, anyone who installed the APK could make themselves a PRO and
// read every patient's name, phone, address and report.
// Hints that match the role being created — a PRO form used to suggest "agent3",
// which is exactly the sort of thing that gets a PRO created with an agent's name.
const STAFF_HINTS: Record<string, { name: string; username: string; zone: string }> = {
  pro: { name: 'Priya Sharma', username: 'pro1', zone: 'All' },
  agent: { name: 'Vinod Kumar', username: 'agent1', zone: 'Ramnagar' },
  lab: { name: 'Heritage Lab', username: 'lab1', zone: 'All' },
  admin: { name: 'Administrator', username: 'admin2', zone: 'All' },
};

function AddStaff({ role }: { role: string }) {
  const { t } = useLang();
  const client = useQueryClient();
  const { alert } = useAlert();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', phone: '', zone: '', password: '' });
  const hint = STAFF_HINTS[role] ?? STAFF_HINTS.agent;

  const create = useMutation({
    mutationFn: async () => (await api.post('/admin/staff', { ...form, role })).data,
    onSuccess: (staff: Person) => {
      client.invalidateQueries({ queryKey: ['staff'] });
      setForm({ name: '', username: '', phone: '', zone: '', password: '' });
      setOpen(false);
      alert('success', t('created', staff.name, staff.username || ''));
    },
    onError: (error) => alert('error', errorMessage(error)),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  if (!open) {
    return (
      <button className="primary add-btn" onClick={() => setOpen(true)}>
        {t('addAccount', role.toUpperCase())}
      </button>
    );
  }

  return (
    <form className="card staff-form" onSubmit={e => {
      e.preventDefault();
      if (!isValidPhone(form.phone)) {
        alert('warning', t('invalidPhone'));
        return;
      }
      create.mutate();
    }}>
      <h2>{t('newAccount', role.toUpperCase())}</h2>
      <div className="staff-grid">
        <label>{t('name')}<input value={form.name} onChange={set('name')} placeholder={hint.name} /></label>
        <label>{t('username')}<input value={form.username} onChange={set('username')} placeholder={hint.username} autoComplete="off" /></label>
        <label>
          {t('phone')}
          <PhoneInput value={form.phone} onChange={phone => setForm(f => ({ ...f, phone }))} />
        </label>
        <label>{t('zone')}<input value={form.zone} onChange={set('zone')} placeholder={hint.zone} /></label>
        <label>
          {t('password')}
          <PasswordInput
            value={form.password}
            onChange={password => setForm(f => ({ ...f, password }))}
            placeholder={t('minChars')}
            autoComplete="new-password"
          />
        </label>
      </div>
      <div className="staff-actions">
        <button type="button" className="ghost" onClick={() => setOpen(false)}>{t('cancel')}</button>
        <button type="submit" className="primary" disabled={create.isPending}>
          {create.isPending ? '…' : t('create')}
        </button>
      </div>
    </form>
  );
}

/* --- shared list filter + pagination (Users, PRO, Agents, Lab) ------------- */

type Paged<T> = { items: T[]; total: number; page: number; pages: number };
type FilterMode = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type ListFilter = { mode: FilterMode; from?: string; to?: string };
const QUICK: { mode: FilterMode; label: string }[] = [
  { mode: 'all', label: 'periodAll' },
  { mode: 'today', label: 'periodToday' },
  { mode: 'week', label: 'periodWeek' },
  { mode: 'month', label: 'periodMonth' },
  { mode: 'year', label: 'periodYear' },
  { mode: 'custom', label: 'periodCustom' },
];

// Inline filter pills; the Custom pill reveals a from/to date range. A status line
// spells out exactly what the table is currently showing.
function FilterBar({ filter, onChange, total }: { filter: ListFilter; onChange: (f: ListFilter) => void; total: number }) {
  const { t } = useLang();
  const [from, setFrom] = useState(filter.from ?? '');
  const [to, setTo] = useState(filter.to ?? '');

  const status = () => {
    switch (filter.mode) {
      case 'today': return t('statusToday');
      case 'week': return t('statusWeek');
      case 'month': return t('statusMonth');
      case 'year': return t('statusYear', new Date().getFullYear());
      case 'custom': return filter.from && filter.to ? t('statusCustom') : t('statusPickDates');
      default: return t('statusAll');
    }
  };

  return (
    <div className="list-filter">
      <div className="filter-pills">
        {QUICK.map(q => (
          <button
            key={q.mode}
            className={filter.mode === q.mode ? 'pill active' : 'pill'}
            onClick={() => onChange(q.mode === 'custom' ? { mode: 'custom', from, to } : { mode: q.mode })}>
            {t(q.label)}
          </button>
        ))}
      </div>

      {filter.mode === 'custom' && (
        <div className="custom-range">
          <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
          <span className="cr-sep">{t('fromDate')}</span>
          <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          <button className="primary" disabled={!from || !to}
            onClick={() => onChange({ mode: 'custom', from, to })}>
            {t('apply')}
          </button>
        </div>
      )}

      <div className="filter-status muted">{status()} · {t('showing', total)}</div>
    </div>
  );
}

function Pager({ page, pages, total, setPage }: {
  page: number; pages: number; total: number; setPage: (fn: (p: number) => number) => void;
}) {
  const { t } = useLang();
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('prev')}</button>
      <span className="muted">{t('pageOf', page, pages, total)}</span>
      <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t('next')}</button>
    </div>
  );
}

// Period + page state shared by every list table. Changing the filter resets to
// page 1 so you never land on an empty page that no longer exists.
function useListQuery<T>(key: unknown[], path: string, extraParams: Record<string, string> = {}) {
  const [filter, setFilterState] = useState<ListFilter>({ mode: 'all' });
  const [page, setPage] = useState(1);
  const setFilter = (f: ListFilter) => { setFilterState(f); setPage(1); };
  const params = filter.mode === 'custom'
    ? { ...extraParams, from: filter.from, to: filter.to, page, limit: 20 }
    : { ...extraParams, period: filter.mode, page, limit: 20 };
  const query = useQuery({
    queryKey: [...key, filter, page],
    queryFn: async () => {
      const raw = (await api.get<Paged<T> | T[]>(path, { params })).data;
      // Tolerate a backend that still returns a plain array (not yet redeployed) so
      // the table never breaks — it just shows everything on one page until then.
      return Array.isArray(raw) ? { items: raw, total: raw.length, page: 1, pages: 1 } : raw;
    },
    refetchInterval: 20_000,
  });
  return { filter, setFilter, page, setPage, query };
}

function StaffTable({ role }: { role: string }) {
  const { t } = useLang();
  const client = useQueryClient();
  const { confirm, alert } = useAlert();

  const { filter, setFilter, page, setPage, query } = useListQuery<Person>(['staff', role], '/admin/staff', { role });
  const { data, isPending } = query;

  // Agents only: who is out on a pickup right now.
  const agents = useQuery({
    queryKey: ['agents-availability'],
    queryFn: async () => (await api.get<Person[]>('/staff/agents')).data,
    enabled: role === 'agent',
    refetchInterval: 15_000,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: '', phone: '', zone: '', password: '' });

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['staff'] });
    client.invalidateQueries({ queryKey: ['agents-availability'] });
  };

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api.patch(`/admin/staff/${id}`, { active })).data,
    onSuccess: refresh,
    onError: (error) => alert('error', errorMessage(error)),
  });

  const save = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      (await api.patch(`/admin/staff/${id}`, body)).data,
    onSuccess: () => { refresh(); setEditing(null); },
    onError: (error) => alert('error', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/staff/${id}`)).data,
    onSuccess: () => { refresh(); alert('success', t('staffDeleted')); },
    onError: (error) => alert('error', errorMessage(error)),
  });

  if (isPending) return <div className="card skeleton tall" />;

  const busyById = Object.fromEntries((agents.data ?? []).map(a => [a._id, a]));
  const staff = data?.items ?? [];

  return (
    <>
      <AddStaff role={role} />

      <div className="card table-card">
        <FilterBar filter={filter} onChange={setFilter} total={data?.total ?? 0} />
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th><th>{t('username')}</th><th>{t('phone')}</th><th>{t('zone')}</th>
              {role === 'agent' && <th>{t('agent')}</th>}
              <th>{t('status')}</th><th>{t('action')}</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr><td colSpan={role === 'agent' ? 7 : 6}><Empty icon="users" message={t('noStaff')} /></td></tr>
            )}
            {staff.map(person => {
              const busy = busyById[person._id]?.busy;

              // Inline edit row: name, phone, zone, and an optional new password.
              if (editing === person._id) {
                return (
                  <tr key={person._id}>
                    <td><input value={edit.name} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} /></td>
                    <td className="mono">{person.username}</td>
                    <td><PhoneInput value={edit.phone} onChange={phone => setEdit(s => ({ ...s, phone }))} /></td>
                    <td><input value={edit.zone} onChange={e => setEdit(s => ({ ...s, zone: e.target.value }))} /></td>
                    {role === 'agent' && <td>—</td>}
                    <td>
                      <PasswordInput
                        value={edit.password}
                        onChange={password => setEdit(s => ({ ...s, password }))}
                        placeholder={t('newPasswordOptional')}
                        autoComplete="new-password"
                      />
                    </td>
                    <td>
                      <button className="primary" disabled={save.isPending} onClick={() => {
                        if (edit.phone && !isValidPhone(edit.phone)) return alert('warning', t('invalidPhone'));
                        const body: Record<string, unknown> = { name: edit.name.trim(), zone: edit.zone.trim() };
                        if (edit.phone) body.phone = edit.phone;
                        if (edit.password) body.password = edit.password;
                        save.mutate({ id: person._id, body });
                      }}>{t('save')}</button>{' '}
                      <button onClick={() => setEditing(null)}>{t('cancel')}</button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={person._id}>
                  <td className="strong">{person.name}</td>
                  <td className="mono">{person.username}</td>
                  <td className="mono">{person.phone ? `+91 ${person.phone}` : '—'}</td>
                  <td>{person.zone || '—'}</td>

                  {role === 'agent' && (
                    <td>
                      {/* Free vs out on a pickup. A busy agent is not offered for a
                          new one — they are physically out on the last. */}
                      <span className="chip" style={busy
                        ? { color: '#8A6520', background: '#F7EDD9' }
                        : { color: '#1F8A5B', background: '#E8F5EE' }}>
                        {busy ? t('busy') : t('free')}
                      </span>
                      {busy && (
                        <span className="muted block mono">
                          {busyById[person._id]?.busyWith?.join(', ')}
                        </span>
                      )}
                    </td>
                  )}

                  <td>
                    <span className="chip" style={person.active
                      ? { color: '#1F8A5B', background: '#E8F5EE' }
                      : { color: '#6D6D6D', background: '#EDEDED' }}>
                      {person.active ? t('active') : t('disabled')}
                    </span>
                  </td>

                  <td className="row-actions">
                    <button onClick={() => {
                      setEditing(person._id);
                      setEdit({ name: person.name, phone: person.phone ?? '', zone: person.zone ?? '', password: '' });
                    }}>{t('edit')}</button>

                    {/* Disable keeps their name on the orders they already handled;
                        delete removes the account entirely. */}
                    <button onClick={() => confirm(
                      person.active
                        ? t('confirmDisable', person.name)
                        : t('confirmEnable', person.name),
                      () => toggle.mutate({ id: person._id, active: !person.active }),
                    )}>
                      {person.active ? t('disable') : t('enable')}
                    </button>

                    <button
                      className="danger"
                      disabled={remove.isPending}
                      onClick={() => confirm(t('confirmDeleteStaff', person.name), () => remove.mutate(person._id))}>
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pager page={page} pages={data?.pages ?? 1} total={data?.total ?? 0} setPage={setPage} />
      </div>
    </>
  );
}

function PatientsTable() {
  const { t } = useLang();
  const client = useQueryClient();
  const { confirm, alert } = useAlert();
  const { filter, setFilter, page, setPage, query } = useListQuery<Person>(['patients'], '/admin/patients');
  const { data, isPending } = query;

  // Deleting a patient takes their orders with them, so the confirm spells that out.
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/patients/${id}`)).data,
    onSuccess: (res: { orders: number }) => {
      client.invalidateQueries({ queryKey: ['patients'] });
      client.invalidateQueries({ queryKey: ['orders'] });
      client.invalidateQueries({ queryKey: ['stats'] });
      client.invalidateQueries({ queryKey: ['overview'] });
      alert('success', t('userDeleted', res.orders));
    },
    onError: e => alert('error', errorMessage(e)),
  });

  if (isPending) return <div className="card skeleton tall" />;
  const patients = data?.items ?? [];

  return (
    <div className="card table-card">
      <FilterBar filter={filter} onChange={setFilter} total={data?.total ?? 0} />
      <table>
        <thead>
          <tr>
            <th>{t('name')}</th><th>{t('phone')}</th><th>{t('village')}</th>
            <th>{t('address')}</th><th>{t('joined')}</th><th />
          </tr>
        </thead>
        <tbody>
          {patients.length === 0 && (
            <tr><td colSpan={6}><Empty icon="users" message={t('noPatients')} /></td></tr>
          )}
          {patients.map(person => (
            <tr key={person._id}>
              <td className="strong">{person.name}</td>
              <td className="mono">+91 {person.phone}</td>
              <td>{person.village || '—'}</td>
              <td>{person.address || '—'}</td>
              <td className="mono">
                {person.createdAt ? new Date(person.createdAt).toLocaleDateString('en-IN') : '—'}
              </td>
              <td>
                <button
                  className="danger"
                  disabled={remove.isPending}
                  onClick={() => confirm(t('confirmDeleteUser', person.name), () => remove.mutate(person._id))}>
                  {t('delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={page} pages={data?.pages ?? 1} total={data?.total ?? 0} setPage={setPage} />
    </div>
  );
}

/* ---------------------------------------------------------- test catalog --- */

const blankTest = { name: '', category: '', amount: '' };

function TestCatalogTable() {
  const { t } = useLang();
  const client = useQueryClient();
  const { confirm, alert } = useAlert();
  const [form, setForm] = useState(blankTest);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState(blankTest);
  const [search, setSearch] = useState('');

  const { data, isPending } = useQuery({
    queryKey: ['catalog'],
    // ?all=1 so the admin also sees disabled tests.
    queryFn: async () => (await api.get<TestItem[]>('/test-catalog', { params: { all: 1 } })).data,
    refetchInterval: 30_000,
  });

  const invalidate = () => client.invalidateQueries({ queryKey: ['catalog'] });

  const create = useMutation({
    mutationFn: async () => (await api.post('/admin/test-catalog', {
      name: form.name.trim(), category: form.category.trim(), amount: Number(form.amount),
    })).data,
    onSuccess: () => { invalidate(); setForm(blankTest); setOpen(false); },
    onError: e => alert('error', errorMessage(e)),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      (await api.patch(`/admin/test-catalog/${id}`, body)).data,
    onSuccess: () => { invalidate(); setEditing(null); },
    onError: e => alert('error', errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/admin/test-catalog/${id}`)).data,
    onSuccess: invalidate,
    onError: e => alert('error', errorMessage(e)),
  });

  if (isPending) return <div className="card skeleton tall" />;
  const tests = data ?? [];
  const needle = search.trim().toLocaleLowerCase();
  const visibleTests = needle
    ? tests.filter(item => `${item.name} ${item.category || ''}`.toLocaleLowerCase().includes(needle))
    : tests;

  const startEdit = (item: TestItem) => {
    setEditing(item._id);
    setEdit({ name: item.name, category: item.category ?? '', amount: String(item.amount) });
  };

  return (
    <>
      {!open ? (
        <button className="primary add-btn" onClick={() => setOpen(true)}>{t('addTest')}</button>
      ) : (
        <form className="card staff-form" onSubmit={e => {
          e.preventDefault();
          if (form.name.trim().length < 2) return alert('warning', t('testNameReq'));
          if (!(Number(form.amount) >= 0)) return alert('warning', t('testRateReq'));
          create.mutate();
        }}>
          <h2>{t('newTest')}</h2>
          <div className="staff-grid">
            <label>{t('testName')}<input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CBC" /></label>
            <label>{t('category')}<input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Blood Test" /></label>
            <label>{t('amount')} (₹)<input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="300" /></label>
          </div>
          <div className="staff-actions">
            <button type="button" className="ghost" onClick={() => { setOpen(false); setForm(blankTest); }}>{t('cancel')}</button>
            <button type="submit" className="primary" disabled={create.isPending}>{create.isPending ? '…' : t('create')}</button>
          </div>
        </form>
      )}

      <div className="card table-card">
        <div className="catalog-search">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('searchTests')}
            aria-label={t('searchTests')}
          />
          <span className="muted">{t('testsFound', String(visibleTests.length))}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('testName')}</th><th>{t('category')}</th><th>{t('amount')}</th>
              <th>{t('status')}</th><th />
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 && (
              <tr><td colSpan={5}><Empty icon="lab" message={t('noTests')} /></td></tr>
            )}
            {tests.length > 0 && visibleTests.length === 0 && (
              <tr><td colSpan={5}><Empty icon="lab" message={t('noMatchingTests')} /></td></tr>
            )}
            {visibleTests.map(item => editing === item._id ? (
              <tr key={item._id}>
                <td><input value={edit.name} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} /></td>
                <td><input value={edit.category} onChange={e => setEdit(s => ({ ...s, category: e.target.value }))} /></td>
                <td><input type="number" min="0" style={{ width: 90 }} value={edit.amount} onChange={e => setEdit(s => ({ ...s, amount: e.target.value }))} /></td>
                <td colSpan={2}>
                  <button className="primary" onClick={() => update.mutate({ id: item._id, body: { name: edit.name.trim(), category: edit.category.trim(), amount: Number(edit.amount) } })}>{t('save')}</button>
                  {' '}
                  <button onClick={() => setEditing(null)}>{t('cancel')}</button>
                </td>
              </tr>
            ) : (
              <tr key={item._id} style={item.isActive ? undefined : { opacity: 0.55 }}>
                <td className="strong">{item.name}</td>
                <td>{item.category || '—'}</td>
                <td className="mono strong">{money(item.amount)}</td>
                <td>
                  <span className="chip" style={item.isActive
                    ? { color: '#1F8A5B', background: '#E8F5EE' }
                    : { color: '#6D6D6D', background: '#EDEDED' }}>
                    {item.isActive ? t('active') : t('disabled')}
                  </span>
                </td>
                <td>
                  <button onClick={() => startEdit(item)}>{t('edit')}</button>{' '}
                  {item.isActive
                    ? <button onClick={() => confirm(t('confirmDisableTest', item.name), () => remove.mutate(item._id))}>{t('disable')}</button>
                    : <button onClick={() => update.mutate({ id: item._id, body: { isActive: true } })}>{t('enable')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type LabCatalogItem = Pick<TestItem, '_id' | 'name' | 'category' | 'amount'>;

function LabCatalog() {
  const { t } = useLang();
  const client = useQueryClient();
  const { alert } = useAlert();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankTest);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState(blankTest);
  const query = useQuery({
    queryKey: ['catalog', 'lab'],
    queryFn: async () => (await api.get<LabCatalogItem[]>('/test-catalog')).data,
    staleTime: 5 * 60_000,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post<LabCatalogItem>('/test-catalog', {
      name: form.name.trim(),
      category: form.category.trim(),
      amount: Number(form.amount),
    })).data,
    onSuccess: test => {
      client.invalidateQueries({ queryKey: ['catalog', 'lab'] });
      setForm(blankTest);
      setOpen(false);
      alert('success', t('testAdded', test.name));
    },
    onError: error => alert('error', errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      (await api.patch<LabCatalogItem>(`/test-catalog/${id}`, body)).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['catalog', 'lab'] });
      setEditing(null);
      alert('success', t('testUpdated'));
    },
    onError: error => alert('error', errorMessage(error)),
  });

  if (query.isPending) return <div className="card skeleton tall" />;
  if (query.isError) {
    return (
      <div className="card error-card">
        {errorMessage(query.error)} <button onClick={() => query.refetch()}>{t('retry')}</button>
      </div>
    );
  }

  const needle = search.trim().toLowerCase();
  const matching = (query.data ?? []).filter(test =>
    !needle || test.name.toLowerCase().includes(needle) || (test.category || '').toLowerCase().includes(needle),
  );
  const visible = matching.slice(0, 100);

  return (
    <>
      {!open ? (
        <button className="primary add-btn" onClick={() => setOpen(true)}>{t('addTest')}</button>
      ) : (
        <form className="card staff-form" onSubmit={event => {
          event.preventDefault();
          if (form.name.trim().length < 2) return alert('warning', t('testNameReq'));
          if (!(Number(form.amount) >= 0)) return alert('warning', t('testRateReq'));
          create.mutate();
        }}>
          <h2>{t('newTest')}</h2>
          <div className="staff-grid">
            <label>{t('testName')}<input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} placeholder="CBC" /></label>
            <label>{t('category')}<input value={form.category} onChange={event => setForm(previous => ({ ...previous, category: event.target.value }))} placeholder="Blood Test" /></label>
            <label>{t('amount')} (₹)<input type="number" min="0" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} placeholder="300" /></label>
          </div>
          <div className="staff-actions">
            <button type="button" className="ghost" onClick={() => { setOpen(false); setForm(blankTest); }}>{t('cancel')}</button>
            <button type="submit" className="primary" disabled={create.isPending}>{create.isPending ? '…' : t('create')}</button>
          </div>
        </form>
      )}

      <div className="card table-card lab-catalog">
        <div className="catalog-search">
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('searchTests')}
          />
          <span className="muted">{t('testsFound', matching.length)}</span>
        </div>
        <table>
          <thead><tr><th>{t('testName')}</th><th>{t('category')}</th><th>{t('amount')}</th><th /></tr></thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={4}><Empty icon="lab" message={t('noMatchingTests')} /></td></tr>
            ) : visible.map(test => editing === test._id ? (
              <tr key={test._id}>
                <td><input value={edit.name} onChange={event => setEdit(previous => ({ ...previous, name: event.target.value }))} /></td>
                <td><input value={edit.category} onChange={event => setEdit(previous => ({ ...previous, category: event.target.value }))} /></td>
                <td><input type="number" min="0" style={{ width: 110 }} value={edit.amount} onChange={event => setEdit(previous => ({ ...previous, amount: event.target.value }))} /></td>
                <td>
                  <button className="primary" disabled={update.isPending} onClick={() => update.mutate({
                    id: test._id,
                    body: { name: edit.name.trim(), category: edit.category.trim(), amount: Number(edit.amount) },
                  })}>{update.isPending ? '…' : t('save')}</button>{' '}
                  <button onClick={() => setEditing(null)}>{t('cancel')}</button>
                </td>
              </tr>
            ) : (
              <tr key={test._id}>
                <td className="strong">{test.name}</td>
                <td>{test.category || '—'}</td>
                <td className="mono strong">{money(test.amount)}</td>
                <td><button onClick={() => {
                  setEditing(test._id);
                  setEdit({ name: test.name, category: test.category || '', amount: String(test.amount) });
                }}>{t('edit')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {matching.length > visible.length && (
          <p className="muted catalog-more">{t('refineTestSearch', visible.length, matching.length)}</p>
        )}
      </div>
    </>
  );
}

function LabHistory() {
  const { t, lang } = useLang();
  const query = useQuery({
    queryKey: ['orders', 'lab-history'],
    queryFn: async () => (await api.get<Order[]>('/orders/history')).data,
    refetchInterval: 30_000,
  });

  if (query.isPending) return <div className="card skeleton tall" />;
  if (query.isError) {
    return (
      <div className="card error-card">
        {errorMessage(query.error)} <button onClick={() => query.refetch()}>{t('retry')}</button>
      </div>
    );
  }

  const orders = query.data ?? [];
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr><th>{t('order')}</th><th>{t('patient')}</th><th>{t('tests')}</th><th>{t('tube')}</th><th>{t('status')}</th><th>{t('date')}</th><th>{t('report')}</th></tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan={7}><Empty icon="orders" message={t('noHistory')} /></td></tr>
          ) : orders.map(order => (
            <tr key={order._id}>
              <td className="mono strong">{order.orderId}</td>
              <td>{order.patient?.name || '—'}</td>
              <td>{order.tests.join(', ') || '—'}</td>
              <td>{order.labTube || '—'}</td>
              <td><StatusChip status={order.status} /></td>
              <td>{new Date(order.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN')}</td>
              <td>{order.reportUrl
                ? <a className="ghost-btn" href={fileUrl(order.reportUrl)} target="_blank" rel="noreferrer">{t('report')}</a>
                : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------- app --- */

function Shell() {
  const { t, lang, setLang } = useLang();
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(getToken() ? 'checking' : 'out');
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [nav, setNav] = useState<NavKey>('dashboard');
  const { confirm } = useAlert();
  const client = useQueryClient();

  useLiveOrders(auth === 'in');

  // A stored token is a claim, not proof. Trusting Boolean(getToken()) meant ANY
  // staff token — a PRO's, an agent's — rendered the admin shell.
  useEffect(() => {
    if (auth !== 'checking') return;
    let cancelled = false;

    api.get('/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        if (data.role === 'admin' || data.role === 'lab') {
          setRole(data.role);
          setNav(data.role === 'lab' ? 'labQueue' : 'dashboard');
          return setAuth('in');
        }
        clearToken();
        setRole(null);
        setAuth('out');
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setRole(null);
        setAuth('out');
      });

    return () => { cancelled = true; };
  }, [auth]);

  if (auth === 'checking') {
    return <div className="center"><div className="card skeleton" style={{ width: 360, height: 120 }} /></div>;
  }
  if (auth === 'out') {
    return <Login onDone={nextRole => {
      client.clear();
      setRole(nextRole);
      setNav(nextRole === 'lab' ? 'labQueue' : 'dashboard');
      setAuth('in');
    }} />;
  }

  const logout = () => {
    clearToken();
    client.clear();
    setRole(null);
    setNav('dashboard');
    setAuth('out');
  };

  const visibleNav = role === 'lab'
    ? NAV.filter(item => ['labQueue', 'labHistory', 'catalog'].includes(item.key))
    : NAV.filter(item => item.key !== 'labHistory');

  const view = {
    dashboard: <Dashboard />,
    orders: <OrdersTable />,
    patients: <PatientsTable />,
    pro: <StaffTable role="pro" />,
    agent: <StaffTable role="agent" />,
    // The lab needs an ACCOUNT before anyone can upload a report — this page is
    // where it is created. The lab's work queue is a separate page.
    labTeam: <StaffTable role="lab" />,
    labQueue: <OrdersTable fixedStatus={['sample_collected', 'lab_received']} />,
    labHistory: <></>,
    collection: <OrdersTable fixedStatus={['report_ready']} />,
    catalog: <TestCatalogTable />,
  }[nav];

  const title = role === 'lab' && nav === 'labQueue'
    ? t('labWorkspace')
    : t(NAV.find(item => item.key === nav)!.label);

  return (
    <div className="shell">
      <aside>
        <div className="brand brand-full">
          <img className="brand-logo-full" src={logo} alt="Heritage Diagnostics" />
        </div>

        <nav>
          {visibleNav.map(item => (
            <button
              key={item.key}
              className={nav === item.key ? 'active' : ''}
              onClick={() => setNav(item.key)}>
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              {t(item.label)}
            </button>
          ))}
        </nav>

        <button
          className="logout"
          onClick={() => confirm(t('confirmLogout'), logout)}>
          {t('logout')}
        </button>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="muted">
              {t('todayOverview')} · {new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          <div className="topbar-actions">
            <div className="lang-switch" role="group" aria-label="Language / भाषा">
              <button
                type="button"
                className={lang === 'en' ? 'active' : ''}
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}>
                EN
              </button>
              <button
                type="button"
                className={lang === 'hi' ? 'active' : ''}
                aria-pressed={lang === 'hi'}
                onClick={() => setLang('hi')}>
                हिंदी
              </button>
            </div>
            <Notifications enabled={auth === 'in'} />
          </div>
        </header>

        {role === 'lab'
          ? nav === 'catalog' ? <LabCatalog /> : nav === 'labHistory' ? <LabHistory /> : <LabWorkspace />
          : <><StatCards />{view}</>}
      </main>
    </div>
  );
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(
    (localStorage.getItem('hd.admin.lang') as Lang) || 'en',
  );

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem('hd.admin.lang', next);
    // Keep the document language in sync so the browser (and screen readers) agree
    // with what's on screen — the page is marked translate="no", so the app is the
    // single source of truth.
    document.documentElement.lang = next;
  };

  // Also apply the saved language on the first load, before the user clicks.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <AlertProvider>
        <Shell />
      </AlertProvider>
    </LangContext.Provider>
  );
}
