import axios from 'axios';

// Where the API lives. Three ways in, checked in this order:
//
//   • The .exe: the Electron shell injects the deployed URL on window.HERITAGE
//     (see electron/preload.cjs). There is no dev server to proxy through, so the
//     address has to be absolute. Guarded with ?. so the same bundle runs in a
//     plain browser, where window.HERITAGE simply does not exist.
//   • The hosted web build: VITE_API_BASE_URL, baked in at build time from
//     .env.production. The site and the API are on different hosts, so this is
//     also absolute — which means the backend's ALLOWED_ORIGINS must list the
//     site's domain or every request dies at CORS.
//   • Dev in the browser: neither is set, so this stays empty and Vite's proxy
//     forwards /api and /uploads to the backend, keeping the dashboard
//     same-origin.
//
// This is an ORIGIN, with no /api on the end — the paths below add it.
declare global {
  interface Window { HERITAGE?: { apiUrl?: string } }
}

export const API_ORIGIN =
  window.HERITAGE?.apiUrl || import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

// The hosted LAB catalog uses a same-origin Vercel function for catalog reads
// and edits. This keeps the database credential server-side while the existing
// Render API continues to authenticate the staff token.
export const catalogApi = axios.create({ baseURL: '/api' });

// Prescriptions and reports are served from the same origin as the API.
export const fileUrl = (path?: string) =>
  (!path ? '' : path.startsWith('http') ? path : `${API_ORIGIN}${path}`);

const TOKEN_KEY = 'hd.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

catalogApi.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    // A wrong password on the login form is also a 401. Reloading there erased
    // the form before its error could be shown. Only expire an established
    // session; unauthenticated login failures stay on the page with their message.
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      location.reload();
    }
    return Promise.reject(error);
  },
);

const ERROR_COPY: Record<string, [string, string]> = {
  invalid_phone: ['Enter a valid 10-digit mobile number.', 'सही 10 अंकों का मोबाइल नंबर डालें।'],
  name_required: ['Please enter a name.', 'नाम डालें।'],
  invalid_age: ['Please enter a valid age.', 'सही उम्र डालें।'],
  village_required: ['Please enter a city or village.', 'अपना शहर / गाँव डालें।'],
  address_required: ['Please enter the complete address.', 'पूरा पता डालें।'],
  weak_password: ['Password must contain at least 6 characters.', 'पासवर्ड कम से कम 6 अक्षर का रखें।'],
  already_registered: ['This number is already registered. Please log in.', 'यह नंबर पहले से रजिस्टर्ड है। लॉगिन करें।'],
  invalid_login: ['The mobile number or password is incorrect.', 'मोबाइल नंबर या पासवर्ड गलत है।'],
  invalid_credentials: ['The username or password is incorrect.', 'गलत username या password।'],
  too_many_attempts: ['Too many attempts. Please try again later.', 'बहुत बार गलत कोशिश। थोड़ी देर बाद फिर से करें।'],
  not_registered: ['This number is not registered.', 'यह नंबर रजिस्टर्ड नहीं है।'],
  invalid_otp: ['The OTP is incorrect or expired.', 'OTP गलत या पुराना है।'],
  not_found: ['The requested record was not found.', 'मांगी गई जानकारी नहीं मिली।'],
  forbidden: ['You do not have permission to perform this action.', 'आपके पास इसकी अनुमति नहीं है।'],
  prescription_required: ['A prescription file is required.', 'पर्ची की फोटो ज़रूरी है।'],
  call_required: ['Please call the patient first.', 'पहले मरीज़ को कॉल करें।'],
  tests_required: ['Select at least one test.', 'कम से कम एक जांच चुनें।'],
  invalid_agent: ['The selected agent is not available.', 'चुना गया एजेंट उपलब्ध नहीं है।'],
  slot_required: ['Please select a pickup time.', 'Pickup समय चुनें।'],
  agent_busy: ['This agent is currently on another pickup.', 'यह एजेंट अभी दूसरे pickup पर है।'],
  not_editable: ['This order can no longer be edited.', 'यह ऑर्डर अब बदला नहीं जा सकता।'],
  sample_required: ['Please collect the sample first.', 'पहले sample लेना ज़रूरी है।'],
  cash_required: ['Please collect the cash first.', 'पहले cash लेना ज़रूरी है।'],
  report_required: ['A report file is required.', 'रिपोर्ट फाइल ज़रूरी है।'],
  token_required: ['A push token is required.', 'Push token ज़रूरी है।'],
  invalid_username: ['Username must contain at least 3 letters or numbers.', 'Username कम से कम 3 अक्षर का हो।'],
  invalid_role: ['Please select a role.', 'Role चुनें।'],
  username_taken: ['This username is already in use.', 'यह username पहले से मौजूद है।'],
  cannot_delete_admin: ['The admin account cannot be deleted.', 'एडमिन खाता नहीं हटाया जा सकता।'],
  staff_busy: ['This staff member still has active orders.', 'यह स्टाफ अभी सक्रिय ऑर्डर पर काम कर रहा है।'],
  invalid_amount: ['Please enter a valid rate.', 'सही रेट डालें।'],
  test_exists: ['This test already exists in the catalog.', 'यह जांच पहले से catalog में है।'],
  unsupported_file_type: ['This file type is not supported.', 'यह फाइल प्रकार स्वीकार नहीं है।'],
  LIMIT_FILE_SIZE: ['The selected file is too large.', 'चुनी गई फाइल बहुत बड़ी है।'],
  unknown_status: ['The selected status is invalid.', 'चुनी गई स्थिति सही नहीं है।'],
  already_in_status: ['This order is already in that status.', 'यह ऑर्डर पहले से इसी स्थिति में है।'],
  illegal_transition: ['This status change is not allowed.', 'यह स्थिति बदलने की अनुमति नहीं है।'],
  server_error: ['The server encountered a problem. Please try again later.', 'सर्वर में कुछ गड़बड़ है। थोड़ी देर बाद कोशिश करें।'],
};

export const errorMessage = (error: unknown): string => {
  const response = (error as { response?: { data?: { code?: string; message?: string } } }).response;
  const lang = typeof localStorage !== 'undefined' && localStorage.getItem('hd.admin.lang') === 'hi' ? 'hi' : 'en';
  const pair = response?.data?.code ? ERROR_COPY[response.data.code] : undefined;
  if (pair) return pair[lang === 'en' ? 0 : 1];

  const serverMessage = response?.data?.message;
  if (serverMessage && (lang === 'hi' || !/[\u0900-\u097F]/.test(serverMessage))) return serverMessage;
  return lang === 'en'
    ? 'Could not contact the server. Please try again.'
    : 'सर्वर से संपर्क नहीं हो पाया। फिर कोशिश करें।';
};

export type Person = {
  _id: string;
  name: string;
  username?: string;
  phone?: string;
  village?: string;
  address?: string;
  zone?: string;
  role?: string;
  active?: boolean;
  currentLoad?: number;

  // Agents only: out on a pickup right now, and which orders they are carrying.
  busy?: boolean;
  busyWith?: string[];

  createdAt?: string;
};

export type Order = {
  _id: string;
  orderId: string;
  status: string;
  tests: string[];
  amount: number;
  patient?: Person;
  assignedAgent?: Person;
  pro?: Person;
  pickupSlot?: string;
  labTube?: 'EDTA' | 'SST' | 'FLU';
  prescriptionUrl?: string;
  reportUrl?: string;
  cashTaken: boolean;
  createdAt: string;
};

export type Stats = {
  newPrescriptions: number;
  confirmed: number;
  inLab: number;
  reportsReady: number;
  cashCollected: number;
};

export type Page = { rows: Order[]; total: number; page: number; pages: number };

export type TestItem = {
  _id: string;
  name: string;
  category?: string;
  amount: number;
  isActive: boolean;
};

export type Overview = {
  days: number;
  trend: { date: string; orders: number; revenue: number }[];
  byStatus: Record<string, number>;
  byAgent: { name: string; zone?: string; pickups: number; collected: number }[];
  totalOrders: number;
  totalRevenue: number;
};
