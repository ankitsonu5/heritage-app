// Dashboard strings. English is the default; the top-bar toggle switches to Hindi
// and the choice is remembered.
//
// Notifications are NOT translated here — the server writes them in both languages
// when the event happens (see backend/src/notifications.js) and sends both, so the
// bell simply picks the one the reader is looking for.

import { createContext, useContext } from 'react';

export type Lang = 'en' | 'hi';

const copy: Record<string, [string, string]> = {
  // en, hi
  dashboard: ['Dashboard', 'डैशबोर्ड'],
  orders: ['Orders', 'ऑर्डर'],
  users: ['Users', 'मरीज़'],
  proTeam: ['PRO team', 'PRO टीम'],
  agents: ['Agents', 'एजेंट'],
  labTeam: ['Lab team', 'लैब टीम'],
  labQueue: ['Lab queue', 'लैब कतार'],
  history: ['History', 'पुराना काम'],
  labWorkspace: ['LAB workspace', 'लैब कार्यक्षेत्र'],
  staffDashboard: ['Admin / LAB dashboard · Varanasi', 'एडमिन / लैब डैशबोर्ड · वाराणसी'],
  selectRole: ['Select account role', 'खाते का रोल चुनें'],
  adminRole: ['Admin', 'एडमिन'],
  labRole: ['LAB', 'लैब'],
  collection: ['Collection', 'कलेक्शन'],
  logout: ['Log out', 'लॉग आउट'],

  todayOverview: ['Today’s overview', 'आज का overview'],
  live: ['Live', 'लाइव'],
  offline: ['Offline', 'ऑफ़लाइन'],
  notifications: ['Notifications', 'सूचनाएँ'],
  noNotifications: ['No notifications yet.', 'अभी कोई सूचना नहीं।'],
  allCaughtUp: ['All caught up.', 'सब देख लिया।'],
  markAllRead: ['Mark all read', 'सब पढ़ा हुआ करें'],
  showAll: ['See history', 'पुरानी देखें'],
  showNew: ['Only new', 'सिर्फ नई'],
  unread: ['new', 'नई'],

  statNew: ['New prescriptions', 'नई पर्चियाँ'],
  statConfirmed: ['Confirmed', 'Confirm हुए'],
  statInLab: ['Sample in lab', 'सैंपल लैब में'],
  statCash: ['Cash collection', 'कैश कलेक्शन'],

  all: ['All', 'सभी'],
  order: ['Order', 'ऑर्डर'],
  patient: ['Patient', 'मरीज़'],
  village: ['Village', 'गाँव / शहर'],
  tests: ['Tests', 'जांच'],
  amount: ['Amount', 'राशि'],
  agent: ['Agent', 'एजेंट'],
  slot: ['Slot', 'समय'],
  status: ['Status', 'स्थिति'],
  files: ['Files', 'फाइलें'],
  prescription: ['Prescription', 'पर्ची'],
  report: ['Report', 'रिपोर्ट'],
  tube: ['Tube', 'ट्यूब'],
  confirmReceived: ['Confirm sample received', 'सैंपल मिला कन्फर्म करें'],
  selectPdf: ['Select report PDF', 'रिपोर्ट PDF चुनें'],
  uploadReport: ['Upload and send report', 'रिपोर्ट अपलोड करके भेजें'],
  noLabSamples: ['No samples waiting in LAB', 'लैब में कोई सैंपल बाकी नहीं है'],
  noHistory: ['No completed work yet', 'अभी कोई पूरा हुआ काम नहीं है'],
  sampleReceivedSuccess: ['Sample marked as received.', 'सैंपल मिला हुआ दर्ज हो गया।'],
  reportUploadedSuccess: ['Report uploaded and sent to the patient.', 'रिपोर्ट अपलोड होकर मरीज को भेज दी गई।'],
  confirmLabReceive: ['Confirm that sample %s has reached the LAB?', 'क्या सैंपल %s लैब में मिल गया है?'],
  confirmReportUpload: ['Upload and send this report to %s?', 'क्या यह रिपोर्ट %s को भेजनी है?'],
  pdfOnly: ['Please select a PDF report.', 'कृपया PDF रिपोर्ट चुनें।'],
  noOrders: ['No orders yet', 'अभी कोई ऑर्डर नहीं'],
  noPatients: ['No patients yet', 'अभी कोई मरीज़ नहीं'],
  noStaff: ['No accounts yet', 'अभी कोई खाता नहीं'],

  name: ['Name', 'नाम'],
  username: ['Username', 'Username'],
  phone: ['Phone', 'फ़ोन'],
  zone: ['Zone', 'ज़ोन'],
  password: ['Password', 'पासवर्ड'],
  address: ['Address', 'पता'],
  joined: ['Joined', 'जुड़े'],
  active: ['Active', 'सक्रिय'],
  disabled: ['Disabled', 'बंद'],
  busy: ['On a pickup', 'पिकअप पर'],
  free: ['Free', 'खाली'],

  newAccount: ['New %s account', 'नया %s खाता'],
  addAccount: ['+ New %s account', '+ नया %s खाता'],
  create: ['Create account', 'खाता बनाएं'],
  cancel: ['Cancel', 'रद्द'],
  disable: ['Disable', 'बंद करें'],
  enable: ['Enable', 'चालू करें'],
  minChars: ['At least 6 characters', 'कम से कम 6 अक्षर'],
  invalidPhone: ['Enter a valid 10-digit mobile number', 'सही 10 अंकों का मोबाइल नंबर डालें'],

  confirmLogout: ['Log out of the dashboard?', 'लॉग आउट करना चाहते हैं?'],
  confirmDisable: ['Disable %s’s login?', '%s का लॉगिन बंद कर दें?'],
  confirmEnable: ['Enable %s’s login again?', '%s का लॉगिन फिर चालू करें?'],
  created: ['%s’s account is ready. Username: %s', '%s का खाता बन गया। Username: %s'],

  ordersTrend: ['Orders — last %s days', 'ऑर्डर — पिछले %s दिन'],
  totalOrders: ['%s orders', 'कुल %s ऑर्डर'],
  pipeline: ['Pipeline', 'पाइपलाइन'],
  agentCollection: ['Agent collection', 'एजेंट कलेक्शन'],
  noAgentOrders: ['No agent has been given an order yet.', 'अभी किसी एजेंट को ऑर्डर नहीं मिला।'],
  pickups: ['%s pickups', '%s पिकअप'],
  seeTable: ['See the data as a table', 'डेटा टेबल में देखें'],
  testCatalog: ['Test Catalog', 'जांच सूची'],
  addTest: ['+ Add test', '+ जांच जोड़ें'],
  newTest: ['New test', 'नई जांच'],
  testName: ['Test name', 'जांच का नाम'],
  category: ['Category', 'श्रेणी'],
  noTests: ['No tests yet — add your first one', 'अभी कोई जांच नहीं — पहली जोड़ें'],
  searchTests: ['Search test name or category', 'जांच का नाम या श्रेणी खोजें'],
  testsFound: ['%s tests found', '%s जांच मिलीं'],
  noMatchingTests: ['No matching tests found', 'कोई मिलती हुई जांच नहीं मिली'],
  refineTestSearch: ['Showing first %s of %s — type more to narrow the list.', 'पहली %s / %s जांच दिख रही हैं — सूची छोटी करने के लिए और लिखें।'],
  testAdded: ['“%s” was added to the test catalog.', '“%s” टेस्ट कैटलॉग में जोड़ दिया गया।'],
  testUpdated: ['Test name and rate updated.', 'जांच का नाम और रेट अपडेट हो गया।'],
  testNameReq: ['Enter a test name', 'जांच का नाम डालें'],
  testRateReq: ['Enter a valid rate', 'सही रेट डालें'],
  uploadCsv: ['Upload test CSV', 'टेस्ट CSV अपलोड करें'],
  chooseCsv: ['Choose CSV file', 'CSV फाइल चुनें'],
  downloadTemplate: ['Download template', 'टेम्पलेट डाउनलोड करें'],
  importCsv: ['Import CSV', 'CSV इम्पोर्ट करें'],
  importCount: ['Import %s tests', '%s जांच इम्पोर्ट करें'],
  csvFormat: ['Columns: test_name, category, amount (maximum 500 rows)', 'कॉलम: test_name, category, amount (अधिकतम 500 पंक्तियां)'],
  csvInvalid: ['Use a valid CSV with test_name, category and amount columns.', 'test_name, category और amount कॉलम वाली सही CSV चुनें।'],
  csvImported: ['CSV imported: %s new, %s updated.', 'CSV इम्पोर्ट हुई: %s नई, %s अपडेट।'],
  confirmDisableTest: ['Disable “%s”? It stays on old orders.', '“%s” बंद करें? पुराने ऑर्डर पर बनी रहेगी।'],
  edit: ['Edit', 'बदलें'],
  save: ['Save', 'सेव'],
  delete: ['Delete', 'हटाएं'],
  archive: ['Archive', 'आर्काइव करें'],
  action: ['Action', 'एक्शन'],
  confirmDeleteUser: ['Archive “%s”? They will disappear from Users and can no longer log in. Orders and reports remain in the database.', '“%s” को archive करें? वे Users सूची से हट जाएंगे और लॉगिन नहीं कर पाएंगे। ऑर्डर और रिपोर्ट database में रहेंगे।'],
  userDeleted: ['User archived; %s linked orders were kept.', 'यूज़र archive हुआ; उससे जुड़े %s ऑर्डर सुरक्षित रखे गए।'],
  confirmDeleteStaff: ['Delete “%s” permanently? Past orders will no longer show their name. Use Disable to keep it.', '“%s” को हमेशा के लिए हटाएं? पुराने ऑर्डर पर इनका नाम नहीं दिखेगा। नाम रखना है तो Disable करें।'],
  staffDeleted: ['Account deleted', 'खाता हटाया गया'],
  newPasswordOptional: ['New password (optional)', 'नया पासवर्ड (ज़रूरी नहीं)'],
  noData: ['No orders yet', 'अभी कोई ऑर्डर नहीं'],
  date: ['Date', 'तारीख'],

  page: ['Page %s of %s · %s orders', 'पेज %s / %s · %s ऑर्डर'],
  prev: ['‹ Prev', '‹ पिछला'],
  next: ['Next ›', 'अगला ›'],
  pageOf: ['Page %s of %s · %s total', 'पेज %s / %s · कुल %s'],
  periodAll: ['All', 'सभी'],
  periodToday: ['Today', 'आज'],
  periodWeek: ['This week', 'इस हफ़्ते'],
  periodMonth: ['This month', 'इस महीने'],
  periodYear: ['This year', 'इस साल'],
  periodCustom: ['Custom', 'Custom'],
  showing: ['%s found', '%s मिले'],
  fromDate: ['From', 'से'],
  toDate: ['To', 'तक'],
  apply: ['Apply', 'लागू करें'],
  statusAll: ['Showing all data', 'सभी डेटा दिखाया जा रहा है'],
  statusToday: ['Showing today’s data', 'आज का डेटा दिखाया जा रहा है'],
  statusWeek: ['Showing this week’s data', 'इस हफ़्ते का डेटा दिखाया जा रहा है'],
  statusMonth: ['Showing this month’s data', 'इस महीने का डेटा दिखाया जा रहा है'],
  statusYear: ['Showing %s data', 'साल %s का डेटा दिखाया जा रहा है'],
  statusCustom: ['Showing data for the selected dates', 'चुनी हुई तारीखों का डेटा दिखाया जा रहा है'],
  statusPickDates: ['Pick a date range', 'तारीख़ चुनें'],
  retry: ['Retry', 'फिर कोशिश करें'],
  loadFailed: ['Could not load.', 'जानकारी नहीं आ सकी।'],
  adminOnly: ['This dashboard is for admins only.', 'यह डैशबोर्ड सिर्फ admin के लिए है।'],
  dashboardOnly: ['This web dashboard is available only to Admin and LAB accounts.', 'यह वेब डैशबोर्ड केवल Admin और LAB खातों के लिए है।'],
  roleMismatch: ['These credentials do not belong to the selected %s role.', 'यह लॉगिन चुने हुए %s रोल का नहीं है।'],
  login: ['Login', 'लॉगिन'],
  adminDashboard: ['Admin dashboard · Varanasi', 'एडमिन डैशबोर्ड · वाराणसी'],
};

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function useLang() {
  const { lang, setLang } = useContext(LangContext);

  // t('addAccount', 'PRO') fills the %s placeholders in order.
  const t = (key: string, ...args: (string | number)[]) => {
    const pair = copy[key];
    if (!pair) return key;
    let text = pair[lang === 'en' ? 0 : 1];
    for (const arg of args) text = text.replace('%s', String(arg));
    return text;
  };

  return { lang, setLang, t };
}
