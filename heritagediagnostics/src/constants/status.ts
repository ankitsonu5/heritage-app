// Client mirror of backend/src/status.js — the single source of truth for the
// order lifecycle. Nothing outside this file may write an order-status string
// literal: step trackers, chips, and list filters all derive from here.
//
// backend/test/status.test.js guards the backend half; contractCheck() below is
// asserted in __tests__/status.test.ts so the two cannot silently drift apart.

export const STATUS = {
  SUBMITTED: 'submitted',
  PRO_REVIEW: 'pro_review',
  CONFIRMED: 'confirmed',
  AGENT_ASSIGNED: 'agent_assigned',
  SAMPLE_COLLECTED: 'sample_collected',
  LAB_RECEIVED: 'lab_received',
  REPORT_READY: 'report_ready',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof STATUS)[keyof typeof STATUS];

export const ALL_STATUSES: OrderStatus[] = Object.values(STATUS);

// The five steps the patient sees. Several statuses share a step.
export const STEPS = [
  'prescription_sent',
  'confirmed_call',
  'agent_assigned',
  'sample_collected',
  'report_ready',
] as const;

export const STEP_INDEX: Record<OrderStatus, number> = {
  [STATUS.SUBMITTED]: 0,
  [STATUS.PRO_REVIEW]: 0,
  [STATUS.CONFIRMED]: 1,
  [STATUS.AGENT_ASSIGNED]: 2,
  [STATUS.SAMPLE_COLLECTED]: 3,
  [STATUS.LAB_RECEIVED]: 3,
  [STATUS.REPORT_READY]: 4,
  [STATUS.CANCELLED]: 0,
};

export const stepIndexOf = (status: OrderStatus) => STEP_INDEX[status] ?? 0;

// Which statuses each staff role's work queue shows. Sent to GET /orders?status=…
export const QUEUE: Record<'pro' | 'agent' | 'lab', OrderStatus[]> = {
  // A confirmed order still belongs to the PRO until an agent is actually
  // assigned. Omitting it made the order disappear after a refresh/re-login and
  // falsely looked as if dispatch had already happened.
  pro: [STATUS.SUBMITTED, STATUS.PRO_REVIEW, STATUS.CONFIRMED],
  agent: [STATUS.AGENT_ASSIGNED],
  lab: [STATUS.SAMPLE_COLLECTED, STATUS.LAB_RECEIVED],
};

export const queueParam = (role: 'pro' | 'agent' | 'lab') => QUEUE[role].join(',');

type ChipStyle = { color: string; backgroundColor: string };

// One colour definition per status, used by every chip in the app.
export const STATUS_CHIP: Record<OrderStatus, ChipStyle> = {
  [STATUS.SUBMITTED]: { color: '#A00000', backgroundColor: '#F8E8E8' },
  [STATUS.PRO_REVIEW]: { color: '#751725', backgroundColor: '#F6E7EA' },
  [STATUS.CONFIRMED]: { color: '#B7863A', backgroundColor: '#F7EDD9' },
  [STATUS.AGENT_ASSIGNED]: { color: '#B7863A', backgroundColor: '#F7EDD9' },
  [STATUS.SAMPLE_COLLECTED]: { color: '#5B4A9E', backgroundColor: '#EDE9F8' },
  [STATUS.LAB_RECEIVED]: { color: '#5B4A9E', backgroundColor: '#EDE9F8' },
  [STATUS.REPORT_READY]: { color: '#1F8A5B', backgroundColor: '#E8F5EE' },
  [STATUS.CANCELLED]: { color: '#6D6D6D', backgroundColor: '#EDEDED' },
};

export const chipStyle = (status?: string): ChipStyle =>
  STATUS_CHIP[status as OrderStatus] ?? STATUS_CHIP[STATUS.SUBMITTED];

// Every status must have a translation key, a step, and a chip colour. Called by
// the unit test; cheap enough to be worth the certainty.
export function contractCheck(hasTranslation: (key: string) => boolean): string[] {
  const problems: string[] = [];
  for (const status of ALL_STATUSES) {
    if (!hasTranslation(status)) problems.push(`no translation for status "${status}"`);
    if (STEP_INDEX[status] === undefined) problems.push(`no step index for status "${status}"`);
    if (!STATUS_CHIP[status]) problems.push(`no chip colour for status "${status}"`);
  }
  for (const step of STEPS) {
    if (!hasTranslation(step)) problems.push(`no translation for step "${step}"`);
  }
  return problems;
}
