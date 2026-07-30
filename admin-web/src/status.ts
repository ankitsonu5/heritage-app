// Mirror of backend/src/status.js. Same single-source-of-truth rule as the mobile
// app: no order-status string literals anywhere else in this dashboard.

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

// The happy path, in order. The pipeline chart is ordinal — it must render in this
// sequence, never sorted by count, or the shape it exists to show is destroyed.
// `cancelled` is not a stage; it is an exit, so it stays out of the funnel.
export const PIPELINE: OrderStatus[] = [
  STATUS.SUBMITTED,
  STATUS.PRO_REVIEW,
  STATUS.CONFIRMED,
  STATUS.AGENT_ASSIGNED,
  STATUS.SAMPLE_COLLECTED,
  STATUS.LAB_RECEIVED,
  STATUS.REPORT_READY,
];

// Both languages, so the dashboard's toggle reaches the status chips too.
export const STATUS_LABEL: Record<OrderStatus, { en: string; hi: string }> = {
  [STATUS.SUBMITTED]: { en: 'New prescription', hi: 'नई पर्ची' },
  [STATUS.PRO_REVIEW]: { en: 'PRO is calling', hi: 'PRO कॉल कर रहे हैं' },
  [STATUS.CONFIRMED]: { en: 'Confirmed', hi: 'Confirm हुआ' },
  [STATUS.AGENT_ASSIGNED]: { en: 'Agent on the way', hi: 'एजेंट भेजा' },
  [STATUS.SAMPLE_COLLECTED]: { en: 'Sample collected', hi: 'सैंपल लिया' },
  [STATUS.LAB_RECEIVED]: { en: 'In lab', hi: 'लैब में' },
  [STATUS.REPORT_READY]: { en: 'Report ready', hi: 'रिपोर्ट तैयार' },
  [STATUS.CANCELLED]: { en: 'Cancelled', hi: 'रद्द' },
};

export const STATUS_COLOR: Record<OrderStatus, { fg: string; bg: string }> = {
  [STATUS.SUBMITTED]: { fg: '#A00000', bg: '#F8E8E8' },
  [STATUS.PRO_REVIEW]: { fg: '#751725', bg: '#F6E7EA' },
  [STATUS.CONFIRMED]: { fg: '#8A6520', bg: '#F7EDD9' },
  [STATUS.AGENT_ASSIGNED]: { fg: '#8A6520', bg: '#F7EDD9' },
  [STATUS.SAMPLE_COLLECTED]: { fg: '#5B4A9E', bg: '#EDE9F8' },
  [STATUS.LAB_RECEIVED]: { fg: '#5B4A9E', bg: '#EDE9F8' },
  [STATUS.REPORT_READY]: { fg: '#1F8A5B', bg: '#E8F5EE' },
  [STATUS.CANCELLED]: { fg: '#6D6D6D', bg: '#EDEDED' },
};
