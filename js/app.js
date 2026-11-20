'use strict';

/* ==================== Telegram WebApp ==================== */
const tg = (window.Telegram && window.Telegram.WebApp) || null;
if (tg) {
  try { tg.ready(); tg.expand(); } catch (e) {}
  try { tg.setHeaderColor && tg.setHeaderColor('secondary_bg_color'); } catch (e) {}
  try { tg.setHeaderTitle && tg.setHeaderTitle('English Teacher'); } catch (e) {}
}
const tgUser = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;

/* ==================== Yordamchi funksiyalar ==================== */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

const store = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { warnStorageFull(); return false; }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
};

/* localStorage to'lganda jimgina ma'lumot yo'qotmaslik uchun ogohlantirish */
let _storageWarned = false;
function warnStorageFull() {
  if (_storageWarned) return;
  _storageWarned = true;
  if (window.console) console.warn('[store] localStorage toldi - malumot saqlanmadi');
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = "Xotira to'ldi: ma'lumot saqlanmadi. Iltimos, zaxira oling va eski ma'lumotlarni tozalang.";
  el.className = 'toast show error';
  setTimeout(function () { el.className = 'toast'; }, 6000);
}

const TEACHER_LOGIN = 'm_amirov';
const TEACHER_PASSWORD = '123';
const TEACHER_NAME = 'Muzaffar Amirov';

const K = {
  accounts: 'et_accounts',
  session: 'et_session',
  groups: 'et_groups',
  students: 'et_students',
  grades: 'et_grades',
  attendance: 'et_attendance',
  speaking: 'et_speaking',
  messages: 'et_messages',
  chatSeen: 'et_chat_seen',
  homework: 'et_homework',
  homeworkDone: 'et_hw_done',
  payments: 'et_payments',
  monthlyFees: 'et_monthly_fees',
  loginFails: 'et_login_fails',
  speakLog: 'et_speak_log',
  tgsubs: 'et_tg_subs',
  sessionId: 'et_session_id',
  cardSettings: 'et_card_settings',
  paymentReceipts: 'et_payment_receipts',
  homeworkSubmissions: 'et_hw_submissions',
  hwCommentsSeen: 'et_hw_comments_seen',
  mock: 'et_mock_results',
  mocks: 'et_mock_defs',
  support: 'et_support_teachers'
};

/* Toza start: demo guruh/o'quvchi seedlari YO'Q — barcha ma'lumot Supabase'dan keladi.
   Kalitlar bo'sh bo'lsa getterlar [] bilan ishlaydi (getGroups/getStudents/...). */

/* XAVFSIZLIK: Parollar va hisoblar ro'yxati localStorage'da ASLO saqlanmaydi */
store.del('et_accounts');
store.del('et_users');
let accounts = {};
function initAccountsMemory() {
  accounts = {};
  accounts[TEACHER_LOGIN] = { login: TEACHER_LOGIN, role: 'teacher', name: TEACHER_NAME, studentId: null };
}
initAccountsMemory();
function persistAccounts() { store.del(K.accounts); store.del('et_accounts'); }

/* ==================== XAVFSIZLIK: SHA-256 PAROL XESHLASH ==================== */
/* Brauzerning standart Web Crypto API'si bilan xeshlash (async) */
async function hashPassword(plainText) {
  const enc = new TextEncoder();
  const data = enc.encode(String(plainText == null ? '' : plainText).trim());
  if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Hex(String(plainText == null ? '' : plainText).trim());
}
/* Sinxron SHA-256 — Web Crypto yo'q muhit va sinxron login tekshiruvi uchun */
function sha256Hex(input) {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const msg = unescape(encodeURIComponent(String(input == null ? '' : input)));
  const bytes = [];
  for (let i = 0; i < msg.length; i++) bytes.push(msg.charCodeAt(i) & 0xff);
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = (bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rr(w[t - 15], 7) ^ rr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rr(w[t - 2], 17) ^ rr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => ((x >>> 0).toString(16).padStart(8, '0'))).join('');
}
function hashPasswordSync(plainText) { return sha256Hex(String(plainText == null ? '' : plainText).trim()); }
function isSha256Hex(v) { return /^[0-9a-f]{64}$/.test(String(v == null ? '' : v)); }
/* Eski ochiq parollar ham qabul qilinadi (orqaga moslik) — yangi parollar faqat xesh */
function passwordMatches(input, stored) {
  const s = String(stored == null ? '' : stored);
  if (!s) return false;
  if (isSha256Hex(s)) return sha256Hex(String(input == null ? '' : input).trim()) === s;
  return s === String(input == null ? '' : input);
}

const state = {
  screen: 'login',
  filterClass: 'Barchasi',
  filterGroup: null,
  hwGroup: null,
  filterHwAllow: false,
  groupTypeFilter: 'all',
  search: '',
  toastTimer: null,
  editor: null,
  gradeGroup: '',
  gradeClass: 'Barchasi',
  gradeDate: '',
  weekOffset: 0,
  attGroup: '',
  attDate: '',
  attDraft: null,
  attDraftFor: '',
  speakDate: '',
  slotMode: 'create',
  slotId: '',
  chatSid: null,
  chatEditId: null,
  chatDelId: null,
  hwFocus: '',
  classHint: false,
  loginTimer: null,
  loginError: '',
  hwNewFiles: [],
  hwAttachments: [],
  payMonth: '',
  captcha: null,
  turnstileToken: '',
  pending2fa: null,
  subGroup: 'all',
  subScroll: 0,
  subEditId: null,
  subDelId: null,
  studentView: '',
  groupDetail: '',
  webSpeakingBusy: {},
  resetCtx: null,
  authStep: 'landing',
  resetMode: 'password',
  resetContact: '',
  resetDone: '',
  recoverCaptcha: null,
  mockRun: null,
  mockResultId: '',
  mockTab: 'reading',
  mockOpen: {},
  mockTOpen: {},
  mockBuilder: null,
  mockBStep: 'text',
  mockAssignId: '',
  mockAssignDraft: [],
  mockDelId: '',
  mockDelResultId: '',
  mockCatView: '',
  mockRole: '',
  supervise: false,
  supportEditId: '',
  supportDelId: ''
};

const AUTH_SCREENS = ['login'];
/* Faqat ustoz ruxsat beradigan ekranlar */
const TEACHER_SCREENS = ['groups', 'students', 'homework', 'submissions', 'debtors', 'payments', 'grades', 'attendance', 'speaking', 'mock', 'support'];


function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---- Ma'lumot o'uvchilari ---- */
function getGroups() { return store.get(K.groups, []); }

/* ---- Ma'lumotlarni normallashtirish ---- */
function normalizeStudents(list){
  const arr = Array.isArray(list)? list:[];
  return arr.map(st=>{
    const out={...st};
    delete out.password;
    delete out.password_hash;
    if(out.speakingDebt==null) out.speakingDebt=0;
    if(out.paymentDebt==null) out.paymentDebt=0;
    if(!Array.isArray(out.audioSubmissions)) out.audioSubmissions=[];
    return out;
  });
}
function getStudents() {
  const raw = store.get(K.students, []);
  const normed = normalizeStudents(raw);
  // sync back if changed
  const changed = JSON.stringify(raw)!==JSON.stringify(normed);
  if(changed) store.set(K.students,normed);
  return normed;
}

function getGrades() { return store.get(K.grades, {}); }
function getAttendance() { return store.get(K.attendance, {}) || {}; }
function getSpeaking() { return store.get(K.speaking, []) || []; }
function getHomework() { return store.get(K.homework, []) || []; }
function getPayments() { return store.get(K.payments, []) || []; }
function getMonthlyFees() { return store.get(K.monthlyFees, []) || []; }
function getTgSubs() { return store.get(K.tgsubs, []) || []; }
function studentById(id) { return getStudents().filter(s => s.id === id)[0] || null; }
function groupById(id) { return getGroups().filter(g => g.id === id)[0] || null; }

/* O'quvchining logini: avval o'quvchi qatoridan (students.login), keyin xotiradagi hisobdan */
function loginOfStudent(sid, st) {
  const s = st || studentById(sid);
  if (!s) return '';
  if (s.login) return String(s.login);
  const acc = Object.keys(accounts).map(function (k) { return accounts[k]; })
    .filter(function (a) { return a.studentId === s.id; })[0];
  return acc && acc.login ? String(acc.login) : '';
}
/* Login bandligi: xotiradagi hisoblar + o'quvchi qatorlaridagi loginlar bo'yicha */
function loginTaken(login, exceptSid) {
  const l = String(login == null ? '' : login).trim().toLowerCase();
  if (!l) return false;
  if (accounts[l] && accounts[l].studentId !== exceptSid) return true;
  return getStudents().some(function (s) {
    return String(s.login || '').toLowerCase() === l && s.id !== exceptSid;
  });
}

/* ---- Sana yordamchilari ---- */
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function todayKey() { return dateKey(new Date()); }
function fmtDM(iso) { const p = String(iso).split('-'); return p[2] + '.' + p[1]; }
function fmtDMY(iso) { const p = String(iso).split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }

function lessonDates(groupId, count) {
  const g = groupById(groupId);
  if (!g) return [];
  const names = String(g.days).split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean); /* "Dushanba 09:15" → kun nomi */
  const jsDays = names
    .map(n => APP_DATA.days.indexOf(n))
    .filter(i => i >= 0)
    .map(i => (i + 1) % 7); /* APP_DATA.days[0] = Dushanba → getDay() === 1 */

  const out = [];
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard++ < 400) {
    if (jsDays.indexOf(cur.getDay()) >= 0) out.push(dateKey(cur));
    cur.setDate(cur.getDate() - 1);
  }
  return out.reverse();
}

/* Jurnal ustunlari = dars sanalari + baho olgan sanalar (speaking sync uchun) */
function journalDates(groupId, count) {
  const set = {};
  lessonDates(groupId, count).forEach(d => { set[d] = 1; });
  getStudents().filter(s => s.groupId === groupId).forEach(s => {
    Object.keys(getGrades()[s.id] || {}).forEach(d => { set[d] = 1; });
  });
  return Object.keys(set).sort().slice(-count);
}

/* ---- Hafta navigatsiyasi: Dushanba–Yakshanba oralig'idagi dars sanalari ---- */
const UZ_MONTHS_SHORT = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
function weekMonday(offset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); /* 0=Yak, 1=Dush... */
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + toMonday + (offset || 0) * 7);
  return mon;
}
function weekDates(groupId, offset) {
  const g = groupById(groupId);
  if (!g) return [];
  const names = String(g.days).split(',').map(x => x.trim().split(/\s+/)[0]).filter(Boolean);
  const jsDays = names
    .map(n => APP_DATA.days.indexOf(n))
    .filter(i => i >= 0)
    .map(i => (i + 1) % 7);
  const mon = weekMonday(offset);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    if (jsDays.indexOf(d.getDay()) >= 0) out.push(dateKey(d));
  }
  return out;
}
function weekLabel(offset) {
  const mon = weekMonday(offset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return mon.getDate() + '-' + UZ_MONTHS_SHORT[mon.getMonth()] + ' \u2014 ' +
         sun.getDate() + '-' + UZ_MONTHS_SHORT[sun.getMonth()] + ', ' + sun.getFullYear();
}

/* ---- Baholar hisobi ---- */
function gradeClassOf(v) {
  /* Neytral 10-ballik: rang ierarxiyasi yo'q — toza, minimalistik ko'rinish */
  return v == null ? 'g-empty' : 'g-num';
}
function scoresFor(sid, dates) {
  const rec = getGrades()[sid] || {};
  return dates.map(d => rec[d]).filter(Boolean).map(r => r.score);
}
function avgOf(nums) {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
function totalOf(nums) { return nums.reduce((a, b) => a + b, 0); }
function fmtAvg(v) { return v == null ? '—' : v.toFixed(1); }

/* ==================== CLOUD SYNC (Supabase — real jadvallar) ==================== */
/* TEACHER_LOGIN, TEACHER_PASSWORD, TEACHER_NAME yuqoriga ko'chirildi */

/* ==================== Cloudflare R2: fayl yuklash ==================== */
/* R2/worker endpointi. Custom domenga o'tish uchun faqat shu qatorni o'zgartiring
   (masalan 'https://api.teachermuzaffar.uz') — TURNSTILE_VERIFY_URL ham shundan hosil bo'ladi. */
const R2_UPLOAD_URL = 'https://teachermuzaffar-upload.amirovmuzaffar070.workers.dev';
const R2_PUBLIC_BASE = 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/';
const SPEAKING_BOT_URL = 'https://t.me/uzbekspeakingcheckbot';
function isR2Url(url) {
  return String(url || '').indexOf(R2_PUBLIC_BASE) === 0;
}
/* Har qanday fayl (rasm, video, audio, Word/PDF/Excel, chek) R2'ga yuboriladi.
   FormData Content-Type'ni o'zi qo'yadi — qo'lda header yozilmaydi. */
async function uploadFileToR2(file, folderPath) {
  if (!file) throw new Error('Fayl tanlanmagan');
  const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  const dir = String(folderPath || 'uploads').replace(/^\/+|\/+$/g, '');
  const path = dir + '/' + Date.now() + '_' + safeName;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('path', path);
  let res;
  try {
    res = await fetch(R2_UPLOAD_URL, { method: 'POST', body: fd });
  } catch (e) {
    throw new Error('R2 yuklashda tarmoq xatosi: ' + ((e && e.message) || 'Failed to fetch'));
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  const url = data && data.url ? String(data.url) : '';
  if (!res || !res.ok || !data || !data.ok || !url) {
    const detail = (data && (data.error || data.message)) || ('HTTP ' + ((res && res.status) || '?'));
    throw new Error('R2 yuklash xatosi: ' + detail);
  }
  return { url: url, path: path, bucket: 'r2', name: safeName };
}

/* R2'dagi faylni o'chiradi. Har qanday xato yutiladi — fayl o'chmasa ham
   asosiy amal (vazifa/topshiriq/chek o'chirish) davom etadi. */
async function deleteFileFromR2(fileUrl) {
  const url = String(fileUrl || '');
  if (!isR2Url(url)) return false;
  const key = decodeURIComponent(url.slice(R2_PUBLIC_BASE.length).split('?')[0]);
  if (!key) return false;
  try {
    const res = await fetch(R2_UPLOAD_URL + '?path=' + encodeURIComponent(key), { method: 'DELETE' });
    if (!res || !res.ok) {
      console.warn('[r2] delete:', key, (res && res.status) || '');
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[r2] delete:', key, (e && e.message) || e);
    return false;
  }
}

/* Speaking topshirig'ining manbasi: sayt (R2 havolasi bor) yoki Telegram bot (telegram_file_id).
   Sayt topshiriqlari faqat saytdagi ustoz inboxiga, bot topshiriqlari faqat botga boradi.
   media_url ustuni bo'lmagan eski bazada havola telegram_file_id ichida saqlanadi. */
function speakingExtrasOf(row) {
  const r = row || {};
  const fid = String(r.telegram_file_id || '');
  const url = r.media_url || (/^https?:\/\//i.test(fid) ? fid : '');
  return {
    mediaUrl: url,
    source: url ? 'web' : 'telegram',
    durationSec: r.duration_sec == null ? null : Number(r.duration_sec),
    lookAwayCount: r.look_away_count == null ? null : Number(r.look_away_count),
    eyeContactPercent: r.eye_contact_percent == null ? null : Number(r.eye_contact_percent)
  };
}
function isWebSubmission(x) { return !!(x && (x.source === 'web' || x.mediaUrl)); }

const CloudSync = (function () {
  const url = window.SUPABASE_URL || 'https://mvjoeqyqaylfccqcnwwe.supabase.co';
  const key = window.SUPABASE_ANON_KEY || 'sb_publishable_PHMC_kfQfu5BLFgDOzHsjw_B0VO2xDI';
  let client = null;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try { client = window.supabase.createClient(url, key); } catch (e) { client = null; }
  }

  const ready = function () { return !!client; };
  /* PGRST205/404 — jadval hali yaratilmagan: lokal rejimda davom etamiz */
  const missing = function (e) {
    return !!e && (e.code === 'PGRST205' || /could not find the table|does not exist/i.test(String(e.message || '')));
  };
  /* Eski bazada yangi ustun hali yo'q: PGRST204 / 42703.
     Bunday holatda aniq ustunlar ro'yxati o'rniga '*' bilan qayta o'qiymiz. */
  const missingColumn = function (e) {
    if (!e) return false;
    const code = String(e.code || '');
    const msg = String(e.message || e.details || '');
    return code === 'PGRST204' || code === '42703' ||
      /could not find the '.*' column|column .* does not exist|undefined column/i.test(msg);
  };
  let hasMessages = true;
  let hasAudio = true;
  let subscribed = false;
  let notifSubscribed = false;
  /* Bildirishnoma yozadigan jadvallar */
  const NOTIFY_TABLES = ['grades', 'homework', 'students', 'messages', 'speaking_submissions'];
  const gradeTimers = {};

  function bg(p, tag) {
    Promise.resolve(p).catch(function (e) { console.warn('[cloud] ' + tag + ':', (e && e.message) || e); });
  }
  const dbOfSid = function (sid) { const s = studentById(sid); return s && s.dbId != null ? s.dbId : null; };
  const accOfSid = function (sid) {
    return Object.keys(accounts).map(function (k) { return accounts[k]; }).filter(function (a) { return a.studentId === sid; })[0] || null;
  };

  /* Yangi yozuvning bulutdagi id'sini kafolatlaymiz (poyga holatini yopadi) */
  async function ensureDbId(sid) {
    let st = studentById(sid);
    if (!st) return null;
    if (st.dbId == null) {
      await pushStudent(sid);
      st = studentById(sid);
    }
    return st && st.dbId != null ? st.dbId : null;
  }

  /* O'quvchi sinxronlashida ishlatiladigan aniq ustunlar ro'yxati.
     web_speaking_allowed har bir select'da ochiq ko'rsatiladi — '*'ga tayanmaymiz. */
  const STUDENT_SYNC_COLS = 'id, name, school_class, group_id, login, speaking_debt, payment_debt, ' +
    'fee_period, telegram_chat_id, voice_allowed, web_speaking_allowed, homework_upload_allowed, ' +
    'last_device, last_seen, last_payment_info, last_paid_month, phone, email, email_verified';

  /* Toggle bosilganda ustun darhol yoziladi. Guard shu vaqt ichida eski pull
     javobi yangi qiymatni bosib ketishining oldini oladi. */
  const webSpeakingGuard = {};
  const WEB_SPEAK_GUARD_MS = 8000;
  function webSpeakingGuardValue(dbId) {
    if (dbId == null) return null;
    const g = webSpeakingGuard[dbId];
    if (!g) return null;
    if (g.pending || g.until > Date.now()) return g.value;
    delete webSpeakingGuard[dbId];
    return null;
  }
  function webSpeakingForWrite(dbId, fallback) {
    const g = webSpeakingGuardValue(dbId);
    return g == null ? fallback === true : g;
  }
  function webSpeakingFromRow(row, fallback) {
    if (!row) return fallback === true;
    const g = webSpeakingGuardValue(row.id);
    if (g != null) return g;
    if (typeof row.web_speaking_allowed !== 'undefined') return row.web_speaking_allowed === true;
    return fallback === true;
  }
  function noteWebSpeaking(dbId, value) {
    if (dbId == null) return;
    const g = webSpeakingGuard[dbId];
    if (g && g.pending) return;
    webSpeakingGuard[dbId] = { value: value === true, until: Date.now() + WEB_SPEAK_GUARD_MS };
  }

  /* Aniq ustunlar ro'yxati bilan o'qish; eski sxemada ustun yo'q bo'lsa
     login/pullAll buzilmasligi uchun '*'ga xavfsiz qaytamiz. */
  async function selectStudentRows(columns, filter) {
    const read = function (cols) {
      let q = client.from('students').select(cols);
      if (typeof filter === 'function') q = filter(q);
      return q;
    };
    let res = await read(columns);
    if (res && res.error && missingColumn(res.error)) {
      console.warn('[cloud] students select fallback:', (res.error && res.error.message) || res.error);
      res = await read('*');
    }
    return res;
  }

  function payloadOf(s) {
    const g = groupById(s.groupId);
    const acc = accOfSid(s.id) || {};
    const out = {
      name: s.fullName,
      school_class: s.schoolClass,
      group_id: g && g.dbId != null ? g.dbId : null,
      login: acc.login || s.login || '',
      speaking_debt: Number(s.speakingDebt) || 0,
      payment_debt: Number(s.paymentDebt) || 0,
      fee_period: s.feePeriod || null,
      last_payment_info: s.lastPaymentInfo || null,
      last_paid_month: s.lastPaidMonth || null,
      voice_allowed: s.voiceAllowed === true,
      web_speaking_allowed: webSpeakingForWrite(s.dbId, s.webSpeakingAllowed),
      homework_upload_allowed: s.homeworkUploadAllowed === true
    };
    /* Kontaktlar ham faqat mavjud bo'lsa yoziladi — eski qiymat o'chmasin */
    if (s.phone) out.phone = String(s.phone);
    if (s.email) out.email = String(s.email);
    /* Parol faqat ma'lum bo'lganda yoziladi: bo'sh satr bazadagi mavjud
       parolni o'chirib yubormasligi kerak (ism/sinf/guruh tahririda). */
    const pw = acc.password || s.password || '';
    if (pw) out.password = pw;
    return out;
  }

  /* --- Xabarlar (messages jadvali) --- */
  async function fetchMessages(sid) {
    if (!ready() || !hasMessages) return false;
    try {
      let query = client.from('messages').select('id, student_id, sender, text, created_at').order('created_at', { ascending: true });
      if (sid != null) {
        const dbId = dbOfSid(sid);
        if (dbId == null) return false;
        query = query.eq('student_id', dbId);
      }
      const res = await query;
      if (res.error) { if (missing(res.error)) hasMessages = false; return false; }
      /* Ilova paydo bo'lganda DB qatorlari keshga qayta qo'shilmasin —
         aks holda har bir realtime yangilanishda xabarlar dublikatlanadi. */
      const cache = store.get(K.messages, []).filter(function (m) {
        if (sid != null) {
          if (m.sid !== sid) return false;
          return !(m.id && String(m.id).charAt(0) === 'm');
        }
        /* Umumiy yuklashda bulutga yozilmagan lokal xabarlar saqlanadi */
        return !!(m.id && String(m.id).charAt(0) === 'l');
      });
      res.data.forEach(function (r) {
        cache.push({
          id: 'm' + r.id,
          sid: sid == null ? 's' + r.student_id : sid,
          sender: r.sender,
          text: r.text,
          createdAt: r.created_at,
          editedAt: r.edited_at || ''
        });
      });
      store.set(K.messages, cache);
      return true;
    } catch (e) { return false; }
  }

  /* --- Uyga vazifalar (homework jadvali; yo'q bo'lsa lokal qoladi) --- */
  let hasHomework = true;
  async function pullHomework() {
    if (!ready() || !hasHomework) return;
    let q = client.from('homework').select('*').order('created_at', { ascending: false });
    const cu = currentUser();
    const own = cu && cu.role === 'student' ? studentById(cu.studentId) : null;
    if (own) {
      const g = groupById(own.groupId);
      if (!g || g.dbId == null) { store.set(K.homework, []); return; }
      q = q.eq('group_id', g.dbId);
    }
    const res = await q;
    if (res.error) {
      if (missing(res.error)) hasHomework = false;
      return;
    }
    const list = res.data.map(function (r) {
      return {
        id: 'h' + r.id,
        dbId: r.id,
        groupId: r.group_id != null ? 'g' + r.group_id : null,
        title: r.title || '',
        description: r.description || '',
        dueDate: r.due_date || '',
        mediaUrl: r.media_url || '',
        mediaType: r.media_type || '',
        attachments: parseAttachments(r.attachments),
        createdAt: r.created_at || ''
      };
    });
    /* bulutga hali yozilmagan lokal vazifalar saqlanadi */
    getHomework().forEach(function (h) { if (h.dbId == null) list.push(h); });
    store.set(K.homework, list);
  }

  async function pushHomework(hw) {
    if (!ready() || !hasHomework) return;
    try {
      let g = groupById(hw.groupId);
      if (g && g.dbId == null) await pushGroup(g);
      g = groupById(hw.groupId);
      const base = {
        group_id: g && g.dbId != null ? g.dbId : null,
        title: hw.title,
        description: hw.description || '',
        due_date: hw.dueDate || null,
        media_url: hw.mediaUrl || null,
        media_type: hw.mediaType || null
      };
      if (base.group_id == null) return;
      const payload = Object.assign({ attachments: hwAttachments(hw) }, base);
      const run = async (p) => (hw.dbId == null)
        ? client.from('homework').insert(p).select()
        : client.from('homework').update(p).eq('id', hw.dbId);
      let res = await run(payload);
      if (res.error && /attachments|schema cache|column/i.test(String(res.error.message || ''))) {
        res = await run(base); /* eski sxema: attachments ustuni yo'q */
      }
      if (res.error) throw res.error;
      if (hw.dbId == null) hw.dbId = res.data[0].id;
      const list = getHomework();
      const t = list.filter(function (x) { return x.id === hw.id; })[0];
      if (t) { t.dbId = hw.dbId; store.set(K.homework, list); }
    } catch (e) {
      if (e && (e.code === 'PGRST205' || /homework/.test(String(e.message || '')) && /schema cache|does not exist/.test(String(e.message || '')))) hasHomework = false;
      console.warn('[cloud] homework:', (e && e.message) || e);
    }
  }

  /* --- Telegram speaking topshiriklari (speaking_submissions) --- */
  let hasTg = true;
  async function pullSpeaking() {
    if (!ready() || !hasTg) return;
    let q = client.from('speaking_submissions').select('*').order('created_at', { ascending: true });
    const cu = currentUser();
    const own = cu && cu.role === 'student' ? studentById(cu.studentId) : null;
    if (own) {
      if (own.dbId == null) return;
      q = q.eq('student_id', own.dbId);
    }
    const res = await q;
    if (res.error) {
      if (missing(res.error)) hasTg = false;
      return;
    }
    const list = res.data.map(function (r) {
      return {
        id: 't' + r.id,
        dbId: r.id,
        sid: 's' + r.student_id,
        mediaType: r.media_type || 'voice',
        status: r.status || 'kutilmoqda',
        score: r.score == null ? null : Number(r.score),
        feedback: r.feedback || '',
        createdAt: r.created_at || '',
        ...speakingExtrasOf(r)
      };
    }).filter(function (x) { return x.sid !== 'snull'; });
    store.set(K.tgsubs, list);
  }

  /* Brauzerda yozilgan krujok video → speaking_submissions (R2 havolasi bilan) */
  async function submitSpeakingVideo(opts) {
    const p = opts || {};
    if (!ready() || !hasTg || p.studentDbId == null) return null;
    const base = {
      student_id: p.studentDbId,
      media_type: 'video',
      telegram_file_id: String(p.mediaUrl || 'web'),
      status: 'kutilmoqda'
    };
    const extra = {
      media_url: p.mediaUrl || null,
      duration_sec: p.durationSec == null ? null : Number(p.durationSec),
      look_away_count: p.lookAwayCount == null ? null : Number(p.lookAwayCount),
      eye_contact_percent: p.eyeContactPercent == null ? null : Number(p.eyeContactPercent)
    };
    let res = await client.from('speaking_submissions').insert(Object.assign({}, base, extra)).select();
    if (res.error && res.error.code === 'PGRST204') {
      /* Yangi ustunlar hali qo'shilmagan bo'lsa — minimal maydonlar bilan */
      res = await client.from('speaking_submissions').insert(base).select();
    }
    if (res.error) {
      if (res.error.code === 'PGRST205') hasTg = false;
      throw res.error;
    }
    const saved = res.data && res.data[0] ? res.data[0] : null;
    /* Sayt videosi uchun ustozga FAQAT matnli xabar. Video fayl yoki inline
       baholash tugmalari botga yuborilmaydi — baholash faqat saytda. */
    try {
      await queueWebSpeakingNotice({
        studentDbId: p.studentDbId,
        studentName: p.studentName,
        groupName: p.groupName
      });
    } catch (e) {
      console.warn('[outbox] speaking:', (e && e.message) || e);
    }
    return saved;
  }

  async function queueWebSpeakingNotice(opts) {
    const p = opts || {};
    if (!ready()) return null;
    let studentName = String(p.studentName || '').trim();
    let groupName = String(p.groupName || '').trim();
    if ((!studentName || !groupName) && p.studentDbId != null) {
      const st = getStudents().filter(function (x) { return String(x.dbId) === String(p.studentDbId); })[0];
      if (st) {
        studentName = studentName || String(st.fullName || '').trim();
        const g = groupById(st.groupId);
        groupName = groupName || (g ? String(g.name || '').trim() : '');
      }
    }
    const link = (function () {
      try {
        const loc = window.location || {};
        if (loc.protocol !== 'http:' && loc.protocol !== 'https:') return '';
        return String(loc.origin || '') + String(loc.pathname || '/');
      } catch (e) { return ''; }
    })();
    const place = link ? `<a href="${esc(link)}">Speaking slotlari</a>` : '<b>Speaking slotlari</b>';
    const when = new Date().toLocaleString(getLang() === 'en' ? 'en-GB' : 'uz-UZ');
    return queueMessages([{
      chat_id: 'ADMIN',
      student_id: p.studentDbId == null ? null : p.studentDbId,
      status: 'pending',
      text: "<b>Yangi sayt speaking videosi</b>\n\n" +
        "O'quvchi: <b>" + esc(studentName || '—') + "</b>\n" +
        "Guruh: <b>" + esc(groupName || 'Guruh tayinlanmagan') + "</b>\n" +
        'Vaqt: ' + esc(when) + "\n\n" +
        'Video saytda saqlandi. Uni faqat ' + place + " bo'limida ko'ring va baholang."
    }]);
  }

  /* Sayt videosini o'chirish: avval R2 fayli (DELETE ?path=), keyin Supabase qatori.
     Baholash bu funksiyani chaqirmaydi — video faqat ustoz "O'chirish"ni tasdiqlaganda o'chadi. */
  async function deleteSpeakingSubmission(dbId, mediaUrl) {
    const out = { fileDeleted: false, rowDeleted: false };
    if (mediaUrl) out.fileDeleted = await deleteFileFromR2(mediaUrl);
    if (!ready() || !hasTg || dbId == null) {
      out.rowDeleted = dbId == null;
      return out;
    }
    try {
      const res = await client.from('speaking_submissions').delete().eq('id', dbId);
      if (res.error && !missing(res.error)) throw res.error;
      out.rowDeleted = true;
    } catch (e) {
      console.warn('[cloud] speaking del:', (e && e.message) || e);
    }
    return out;
  }

  async function pushSpeakingGrade(localId) {
    if (!ready() || !hasTg) return;
    const sub = store.get(K.tgsubs, []).filter(function (x) { return x.id === localId; })[0];
    if (!sub || sub.dbId == null) return;
    const payload = { status: sub.status, score: sub.score, feedback: sub.feedback || '' };
    try {
      let res = await client.from('speaking_submissions').update(payload).eq('id', sub.dbId);
      if (res.error && res.error.code === 'PGRST204') {
        /* feedback ustuni hali yo'q — faqat status/baho bilan yozamiz */
        delete payload.feedback;
        res = await client.from('speaking_submissions').update(payload).eq('id', sub.dbId);
      }
      if (res.error) throw res.error;
    } catch (e) {
      if (e && e.code === 'PGRST205') hasTg = false;
      console.warn('[cloud] speaking grade:', (e && e.message) || e);
    }
  }

  /* --- Ustoz paroli: Supabase bot_settings (key: 'teacher_password') --- */
  let hasSettings = true;
  async function pullTeacherPassword() {
    if (!ready() || !hasSettings) return null;
    try {
      const res = await client.from('bot_settings')
        .select('value').eq('key', 'teacher_password').limit(1);
      if (res.error) {
        if (missing(res.error)) hasSettings = false;
        return null;
      }
      return res.data && res.data.length ? (res.data[0].value || null) : null;
    } catch (e) { return null; }
  }

  async function pushTeacherPassword(pass) {
    if (!ready() || !hasSettings) return;
    try {
      let res = await client.from('bot_settings')
        .update({ value: pass }).eq('key', 'teacher_password').select('key');
      if (res.error) {
        if (missing(res.error)) { hasSettings = false; return; }
        throw res.error;
      }
      if (!res.data || !res.data.length) {
        /* qator hali yo'q — yangi qator sifatida qo'shamiz */
        res = await client.from('bot_settings')
          .insert({ key: 'teacher_password', value: pass }).select('key');
        if (res.error) {
          if (missing(res.error)) hasSettings = false;
          else throw res.error;
        }
      }
    } catch (e) {
      console.warn('[cloud] teacher password:', (e && e.message) || e);
    }
  }

  /* --- bot_settings: umumiy kalit/qiymat (admin_email, admin_phone) --- */
  async function getSetting(key) {
    if (!ready() || !hasSettings || !key) return null;
    try {
      const res = await client.from('bot_settings').select('value').eq('key', key).limit(1);
      if (res.error) {
        if (missing(res.error)) hasSettings = false;
        return null;
      }
      return res.data && res.data.length ? (res.data[0].value || null) : null;
    } catch (e) { return null; }
  }

  async function setSetting(key, value) {
    if (!ready() || !hasSettings || !key) return false;
    try {
      let res = await client.from('bot_settings')
        .update({ value: value }).eq('key', key).select('key');
      if (res.error) {
        if (missing(res.error)) { hasSettings = false; return false; }
        throw res.error;
      }
      if (!res.data || !res.data.length) {
        /* qator hali yo'q — yangi qator sifatida qo'shamiz */
        res = await client.from('bot_settings').insert({ key: key, value: value }).select('key');
        if (res.error) {
          if (missing(res.error)) { hasSettings = false; return false; }
          throw res.error;
        }
      }
      return true;
    } catch (e) {
      console.warn('[cloud] bot_settings ' + key + ':', (e && e.message) || e);
      return false;
    }
  }

  /* bot_settings yozuvi — xato YASHIRILMAYDI: { ok, error } qaytaradi.
     Profilda saqlash tugmasi shu orqali ishlaydi (res.error.message ekranga chiqadi). */
  async function setSettingChecked(key, value) {
    if (!ready()) return { ok: false, error: "Bulut bilan aloqa yo'q (Supabase sozlanmagan)" };
    if (!key) return { ok: false, error: 'Kalit berilmadi' };
    try {
      /* .select() YO'Q: SELECT ruxsati cheklangan bo'lsa ham yozuv muvaffaqiyati bilinadi */
      const upd = await client.from('bot_settings').update({ value: value }).eq('key', key);
      if (upd.error) {
        if (missing(upd.error)) hasSettings = false;
        return { ok: false, error: upd.error.message || String(upd.error) };
      }
      /* Qator hali yo'q bo'lishi mumkin — insert qilamiz; mavjud bo'lsa unique xatosi e'tiborsiz */
      const ins = await client.from('bot_settings').insert({ key: key, value: value });
      if (ins.error && !/duplicate|unique|already exists/i.test(String(ins.error.message || ins.error))) {
        if (missing(ins.error)) hasSettings = false;
        return { ok: false, error: ins.error.message || String(ins.error) };
      }
      return { ok: true, error: '' };
    } catch (e) {
      console.warn('[cloud] bot_settings ' + key + ':', (e && e.message) || e);
      return { ok: false, error: (e && e.message) || String(e) };
    }
  }

  /* --- Support teacherlar ro'yxati (bot_settings: support_teachers) --- */
  async function pullSupportTeachers() {
    const raw = await getSetting('support_teachers');
    if (!raw) return false;
    try {
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return false;
      store.set(K.support, list);
      return true;
    } catch (e) { return false; }
  }
  async function pushSupportTeachers(list) {
    const res = await setSettingChecked('support_teachers', JSON.stringify(list || []));
    return !!(res && res.ok);
  }

  /* --- Bulutdan tortib olish ---
     Ustoz: barcha jadvallar. O'quvchi: FAQAT o'z ma'lumotlari —
     boshqa o'quvchilarning parollari/ma'lumotlari brauzerga tushmaydi. --- */
  async function pullAll(loginHint) {
    if (!ready()) return false;
    const hint = String(loginHint || '').trim().toLowerCase();
    if (hint && hint !== TEACHER_LOGIN) return pullStudent(hint);
    try {
      /* Toza start: bo'sh bazaga demo ma'lumot SEED QILINMAYDI — ustoz o'zi qo'shadi */
      const gRes = await client.from('groups').select('*');
      const sRes = await selectStudentRows(STUDENT_SYNC_COLS);
      if (gRes.error || sRes.error) return false;
      const grRes = await client.from('grades').select('id, student_id, date, grade, category, note');
      const atRes = await client.from('attendance').select('student_id, date, status');
      if (grRes.error || atRes.error) return false;

      const prev = getStudents();
      const newIdByOld = {}, oldIdByDb = {}, audioByOld = {}, prevByDb = {};
      prev.forEach(function (st) {
        if (st.dbId == null) return;
        newIdByOld[st.id] = 's' + st.dbId;
        oldIdByDb[st.dbId] = st.id;
        prevByDb[st.dbId] = st;
        if (st.audioSubmissions && st.audioSubmissions.length) audioByOld[st.id] = st.audioSubmissions;
      });

      const groups = gRes.data.map(function (r) {
        return { id: 'g' + r.id, dbId: r.id, name: r.name, days: r.days, time: r.time, monthlyFee: Number(r.monthly_fee) || 0, groupType: r.group_type === 'school' ? 'school' : 'tutoring' };
      });
      const students = sRes.data.map(function (r) {
        return {
          id: 's' + r.id,
          dbId: r.id,
          fullName: r.name,
          schoolClass: r.school_class,
          groupId: r.group_id != null ? 'g' + r.group_id : null,
          login: r.login || '',
          speakingDebt: Number(r.speaking_debt) || 0,
          paymentDebt: Number(r.payment_debt) || 0,
          feePeriod: r.fee_period || '',
          telegramChatId: r.telegram_chat_id == null ? null : Number(r.telegram_chat_id),
          voiceAllowed: r.voice_allowed === true,
          webSpeakingAllowed: webSpeakingFromRow(r, prevByDb[r.id] && prevByDb[r.id].webSpeakingAllowed),
          homeworkUploadAllowed: r.homework_upload_allowed === true,
          lastDevice: r.last_device || '',
          lastSeen: r.last_seen || null,
          lastPaymentInfo: r.last_payment_info || '',
          lastPaidMonth: r.last_paid_month || '',
          phone: r.phone || '',
          email: r.email || '',
          emailVerified: !!r.email_verified,
          audioSubmissions: (audioByOld[oldIdByDb[r.id]] || []).slice()
        };
      });

      /* Hali bulutga yozilmagan lokal guruh/o'quvchilar yo'qolmaydi */
      getGroups().forEach(function (g) { if (g.dbId == null) groups.push(g); });
      prev.forEach(function (st) { if (st.dbId == null) students.push(st); });

      const grades = {};
      grRes.data.forEach(function (r) {
        const sid = 's' + r.student_id;
        grades[sid] = grades[sid] || {};
        grades[sid][r.date] = { score: r.grade, category: r.category || 'Darsdagi javob', note: r.note || '' };
      });
      const attendance = {};
      atRes.data.forEach(function (r) {
        attendance[r.date] = attendance[r.date] || {};
        attendance[r.date]['s' + r.student_id] = r.status;
      });

      /* Bulutda hali yo'q, lokalda mavjud baho/davomat sanalari saqlanadi */
      const localGrades = getGrades();
      Object.keys(localGrades).forEach(function (lsid) {
        Object.keys(localGrades[lsid] || {}).forEach(function (d) {
          grades[lsid] = grades[lsid] || {};
          if (!grades[lsid][d]) grades[lsid][d] = localGrades[lsid][d];
        });
      });
      const localAtt = getAttendance();
      Object.keys(localAtt).forEach(function (d) {
        attendance[d] = attendance[d] || {};
        Object.keys(localAtt[d] || {}).forEach(function (lsid) {
          if (!attendance[d][lsid]) attendance[d][lsid] = localAtt[d][lsid];
        });
      });

      store.set(K.groups, groups);
      store.set(K.students, students);
      store.set(K.grades, grades);
      store.set(K.attendance, attendance);
      await pullPayments();
      applyMonthlyFees();

      /* speaking slotlari: eski lokal id → yangi id */
      const slots = getSpeaking();
      let slotChanged = false;
      slots.forEach(function (x) {
        if (x.studentId && newIdByOld[x.studentId] && newIdByOld[x.studentId] !== x.studentId) {
          x.studentId = newIdByOld[x.studentId];
          slotChanged = true;
        }
      });
      if (slotChanged) store.set(K.speaking, slots);

      /* Xavfsizlik: hisoblar ro'yxati localStorage'ga yozilmaydi */
      store.del('et_accounts');
      const next = {};
      next[TEACHER_LOGIN] = { login: TEACHER_LOGIN, role: 'teacher', name: TEACHER_NAME, studentId: null };
      students.forEach(function (st) {
        if (st.login) next[st.login] = { login: st.login, role: 'student', studentId: st.id, name: st.fullName };
      });
      accounts = next;

      await fetchMessages(null);
      try { await pullSlots(null); } catch (e) { /* speaking_slots yo'q */ }
      try { await pullMonthlyFees(); } catch (e) { /* monthly_fees yo'q */ }
      try { await pullSupportTeachers(); } catch (e) { /* support ro'yxati yo'q */ }
      try { await pullHomework(); } catch (e) { /* homework jadvali yo'q */ }
      try { await pullSubmissions(); } catch (e) { /* homework_submissions yo'q */ }
      try { await pullCardSettings(); } catch (e) { /* bot_settings yo'q */ }
      try { await pullSpeaking(); } catch (e) { /* speaking_submissions yo'q */ }
      /* Ustoz paroli — bot_settings ('teacher_password') dan o'qiladi */
      let teachPw = null;
      try { teachPw = await pullTeacherPassword(); } catch (e) { /* bot_settings yo'q */ }
      next[TEACHER_LOGIN].password = teachPw || TEACHER_PASSWORD;
      persistAccounts();
      return true;
    } catch (e) {
      console.warn('[cloud] pull:', (e && e.message) || e);
      return false;
    }
  }

  /* --- O'quvchi: faqat o'z qatori, baholari, davomati, xabarlari --- */
  async function pullStudent(login) {
    const sRes = await selectStudentRows(STUDENT_SYNC_COLS, function (q) {
      return q.ilike('login', login).limit(1);
    });
    if (sRes.error || !sRes.data || !sRes.data.length) return false;
    const row = sRes.data[0];
    const dbId = row.id;

    const groups = [];
    if (row.group_id != null) {
      const gRes = await client.from('groups').select('*').eq('id', row.group_id).limit(1);
      if (!gRes.error && gRes.data && gRes.data[0]) {
        const g = gRes.data[0];
        groups.push({ id: 'g' + g.id, dbId: g.id, name: g.name, days: g.days, time: g.time, monthlyFee: Number(g.monthly_fee) || 0, groupType: g.group_type === 'school' ? 'school' : 'tutoring' });
      }
    }

    const grRes = await client.from('grades').select('id, student_id, date, grade, category, note').eq('student_id', dbId);
    if (grRes.error) return false;
    const atRes = await client.from('attendance').select('student_id, date, status').eq('student_id', dbId);
    if (atRes.error) return false;

    const prevSt = getStudents().filter(function (x) { return x.dbId === dbId; })[0];
    const students = [{
      id: 's' + dbId,
      dbId: dbId,
      fullName: row.name,
      schoolClass: row.school_class,
      groupId: row.group_id != null ? 'g' + row.group_id : null,
      login: row.login || '',
      speakingDebt: Number(row.speaking_debt) || 0,
      paymentDebt: Number(row.payment_debt) || 0,
      feePeriod: row.fee_period || '',
      telegramChatId: row.telegram_chat_id == null ? null : Number(row.telegram_chat_id),
      voiceAllowed: row.voice_allowed === true,
      webSpeakingAllowed: webSpeakingFromRow(row, prevSt && prevSt.webSpeakingAllowed),
      homeworkUploadAllowed: row.homework_upload_allowed === true,
      lastDevice: row.last_device || '',
      lastSeen: row.last_seen || null,
      phone: row.phone || '',
      email: row.email || '',
      emailVerified: !!row.email_verified,
      audioSubmissions: prevSt && prevSt.audioSubmissions ? prevSt.audioSubmissions.slice() : []
    }];

    const grades = {};
    grRes.data.forEach(function (r) {
      grades['s' + dbId] = grades['s' + dbId] || {};
      grades['s' + dbId][r.date] = { score: r.grade, category: r.category || 'Darsdagi javob', note: r.note || '' };
    });
    const attendance = {};
    atRes.data.forEach(function (r) {
      attendance[r.date] = attendance[r.date] || {};
      attendance[r.date]['s' + dbId] = r.status;
    });

    store.set(K.groups, groups);
    store.set(K.students, students);
    store.set(K.grades, grades);
    store.set(K.attendance, attendance);
    await pullPayments(dbId);

    /* xabarlar — faqat o'z suhbati */
    const mRes = await client.from('messages').select('id, student_id, sender, text, created_at, edited_at')
      .eq('student_id', dbId).order('created_at', { ascending: true });
    if (!mRes.error) {
      store.set(K.messages, (mRes.data || []).map(function (r) {
        return { id: 'm' + r.id, sid: 's' + dbId, sender: r.sender, text: r.text,
          createdAt: r.created_at, editedAt: r.edited_at || '' };
      }));
    }

    /* speaking topshiriklari — faqat o'ziniki */
    const tRes = await client.from('speaking_submissions').select('*')
      .eq('student_id', dbId).order('created_at', { ascending: true });
    if (!tRes.error) {
      store.set(K.tgsubs, (tRes.data || []).map(function (r) {
        return {
          id: 't' + r.id, dbId: r.id, sid: 's' + dbId,
          mediaType: r.media_type || 'voice', status: r.status || 'kutilmoqda',
          score: r.score == null ? null : Number(r.score),
          feedback: r.feedback || '', createdAt: r.created_at || ''
        };
      }));
    }

    /* uyga vazifalar — faqat o'z guruhi */
    if (row.group_id != null) {
      const hwRes = await client.from('homework').select('*')
        .eq('group_id', row.group_id).order('created_at', { ascending: false });
      if (!hwRes.error) {
        store.set(K.homework, (hwRes.data || []).map(function (r) {
          return {
            id: 'h' + r.id, dbId: r.id, groupId: 'g' + r.group_id,
            title: r.title || '', description: r.description || '',
            dueDate: r.due_date || '', mediaUrl: r.media_url || '', mediaType: r.media_type || '',
            attachments: parseAttachments(r.attachments),
            createdAt: r.created_at || ''
          };
        }));
      }
    } else {
      store.set(K.homework, []);
    }
    try { await pullSubmissions(dbId); } catch (e) { /* homework_submissions yo'q */ }

    try { await pullSlots(dbId); } catch (e) { /* speaking_slots yo'q */ }
    try { await pullMonthlyFees(row.group_id); } catch (e) { /* monthly_fees yo'q */ }
    try { await pullCardSettings(); } catch (e) { /* bot_settings yo'q */ }
    try { await pullStudentReceipts(dbId); } catch (e) { /* payment_receipts yo'q */ }

    /* Xavfsizlik: parollar localStorage'ga saqlanmaydi */
    store.del('et_accounts');
    const key = String(row.login || '').toLowerCase();
    const next = {};
    if (key) next[key] = { login: key, role: 'student', studentId: 's' + dbId, name: row.name };
    accounts = next;
    return true;
  }

  /* --- Yozish: guruh / o'quvchi / qarz / baho / davomat / audio / xabar --- */
  async function pushGroup(g) {
    if (!ready()) return;
    try {
      const base = { name: g.name, days: g.days, time: g.time, monthly_fee: Number(g.monthlyFee) || 0 };
      const withType = Object.assign({ group_type: groupTypeOf(g) }, base);
      const run = async (p) => (g.dbId == null)
        ? client.from('groups').insert(p).select()
        : client.from('groups').update(p).eq('id', g.dbId);
      let res = await run(withType);
      /* group_type ustuni hali qo'shilmagan bo'lsa — eski sxema bilan yozamiz */
      if (res.error && /group_type|schema cache|does not exist|column/i.test(String(res.error.message || ''))) {
        res = await run(base);
      }
      if (res.error) throw res.error;
      if (g.dbId == null) g.dbId = res.data[0].id;
      const list = getGroups();
      const t = list.filter(function (x) { return x.id === g.id; })[0];
      if (t) { t.dbId = g.dbId; store.set(K.groups, list); }
    } catch (e) { console.warn('[cloud] group:', (e && e.message) || e); }
  }

  async function pushStudent(sid) {
    if (!ready()) return;
    const st = studentById(sid);
    if (!st) return;
    try {
      /* Yangi guruh hali bulutda bo'lmasa — avval guruh yoziladi */
      const g = groupById(st.groupId);
      if (g && g.dbId == null) await pushGroup(g);
      const payload = payloadOf(st);
      if (st.dbId == null) {
        let res = await client.from('students').insert(payload).select();
        /* Yangi ustunlar hali migratsiya qilinmagan bo'lsa — ularsiz qayta urinamiz */
        const optionalCols = ['web_speaking_allowed', 'homework_upload_allowed', 'voice_allowed'];
        for (let i = 0; i < optionalCols.length && res.error && res.error.code === 'PGRST204'; i++) {
          delete payload[optionalCols[i]];
          res = await client.from('students').insert(payload).select();
        }
        if (res.error) throw res.error;
        const list = getStudents();
        const t = list.filter(function (x) { return x.id === sid; })[0];
        if (t) { t.dbId = res.data[0].id; store.set(K.students, list); }
      } else {
        let res = await client.from('students').update(payload).eq('id', st.dbId);
        /* Yangi (ixtiyoriy) ustunlar hali bazada bo'lmasa — ularsiz qayta yozamiz */
        const optionalCols = ['web_speaking_allowed', 'homework_upload_allowed', 'voice_allowed'];
        for (let i = 0; i < optionalCols.length && res.error && res.error.code === 'PGRST204'; i++) {
          delete payload[optionalCols[i]];
          res = await client.from('students').update(payload).eq('id', st.dbId);
        }
        if (res.error) throw res.error;
      }
    } catch (e) { console.warn('[cloud] student:', (e && e.message) || e); }
  }

  /* Faqat shu ustunni to'g'ridan-to'g'ri yozadi. Butun o'quvchi qatorini
     yubormaymiz — parallel pull yoki eski to'liq update uni qaytarib qo'ymaydi. */
  async function setWebSpeakingAllowed(sid, enabled) {
    if (!ready()) return { ok: false, error: "Bulut bilan aloqa yo'q (Supabase sozlanmagan)" };
    const value = enabled === true;
    const dbId = await ensureDbId(sid);
    if (dbId == null) return { ok: false, error: "O'quvchi bazada saqlanmagan (dbId yo'q)" };
    webSpeakingGuard[dbId] = { value: value, pending: true, until: 0 };
    try {
      const res = await client.from('students')
        .update({ web_speaking_allowed: value })
        .eq('id', dbId);
      if (res.error) {
        delete webSpeakingGuard[dbId];
        console.warn('[cloud] web_speaking_allowed:', (res.error && res.error.message) || res.error);
        return { ok: false, error: (res.error && res.error.message) || String(res.error) };
      }
      /* Yozuv tugagach ham qisqa muddat guard qoladi: update boshlanishidan
         oldin ketgan pull javobi keyin kelib, eski qiymatni yozmasin. */
      webSpeakingGuard[dbId] = { value: value, pending: false, until: Date.now() + WEB_SPEAK_GUARD_MS };
      const list = getStudents();
      const t = list.filter(function (x) { return x.id === sid; })[0];
      if (t) { t.webSpeakingAllowed = value; store.set(K.students, list); }
      return { ok: true, value: value, error: '' };
    } catch (e) {
      delete webSpeakingGuard[dbId];
      console.warn('[cloud] web_speaking_allowed:', (e && e.message) || e);
      return { ok: false, error: (e && e.message) || String(e) };
    }
  }

  async function pushDebt(sid) {
    if (!ready()) return;
    const st = studentById(sid);
    if (!st) return;
    const dbId = await ensureDbId(sid);
    if (dbId == null) return;
    const res = await client.from('students').update({ speaking_debt: Number(st.speakingDebt) || 0 }).eq('id', dbId);
    if (res.error) throw res.error;
  }

  /* Qarzni bulutdagi ENG YANGI qiymatdan o'zgartiradi (eski lokal qiymat
     botning kamaytirishini bosib ketmasligi uchun) */
  async function adjustDebt(sid, delta) {
    if (!ready()) return;
    const dbId = await ensureDbId(sid);
    if (dbId == null) return;
    try {
      const cur = await client.from('students').select('speaking_debt').eq('id', dbId).limit(1);
      if (cur.error) throw cur.error;
      const now = Number((cur.data && cur.data[0] && cur.data[0].speaking_debt) || 0);
      const next = Math.max(0, now + (Number(delta) || 0));
      const res = await client.from('students').update({ speaking_debt: next }).eq('id', dbId);
      if (res.error) throw res.error;
      const list = getStudents();
      const st = list.filter(function (x) { return x.id === sid; })[0];
      if (st) { st.speakingDebt = next; store.set(K.students, list); }
    } catch (e) { console.warn('[cloud] debt:', (e && e.message) || e); }
  }

  async function doPushGrade(sid, date) {
    /* Yangi o'quvchining dbId'si hali yo'q bo'lsa — avval uni yozamiz */
    const dbId = await ensureDbId(sid);
    if (dbId == null) return;
    const rec = (getGrades()[sid] || {})[date];
    const del = await client.from('grades').delete().eq('student_id', dbId).eq('date', date);
    if (del.error) throw del.error;
    if (!rec) return;
    const ins = await client.from('grades').insert({
      student_id: dbId, date: date, grade: rec.score,
      category: rec.category || 'Darsdagi javob', note: rec.note || ''
    });
    if (ins.error) throw ins.error;
  }

  function pushGrade(sid, date) {
    if (!ready()) return;
    /* izoh yozilganda har harf uchun so'ralmasligi uchun debounce */
    const k = sid + '|' + date;
    clearTimeout(gradeTimers[k]);
    gradeTimers[k] = setTimeout(function () { bg(doPushGrade(sid, date), 'grade'); }, 500);
  }

  async function pushAttendance(date, sids) {
    if (!ready()) return;
    const ids = [], rows = [];
    /* takroriy sidlar dublikat qatorlar keltirmasligi uchun unique qilamiz */
    const unique = Array.from(new Set(sids || []));
    for (let i = 0; i < unique.length; i++) {
      const sid = unique[i];
      const dbId = await ensureDbId(sid);
      if (dbId == null) continue;
      ids.push(dbId);
      const status = (getAttendance()[date] || {})[sid];
      if (status) rows.push({ student_id: dbId, date: date, status: status });
    }
    if (!ids.length) return;
    const del = await client.from('attendance').delete().eq('date', date).in('student_id', ids);
    if (del.error) throw del.error;
    if (rows.length) {
      const ins = await client.from('attendance').insert(rows);
      if (ins.error) throw ins.error;
    }
  }

  function messageDbId(localId) {
    const m = /^m(\d+)$/.exec(String(localId));
    return m ? Number(m[1]) : null;
  }

  async function editMessage(localId, text) {
    const cache = store.get(K.messages, []);
    const msg = cache.filter(function (m) { return String(m.id) === String(localId); })[0];
    if (!msg) return false;
    msg.text = text;
    msg.editedAt = new Date().toISOString();
    store.set(K.messages, cache);
    const dbId = messageDbId(localId);
    if (!ready() || !hasMessages || dbId == null) return true;
    try {
      let res = await client.from('messages').update({ text: text, edited_at: msg.editedAt }).eq('id', dbId);
      if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703')) {
        res = await client.from('messages').update({ text: text }).eq('id', dbId);
      }
      if (res.error) throw res.error;
    } catch (e) {
      console.warn('[cloud] edit msg:', (e && e.message) || e);
    }
    return true;
  }

  async function deleteMessage(localId) {
    const cache = store.get(K.messages, []);
    const msg = cache.filter(function (m) { return String(m.id) === String(localId); })[0];
    if (!msg) return false;
    store.set(K.messages, cache.filter(function (m) { return String(m.id) !== String(localId); }));
    const dbId = messageDbId(localId);
    if (!ready() || !hasMessages || dbId == null) return true;
    try {
      const res = await client.from('messages').delete().eq('id', dbId);
      if (res.error) throw res.error;
    } catch (e) {
      console.warn('[cloud] del msg:', (e && e.message) || e);
    }
    return true;
  }

  async function sendMessage(sid, sender, text) {
    const msg = { id: 'l' + Date.now() + Math.random().toString(36).slice(2, 7), sid: sid, sender: sender, text: text, createdAt: new Date().toISOString() };
    const cache = store.get(K.messages, []);
    cache.push(msg);
    store.set(K.messages, cache);
    if (!ready() || !hasMessages) return msg;
    const dbId = await ensureDbId(sid);
    if (dbId == null) return msg;
    try {
      const res = await client.from('messages').insert({ student_id: dbId, sender: sender, text: text }).select();
      if (res.error) { if (missing(res.error)) hasMessages = false; return msg; }
      const c = store.get(K.messages, []);
      const i = c.findIndex(function (m) { return m.id === msg.id; });
      if (i >= 0) {
        c[i] = { id: 'm' + res.data[0].id, sid: sid, sender: sender, text: text, createdAt: res.data[0].created_at };
        store.set(K.messages, c);
      }
      updateChatView();
    } catch (e) { console.warn('[cloud] msg:', (e && e.message) || e); }
    return msg;
  }

  /* --- O'chirish: bog'liq qatorlar bilan birga --- */
  async function deleteStudent(dbId) {
    if (!ready() || dbId == null) return;
    /* bog'liq qatorlar avval (FK cascade bo'lmasa ham xavfsiz) */
    if (hasMessages) {
      const r = await client.from('messages').delete().eq('student_id', dbId);
      if (r.error) { if (missing(r.error)) hasMessages = false; else throw r.error; }
    }
    if (hasAudio) {
      const r = await client.from('audio_submissions').delete().eq('student_id', dbId);
      if (r.error) { if (missing(r.error)) hasAudio = false; else throw r.error; }
    }
    /* to'lov cheklari: R2/Storage fayllari ham tozalanadi */
    try {
      const rr = await client.from('payment_receipts').select('id, receipt_url').eq('student_id', dbId);
      if (!rr.error && Array.isArray(rr.data)) {
        for (let i = 0; i < rr.data.length; i++) {
          await deletePaymentReceipt(rr.data[i].id, rr.data[i].receipt_url);
        }
      }
    } catch (e) { console.warn('[cloud] student receipts del:', (e && e.message) || e); }
    const g = await client.from('grades').delete().eq('student_id', dbId);
    if (g.error) throw g.error;
    const a = await client.from('attendance').delete().eq('student_id', dbId);
    if (a.error) throw a.error;
    const st = await client.from('students').delete().eq('id', dbId);
    if (st.error) throw st.error;
  }

  async function deleteGroup(dbId) {
    if (!ready() || dbId == null) return;
    /* avval o'quvchilarni guruhdan uzamiz (FK) */
    const up = await client.from('students').update({ group_id: null }).eq('group_id', dbId);
    if (up.error) throw up.error;
    const del = await client.from('groups').delete().eq('id', dbId);
    if (del.error) throw del.error;
  }

  /* --- Uyga vazifani o'chirish: avval Storage'dagi fayl, keyin jadval qatori ---
     media_url berilsa, fayl yo'li ajratib olinadi va ikkala bucket nomi bilan
     o'chirishga uriniladi — og'ir video/audio xotirada axlat bo'lib qolmaydi. */
  async function deleteHomework(dbId, mediaUrls) {
    if (!ready()) return;
    const urls = (Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls])
      .map(function (u) { return String(u || ''); }).filter(Boolean);
    for (let u = 0; u < urls.length; u++) {
      /* R2 fayllari Cloudflare'dan, eski Supabase URL'lari Storage'dan o'chiriladi */
      if (isR2Url(urls[u])) { await deleteFileFromR2(urls[u]); continue; }
      if (/r2\.dev/i.test(urls[u])) continue;
      const found = mediaPath(urls[u]);
      const rawPath = urls[u].split('?')[0];
      const filePath = found && found.path ? found.path : rawPath.split('/').pop();
      const buckets = found
        ? [found.bucket].concat(MEDIA_BUCKETS.filter(function (b) { return b !== found.bucket; }))
        : MEDIA_BUCKETS;
      if (!filePath) continue;
      for (let i = 0; i < buckets.length; i++) {
        try {
          const rm = await client.storage.from(buckets[i]).remove([filePath]);
          if (!rm.error) break;
        } catch (e) {
          console.warn('[cloud] hw media del (' + buckets[i] + '):', (e && e.message) || e);
        }
      }
    }
    if (!hasHomework || dbId == null) return;
    const res = await client.from('homework').delete().eq('id', dbId);
    if (res.error) throw res.error;
  }

  /* --- homework media (Supabase Storage): faqat sayt yuklaydi/o'chiradi ---
     Bucket nomi 'homework-media' yoki 'homework_media' bo'lishi mumkin:
     ikkalasi ham qo'llab-quvvatlanadi, birinchisidan boshlab urinib ko'riladi. */
  const MEDIA_BUCKETS = ['homework-media', 'homework_media'];
  const MEDIA_BUCKET = MEDIA_BUCKETS[0];
  function mediaPath(url) {
    const raw = String(url || '');
    for (let i = 0; i < MEDIA_BUCKETS.length; i++) {
      const bucket = MEDIA_BUCKETS[i];
      const marker = '/storage/v1/object/public/' + bucket + '/';
      const at = raw.indexOf(marker);
      if (at >= 0) {
        return { bucket: bucket, path: decodeURIComponent(raw.slice(at + marker.length).split('?')[0]) };
      }
    }
    return null;
  }
  async function uploadHomeworkMedia(file) {
    /* Ustoz biriktirgan har qanday fayl R2'ga */
    return uploadFileToR2(file, 'hw');
  }
  async function removeHomeworkMedia(url) {
    if (isR2Url(url)) { await deleteFileFromR2(url); return; }
    const found = mediaPath(url);
    if (!found || !found.path) return;
    /* Avval URL'dagi bucket, keyin ikkinchi nom sinaladi */
    const order = [found.bucket].concat(MEDIA_BUCKETS.filter(function (b) { return b !== found.bucket; }));
    for (let i = 0; i < order.length; i++) {
      try {
        const res = await client.storage.from(order[i]).remove([found.path]);
        if (!res.error) return;
      } catch (e) { console.warn('[cloud] media del (' + order[i] + '):', (e && e.message) || e); }
    }
  }

  /* --- homework_submissions: o'quvchi topshirig'i + ustoz komentariyasi --- */
  function submissionFilesOf(raw) {
    let v = raw;
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch (e) { v = null; }
    }
    if (!Array.isArray(v)) return [];
    return v.filter(function (f) { return f && typeof f === 'object' && f.url; }).map(function (f) {
      return {
        url: String(f.url),
        type: String(f.type || 'file').toLowerCase(),
        name: String(f.name || ''),
        size: Number(f.size) || 0
      };
    });
  }
  function mapSubmission(r) {
    return {
      id: r.id,
      studentDbId: r.student_id == null ? null : Number(r.student_id),
      homeworkDbId: r.homework_id == null ? null : Number(r.homework_id),
      files: submissionFilesOf(r.files),
      note: r.note || '',
      status: r.status || 'yangi',
      teacherComment: r.teacher_comment || '',
      commentedAt: r.commented_at || null,
      createdAt: r.created_at || '',
      updatedAt: r.updated_at || r.created_at || ''
    };
  }
  function putLocalSubmission(row) {
    const list = store.get(K.homeworkSubmissions, []) || [];
    const i = list.findIndex(function (x) { return String(x.id) === String(row.id); });
    if (i >= 0) list[i] = Object.assign({}, list[i], row);
    else list.unshift(row);
    store.set(K.homeworkSubmissions, list);
    return row;
  }
  /* studentDbId berilmasa — barcha topshiriqlar (ustoz paneli) */
  async function pullSubmissions(studentDbId) {
    if (!ready()) return store.get(K.homeworkSubmissions, []);
    try {
      let q = client.from('homework_submissions').select('*').order('created_at', { ascending: false });
      if (studentDbId != null) q = q.eq('student_id', studentDbId);
      const res = await q;
      if (res.error) return store.get(K.homeworkSubmissions, []);
      const list = (res.data || []).map(mapSubmission);
      store.set(K.homeworkSubmissions, list);
      return list;
    } catch (e) {
      console.warn('[cloud] submissions:', (e && e.message) || e);
      return store.get(K.homeworkSubmissions, []);
    }
  }
  /* PostgREST/Storage xatosini o'qiladigan matnga aylantiradi */
  function apiErrText(e) {
    if (!e) return "noma'lum xato";
    const parts = [];
    const code = e.code || e.statusCode || e.status;
    if (code) parts.push(String(code));
    if (e.details) parts.push(String(e.details));
    if (e.hint) parts.push('hint: ' + e.hint);
    parts.push(String(e.message || e.error_description || e));
    return parts.filter(Boolean).join(' · ');
  }
  /* Eski jadvalda yangi ustunlar bo'lmasa (PGRST204 / schema cache) — aniqlash */
  function isMissingColumn(e) {
    return /PGRST204|schema cache|column .* does not exist|could not find the .* column/i
      .test(String((e && e.code) || '') + ' ' + String((e && e.message) || ''));
  }
  async function saveHomeworkSubmission(sub) {
    if (!ready()) throw new Error('Baza: Supabase sozlanmagan');
    /* homework_submissions jadvali ustunlari bilan 1:1 mos obyekt */
    const base = {
      student_id: sub.studentDbId,
      homework_id: sub.homeworkDbId,
      files: submissionFilesOf(sub.files),
      note: String(sub.note || ''),
      updated_at: new Date().toISOString()
    };
    const extras = {
      student_name: String(sub.studentName || ''),
      group_name: String(sub.groupName || ''),
      status: String(sub.status || 'yangi')
    };
    /* Jadval ustunlari — boshqa kalit yuborilmaydi (PGRST204 oldini oladi) */
    const HW_SUB_COLUMNS = ['student_id', 'homework_id', 'student_name',
      'group_name', 'files', 'note', 'status', 'updated_at'];
    const onlyColumns = function (src) {
      const row = {};
      HW_SUB_COLUMNS.forEach(function (k) { if (src[k] !== undefined) row[k] = src[k]; });
      return row;
    };
    const found = await client.from('homework_submissions').select('*')
      .eq('student_id', sub.studentDbId).eq('homework_id', sub.homeworkDbId).limit(1);
    if (found.error) {
      throw new Error("Baza (homework_submissions so'rovi): " + apiErrText(found.error));
    }
    const existing = found.data && found.data[0];
    /* 16-bo'lim SQL hali qo'llanmagan bo'lsa, qo'shimcha ustunlarsiz qayta urinamiz */
    const attempts = [onlyColumns(Object.assign({}, base, extras)), onlyColumns(base)];
    let lastErr = null;
    for (let i = 0; i < attempts.length; i++) {
      const row = attempts[i];
      const res = existing
        ? await client.from('homework_submissions').update(row).eq('id', existing.id).select()
        : await client.from('homework_submissions').insert(row).select();
      if (!res.error) {
        const saved = mapSubmission((res.data && res.data[0]) || Object.assign({}, existing || {}, row));
        return putLocalSubmission(saved);
      }
      lastErr = res.error;
      if (!isMissingColumn(res.error)) break;
      console.warn('[cloud] homework_submissions: qo\'shimcha ustun yo\'q — soddaroq qator bilan qayta yuboriladi');
    }
    throw new Error('Baza (homework_submissions INSERT): ' + apiErrText(lastErr));
  }
  /* --- Diagnostika: bucket public holati, Storage policy'lari, jadval ustunlari --- */
  async function diagnostics() {
    const out = [];
    const add = function (ok, label, detail) {
      out.push({ ok: !!ok, label: label, detail: String(detail || '') });
    };
    if (!ready()) {
      add(false, 'Supabase ulanishi', 'URL yoki anon kalit topilmadi (js/config.js)');
      return out;
    }
    add(true, 'Supabase ulanishi', 'anon kalit bilan client yaratildi');

    /* 1) homework_submissions ustunlari */
    const subCols = ['student_id', 'homework_id', 'student_name', 'group_name',
      'files', 'note', 'status', 'teacher_comment', 'commented_at'];
    try {
      const res = await client.from('homework_submissions').select(subCols.join(',')).limit(1);
      if (res.error) add(false, 'homework_submissions ustunlari', apiErrText(res.error));
      else add(true, 'homework_submissions ustunlari', subCols.join(', ') + ' — joyida');
    } catch (e) { add(false, 'homework_submissions ustunlari', apiErrText(e)); }

    /* 2) students ruxsat ustunlari (web speaking + homework) */
    try {
      const res = await client.from('students').select('web_speaking_allowed, homework_upload_allowed').limit(1);
      if (res.error) add(false, 'students.web_speaking_allowed + homework_upload_allowed', apiErrText(res.error));
      else add(true, 'students.web_speaking_allowed + homework_upload_allowed', 'ikkala ruxsat ustuni joyida');
    } catch (e) { add(false, 'students ruxsat ustunlari', apiErrText(e)); }

    /* 3) Bucket mavjudligi va public holati */
    let bucketName = null;
    for (let i = 0; i < MEDIA_BUCKETS.length; i++) {
      const b = MEDIA_BUCKETS[i];
      try {
        const res = await client.storage.getBucket(b);
        if (!res.error && res.data) {
          bucketName = b;
          add(!!res.data.public, "Storage bucket '" + b + "' public",
            res.data.public
              ? 'bucket public — yuklangan fayllar URL orqali ochiladi'
              : "bucket PRIVATE — Storage bo'limida bucket'ni Public qiling");
          break;
        }
        if (res.error && i === MEDIA_BUCKETS.length - 1) {
          add(false, "Storage bucket '" + b + "'", apiErrText(res.error));
        }
      } catch (e) {
        if (i === MEDIA_BUCKETS.length - 1) add(false, "Storage bucket '" + b + "'", apiErrText(e));
      }
    }
    if (!bucketName) {
      add(false, 'Storage bucket', MEDIA_BUCKETS.join(' / ') + " topilmadi — supabase.sql 17-bo'limini Run qiling");
      return out;
    }

    /* 4) Yozish (INSERT policy): kichik test fayl */
    const diagPath = 'submissions/_diagnostika/' + Date.now() + '_diag.txt';
    const testFile = new Blob(['diag'], { type: 'text/plain' });
    let canWrite = false;
    try {
      const up = await client.storage.from(bucketName).upload(diagPath, testFile, {
        cacheControl: '60', upsert: true, contentType: 'text/plain', headers: { 'x-upsert': 'true' }
      });
      canWrite = !up.error;
      add(canWrite, 'Storage yozish (INSERT policy)',
        canWrite ? 'test fayl muvaffaqiyatli yuklandi' : apiErrText(up.error));
    } catch (e) {
      add(false, 'Storage yozish (INSERT policy)', apiErrText(e));
    }

    if (canWrite) {
      /* 5) O'qish: public URL ochiladimi */
      const pub = client.storage.from(bucketName).getPublicUrl(diagPath);
      const url = (pub && pub.data && pub.data.publicUrl) || '';
      if (!url) {
        add(false, "Storage o'qish (public URL)", 'public URL olinmadi');
      } else {
        try {
          const r = await fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now(),
            { cache: 'no-store' });
          add(r.ok, "Storage o'qish (public URL)",
            r.ok ? 'HTTP ' + r.status : 'HTTP ' + r.status + " — bucket public emas yoki SELECT policy yo'q");
        } catch (e) {
          add(false, "Storage o'qish (public URL)", 'Failed to fetch — CORS yoki bucket public emas');
        }
      }
      /* 6) O'chirish (DELETE policy) + test faylni tozalash */
      try {
        const rm = await client.storage.from(bucketName).remove([diagPath]);
        add(!rm.error, 'Storage ochirish (DELETE policy)',
          rm.error ? apiErrText(rm.error) : 'test fayl tozalandi');
      } catch (e) {
        add(false, 'Storage ochirish (DELETE policy)', apiErrText(e));
      }
    }
    return out;
  }

  /* Topshiriq yozuvini o'chirish: avval Storage obyektlari, keyin jadval qatori */
  async function deleteSubmission(id, files) {
    if (!ready() || id == null) throw new Error('Baza: topshiriq id topilmadi');
    const list = Array.isArray(files) ? files : [];
    const storageErrors = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i] || {};
      const ref = String(item.path || item.url || '');
      if (!ref) continue;
      /* R2 fayllari Cloudflare'dan, eski supabase URL'lar Storage'dan o'chiriladi */
      if (isR2Url(ref)) { await deleteFileFromR2(ref); continue; }
      if (/r2\.dev/i.test(ref)) continue;
      const found = mediaPath(ref);
      const filePath = found && found.path ? found.path : ref.split('?')[0];
      if (!filePath) continue;
      const buckets = found
        ? [found.bucket].concat(MEDIA_BUCKETS.filter(function (b) { return b !== found.bucket; }))
        : MEDIA_BUCKETS;
      let removed = false;
      for (let b = 0; b < buckets.length; b++) {
        try {
          const rm = await client.storage.from(buckets[b]).remove([filePath]);
          if (!rm.error) { removed = true; break; }
          storageErrors.push('Storage (' + buckets[b] + '): ' + apiErrText(rm.error));
        } catch (e) {
          storageErrors.push('Storage (' + buckets[b] + '): ' + apiErrText(e));
        }
      }
      if (!removed) console.warn('[cloud] submission fayl o\'chmadi:', filePath);
    }
    const res = await client.from('homework_submissions').delete().eq('id', id);
    if (res.error) throw new Error('Baza (homework_submissions DELETE): ' + apiErrText(res.error));
    store.set(K.homeworkSubmissions, (store.get(K.homeworkSubmissions, []) || [])
      .filter(function (x) { return String(x.id) !== String(id); }));
    return { storageErrors: storageErrors };
  }
  async function deleteSubmissionComment(id) {
    if (!ready()) throw new Error('Supabase sozlanmagan');
    const res = await client.from('homework_submissions')
      .update({ teacher_comment: '', commented_at: null })
      .eq('id', id).select();
    if (res.error) throw res.error;
    const saved = mapSubmission((res.data && res.data[0]) ||
      { id: id, teacher_comment: '', commented_at: null });
    return putLocalSubmission(saved);
  }
  async function commentSubmission(id, comment) {
    if (!ready()) throw new Error('Supabase sozlanmagan');
    const text = String(comment || '').trim();
    const res = await client.from('homework_submissions')
      .update({ teacher_comment: text, commented_at: new Date().toISOString() })
      .eq('id', id).select();
    if (res.error) throw res.error;
    const saved = mapSubmission((res.data && res.data[0]) || { id: id, teacher_comment: text });
    return putLocalSubmission(saved);
  }
  /* Faylni Storage'ga yuklash: homework-media/submissions/{student}/{homework}/... */
  async function uploadSubmissionFile(file, studentDbId, homeworkDbId) {
    /* Barcha fayl turlari R2'ga: submissions/{student}/{homework}/... */
    const folder = 'submissions/' + (studentDbId == null ? '0' : studentDbId) +
      '/' + (homeworkDbId == null ? '0' : homeworkDbId);
    return uploadFileToR2(file, folder);
  }

  /* --- telegram_outbox: sayt yozadi, bot yuboradi (chek / eslatma) --- */
  async function queueMessages(rows) {
    if (!ready() || !rows || !rows.length) return [];
    /* status HAR DOIM yoziladi — aks holda bot (status='pending') qatorni ko'rmaydi */
    const full = rows.map(function (r) {
      const row = Object.assign({}, r);
      row.chat_id = String(r.chat_id == null ? '' : r.chat_id);
      row.status = r.status || 'pending';
      return row;
    });
    let res = await client.from('telegram_outbox').insert(full).select('id');
    if (res.error && /student_id|schema cache|column/i.test(String(res.error.message || ''))) {
      /* student_id ustuni hali ochilmagan bo'lsa — faqat chat_id, text, status bilan xatosiz yozadi */
      const cleanRows = full.map(function (r) {
        return { chat_id: r.chat_id, text: String(r.text || ''), status: r.status };
      });
      res = await client.from('telegram_outbox').insert(cleanRows).select('id');
    }
    if (res.error) throw res.error;
    const ids = (res.data || []).map(function (r) { return r.id; });
    /* INSERT ruxsat berilgan, SELECT javob qaytarmagan bo'lsa ham xabar navbatga tushgan */
    return ids.length ? ids : full.map(function () { return null; });
  }
  async function messageStatus(ids) {
    if (!ready() || !ids || !ids.length) return [];
    const res = await client.from('telegram_outbox').select('id, status').in('id', ids);
    if (res.error) throw res.error;
    return res.data || [];
  }

  /* --- auth_codes: bir martalik kodlar (ustoz 2FA, parolni tiklash) --- */
  async function saveAuthCode(row) {
    if (!ready() || !row) return null;
    try {
      const res = await client.from('auth_codes').insert({
        purpose: row.purpose || 'reset',
        student_id: row.studentId == null ? null : Number(row.studentId),
        contact: row.contact == null ? null : String(row.contact),
        code: String(row.code || ''),
        expires_at: row.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false
      }).select('*');
      if (res.error) throw res.error;
      return (res.data || [])[0] || {
        id: null,
        purpose: row.purpose || 'reset',
        student_id: row.studentId == null ? null : Number(row.studentId),
        contact: row.contact == null ? null : String(row.contact),
        code: String(row.code || ''),
        expires_at: row.expiresAt || new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false
      };
    } catch (e) {
      console.warn('[cloud] auth_codes insert:', (e && e.message) || e);
      return null;
    }
  }

  /* Kodni tekshiradi va ishlatilgan deb belgilaydi (bir marta amal qiladi) */
  async function consumeAuthCode(purpose, code) {
    if (!ready()) return null;
    const value = String(code || '').trim();
    if (!value) return null;
    try {
      const res = await client.from('auth_codes').select('*')
        .eq('purpose', purpose).eq('code', value).eq('used', false);
      if (res.error) throw res.error;
      const row = (res.data || []).slice().sort(function (a, b) { return Number(b.id) - Number(a.id); })[0];
      if (!row) return null;
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
      const upd = await client.from('auth_codes').update({ used: true }).eq('id', row.id);
      if (upd.error) throw upd.error;
      return row;
    } catch (e) {
      console.warn('[cloud] auth_codes check:', (e && e.message) || e);
      return null;
    }
  }

  /* --- email_outbox: sayt yozadi, bot Gmail (smtplib) orqali yuboradi --- */
  async function queueEmail(rows) {
    if (!ready() || !rows) return [];
    const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean).map(function (r) {
      return {
        to_email: String(r.to_email || r.to || ''),
        subject: String(r.subject || 'Bildirishnoma'),
        body_html: String(r.body_html || r.html || ''),
        status: 'pending'
      };
    }).filter(function (r) { return !!r.to_email; });
    if (!list.length) return [];
    try {
      const res = await client.from('email_outbox').insert(list).select('id');
      if (res.error) throw res.error;
      const ids = (res.data || []).map(function (r) { return r.id; });
      return ids.length ? ids : list.map(function () { return null; });
    } catch (e) {
      console.warn('[cloud] email_outbox:', (e && e.message) || e);
      return [];
    }
  }

    /* Telefon (oxirgi 9 raqam), Gmail yoki login bo'yicha o'quvchini topadi.
     Qidiruv serverda `.ilike` bilan bajariladi — "+998 90...", "99890..." va
     "90..." ko'rinishidagi raqamlar bir xil topiladi. */
  async function lookupStudentByContact(value) {
    if (!ready()) return null;
    const raw = String(value || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const digits = raw.replace(/\D/g, '');
    const last9 = digits.length >= 9 ? digits.slice(-9) : '';

    async function firstOf(build) {
      try {
        const res = await build();
        if (res.error) throw res.error;
        return (res.data && res.data[0]) || null;
      } catch (e) {
        console.warn('[cloud] students lookup:', (e && e.message) || e);
        return null;
      }
    }

    if (last9) {
      const byPhone = await firstOf(function () {
        return selectStudentRows(STUDENT_SYNC_COLS, function (q) {
          return q.ilike('phone', '%' + last9).limit(1);
        });
      });
      if (byPhone) return byPhone;
    }
    if (lower.indexOf('@') > 0) {
      const byMail = await firstOf(function () {
        return selectStudentRows(STUDENT_SYNC_COLS, function (q) {
          return q.ilike('email', lower).limit(1);
        });
      });
      if (byMail) return byMail;
    }
    return firstOf(function () {
      return selectStudentRows(STUDENT_SYNC_COLS, function (q) {
        return q.ilike('login', lower).limit(1);
      });
    });
  }

  /* Telefon/Gmail maydonlari (students.email / students.phone).
     Xato yashirilmaydi: { ok, error } qaytaradi. */
  async function updateStudentContactChecked(sid, fields) {
    if (!ready()) return { ok: false, error: "Bulut bilan aloqa yo'q (Supabase sozlanmagan)" };
    if (!fields) return { ok: false, error: 'Maydonlar berilmadi' };
    const st = studentById(sid);
    if (!st) return { ok: false, error: "O'quvchi topilmadi" };
    if (st.dbId == null) return { ok: false, error: "O'quvchi bazada saqlanmagan (dbId yo'q)" };
    const payload = {};
    if ('email' in fields) payload.email = fields.email ? String(fields.email) : null;
    if ('phone' in fields) payload.phone = fields.phone ? String(fields.phone) : null;
    if ('emailVerified' in fields) payload.email_verified = !!fields.emailVerified;
    if (!Object.keys(payload).length) return { ok: false, error: "Saqlanadigan maydon yo'q" };
    try {
      const res = await client.from('students').update(payload).eq('id', st.dbId);
      if (res.error) return { ok: false, error: res.error.message || String(res.error) };
      const list = getStudents();
      const t = list.filter(function (x) { return x.id === sid; })[0];
      if (t) {
        if ('email' in payload) t.email = payload.email || '';
        if ('phone' in payload) t.phone = payload.phone || '';
        if ('email_verified' in payload) t.emailVerified = !!payload.email_verified;
        store.set(K.students, list);
      }
      return { ok: true, error: '' };
    } catch (e) {
      return { ok: false, error: (e && e.message) || String(e) };
    }
  }

  /* Orqaga moslik: muvaffaqiyatsiz bo'lsa throw qiladi */
  async function updateStudentContact(sid, fields) {
    const r = await updateStudentContactChecked(sid, fields);
    if (!r.ok) throw new Error(r.error);
    return true;
  }

  /* --- monthly_fees: guruh uchun oyiga alohida to'lov summasi --- */
  async function pullMonthlyFees(groupDbId) {
    if (!ready()) return;
    try {
      let q = client.from('monthly_fees').select('*');
      if (groupDbId != null) q = q.eq('group_id', groupDbId);
      const res = await q;
      if (res.error) return;
      const rows = (res.data || []).map(function (r) {
        return { id: 'mf' + r.id, dbId: r.id, gid: 'g' + r.group_id,
                 period: r.period || '', amount: Number(r.amount) || 0 };
      });
      if (groupDbId != null) {
        const keep = getMonthlyFees().filter(function (x) { return x.gid !== 'g' + groupDbId; });
        store.set(K.monthlyFees, keep.concat(rows));
      } else {
        store.set(K.monthlyFees, rows);
      }
    } catch (e) { /* monthly_fees jadvali hali yaratilmagan */ }
  }

  async function saveMonthlyFee(gid, period, amount) {
    const g = groupById(gid);
    const per = String(period || '').slice(0, 7);
    const sum = Math.max(0, Math.round(Number(amount) || 0));
    if (!g || !/^\d{4}-\d{2}$/.test(per) || !sum) return false;
    const list = getMonthlyFees().filter(function (x) { return !(x.gid === gid && x.period === per); });
    const row = { id: 'mf' + Date.now(), dbId: null, gid: gid, period: per, amount: sum };
    list.push(row);
    store.set(K.monthlyFees, list);
    if (!ready() || g.dbId == null) return true;
    try {
      const res = await client.from('monthly_fees')
        .upsert({ group_id: g.dbId, period: per, amount: sum }, { onConflict: 'group_id,period' })
        .select();
      if (res.error) throw res.error;
      if (res.data && res.data[0]) row.dbId = res.data[0].id;
      store.set(K.monthlyFees, getMonthlyFees());
    } catch (e) { console.warn('[cloud] monthly fee:', (e && e.message) || e); }
    return true;
  }

  async function deleteMonthlyFee(gid, period) {
    store.set(K.monthlyFees, getMonthlyFees().filter(function (x) { return !(x.gid === gid && x.period === period); }));
    const g = groupById(gid);
    if (!ready() || !g || g.dbId == null) return;
    try {
      const res = await client.from('monthly_fees').delete().eq('group_id', g.dbId).eq('period', period);
      if (res.error) throw res.error;
    } catch (e) { console.warn('[cloud] monthly fee del:', (e && e.message) || e); }
  }

  /* --- payments: to'lovlar tarixi --- */
  async function pullPayments(dbId) {
    if (!ready()) return;
    try {
      let q = client.from('payments').select('*').order('created_at', { ascending: true });
      if (dbId != null) q = q.eq('student_id', dbId);
      const res = await q;
      if (res.error) return;
      store.set(K.payments, (res.data || []).map(function (r) {
        return {
          id: 'p' + r.id, dbId: r.id, sid: 's' + r.student_id,
          amount: Number(r.amount) || 0, note: r.note || '',
          period: r.period || String(r.created_at || '').slice(0, 7),
          createdAt: r.created_at || ''
        };
      }));
    } catch (e) { /* payments jadvali hali yaratilmagan */ }
  }

  async function addPayment(sid, dbId, amount, note, period) {
    const per = period || new Date().toISOString().slice(0, 7);
    const local = {
      id: 'p' + Date.now(), dbId: null, sid: sid,
      amount: Number(amount) || 0, note: note || '', period: per,
      createdAt: new Date().toISOString()
    };
    const list = getPayments(); list.push(local); store.set(K.payments, list);
    if (!ready() || dbId == null) return local;
    try {
      let res = await client.from('payments')
        .insert({ student_id: dbId, amount: Number(amount) || 0, note: note || '', period: per }).select();
      if (res.error && /period|schema cache|column/i.test(String(res.error.message || ''))) {
        /* period ustuni hali qo'shilmagan — eski sxema bilan */
        res = await client.from('payments')
          .insert({ student_id: dbId, amount: Number(amount) || 0, note: note || '' }).select();
      }
      if (res.error) throw res.error;
      if (res.data && res.data[0]) {
        local.dbId = res.data[0].id;
        store.set(K.payments, getPayments());
      }
    } catch (e) { console.warn('[cloud] payment:', (e && e.message) || e); }
    return local;
  }

  /* --- Zaxira: jadvallarni olish / qayta tiklash --- */
  const BACKUP_TABLES = ['groups', 'students', 'attendance', 'grades', 'messages', 'speaking_submissions',
    'audio_submissions', 'homework', 'speaking_slots', 'payments'];

  async function fetchBackup() {
    if (!ready()) return null;
    const out = {};
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const t = BACKUP_TABLES[i];
      try {
        const res = await client.from(t).select('*');
        if (res.error) {
          if (missing(res.error)) { out[t] = []; continue; }
          console.warn('[cloud] backup ' + t + ':', res.error.message);
          return null;
        }
        out[t] = res.data;
      } catch (e) {
        console.warn('[cloud] backup ' + t + ':', (e && e.message) || e);
        return null;
      }
    }
    return out;
  }

  async function restoreBackup(data) {
    if (!ready() || !data) return false;
    try {
      /* 1) avval bog'liq qatorlar, keyin asosiy jadvallar (FK uchun) */
      const delOrder = ['messages', 'grades', 'attendance', 'speaking_submissions', 'audio_submissions',
        'homework', 'speaking_slots', 'payments', 'students', 'groups'];
      for (let i = 0; i < delOrder.length; i++) {
        const res = await client.from(delOrder[i]).delete().gte('id', 0);
        if (res.error && !missing(res.error)) throw res.error;
      }
      /* 2) zaxiradan qayta yozish (ID saqlanadi) */
      const plan = [
        ['groups', ['id', 'name', 'days', 'time']],
        ['students', ['id', 'name', 'school_class', 'group_id', 'login', 'password', 'speaking_debt',
                      'voice_allowed', 'web_speaking_allowed', 'telegram_chat_id', 'last_device', 'last_seen']],
        ['speaking_slots', ['id', 'date', 'start_time', 'end_time', 'student_id', 'score', 'created_at']],
        ['homework', ['id', 'group_id', 'title', 'description', 'due_date', 'created_at']],
        ['attendance', ['id', 'student_id', 'date', 'status']],
        ['grades', ['id', 'student_id', 'date', 'grade', 'category', 'note']],
        ['messages', ['id', 'student_id', 'sender', 'text', 'created_at']],
        ['speaking_submissions', ['id', 'student_id', 'media_type', 'telegram_file_id', 'status', 'score', 'feedback', 'created_at']],
        ['audio_submissions', ['id', 'student_id', 'date', 'url', 'status', 'score', 'feedback', 'created_at']]
      ];
      const groupIds = {};
      (data.groups || []).forEach(g => { const n = toNumId(g && g.id); if (n != null) groupIds[n] = 1; });
      const studentIds = {};
      (data.students || []).forEach(x => { const n = toNumId(x && x.id); if (n != null) studentIds[n] = 1; });

      for (let i = 0; i < plan.length; i++) {
        const t = plan[i][0], cols = plan[i][1];
        const rows = [];
        (data[t] || []).forEach(r => {
          if (!r || typeof r !== 'object') return;
          const row = {};
          cols.forEach(c => { if (r[c] !== undefined) row[c] = r[c]; });
          if ('id' in row) { const n = toNumId(row.id); if (n == null) delete row.id; else row.id = n; }
          if ('group_id' in row && row.group_id != null) {
            const n = toNumId(row.group_id);
            row.group_id = n != null && groupIds[n] ? n : null;
          }
          if ('student_id' in row) {
            if (row.student_id == null && t === 'speaking_slots') {
              /* tayinlanmagan slot — bo'sh qoladi */
            } else {
              const n = toNumId(row.student_id);
              if (n == null || !studentIds[n]) return; /* yo'q o'quvchiga bog'langan qator — tashlanadi */
              row.student_id = n;
            }
          }
          rows.push(row);
        });
        if (!rows.length) continue;
        const res = await client.from(t).insert(rows);
        if (res.error) {
          if (missing(res.error)) continue;
          throw res.error;
        }
      }
      return true;
    } catch (e) {
      console.warn('[cloud] restore:', (e && e.message) || e);
      return false;
    }
  }

  /* --- Tozalash: bitta jadvaldagi barcha qatorlarni o'chirish --- */
  async function clearTable(tableKey) {
    if (!ready()) return true; /* lokal rejimda lokal tozalash yetarli */
    const tables = tableKey === 'speaking_submissions'
      ? ['speaking_submissions', 'audio_submissions']
      : [tableKey];
    try {
      for (let i = 0; i < tables.length; i++) {
        const res = await client.from(tables[i]).delete().gte('id', 0);
        if (res.error && !missing(res.error)) throw res.error;
      }
      return true;
    } catch (e) {
      console.warn('[cloud] clear ' + tableKey + ':', (e && e.message) || e);
      return false;
    }
  }

  /* Real-time: messages jadvaliga obuna (publication yo'l qo'ysa) */
  function subscribe() {
    if (!ready()) return;
    subscribeMessages();
    subscribeNotifications();
  }

  function subscribeMessages() {
    if (!hasMessages || subscribed) return;
    try {
      const ch = client.channel('messages-live');
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, function () { refreshChat(); })
        .subscribe(function (status) {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') subscribed = false;
        });
      subscribed = true;
    } catch (e) { subscribed = false; }
  }

  /* Real-time: bildirishnomalar uchun barcha tegishli jadvallar */
  function subscribeNotifications() {
    if (notifSubscribed) return;
    try {
      const ch = client.channel('notify-live');
      NOTIFY_TABLES.forEach(function (t) {
        ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: t },
            function (p) { onCloudNotifChange(t, p && p.new, null); })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: t },
            function (p) { onCloudNotifChange(t, p && p.new, p && p.old); });
      });
      ch.subscribe(function (status) {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') notifSubscribed = false;
      });
      notifSubscribed = true;
    } catch (e) { notifSubscribed = false; }
  }

  /* --- Xavfsizlik: oxirgi qurilma/vaqt + faol qurilmalar (user_sessions) --- */
  async function pushLastSeen(dbId, deviceName) {
    if (!ready() || dbId == null) return false;
    try {
      const res = await client.from('students')
        .update({ last_device: deviceName, last_seen: new Date().toISOString() })
        .eq('id', dbId);
      if (res.error) { if (missing(res.error)) return false; console.warn('[cloud] last_seen:', res.error.message); return false; }
      return true;
    } catch (e) { console.warn('[cloud] last_seen:', (e && e.message) || e); return false; }
  }

  function sessionRowOf(sess) {
    return {
      id: sess.id,
      user_type: sess.userType,
      user_id: sess.userId,
      device_name: sess.deviceName,
      last_active: sess.lastActive || new Date().toISOString()
    };
  }

  async function upsertSession(sess) {
    if (!ready()) return false;
    try {
      const res = await client.from('user_sessions').upsert(sessionRowOf(sess));
      if (res.error) { if (missing(res.error)) return false; console.warn('[cloud] session upsert:', res.error.message); return false; }
      return true;
    } catch (e) { console.warn('[cloud] session upsert:', (e && e.message) || e); return false; }
  }

  async function touchSession(id) {
    if (!ready()) return false;
    try {
      const res = await client.from('user_sessions')
        .update({ last_active: new Date().toISOString() }).eq('id', id);
      return !res.error;
    } catch (e) { return false; }
  }

  async function deleteSession(id) {
    if (!ready()) return false;
    try {
      const res = await client.from('user_sessions').delete().eq('id', id);
      return !res.error;
    } catch (e) { return false; }
  }

  async function listSessions(userType, userId) {
    if (!ready()) return null;
    try {
      const res = await client.from('user_sessions').select('*')
        .eq('user_type', userType).eq('user_id', userId)
        .order('last_active', { ascending: false });
      if (res.error) { if (missing(res.error)) return null; return null; }
      return res.data || [];
    } catch (e) { return null; }
  }

  /* Joriy qurilma seansda bormi? (lokal rejimda hech qachon chiqarmaydi) */
  async function sessionExists(id) {
    if (!ready()) return true;
    try {
      const res = await client.from('user_sessions').select('id').eq('id', id).limit(1);
      if (res.error) return true;
      return !!(res.data && res.data.length);
    } catch (e) { return true; }
  }

  /* --- Speaking slotlari (speaking_slots) --- */
  let hasSlots = true;
  async function pullSlots(studentDbId) {
    if (!ready() || !hasSlots) return;
    try {
      let q = client.from('speaking_slots').select('*');
      if (studentDbId != null) q = q.eq('student_id', studentDbId);
      const res = await q;
      if (res.error) { if (missing(res.error)) hasSlots = false; return; }
      const list = (res.data || []).map(function (r) {
        const st = getStudents().filter(function (x) { return x.dbId === r.student_id; })[0];
        return {
          id: 'sp' + r.id,
          dbId: r.id,
          date: r.date || '',
          start: String(r.start_time || '').slice(0, 5),
          end: String(r.end_time || '').slice(0, 5),
          studentId: st ? st.id : null,
          score: r.score == null ? null : Number(r.score)
        };
      });
      /* bulutga hali yozilmagan lokal slotlar saqlanadi */
      getSpeaking().forEach(function (x) { if (x.dbId == null) list.push(x); });
      store.set(K.speaking, list);
    } catch (e) { console.warn('[cloud] slots:', (e && e.message) || e); }
  }

  async function pushSlot(x) {
    if (!ready() || !hasSlots || !x) return;
    const st = x.studentId ? studentById(x.studentId) : null;
    const payload = {
      date: x.date,
      start_time: x.start,
      end_time: x.end,
      student_id: st && st.dbId != null ? st.dbId : null,
      score: x.score == null ? null : Number(x.score)
    };
    try {
      if (x.dbId == null) {
        const res = await client.from('speaking_slots').insert(payload).select();
        if (res.error) throw res.error;
        const list = getSpeaking();
        const t = list.filter(function (y) { return y.id === x.id; })[0];
        if (t && res.data && res.data[0]) { t.dbId = res.data[0].id; store.set(K.speaking, list); }
      } else {
        const res = await client.from('speaking_slots').update(payload).eq('id', x.dbId);
        if (res.error) throw res.error;
      }
    } catch (e) {
      if (e && e.code === 'PGRST205') hasSlots = false;
      console.warn('[cloud] slot:', (e && e.message) || e);
    }
  }

  async function deleteSlot(dbId) {
    if (!ready() || !hasSlots || dbId == null) return;
    try {
      const res = await client.from('speaking_slots').delete().eq('id', dbId);
      if (res.error) throw res.error;
    } catch (e) { console.warn('[cloud] slot del:', (e && e.message) || e); }
  }

  return {
    ready: ready,
    pullAll: pullAll,
    uploadHomeworkMedia: uploadHomeworkMedia,
    pullSubmissions: pullSubmissions,
    saveHomeworkSubmission: saveHomeworkSubmission,
    commentSubmission: commentSubmission,
    deleteSubmission: deleteSubmission,
    diagnostics: diagnostics,
    uploadSubmissionFile: uploadSubmissionFile,
    removeHomeworkMedia: removeHomeworkMedia,
    queueMessages: queueMessages,
    messageStatus: messageStatus,
    saveAuthCode: saveAuthCode,
    consumeAuthCode: consumeAuthCode,
    queueEmail: queueEmail,
    lookupStudentByContact: lookupStudentByContact,
    updateStudentContact: updateStudentContact,
    getSetting: getSetting,
    setSetting: setSetting,
    setSettingChecked: setSettingChecked,
    updateStudentContactChecked: updateStudentContactChecked,
    addPayment: addPayment,
    pullMonthlyFees: pullMonthlyFees,
    saveMonthlyFee: saveMonthlyFee,
    deleteMonthlyFee: deleteMonthlyFee,
    fetchMessages: fetchMessages,
    pushGroup: pushGroup,
    pushStudent: pushStudent,
    setWebSpeakingAllowed: setWebSpeakingAllowed,
    selectStudentRows: selectStudentRows,
    webSpeakingFromRow: webSpeakingFromRow,
    noteWebSpeaking: noteWebSpeaking,
    pushDebt: pushDebt,
    adjustDebt: adjustDebt,
    pushGrade: pushGrade,
    pushAttendance: pushAttendance,
    pullHomework: pullHomework,
    pushHomework: pushHomework,
    pullSpeaking: pullSpeaking,
    pushSpeakingGrade: pushSpeakingGrade,
    submitSpeakingVideo: submitSpeakingVideo,
    queueWebSpeakingNotice: queueWebSpeakingNotice,
    deleteSpeakingSubmission: deleteSpeakingSubmission,
    pullSlots: pullSlots,
    pushSlot: pushSlot,
    deleteSlot: deleteSlot,
    pullTeacherPassword: pullTeacherPassword,
    pushTeacherPassword: pushTeacherPassword,
    pullSupportTeachers: pullSupportTeachers,
    pushSupportTeachers: pushSupportTeachers,
    sendMessage: sendMessage,
    deleteSubmissionComment: deleteSubmissionComment,
    editMessage: editMessage,
    deleteMessage: deleteMessage,
    subscribe: subscribe,
    deleteStudent: deleteStudent,
    deleteGroup: deleteGroup,
    deleteHomework: deleteHomework,
    fetchBackup: fetchBackup,
    restoreBackup: restoreBackup,
    clearTable: clearTable,
    messagesAvailable: function () { return ready() && hasMessages; },
    pushLastSeen: pushLastSeen,
    upsertSession: upsertSession,
    touchSession: touchSession,
    deleteSession: deleteSession,
    listSessions: listSessions,
    sessionExists: sessionExists,
    pullCardSettings: pullCardSettings,
    saveCardSettings: saveCardSettings,
    uploadReceiptImage: uploadReceiptImage,
    submitPaymentReceipt: submitPaymentReceipt,
    pullStudentReceipts: pullStudentReceipts,
    deletePaymentReceipt: deletePaymentReceipt,
    deleteFileFromR2: deleteFileFromR2,
    addStudentPaymentRecord: addStudentPaymentRecord,
    url: url
  };
  async function addStudentPaymentRecord(studentDbId, groupDbId, monthKey, monthName, amount) {
    if (!ready() || studentDbId == null) return;
    try {
      await client.from('student_payments').insert({
        student_id: studentDbId,
        group_id: groupDbId,
        month_key: monthKey,
        month_name: monthName,
        amount_paid: Number(amount) || 0,
        is_paid: true,
        paid_at: new Date().toISOString(),
        note: monthName + " uchun to'lov"
      });
    } catch (e) {
      console.warn('[cloud] student_payments insert:', (e && e.message) || e);
    }
  }


  /* --- To'lov kartasi sozlamalari (bot_settings) --- */
  async function pullCardSettings() {
    if (!ready()) return store.get(K.cardSettings, { number: '', holder: '' });
    try {
      const res = await client.from('bot_settings').select('key, value').in('key', ['teacher_card_number', 'teacher_card_holder']);
      if (res.error) return store.get(K.cardSettings, { number: '', holder: '' });
      const cur = store.get(K.cardSettings, { number: '', holder: '' });
      (res.data || []).forEach(r => {
        if (r.key === 'teacher_card_number') cur.number = r.value || '';
        if (r.key === 'teacher_card_holder') cur.holder = r.value || '';
      });
      store.set(K.cardSettings, cur);
      return cur;
    } catch (e) {
      return store.get(K.cardSettings, { number: '', holder: '' });
    }
  }

  async function saveCardSettings(number, holder) {
    const cleanNum = String(number || '').trim();
    const cleanHolder = String(holder || '').trim().toUpperCase();
    const cur = { number: cleanNum, holder: cleanHolder };
    store.set(K.cardSettings, cur);
    if (!ready()) return true;
    try {
      await client.from('bot_settings').upsert([
        { key: 'teacher_card_number', value: cleanNum },
        { key: 'teacher_card_holder', value: cleanHolder }
      ], { onConflict: 'key' });
      return true;
    } catch (e) {
      console.warn('[cloud] saveCardSettings:', (e && e.message) || e);
      return false;
    }
  }

  /* --- To'lov chekini Supabase Storage'ga yuklash va bazaga yozish --- */
  /* --- To'lov chekini R2'ga yuklash va bazaga yozish --- */
  async function uploadReceiptImage(file) {
    return uploadFileToR2(file, 'receipts');
  }

  async function submitPaymentReceipt(studentDbId, monthKey, amount, receiptUrl) {
    if (!ready() || studentDbId == null) return null;
    try {
      const res = await client.from('payment_receipts').insert({
        student_id: studentDbId,
        month_key: monthKey,
        amount: Number(amount) || 0,
        receipt_url: receiptUrl,
        status: 'kutilmoqda'
      }).select();
      if (res.error) throw res.error;
      const row = res.data && res.data[0] ? res.data[0] : null;
      if (row) {
        const list = store.get(K.paymentReceipts, []);
        list.unshift(row);
        store.set(K.paymentReceipts, list);
      }
      return row;
    } catch (e) {
      console.warn('[cloud] submitPaymentReceipt:', (e && e.message) || e);
      throw e;
    }
  }

  /* To'lov chekini o'chirish: avval R2/Storage fayli, keyin payment_receipts qatori */
  async function deletePaymentReceipt(id, receiptUrl) {
    const raw = String(receiptUrl || '');
    if (isR2Url(raw)) {
      await deleteFileFromR2(raw);
    } else if (raw) {
      const found = mediaPath(raw);
      const filePath = found && found.path ? found.path : raw.split('?')[0];
      if (filePath) {
        const buckets = found
          ? [found.bucket].concat(MEDIA_BUCKETS.filter(function (b) { return b !== found.bucket; }))
          : MEDIA_BUCKETS;
        for (let i = 0; i < buckets.length; i++) {
          try {
            const rm = await client.storage.from(buckets[i]).remove([filePath]);
            if (!rm.error) break;
          } catch (e) { console.warn('[cloud] receipt del (' + buckets[i] + '):', (e && e.message) || e); }
        }
      }
    }
    if (!ready() || id == null) return;
    const res = await client.from('payment_receipts').delete().eq('id', id);
    if (res.error) throw res.error;
    store.set(K.paymentReceipts, (store.get(K.paymentReceipts, []) || [])
      .filter(function (x) { return String(x.id) !== String(id); }));
  }

  async function pullStudentReceipts(studentDbId) {
    if (!ready() || studentDbId == null) return store.get(K.paymentReceipts, []);
    try {
      const res = await client.from('payment_receipts').select('*')
        .eq('student_id', studentDbId).order('created_at', { ascending: false });
      if (res.error) return store.get(K.paymentReceipts, []);
      store.set(K.paymentReceipts, res.data || []);
      return res.data || [];
    } catch (e) {
      return store.get(K.paymentReceipts, []);
    }
  }

})();

window.__cloud = CloudSync;

/* ==================== QURILMA VA FAOL QURILMALAR (xavfsizlik nazorati) ==================== */
/* Brauzer nomi: 'Chrome', 'Safari', 'Edge' ... */
function detectBrowserName(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Brauzer';
}

/* Aniq qurilma modeli (SM-A546B, Redmi Note 12, Pixel 8) — bir marta aniqlanadi
   va sessionStorage'da kesh qilinadi, keyin detectDevice() darhol qaytaradi. */
let _resolvedDevice = '';
const DEVICE_MODEL_KEY = 'et_device_model';

function cachedDeviceModel() {
  if (_resolvedDevice) return _resolvedDevice;
  try {
    const v = window.sessionStorage && window.sessionStorage.getItem(DEVICE_MODEL_KEY);
    if (v) _resolvedDevice = v;
  } catch (e) {}
  return _resolvedDevice;
}

function setDeviceModel(model) {
  _resolvedDevice = model ? String(model) : '';
  try {
    if (!window.sessionStorage) return;
    if (_resolvedDevice) window.sessionStorage.setItem(DEVICE_MODEL_KEY, _resolvedDevice);
    else window.sessionStorage.removeItem(DEVICE_MODEL_KEY);
  } catch (e) {}
}

/* Modelni aniqlaydi: 1) userAgentData (high entropy) 2) UA ichidagi '... Build/'
   Topilmasa bo'sh satr — detectDevice() iPhone/Mac/Windows kabi umumiy nom qoldiradi. */
async function resolveDeviceModel() {
  const known = cachedDeviceModel();
  if (known) return known;
  const ua = (navigator && navigator.userAgent) || '';
  let model = '';
  try {
    const uad = navigator.userAgentData;
    if (uad && typeof uad.getHighEntropyValues === 'function') {
      const hv = await uad.getHighEntropyValues(['model', 'platform', 'platformVersion']);
      if (hv && hv.model) model = String(hv.model).trim();
    }
  } catch (e) {}
  if (!model) {
    const m = ua.match(/;\s*([^;)]+?)\s+Build\//);
    if (m) {
      const cand = m[1].trim();
      if (cand && !/^Android$/i.test(cand)) model = cand;
    }
  }
  if (model) setDeviceModel(model);
  return model;
}

/* Aniq modelni ko'rsatish uchun: 'SM-A546B (Chrome)' -> 'SM-A546B \u2022 Chrome' */
function deviceShortLabel(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const m = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  return m ? (m[1].trim() + ' \u2022 ' + m[2].trim()) : raw;
}

/* Qurilma nomi: model topilsa 'SM-A546B \u2022 Chrome', aks holda 'Android \u2022 Chrome' */
function detectDevice() {
  const ua = (navigator && navigator.userAgent) || '';
  let os = 'Boshqa qurilma';
  if (/iPhone/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua)) os = 'iPad';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Windows/.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac';
  else if (/Linux/.test(ua)) os = 'Linux';
  const br = detectBrowserName(ua);
  const model = cachedDeviceModel();
  const label = model || os;
  return { os: os, br: br, model: model, name: label + ' (' + br + ')', short: label + ' \u2022 ' + br };
}

/* Takrorlanmas session_id (UUID v4) — har bir qurilma uchun bir marta saqlanadi */
function uuidV4() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function getSessionId() {
  let id = store.get(K.sessionId, null);
  if (!id) { id = uuidV4(); store.set(K.sessionId, id); }
  return id;
}

/* Vaqt ko'rinishi: 'hozirgina' / '20 daqiqa oldin' / '3 soat oldin' / '2 kun oldin' */
function timeAgoText(iso) {
  const t = new Date(iso).getTime();
  if (!t || isNaN(t)) return '\u2014';
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  const en = getLang() === 'en';
  if (m < 1) return en ? 'Just now' : 'hozirgina';
  if (m < 60) return en ? (m + ' min ago') : (m + ' daqiqa oldin');
  const h = Math.floor(m / 60);
  if (h < 24) return en ? (h + ' hours ago') : (h + ' soat oldin');
  const d = Math.floor(h / 24);
  return en ? (d + ' days ago') : (d + ' kun oldin');
}

/* O'quvchi kartasi satri: 5 daqiqa ichida -> 'Onlayn: SM-A546B \u2022 Chrome',
   aks holda -> '20 daqiqa oldin \u2022 SM-A546B'. Model to'liq, kesilmaydi. */
function presenceIsOnline(s) {
  if (!s || !s.lastSeen) return false;
  const ts = new Date(s.lastSeen).getTime();
  if (!ts || isNaN(ts)) return false;
  return (Date.now() - ts) / 60000 < 5;
}
function presenceText(s) {
  if (!s || !s.lastSeen) return '';
  const ts = new Date(s.lastSeen).getTime();
  if (!ts || isNaN(ts)) return '';
  const full = deviceShortLabel(s.lastDevice) || t('qurilma');
  const model = full.split(' \u2022 ')[0];
  const icon = ico('smartphone', 14);
  if (presenceIsOnline(s)) return icon + ' ' + t('Onlayn') + ': ' + esc(full);
  return icon + ' ' + esc(timeAgoText(s.lastSeen) + ' \u2022 ' + model);
}
function presenceHTML(s) {
  const txt = presenceText(s);
  if (!txt) return '';
  return '<div class="s-presence' + (presenceIsOnline(s) ? ' is-on' : '') + '">' + txt + '</div>';
}

/* Lokal (localStorage) ga oxirgi qurilma/vaqt — kartalar offline ham ko'radi */
function updateLocalPresence(deviceName) {
  const u = currentUser();
  if (!u || !u.studentId) return;
  const list = getStudents();
  const st = list.filter(function (x) { return x.id === u.studentId; })[0];
  if (!st) return;
  st.lastDevice = deviceName || '';
  st.lastSeen = new Date().toISOString();
  store.set(K.students, list);
}

const Sessions = {
  list: [],
  enabled: function () { return CloudSync.ready(); },

  /* Login paytida: user_sessions ga seans + students.last_device/last_seen */
  onLogin: async function () {
    const u = currentUser();
    if (!u) return;
    await resolveDeviceModel();
    const dev = detectDevice();
    updateLocalPresence(dev.name);
    if (!this.enabled()) return;
    const id = getSessionId();
    await CloudSync.upsertSession({
      id: id,
      userType: u.role === 'teacher' ? 'teacher' : 'student',
      userId: u.login,
      deviceName: dev.short,
      lastActive: new Date().toISOString()
    });
    if (u.studentId) {
      const st = studentById(u.studentId);
      if (st && st.dbId != null) await CloudSync.pushLastSeen(st.dbId, dev.name);
    }
    this.refresh();
  },

  /* Harakat -> oxirgi faoliyat (60s throttle bilan chaqiriladi) */
  touch: async function () {
    const u = currentUser();
    if (!u) return;
    await resolveDeviceModel();
    const dev = detectDevice();
    updateLocalPresence(dev.name);
    if (!this.enabled()) return;
    CloudSync.touchSession(getSessionId());
    if (u.studentId) {
      const st = studentById(u.studentId);
      if (st && st.dbId != null) CloudSync.pushLastSeen(st.dbId, dev.name);
    }
  },

  /* Profil uchun seanslar ro'yxati */
  refresh: async function () {
    const u = currentUser();
    if (!u) { this.list = []; return this.list; }
    if (!this.enabled()) return this.list;
    const rows = await CloudSync.listSessions(u.role === 'teacher' ? 'teacher' : 'student', u.login);
    if (rows == null) return this.list;
    const changed = JSON.stringify(rows) !== JSON.stringify(this.list);
    this.list = rows;
    if (changed && state.screen === 'profile') render();
    return rows;
  },

  /* Har 30 soniyada: joriy qurilma seansda bormi? O'chirilgan bo'lsa — majburiy chiqish */
  check: async function () {
    const u = currentUser();
    if (!u || !this.enabled()) return true;
    const id = getSessionId();
    const exists = await CloudSync.sessionExists(id);
    if (exists === false) { forcedLogout(); return false; }
    CloudSync.touchSession(id);
    return true;
  },

  /* O'z seansimizni o'chirish (oddiy chiqish) */
  onLogout: function () {
    if (this.enabled()) CloudSync.deleteSession(getSessionId());
    this.list = [];
  },

  /* Boshqa qurilmani chiqarib yuborish */
  remove: async function (id) {
    if (!id) return;
    this.list = this.list.filter(function (s) { return s.id !== id; });
    if (this.enabled()) { await CloudSync.deleteSession(id); await this.refresh(); }
    else if (state.screen === 'profile') render();
    toast('Qurilma chiqarib yuborildi');
  },

  /* Barcha boshqa qurilmalardan chiqish */
  removeAllOthers: async function () {
    const cur = getSessionId();
    const others = this.list.filter(function (s) { return s.id !== cur; });
    this.list = this.list.filter(function (s) { return s.id === cur; });
    if (this.enabled()) {
      for (let i = 0; i < others.length; i++) await CloudSync.deleteSession(others[i].id);
      await this.refresh();
    } else if (state.screen === 'profile') render();
    toast(others.length ? 'Boshqa qurilmalar chiqarib yuborildi' : "Boshqa qurilmalar yo'q");
  }
};

/* Boshqa qurilmadan chiqarildik: localStorage tozalanib, login ekraniga qaytamiz */
function forcedLogout() {
  Sessions.list = [];
  analyticsCall('reset');
  /* Faqat shu ilovaning kalitlari tozalanadi */
  try {
    Object.keys(K).forEach(function (k) { localStorage.removeItem(K[k]); });
  } catch (e) {}
  state.attDraft = null;
  state.editor = null;
  state.forcedOut = true;
  state.loginError = '';
  state.screen = 'login';
  closeModal();
  state.authStep = 'login';
  render();
  scrollAuthTop();
  toast('Siz ushbu qurilmadan chiqarildingiz!', 'error');
}

/* Profil: Faol qurilmalar bloki */
function sessionsSectionHTML() {
  const dev = detectDevice();
  const cur = getSessionId();
  const others = (Sessions.list || []).filter(function (s) { return s.id !== cur; });
  return `
  <div class="section-title">${ico('smartphone', 15)} ${t('Faol qurilmalar')}</div>
  <div class="card list-card" id="sessions-card">
    <div class="list-row session-row is-current">
      <span class="session-info">
        <span class="session-name"><span class="sess-dot"></span>${ico('smartphone', 14)}${t('Bu qurilma')} (${esc(dev.short)})</span>
        <span class="muted small">${t('joriy sessiya')}</span>
      </span>
    </div>
    ${others.length ? others.map(function (s) {
      return `
    <div class="list-row session-row">
      <span class="session-info">
        <span class="session-name">${ico('smartphone', 14)}${esc(s.device_name || t("Noma'lum qurilma"))}</span>
        <span class="muted small">${esc(timeAgoText(s.last_active))}</span>
      </span>
      <button type="button" class="btn btn-xs danger" data-act="session-logout" data-sess="${esc(s.id)}">${t('Chiqarib yuborish')}</button>
    </div>`;
    }).join('') : `
    <div class="list-row"><span class="muted small">${t('Boshqa qurilmalar ulanmagan')}</span></div>`}
  </div>
  ${others.length ? `<button type="button" class="btn btn-danger btn-block" data-act="session-logout-all">${ico('alert', 16)} ${t('Barcha boshqa qurilmalardan chiqish')}</button>` : ''}
  `;
}

window.__sessions = {
  detectDevice: detectDevice,
  resolveDeviceModel: resolveDeviceModel,
  resetDeviceModel: function () { setDeviceModel(''); },
  getSessionId: getSessionId,
  timeAgoText: timeAgoText,
  presenceText: presenceText,
  sessions: Sessions,
  forcedLogout: forcedLogout
};


/* ---- Analitika (js/analytics.js) — xato bo'lsa ham ilova ishlayveradi ---- */
function analyticsCall(name, arg1, arg2) {
  try {
    const a = window.Analytics;
    if (!a || typeof a[name] !== 'function') return;
    a[name](arg1, arg2);
  } catch (e) { /* analitika hech qachon oqimni to'xtatmaydi */ }
}
function analyticsConsent() {
  try {
    const a = window.Analytics;
    return !!(a && a.consent && a.consent.granted());
  } catch (e) { return false; }
}

/* ---- Hisob va sessiya (login/parol) ---- */
function getSession() { return store.get(K.session, null); }
function currentUser() {
  const s = getSession();
  if (!s || !s.login) return null;
  if (accounts[s.login]) return Object.assign({}, accounts[s.login], s);
  return s;
}
function isTeacher() {
  const u = currentUser();
  return !!u && u.role === 'teacher';
}
function linkedStudent() {
  const u = currentUser();
  if (!u || !u.studentId) return null;
  return studentById(u.studentId);
}

/* ==================== SUPPORT TEACHER (yordamchi o'qituvchi) ====================
   Asosiy o'qituvchi support teacher qo'shadi, unga guruhlar biriktiradi va
   ruxsatlarni belgilaydi. Support teacher faqat o'z guruhlari va ruxsat
   etilgan bo'limlarda ishlaydi. Ro'yxat bulutda bot_settings orqali saqlanadi. */
const SUPPORT_PERM_LIST = [
  { key: 'students', label: "O'quvchilar paneli", hint: "Biriktirilgan guruh o'quvchilari" },
  { key: 'speaking', label: 'Speaking slotlari', hint: 'Slot yaratish va baholash' },
  { key: 'attendance', label: 'Davomat', hint: 'Davomat belgilash' },
  { key: 'homework', label: 'Uyga vazifa kiritish', hint: 'Vazifa berish va tahrirlash' },
  { key: 'grades', label: 'Baholar kiritish', hint: 'Baholar jurnaliga yozish' },
  { key: 'mock', label: 'Mock test kiritish', hint: 'Mock test yaratish va baholash' },
  { key: 'submissions', label: 'Topshiriqlar', hint: "Bajarilgan ishlarni ko'rish va izoh yozish" }
];
const SUPPORT_SCREEN_PERM = {
  groups: 'students',
  students: 'students',
  homework: 'homework',
  submissions: 'submissions',
  grades: 'grades',
  attendance: 'attendance',
  speaking: 'speaking',
  mock: 'mock'
};
function isSupport() {
  const u = currentUser();
  return !!u && u.role === 'support';
}
function isStaff() { return isTeacher() || isSupport(); }
function supportTeachers() {
  const list = store.get(K.support, []);
  return Array.isArray(list) ? list : [];
}
function persistSupportTeachers(list) {
  store.set(K.support, Array.isArray(list) ? list : []);
  try { if (CloudSync && CloudSync.pushSupportTeachers) CloudSync.pushSupportTeachers(list); } catch (e) {}
}
function supportTeacherByLogin(login) {
  const l = String(login || '').trim().toLowerCase();
  if (!l) return null;
  return supportTeachers().filter(function (r) {
    return String(r.login || '').trim().toLowerCase() === l;
  })[0] || null;
}
function supportTeacherById(id) {
  return supportTeachers().filter(function (r) { return String(r.id) === String(id); })[0] || null;
}
function supportPermsOf(rec) {
  const perms = {};
  SUPPORT_PERM_LIST.forEach(function (p) {
    perms[p.key] = !rec || !rec.perms ? true : rec.perms[p.key] !== false;
  });
  return perms;
}
function supportRecord() {
  if (!isSupport()) return null;
  const u = currentUser() || {};
  return supportTeacherByLogin(u.login);
}
function supportPerm(key) {
  if (isTeacher()) return true;
  const rec = supportRecord();
  if (!rec) return false;
  return supportPermsOf(rec)[key] === true;
}
/* Ekran/bo'lim ruxsati: asosiy ustoz hamma joyda, support — ruxsat bo'lsa */
function canStaff(permKey) {
  if (isTeacher()) return true;
  if (!isSupport()) return false;
  return permKey ? supportPerm(permKey) : true;
}
function supportRecordGroupIds(rec) {
  return (rec && Array.isArray(rec.groupIds) ? rec.groupIds : []).map(String);
}
function supportGroupIdsAll() {
  const out = {};
  supportTeachers().forEach(function (r) {
    supportRecordGroupIds(r).forEach(function (id) { out[id] = 1; });
  });
  return out;
}
function supportTeacherOfGroup(gid) {
  const id = String(gid == null ? '' : gid);
  if (!id) return null;
  return supportTeachers().filter(function (r) {
    return supportRecordGroupIds(r).indexOf(id) >= 0;
  })[0] || null;
}
/* Ko'rinadigan guruhlar: support — faqat o'z guruhlari; asosiy ustoz —
   support guruhlari faqat "Support teacherni nazorat qilish" rejimida. */
function scopedGroups() {
  const all = getGroups();
  if (isSupport()) {
    const ids = supportRecordGroupIds(supportRecord());
    return all.filter(function (g) { return ids.indexOf(String(g.id)) >= 0; });
  }
  if (state.supervise) return all;
  const hidden = supportGroupIdsAll();
  return all.filter(function (g) { return !hidden[String(g.id)]; });
}
function scopedStudents() {
  if (isSupport()) {
    const ids = supportRecordGroupIds(supportRecord());
    return getStudents().filter(function (s) { return ids.indexOf(String(s.groupId)) >= 0; });
  }
  if (state.supervise) return getStudents();
  const hidden = supportGroupIdsAll();
  return getStudents().filter(function (s) { return !hidden[String(s.groupId)]; });
}
function supportGroupsText(rec) {
  const ids = supportRecordGroupIds(rec);
  if (!ids.length) return t('Guruh biriktirilmagan');
  return ids.map(function (id) {
    const g = groupById(id);
    return g ? g.name : id;
  }).join(', ');
}
function startSession(userObj) {
  const sess = typeof userObj === 'object' ? userObj : {
    login: userObj,
    role: (accounts[userObj] && accounts[userObj].role) || (userObj === TEACHER_LOGIN ? 'teacher' : 'student'),
    name: (accounts[userObj] && accounts[userObj].name) || '',
    studentId: (accounts[userObj] && accounts[userObj].studentId) || null
  };
  store.set(K.session, sess);
  /* mavjud hisob yozuvidagi parol xeshi (faqat xotirada) yo'qolmasin */
  accounts[sess.login] = Object.assign({}, accounts[sess.login] || {}, sess);
  state.screen = 'home';
  render();
  /* Boshqa qurilmadan kirgan bo'lsak — bulutdan ma'lumotni tiklandi (doLogin) */
  CloudSync.subscribe();
  refreshChat();
  /* Bildirishnomalar ruxsati hali so'ralmagan bo'lsa — so'raymiz (salomdan keyin) */
  Notif.afterLogin();
  /* Xavfsizlik: sessiya + oxirgi qurilma/vaqt yoziladi (user_sessions / students) */
  state.forcedOut = false;
  state.loginError = '';
  Sessions.onLogin();
  /* Analitika: kirish (faqat rozilik berilgan bo'lsa) — hisob logini yuborilmaydi */
  const anon = linkedStudent();
  analyticsCall('onLogin', {
    account: sess.login,
    role: (accounts[sess.login] && accounts[sess.login].role) || sess.role,
    hasGroup: !!(anon && anon.groupId),
    surface: tg ? 'telegram' : 'browser'
  });
}
function go(screen) {
  state.screen = screen;
  render();
  /* Faol qurilmalar ro'yxatini yangilash (Profil ekrani) */
  if (screen === 'profile') Sessions.refresh();
  /* Ekranni bulutdan yangilaymiz (bir martalik pull — 5 soniyalik loop'siz) */
  if (!CloudSync.ready()) return;
  if (screen === 'home') {
    const hw0 = JSON.stringify(getHomework());
    const tg0 = JSON.stringify(getTgSubs());
    const sp0 = JSON.stringify(getSpeaking());
    const stu = linkedStudent();
    const slotsDbId = isTeacher() ? null : (stu && stu.dbId != null ? stu.dbId : null);
    Promise.all([CloudSync.pullHomework(), CloudSync.pullSpeaking(), CloudSync.pullSlots(slotsDbId)]).then(function () {
      if (JSON.stringify(getHomework()) !== hw0 || JSON.stringify(getTgSubs()) !== tg0 ||
          JSON.stringify(getSpeaking()) !== sp0) render();
    }).catch(function () {});
  } else if (screen === 'speaking' && isTeacher()) {
    const tg0 = JSON.stringify(getTgSubs());
    const sp0 = JSON.stringify(getSpeaking());
    Promise.all([CloudSync.pullSpeaking(), CloudSync.pullSlots(null)]).then(function () {
      if (JSON.stringify(getTgSubs()) !== tg0 || JSON.stringify(getSpeaking()) !== sp0) render();
    }).catch(function () {});
  } else if (screen === 'mock') {
    const mk0 = JSON.stringify(mockResults());
    const md0 = JSON.stringify(mockDefs());
    MockSync.pullAll().then(function () {
      if (JSON.stringify(mockResults()) !== mk0 || JSON.stringify(mockDefs()) !== md0) render();
    }).catch(function () {});
  }
}

function suggestLogin(fullName) {
  const base = String(fullName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
  let candidate = base;
  let n = 1;
  while (accounts[candidate]) { candidate = base + (++n); }
  return candidate;
}

/* ---- Toast ---- */
function toast(msg, type) {
  msg = i18nText(msg, getLang()) || msg;
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

/* Tugmali toast — masalan bildirishnoma ruxsati so'rovi */
function toastAction(msg, actionLabel, onAction) {
  const el = $('#toast');
  if (!el) return;
  clearTimeout(state.toastTimer);
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg + ' '));
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toast-action';
  btn.textContent = actionLabel;
  btn.addEventListener('click', function () {
    clearTimeout(state.toastTimer);
    el.className = 'toast';
    el.innerHTML = '';
    onAction();
  });
  el.appendChild(btn);
  el.className = 'toast show toast--action';
  state.toastTimer = setTimeout(function () { el.className = 'toast'; }, 15000);
}

/* ==================== Brauzer bildirishnomalari (Web Push) ====================
   Bloklangan bo'lsa — jim o'tamiz: barcha ogohlantirishlar UI (toast) va
   Telegram botda qolaveradi. */
const Notif = (function () {
  const ICON_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="14" fill="#2563eb"/>' +
    '<circle cx="32" cy="32" r="15" fill="#fff" opacity=".92"/></svg>'
  );
  const PROMPT_TEXT = 'Yangi baholar va xabarlarni o\'tkazib yubormaslik uchun bildirishnomalarni yoqing';
  const PROMPT_BUTTON = 'Ruxsat berish';
  const shown = Object.create(null); /* bitta hodisa bir marta ko'rsatiladi */

  function supported() {
    return typeof window !== 'undefined' && typeof window.Notification !== 'undefined';
  }
  function permission() { return supported() ? window.Notification.permission : 'denied'; }
  function granted() { return supported() && window.Notification.permission === 'granted'; }
  function blocked() { const p = permission(); return p === 'denied' || p === 'default'; }

  function show(title, body) {
    if (!granted()) return false;
    try {
      new window.Notification(title, { body: body, icon: ICON_URL });
      return true;
    } catch (e) {
      /* ba'zi brauzerlar (yoki HTTPS emas) Notification quruvchisini tashlaydi */
      console.warn('[notif]', (e && e.message) || e);
      return false;
    }
  }

  /* key — qatorning yagona id'si; ruxsat hali 'default' bo'lsa ko'rsatmaymiz,
     lekin kalitni ham yozmaymiz — ruxsat berilgach keyingi realtime yangilikda chiqadi. */
  function notifyOnce(key, title, body) {
    if (!key || shown[key]) return false;
    if (!granted()) return false;
    shown[key] = true;
    return show(title, body);
  }

  function request() {
    if (!supported()) return;
    if (granted()) { toast('Bildirishnomalar yoqildi'); return; }
    if (permission() === 'denied') { toast("Brauzerda bildirishnomalar bloklangan", 'error'); return; }
    const onDone = function (p) {
      if (p === 'granted') toast('Bildirishnomalar yoqildi');
      else toast("Bildirishnomalar o'chirib qoldi", 'error');
    };
    try {
      const r = window.Notification.requestPermission(onDone);
      if (r && typeof r.then === 'function') { r.then(onDone).catch(function () {}); }
    } catch (e) { console.warn('[notif] request:', (e && e.message) || e); }
  }

  function showPrompt() {
    if (permission() !== 'default') return false;
    toastAction(t(PROMPT_TEXT), t(PROMPT_BUTTON), request);
    return true;
  }

  /* Kirganda: ruxsat so'ralmagan bo'lsa — do'stona so'rov (salomdan keyin) */
  function afterLogin(delayMs) {
    if (permission() !== 'default') return false;
    setTimeout(showPrompt, typeof delayMs === 'number' ? delayMs : 2800);
    return true;
  }

  function resetSeen() {
    Object.keys(shown).forEach(function (k) { delete shown[k]; });
  }

  return {
    supported: supported,
    permission: permission,
    granted: granted,
    blocked: blocked,
    show: show,
    notifyOnce: notifyOnce,
    request: request,
    showPrompt: showPrompt,
    afterLogin: afterLogin,
    resetSeen: resetSeen,
    PROMPT_TEXT: PROMPT_TEXT,
    PROMPT_BUTTON: PROMPT_BUTTON
  };
})();
window.Notif = Notif;

/* Supabase realtime → brauzer bildirishnomasi.
   Har bir hodisada faqat qabul qiluvchi tomon ogohlantiriladi:
   ustoz yozgan xabar o'quvchiga, o'quvchi yozgan xabar ustozga va h.k. */
function onCloudNotifChange(table, row, old) {
  if (!row) return;

  if (table === 'grades') {
    const st = linkedStudent();
    if (!st || st.dbId == null || row.student_id !== st.dbId) return;
    Notif.notifyOnce('grade:' + row.id,
      TEACHER_NAME + ': Sizga yangi baho qo\'yildi (' + row.grade + '/10)!');
    return;
  }

  if (table === 'homework') {
    const st = linkedStudent();
    if (!st) return;
    const g = groupById(st.groupId);
    if (!g || g.dbId == null || row.group_id == null || row.group_id !== g.dbId) return;
    Notif.notifyOnce('hw:' + row.id, 'Yangi uyga vazifa: ' + String(row.title || ''));
    return;
  }

  if (table === 'students') {
    /* --- Jonli speaking qarz badge'i (masalan 2 → 1) — sahifani yangilashsiz --- */
    if (row.speaking_debt != null) {
      const dl = getStudents();
      const dt = dl.filter(function (x) { return x.dbId === row.id; })[0];
      const nd = Number(row.speaking_debt) || 0;
      if (dt && (Number(dt.speakingDebt) || 0) !== nd) {
        dt.speakingDebt = nd;
        store.set(K.students, dl);
        if (state.screen === 'speaking' || state.screen === 'students' ||
            (!isTeacher() && state.screen === 'home')) render();
      }
    }

    const st = linkedStudent();
    if (!st || st.dbId == null || row.id !== st.dbId) return;
    /* Ikkala ruxsatni ham real vaqtda sinxronlaymiz (sayt ruxsati voice'dan mustaqil) */
    const voiceNow = typeof row.voice_allowed === 'undefined'
      ? st.voiceAllowed === true
      : row.voice_allowed === true;
    const webNow = CloudSync.webSpeakingFromRow(row, st.webSpeakingAllowed);
    const was = old && typeof old.voice_allowed !== 'undefined'
      ? old.voice_allowed
      : st.voiceAllowed;
    const webWas = old && typeof old.web_speaking_allowed !== 'undefined'
      ? old.web_speaking_allowed
      : st.webSpeakingAllowed;
    if (was === voiceNow && webWas === webNow) return;
    const list = getStudents();
    const t = list.filter(function (x) { return x.id === st.id; })[0];
    if (t) {
      t.voiceAllowed = voiceNow;
      t.webSpeakingAllowed = webNow;
      store.set(K.students, list);
    }
    if (typeof row.web_speaking_allowed !== 'undefined') {
      CloudSync.noteWebSpeaking(row.id, webNow);
    }
    if (voiceNow && was !== true) {
      Notif.notifyOnce('voice:' + row.id,
        TEACHER_NAME + ': Ovozli speaking topshirishga ruxsat berildi!');
    }
    if (webNow && webWas !== true) {
      Notif.notifyOnce('webspeak:' + row.id,
        TEACHER_NAME + ': Saytda speaking topshirishga ruxsat berildi!');
    }
    render();
    return;
  }

  if (table === 'messages') {
    const txt = String(row.text || '');
    if (row.sender === 'teacher') {
      const st = linkedStudent();
      if (!st || st.dbId == null || row.student_id !== st.dbId) return;
      Notif.notifyOnce('msg:' + row.id,
        TEACHER_NAME + 'dan yangi xabar: ' + txt);
    } else if (row.sender === 'student') {
      if (!isTeacher()) return;
      const s = getStudents().filter(function (x) { return x.dbId === row.student_id; })[0];
      if (!s) return;
      Notif.notifyOnce('msg:' + row.id, s.fullName + ': Yangi xabar keldi');
    }
    /* Realtime: tahrir/o'chirish/yangi xabar — ochiq suhbatni darhol yangilaymiz */
    const stuRow = linkedStudent();
    const chatSid = isTeacher() ? (state.chatSid || '') : (stuRow ? stuRow.id : '');
    if (chatSid && chatSid === 's' + row.student_id && state.screen === 'home') {
      if (!isTeacher() && state.studentView === 'chat') markChatSeen(chatSid);
      refreshChat();
    }
    return;
  }

  if (table === 'speaking_submissions') {
    /* --- Jonli INBOX (zero refresh):
       INSERT → yangi topshirik karta darhol INBOX boshiga chiqadi;
       UPDATE (baholangan) → karta INBOXdan silliq chiqib ketadi. --- */
    const rec = {
      id: 't' + row.id,
      dbId: row.id,
      sid: 's' + row.student_id,
      mediaType: row.media_type || 'voice',
      status: row.status || 'kutilmoqda',
      score: row.score == null ? null : Number(row.score),
      feedback: row.feedback || '',
      createdAt: row.created_at || '',
      ...speakingExtrasOf(row)
    };
    if (rec.sid !== 'snull') {
      const subs = getTgSubs();
      const i = subs.map(function (x) { return x.dbId; }).indexOf(row.id);
      if (i < 0) subs.push(rec);  /* INSERT — render teskari yig'adi, ya'ni yuqorida */
      else {                      /* UPDATE — lokal holat darhol yangilanadi (manba/havola saqlanadi) */
        const keep = rec.mediaUrl ? {} : { mediaUrl: subs[i].mediaUrl || '', source: subs[i].source || rec.source };
        subs[i] = Object.assign({}, rec, keep);
      }
      store.set(K.tgsubs, subs);
    }

    const done = rec.status === 'baholandi' || rec.status === 'graded' || rec.status === 'rad_etildi';
    const node = done ? document.querySelector('[data-tgcard="' + rec.id + '"]') : null;
    if (node && node.classList) {
      node.classList.add('is-leaving');
      setTimeout(function () { render(); }, 200); /* animatsiyadan keyin qayta chizish */
    } else if (isTeacher() && state.screen === 'speaking') {
      render(); /* yangi karta darhol ekranda — qayta yuklash yo'q */
    }

    if (!isTeacher()) return;
    /* Bot topshiriqlari haqida ustozga botning o'zi xabar beradi — saytda takrorlanmaydi */
    if (!isWebSubmission(rec)) return;
    const s = getStudents().filter(function (x) { return x.dbId === row.student_id; })[0];
    if (!s) return;
    const g = groupById(s.groupId);
    const gname = g ? g.name : t('Guruh tayinlanmagan');
    Notif.notifyOnce('sub:' + row.id, t('Yangi sayt speaking videosi'),
      s.fullName + ' — ' + gname);
    if (!old) toast(s.fullName + ' (' + gname + '): ' + t('yangi speaking videosi'));
  }
}
window.onCloudNotifChange = onCloudNotifChange;

/* ==================== Ikonkalar ==================== */
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.6V21h13V9.6"/><path d="M9.5 21v-6h5v6"/></svg>',
  students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="4.5" cy="18" r="1.4"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"/><path d="M8 16v-4"/><path d="M12 16V8"/><path d="M16 16v-6"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M9 15l2 2 4-4"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c0-3.7 3.3-6.2 7.5-6.2s7.5 2.5 7.5 6.2"/></svg>',
  groups: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.2 20c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4"/><circle cx="17.3" cy="9.3" r="2.3"/><path d="M16.5 14.7c2.7.1 4.6 2.3 4.6 4.6"/></svg>',
  /* --- Yangi Lucide-uslubidagi vektor ikonkalar (emoji o'rniga) --- */
  gradCap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/><path d="M22 10v6"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"/><circle cx="8.5" cy="7" r="3.6"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>',
  bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
  clipboardCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 13.5 2 2 4-4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8.6-8.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.7 5.1A10.7 10.7 0 0 1 12 5c6.3 0 10 7 10 7a18.3 18.3 0 0 1-2.6 3.5"/><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.7 7 10 7a10.4 10.4 0 0 0 5.4-1.5"/><path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>',
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-5A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  stopRec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  cameraCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5 7 7l1.5-2h7L17 7l3 1.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="12.5" r="3.2"/><path d="m9 4 1.6 2h2.8L15 4"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10.2 5.2-3.2v10L16 13.8Z"/></svg>',
  smartphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10.5 5 5 5-5"/><path d="M4 20h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 7 5-4 5 4"/><path d="M4 20h16"/></svg>',
  brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 11 8-8a2.8 2.8 0 0 1 4 4l-8 8"/><path d="M7.2 13.9c-1.6 0-3 1.4-3 3 0 1.3-2.4 1.6-1.9 2.1 1.1 1.1 2.5 2 4 2 2.2 0 4-1.8 4-4a3 3 0 0 0-3.1-3.1Z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="11" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  flagUZ: '<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#fff"/><path d="M0 0h20v4.7H0z" fill="#0099B5"/><path d="M0 9.3h20V14H0z" fill="#1EB53A"/><path d="M0 4.7h20v.6H0zM0 8.7h20v.6H0z" fill="#CE1126"/><path d="M8.4 3.2a2.2 2.2 0 1 0 0 3.4 2.6 2.6 0 1 1 0-3.4z" fill="#fff"/></svg>',
  flagGB: '<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#012169"/><path d="M0 0l20 14M20 0L0 14" stroke="#fff" stroke-width="2.6"/><path d="M0 0l20 14M20 0L0 14" stroke="#C8102E" stroke-width="1.2"/><path d="M10 0v14M0 7h20" stroke="#fff" stroke-width="4.6"/><path d="M10 0v14M0 7h20" stroke="#C8102E" stroke-width="2.6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.2 18-8-14a1.9 1.9 0 0 0-3.3 0l-8 14A1.9 1.9 0 0 0 3.6 21h16.8a1.9 1.9 0 0 0 1.7-3Z"/><path d="M12 9.5v4"/><path d="M12 17.2h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.4 12.3 2.5 2.5 4.7-5.2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3.4 2.75 5.6 6.15.9-4.45 4.3 1.05 6.15L12 17.45l-5.5 2.9 1.05-6.15L3.1 9.9l6.15-.9Z"/></svg>',
  fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13.5h6M9 17h4"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3"/><rect x="8" y="13" width="8" height="6" rx="1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V6a2 2 0 0 1 2-2h11"/><circle cx="17" cy="13" r="1.2"/></svg>',
  creditCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a3 3 0 0 0 3 3h2v-7H6a2 2 0 0 0-2 2z"/><path d="M20 13v4a3 3 0 0 1-3 3h-2v-7h3a2 2 0 0 1 2 2z"/></svg>',
  bellOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 8-3 8h12"/><path d="M18 8a6 6 0 0 0-9.4-5"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="m3 3 18 18"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h3l7 4V5L7 9z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8"/><path d="M12 8v12"/><path d="M8 8a2 2 0 1 1 4 0"/><path d="M16 8a2 2 0 1 0-4 0"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></svg>',
  paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="none"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" fill="currentColor"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v6c0 4.4-3 8.2-7.5 9-4.5-.8-7.5-4.6-7.5-9V6z"/><path d="m9 12 2.2 2.2 4-4.4"/></svg>',
};

/* Matndagi mayda vektor ikonka: o'lchami aniq (SVG width/height) */
function ico(name, size) {
  const px = Number(size) || 16;
  const svg = ICON[name] || '';
  if (!svg) return '';
  return svg.replace('<svg', '<svg width="' + px + '" height="' + px + '"');
}

/* ==================== Header / Bottom nav ==================== */
/* ==================== I18N (UZ/EN) VA REJIM (Light/Dark) ==================== */
const I18N_EN = {
  'Support teacherlar': 'Support teachers',
  "Support teacher qo'shish": 'Add support teacher',
  'Support teacherni tahrirlash': 'Edit support teacher',
  'Support teacherni nazorat qilish': 'Supervise support teacher',
  "O'chirilganda support guruhlari Guruhlar va O'quvchilar bo'limlarida ko'rinmaydi.":
    'When off, support groups are hidden from the Groups and Students sections.',
  "Nazorat rejimi yoniq — support guruhlari ko'rinadi.": 'Supervision is on — support groups are visible.',
  "Hozircha support teacher qo'shilmagan": 'No support teachers yet',
  "Hozircha support teacher qo'shilmagan — «Support teacher qo'shish» tugmasini bosing":
    'No support teachers yet — press “Add support teacher”',
  'Ruxsatlar': 'Permissions',
  'guruh': 'groups',
  'Guruh biriktirilmagan': 'No group assigned',
  "Guruh biriktirilmagan — asosiy o'qituvchiga murojaat qiling": 'No group assigned — contact the main teacher',
  'Biriktirilgan guruhlar': 'Assigned groups',
  "o'quvchi": 'students',
  'Tez amallar': 'Quick actions',
  'Support teacher nazorati': 'Support teacher supervision',
  'Mock natijalari': 'Mock results',
  'Baholanmagan': 'Not graded',
  'Baholar jurnalini ochish': 'Open gradebook',
  "Hozircha vazifa yo'q": 'No homework yet',
  "Davomat yozuvi yo'q": 'No attendance record',
  "Hozircha natija yo'q": 'No results yet',
  'Mock test': 'Mock test',
  'Qanday ishlaydi': 'How it works',
  "O'quvchilar paneli": 'Students panel',
  "Biriktirilgan guruh o'quvchilari": 'Assigned group students',
  'Slot yaratish va baholash': 'Create and grade slots',
  'Davomat belgilash': 'Mark attendance',
  'Uyga vazifa kiritish': 'Add homework',
  'Vazifa berish va tahrirlash': 'Assign and edit homework',
  'Baholar kiritish': 'Enter grades',
  'Baholar jurnaliga yozish': 'Write to the gradebook',
  'Mock test kiritish': 'Create mock tests',
  'Mock test yaratish va baholash': 'Create and grade mock tests',
  'Topshiriqlar': 'Submissions',
  "Bajarilgan ishlarni ko'rish va izoh yozish": 'Review submissions and comment',
  "Guruhlar (support faqat shu guruhlarni ko'radi)": 'Groups (support sees only these)',
  "Support teacherni o'chirish": 'Delete support teacher',
  "Support teacher faqat shu yerda biriktirilgan guruhlar va belgilangan ruxsatlar bilan ishlaydi. Uning guruhlari Guruhlar va O'quvchilar bo'limlarida faqat «Support teacherni nazorat qilish» rejimi yoniq bo'lganda ko'rinadi.":
    'A support teacher works only with the groups and permissions assigned here. Their groups appear in the Groups and Students sections only while “Supervise support teacher” mode is on.',
  'Kamida 3 ta belgi': 'At least 3 characters',
  "Bo'sh qoldirsangiz o'zgarmaydi": 'Leave empty to keep unchanged',
  'Masalan: Dilshod Karimov': 'e.g. Dilshod Karimov',
  "Support teacherlar boshqaruvi": 'Support teacher management',
  "To'lov": "Payments",
  "To'lovlar": "Payments",
  'Bosh sahifa': 'Home', 'Bosh': 'Home', 'Guruhlar': 'Groups',
  "O'quvchilar": 'Students', "O'quvchi": 'Students',
  'Baholar jurnali': 'Gradebook', 'Baholar': 'Grades',
  'Davomat': 'Attendance', 'Tezkor davomat': 'Attendance',
  'Speaking slotlari': 'Speaking Slots', 'Speaking (1-on-1)': 'Speaking',
  'Profil': 'Profile', 'Kabinet': 'Dashboard',
  'Kirish': 'Sign In', 'Chiqish': 'Log Out', 'Hisobdan chiqish': 'Log Out',
  'Maxfiylik': 'Privacy', 'Anonim statistika': 'Anonymous analytics',
  'Anonim statistika yoqildi': 'Anonymous analytics turned on',
  "Anonim statistika o'chirildi": 'Anonymous analytics turned off',
  "Rozilik bersangiz, kirish va uyga vazifa harakatlari PostHog'ga loginsiz (anonim ID) yuboriladi. Rozilik bo'lmasa hech narsa yuborilmaydi.":
    'If you allow it, sign-in and homework actions are sent to PostHog without your login (anonymous ID). Nothing is sent without your consent.',
  'Uyga vazifalar': 'Homework', 'Qarz': 'Debt',
  'Guruh': 'Group', 'Sinf': 'Class', 'Sana': 'Date',
  'Oldingi hafta': 'Previous week', 'Bugun': 'Today', 'Keyingi hafta': 'Next week',
  "O'rtacha": 'Average', "O'rtacha bahosi": 'Average score',
  'Parol': 'Password',
  /* --- Dinamik kartalar matnlari (o'quvchi kartasi, uyga vazifa) --- */
  'Speaking qarzi': 'Speaking debt',
  'Ovozli ruxsat': 'Voice allowed',
  'Uyga vazifa yuklashga ruxsat': 'Allow homework upload',
  'Xabar yozish': 'Message',
  'Parolni yangilash': 'Reset Password',
  'Tahrirlash': 'Edit',
  "O'chirish": 'Delete',
  'Topshirish muddati': 'Due date',
  'Guruhni tanlang — vazifalar va topshiriqlar shu yerda': 'Choose a group — homework and submissions live here',
  "Berilgan vazifalar «Uyga vazifalar» bo'limida ko'rinadi.": 'Assigned homework appears in the Homework section.',
  'Guruh taylanmagan': 'No group assigned',
  'Barchasi': 'All',
  /* --- Kirish sahifasi (hero): sarlavha, tavsif, 3 ta ma'lumot kartasi --- */
  "Teacher Muzaffar Amirov — Ingliz tili ta'lim platformasi":
    'Teacher Muzaffar Amirov — English Learning Platform',
  "Ushbu platforma Muzaffar Amirovning 5–11-sinf o'quvchilari uchun mo'ljallangan zamonaviy ta'lim va nazorat tizimidir. O'quvchilar darslarni o'zlashtirishi, vazifalar va speaking topshiriqlarini bajarishi, ota-onalar esa davomat va baholarni real vaqtda kuzatishi mumkin.":
    "A modern learning and monitoring platform designed for Teacher Muzaffar Amirov's Grade 5–11 students. Track daily lessons, complete speaking assignments, and monitor attendance and grades in real time.",
  "Yakkama-yakka Speaking va Audio/Video tahlil": '1-on-1 Speaking & Audio/Video Review',
  "O'quvchilar mavzular bo'yicha speaking topshiriqlarini darsda yoki Telegram bot orqali ovozli xabar va krujok video shaklida yuboradilar. Har bir javob 10 ballik tizimda baholanadi va speaking qarzlari avtomatik hisoblanadi.":
    'Students submit speaking tasks in class or via Telegram bot as voice and video notes. Every submission is graded on a 10-point scale with automatic speaking debt tracking.',
  "Kundalik 10 ballik elektron jurnal va Davomat": 'Daily 10-Point Gradebook & Attendance',
  "Har bir darsdagi faollik, davomat va baholar shaffof elektron jurnalga kiritiladi hamda haftalik va umumiy o'rtacha reyting avtomatik hisoblanadi.":
    'Class participation, attendance, and grades are recorded in a transparent electronic journal with automatic weekly and overall average calculations.',
  "Telegram Bot ekotizimi (@uzbekspeakingcheckbot)": 'Telegram Bot Ecosystem (@uzbekspeakingcheckbot)',
  "Yangi uyga vazifalar, speaking eslatmalari, olingan baholar va ustoz xabarlari bevosita o'quvchining Telegram profiliga tezkor yetkaziladi.":
    "Instant notifications for new homework, speaking schedules, grades, and teacher messages delivered directly to the student's Telegram.",
  /* --- Profil: faol qurilmalar --- */
  'Faol qurilmalar': 'Active Devices',
  'Bu qurilma': 'This device',
  'joriy sessiya': 'current session',
  'Chiqarib yuborish': 'Terminate',
  'Barcha boshqa qurilmalardan chiqish': 'Terminate All Other Sessions',
  'Boshqa qurilmalar ulanmagan': 'No other devices connected',
  "Noma'lum qurilma": 'Unknown device',
  'Onlayn': 'Online',
  'qurilma': 'device',
  /* --- Profil: xavfsizlik, zaxira, tozalash --- */
  'Xavfsizlik': 'Security',
  "Ko'rinish": 'Role',
  "Parolni o'zgartirish": 'Change Password',
  "Ma'lumotlar Bazasi Zaxirasi": 'Database Backup',
  "Guruhlar, o'quvchilar, davomat, baholar, xabarlar va speaking topshiriqlari JSON faylda saqlanadi.":
    'Groups, students, attendance, grades, messages, and speaking tasks are saved in a JSON file.',
  'Bazani yuklab olish (Backup)': 'Download Backup',
  'Bazani qayta tiklash (Restore)': 'Restore Backup',
  'Tozalash': 'Cleanup',
  "Tozalashdan oldin barcha jadvallar fayl ko'rinishida avtomatik yuklab olinadi.":
    'All tables are automatically downloaded as a file before cleanup.',
  'Xabarlar': 'Messages',
  'Topshiriqlar': 'Tasks',
  'Tanlangan jadvalni tozalash': 'Clear Selected Table',
  /* --- Landing + kirish/tiklash ekranlari --- */
  'English Teacher — Muzaffar Amirov': 'English Teacher — Muzaffar Amirov',
  "5–11-sinf va repetitorlik guruhlari uchun ingliz tili ta'lim platformasi: uyga vazifalar, 10 ballik baholar jurnali, davomat va speaking nazorati.":
    'An English learning platform for Grade 5–11 and tutoring groups: homework, a 10-point gradebook, attendance, and speaking control.',
  'Tizimga kirish': 'Sign In', 'Orqaga': 'Back',
  'Uyga vazifalar va media darslar': 'Homework & media lessons',
  "Video, audio va hujjatlarni saytning o'zida tezlikni boshqarib o'rganish.":
    'Study video, audio, and documents right on the site with playback speed control.',
  '10 ballik jurnal va davomat': '10-point gradebook & attendance',
  "Har bir darsdagi baholar, o'rtacha reyting va qatnashish statistikasi.":
    'Grades for every lesson, average rating, and attendance statistics.',
  'Telegram bot (@uzbekspeakingcheckbot)': 'Telegram bot (@uzbekspeakingcheckbot)',
  'Ovozli va video speaking topshirish hamda baho/xabarlarni tezkor olish.':
    'Submit voice and video speaking tasks and receive grades and messages instantly.',
  'Kirish — English Teacher': 'Sign In — English Teacher',
  'Login va parolingizni kiriting': 'Enter your login and password',
  'Login yoki parolni unutdingizmi?': 'Forgot your login or password?',
  'Kirishni tiklash': 'Recover access',
  'Muammoni tanlang — kod tasdiqlangan Telegram yoki Gmailga yuboriladi.':
    'Choose an option — the code is sent to your verified Telegram or Gmail.',
  'Login yodimda yo\u2018q': "I don't remember my login",
  'Login tasdiqlangan telefon/Gmailga yuboriladi.': 'Your login is sent to your verified phone/Gmail.',
  'Parol yodimda yo\u2018q': "I don't remember my password",
  'Yangi parol olish uchun tasdiqlash kodi yuboriladi.': 'A verification code is sent to set a new password.',
  'Ikkalasi ham yodimda yo\u2018q': 'I remember neither',
  'Tasdiqlangan telefon/Gmail orqali tiklash yoki ustozga murojaat.':
    'Recover via your verified phone/Gmail or contact the teacher.',
  'Telefon yoki Gmail': 'Phone or Gmail',
  '+998 90 123 45 67 yoki ism@gmail.com': '+998 90 123 45 67 or name@gmail.com',
  '5 xonali kod': '5-digit code',
  'Keyingi qadam': 'Next step', 'Yuborish': 'Send',
  'Kodni qayta yuborish': 'Resend code',
  'Kod (6 xona)': 'Code (6 digits)', 'Yangi parol': 'New password', 'Parolni yangilash': 'Update password',
  /* --- Bajarilgan topshiriqlar + o'quvchi yuklashi --- */
  'Topshiriqlar': 'Submissions',
  'Bajarilgan topshiriqlar': 'Submitted Homework',
  'Komentariya yozish': 'Write a comment',
  "O'qituvchi komentariyasi": "Teacher's comment",
  'Siz yuklagan fayllar': 'Files you uploaded',
  'Topshiriqni yuklash': 'Upload homework',
  'Yuklash ruxsati': 'Upload allowed',
  'Yuklash': 'Upload',
  "Barcha guruhlar": 'All groups',
  'Komentariya yuborildi': 'Comment sent',
  'Ko‘rilmagan': 'New',
};
/* --- Kengaytirilgan UZ→EN lug'ati (barcha ekran va modallar) ---
   Mavjud tarjimalar ustidan yozilmaydi — faqat yetishmayotgan kalitlar qo'shiladi. */
(function (extra) {
  Object.keys(extra).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(I18N_EN, k)) I18N_EN[k] = extra[k];
  });
})({
  "Xush kelibsiz,": "Welcome,",
  "Tez amallar": "Quick actions",
  "Uyga vazifa berish": "Assign Homework",
  "Baholar jurnali": "Gradebook",
  "Tezkor davomat": "Quick Attendance",
  "Speaking slotlari": "Speaking Slots",
  "Bajarilgan topshiriqlar": "Submitted Homework",
  "To'lovlar": "Payments",
  "To'lov": "Payments",
  "Guruhlar": "Groups",
  "Guruh o'quvchilari": "Group students",
  "Bosib, speaking qarzini belgilash": "Tap to set speaking debt",
  "Bosib, o'quvchilarni boshqarish": "Tap to manage students",
  "Hozircha guruhda o'quvchi yo'q": "No students in this group yet",
  "Kamaytirish": "Decrease",
  "Ko'paytirish": "Increase",
  "O'quvchilar": "Students",
  "O'quvchi": "Students",
  "Sinflar": "Classes",
  "Sinf": "Grade",
  "Guruh": "Group",
  "Baholar": "Grades",
  "Davomat": "Attendance",
  "Profil": "Profile",
  "Kabinet": "Dashboard",
  "Bosh": "Home",
  "Bosh sahifa": "Home",
  "Yuklash": "Upload",
  "Yuklash ruxsati": "Upload allowed",
  "Uyga vazifa yuklashga ruxsat": "Allow homework upload",
  "Uyga vazifa yuklashga ruxsat yo'q": "Homework upload is not allowed",
  "Uyga vazifalar va media darslar": "Homework and media lessons",
  "Topshiriqni yuklash": "Upload homework",
  "Topshiriqlar": "Submissions",
  "Izoh (ixtiyoriy)": "Comment (optional)",
  "Fayl tanlang yoki izoh yozing": "Choose a file or write a comment",
  "Rasm, Word, PDF, Excel, video va audio fayllarni yuklash mumkin (har biri 50MB gacha).": "Upload images, Word, PDF, Excel, video and audio files (up to 50MB each).",
  "Har bir fayl uchun maksimal hajm: 50MB · bir nechta fayl tanlash mumkin": "Max size per file: 50MB · multiple files allowed",
  "Siz yuklagan fayllar": "Files you uploaded",
  "O'qituvchi komentariyasi": "Teacher's comment",
  "Komentariya yozish": "Write a comment",
  "Komentariya yuborildi": "Comment sent",
  "Komentariyani saqlashda xatolik": "Failed to save the comment",
  "Yuborish": "Send",
  "Saqlash": "Save",
  "Bekor qilish": "Cancel",
  "Yopish": "Close",
  "Tahrirlash": "Edit",
  "O'chirish": "Delete",
  "Qo'shish": "Add",
  "+ Qo'shish": "+ Add",
  "Orqaga": "Back",
  "Keyingi qadam": "Next step",
  "Ha, o'chirish": "Yes, delete",
  "Ha, yuborish": "Yes, send",
  "Ko'rdim": "Got it",
  "Ko'rinish": "Role",
  "Holat": "Status",
  "Yangi": "New",
  "Yangi parol": "New password",
  "Parol": "Password",
  "Parolni o'zgartirish": "Change password",
  "Parolni yangilash": "Reset Password",
  "Kirish": "Sign In",
  "Hisobdan chiqish": "Log Out",
  "Hisobdan chiqdingiz": "You have logged out",
  "Tizimga kirish": "Sign in",
  "Kirish ma'lumotlari": "Sign-in details",
  "Kirishni tiklash": "Recover access",
  "Login yoki parol noto'g'ri": "Incorrect login or password",
  "Login va parolingizni kiriting": "Enter your login and password",
  "Login va parolni kiriting": "Enter login and password",
  "Login noto'g'ri": "Incorrect login",
  "Login yuborildi": "Login sent",
  "Login ma'lumoti": "Login details",
  "Joriy parol noto'g'ri": "Current password is incorrect",
  "Parollar mos kelmadi": "Passwords do not match",
  "Parol kamida 3 ta belgi bo'lsin": "Password must be at least 3 characters",
  "Yangi parol kamida 3 ta belgi bo'lsin": "New password must be at least 3 characters",
  "Dastlabki parol kamida 3 ta belgi bo'lsin": "Initial password must be at least 3 characters",
  "Tekshiruv (CAPTCHA)": "Verification (CAPTCHA)",
  "Javob": "Answer",
  "Tekshiruv javobi noto'g'ri — yangi misolni yeching": "Wrong verification answer — solve the new example",
  "5 xonali kod": "5-digit code",
  "Kod (6 xona)": "Code (6 digits)",
  "Kod yuborish": "Send code",
  "Telefon raqam": "Phone number",
  "Telefon yoki Gmail": "Phone or Gmail",
  "Telefon raqam noto'g'ri: +998 90 123 45 67": "Invalid phone number: +998 90 123 45 67",
  "Gmail manzili": "Gmail address",
  "Gmail manzil noto'g'ri": "Invalid Gmail address",
  "Gmail olib tashlandi": "Gmail removed",
  "Ustoz Gmail manzili": "Teacher Gmail address",
  "Tasdiqlangan": "Verified",
  "Tasdiqlanmagan": "Not verified",
  "Aloqa va tiklash ma'lumotlari": "Contact and recovery details",
  "2FA va tiklash sozlamalari": "2FA and recovery settings",
  "Ishonchli qurilmalar": "Trusted devices",
  "Ishonchli qurilmalarni tozalash": "Clear trusted devices",
  "Barcha boshqa qurilmalardan chiqish": "Log out from all other devices",
  "Faol qurilmalar": "Active devices",
  "Bu qurilma": "This device",
  "bu qurilma": "this device",
  "qurilma": "device",
  "ishonchli": "trusted",
  "yangi": "new",
  "joriy sessiya": "current session",
  "Noma'lum qurilma": "Unknown device",
  "Qurilma chiqarib yuborildi": "Device removed",
  "Siz ushbu qurilmadan chiqarildingiz!": "You were removed from this device!",
  "Boshqa qurilmalar ulanmagan": "No other devices connected",
  "Bu ilova tashqi tahlil xizmatlariga ma'lumot yubormaydi.": "This app does not send data to external analytics services.",
  "Maxfiylik": "Privacy",
  "Xavfsizlik": "Security",
  "Muammoni tanlang — kod tasdiqlangan Telegram yoki Gmailga yuboriladi.": "Choose the issue — the code is sent to your verified Telegram or Gmail.",
  "Avval Gmail manzilni kiriting": "Enter your Gmail address first",
  "Parolni tiklash kodi shu telefon (Telegram) yoki Gmail manzilga yuboriladi.": "The password reset code is sent to this phone (Telegram) or Gmail address.",
  "Kirishdagi 2 bosqichli kod va parolni tiklash kodi shu manzillarga yuboriladi.": "The 2-step sign-in code and password reset code are sent to these addresses.",
  "Asosiy oyna": "Home",
  "Mening ma'lumotlarim": "My details",
  "Ma'lumotlar Bazasi Zaxirasi": "Database Backup",
  "Bazani yuklab olish (Backup)": "Download backup",
  "Bazani qayta tiklash (Restore)": "Restore backup",
  "Bazani qayta tiklashda xatolik": "Failed to restore the backup",
  "Zaxira fayli topilmadi": "Backup file not found",
  "Zaxira maydoni topilmadi": "Backup field not found",
  "Zaxira tayyorlanmoqda...": "Preparing backup...",
  "Zaxirani yuklab bo'lmadi": "Could not download the backup",
  "Baza qayta tiklanmoqda...": "Restoring database...",
  "Baza tozalanmoqda...": "Cleaning database...",
  "Tozalash": "Cleanup",
  "Tozalashdan oldin barcha jadvallar fayl ko'rinishida avtomatik yuklab olinadi.": "Before cleanup all tables are downloaded automatically as a file.",
  "Tanlangan jadvalni tozalash": "Clean selected table",
  "Bildirishnomalar yoqildi": "Notifications enabled",
  "Bildirishnomalar o'chirib qoldi": "Notifications turned off",
  "Brauzerda bildirishnomalar bloklangan": "Notifications are blocked in the browser",
  "Boshqa qurilmalar": "Other devices",
  "Avval guruh yarating": "Create a group first",
  "Avval o'quvchi tayinlang": "Assign a student first",
  "Avval komentariyani yozing": "Write a comment first",
  "Guruh qo'shish": "Add group",
  "O'quvchi qo'shish": "Add student",
  "O'quvchini tahrirlash": "Edit student",
  "Guruh nomini kiriting": "Enter the group name",
  "Ism familiyani kiriting": "Enter full name",
  "Guruhni tanlang": "Choose a group",
  "Maktab sinfini tanlang": "Choose the school class",
  "Dars kunlarini tanlang": "Choose lesson days",
  "Dars vaqtlari (har kun uchun)": "Lesson times (per day)",
  "Guruh o'zgartirilsa, mavjud baholar va davomat tarixi saqlanib qoladi.": "If the group changes, existing grades and attendance history are kept.",
  "Guruh turi faqat sizga ko'rinadi — o'quvchilarga hech qachon ko'rsatilmaydi.": "The group type is visible only to you — never shown to students.",
  "Bosib, guruh o'quvchilarini ko'rish": "Tap to see the group's students",
  "Berilgan vazifalar guruh sahifasida ko'rinadi.": "Assigned homework appears on the group page.",
  "Guruhlar, o'quvchilar, davomat, baholar, xabarlar va speaking topshiriqlari JSON faylda saqlanadi.": "Groups, students, attendance, grades, messages and speaking tasks are saved in a JSON file.",
  "Har bir oy uchun alohida summa belgilang. Kiritilmagan oyda guruhning eski oylik summasi ishlatiladi.": "Set a separate amount for each month. If a month is missing, the group's previous monthly fee is used.",
  "Har bir tanlangan kun uchun alohida dars vaqtini belgilang.": "Set a separate lesson time for each selected day.",
  "Kunni tanlang — har bir kun uchun alohida vaqtni belgilang (masalan Dushanba 09:15, Shanba 11:00).": "Pick the day — set a separate time for each day (e.g. Monday 09:15, Saturday 11:00).",
  "Kiritilgan summa qarzdan ayiriladi va o'quvchi kabinetida so'nggi to'lov sifatida ko'rinadi.": "The entered amount is deducted from the debt and shown as the latest payment in the student dashboard.",
  "Ball tanlansa, o'quvchining baholar jurnaliga darhol yoziladi.": "Selecting a score writes it to the student's gradebook immediately.",
  "Baho qo'yish uchun katakchaga bosing.": "Tap a cell to set a grade.",
  "Har bir darsdagi baholar, o'rtacha reyting va qatnashish statistikasi.": "Grades for every lesson, average rating and attendance statistics.",
  "Muzaffar Amirov baholagach, natijani shu kabinetda ko'rasiz.": "You will see the result in this dashboard after Muzaffar Amirov grades it.",
  "Ovozli va video speaking topshirish hamda baho/xabarlarni tezkor olish.": "Submit voice and video speaking tasks and get grades/messages quickly.",
  "Video, audio va hujjatlarni saytning o'zida tezlikni boshqarib o'rganish.": "Study video, audio and documents on the site with adjustable speed.",
  "10 ballik jurnal va davomat": "10-point gradebook and attendance",
  "5–11-sinf va repetitorlik guruhlari uchun ingliz tili ta'lim platformasi: uyga vazifalar, 10 ballik baholar jurnali, davomat va speaking nazorati.": "English learning platform for grades 5–11 and tutoring groups: homework, a 10-point gradebook, attendance and speaking control.",
  "Oylik to'lov summasi (so'mda)": "Monthly fee (in sum)",
  "To'lov qarzi (so'mda)": "Payment debt (in sum)",
  "To'lov summasi (so'mda)": "Payment amount (in sum)",
  "Qo'shiladigan summa (so'mda)": "Amount to add (in sum)",
  "Karta raqami (16 ta raqam)": "Card number (16 digits)",
  "Qarz qo'shish": "Add debt",
  "To'lov kiritish": "Add payment",
  "Qaysi oy uchun to'lov": "Payment for which month",
  "Oyni tanlang": "Choose the month",
  "Summani kiriting": "Enter the amount",
  "Sanani tanlang": "Choose the date",
  "Vaqt oralig'ini kiriting": "Enter the time range",
  "Tugash vaqti boshlanishdan keyin bo'lishi kerak": "End time must be after the start time",
  "Xabar matnini kiriting": "Enter the message text",
  "Xabar yozish": "Message",
  "Eslatma yuborish": "Send reminder",
  "Eslatma yuborilmadi:": "Reminder was not sent:",
  "Barcha qarzdorlarga eslatma yuborish": "Send a reminder to all debtors",
  "Qarzdorlar ro'yxati": "Debtors list",
  "Qarzdorlar": "Debtors",
  "To'langan": "Paid",
  "Yig'ilgan": "Collected",
  "Kutilgan": "Expected",
  "Qolgan": "Remaining",
  "hali to'lov yo'q": "no payment yet",
  "So'nggi to'lov:": "Last payment:",
  "Oxirgi to'lov:": "Last payment:",
  "Joriy qarz:": "Current debt:",
  "Oylik:": "Monthly:",
  "Maktab guruhi bepul — to'lov yo'q": "School group is free — no payment",
  "Maktab guruhi bepul — jadval kerak emas": "School group is free — no schedule needed",
  "Maktab guruhida qarz yo'q (bepul)": "No debt in a school group (free)",
  "Bu o'quvchida qarz yo'q": "This student has no debt",
  "Bu sanada shu vaqtda slot bor": "There is already a slot at this time on this date",
  "Slot o'chirildi": "Slot deleted",
  "Uyga vazifa o'chirildi": "Homework deleted",
  "Topshiriq o'chirildi": "Submission deleted",
  "Topshiriq yozuvi topilmadi": "Submission record not found",
  "Fayl o'chirildi": "File deleted",
  "Fayl noto'g'ri: bu mos kelmaydigan zaxira fayli": "Invalid file: this is not a matching backup file",
  "Faylni o'qib bo'lmadi": "Could not read the file",
  "Fayl hajmi 50 MB dan oshmasligi kerak:": "File size must not exceed 50 MB:",
  "Fayl hajmi 100 MB dan oshmasligi kerak:": "File size must not exceed 100 MB:",
  "Bulutda tozalab bo'lmadi": "Could not clean in the cloud",
  "Xatolik: bulut bilan aloqa yo'q (Supabase sozlanmagan)": "Error: no cloud connection (Supabase is not configured)",
  "Xatolik:": "Error:",
  "Xatolik: ...": "Error: ...",
  "Ruxsat yo'q": "Permission denied",
  "O'chirishda xatolik:": "Delete failed:",
  "Bahani faqat Muzaffar Amirov qo'yadi": "Only Muzaffar Amirov can grade",
  "Baho o'chirildi": "Grade deleted",
  "Baho qo'yish": "Set grade",
  "Baho saqlandi": "Grade saved",
  "Hozircha baho yo'q": "No grades yet",
  "O'rtacha baho": "Average score",
  "O'rtacha": "Average",
  "O'rtacha bahosi": "Average score",
  "Davomatni saqlash": "Save attendance",
  "Davomat yozuvi yo'q": "No attendance records",
  "Oldingi hafta": "Previous week",
  "Bugun": "Today",
  "Keyingi hafta": "Next week",
  "Speaking qarzi": "Speaking debt",
  "Speaking": "Speaking",
  "Maktab guruhi": "School group",
  "Repetitor guruhi": "Tutoring group",
  "Maktab guruhi bepul": "School group is free",
  "Bepul": "Free",
  "Lavozim": "Role",
  "O'quvchi kabineti": "Student dashboard",
  "O'quvchida Telegram ulanmagan": "Student has not connected Telegram",
  "O'quvchilarda Telegram ulanmagan": "Students have not connected Telegram",
  "O'quvchi ma'lumoti topilmadi": "Student record not found",
  "O'quvchi ma'lumoti topilmadi — qayta kiring": "Student record not found — sign in again",
  "Profilingiz bulutga ulanmagan — ustozga murojaat qiling": "Your profile is not connected to the cloud — contact the teacher",
  "Bu vazifa hali bulutga yozilmagan — keyinroq urinib ko'ring": "This homework is not saved to the cloud yet — try again later",
  "O'qituvchi vazifangizga komentariya yozdi:": "The teacher commented on your homework:",
  "Vazifa ichida o'qib, fayllaringizni ko'rish mumkin.": "Inside the task you can read it and see your files.",
  "To'lov eslatmasi!": "Payment reminder!",
  "To'lov qabul qilindi!": "Payment received!",
  "To'lov cheki ko'rib chiqilmoqda!": "Your payment receipt is under review!",
  "Chekingiz qabul qilindi! Ustoz tasdiqlashi bilan qarzingiz o'chiriladi.": "Your receipt was accepted! Your debt is cleared once the teacher confirms it.",
  "Ustoz tasdiqlashi bilan qarzingiz o'chiriladi.": "Your debt is cleared once the teacher confirms it.",
  "Iltimos, to'lov cheki rasmini tanlang": "Please choose a payment receipt image",
  "To'lanadigan summa:": "Amount to pay:",
  "Karta:": "Card:",
  "Qurilma:": "Device:",
  "Karta egasining ism-familiyasi": "Cardholder full name",
  "Kartani saqlash": "Save card",
  "To'lov kartasi sozlamalari": "Payment card settings",
  "Tasdiqlash": "Confirm",
  "Kiritish": "Enter",
  "Chiqarib yuborish": "Remove",
  "Yangi qurilma aniqlandi — 6 xonali kod Telegram (ustoz) va Gmail orqali yuborildi. Qurilma:": "New device detected — a 6-digit code was sent via Telegram (teacher) and Gmail. Device:",
  "Telegram bot (@uzbekspeakingcheckbot)": "Telegram bot (@uzbekspeakingcheckbot)",
  "Bu raqamga Telegram bot ulanmagan. Avval @uzbekspeakingcheckbot da /login qiling": "Telegram bot is not linked to this number. Run /login in @uzbekspeakingcheckbot first",
  "Telegram kirishi tekshiruvi majburiy — kirish rad etildi": "Telegram sign-in verification is required — sign-in denied",
  "Telegram navbati yozilmadi — bot sozlanmagan bo'lishi mumkin": "Telegram queue was not written — the bot may not be configured",
  "Gmail yuborish navbati ishlamadi — botda": "Gmail queue did not work — in the bot",
  "Eslatma yuborilmadi": "Reminder was not sent",
  "O'quvchi qo'shildi": "Student added",
  "Guruh qo'shildi": "Group added",
  "Diagnostika": "Diagnostics",
  "Diagnostikani ishga tushirish": "Run diagnostics",
  "Qayta tekshirish": "Re-check",
  "Hammasi joyida — yuklash ishlashi kerak": "Everything looks good — upload should work",
  "ta muammo topildi": "issues found",
  "Yuklash (o'quvchi)": "Upload (student)",
  "To'lovlar va qarzdorlar": "Payments and debtors",
  "Guruhlar va o'quvchilar": "Groups and students",
  "Vazifa berish": "Assign homework",
  "Uyga vazifa": "Homework",
  "Uyga vazifalar": "Homework",
  "Barcha o'quvchilar": "All students",
  "Barchasi": "All",
  "Maktab": "School",
  "Repetitorlik": "Tutoring",
  "Ko'rilmagan": "New",
  "Yangi topshiriq": "New submission",
  "O'qituvchi": "Teacher",
  "Ustoz": "Teacher",
  "ta guruh": "groups",
  "ta o'quvchi": "students",
  "guruhidagi o'quvchilar": "students in the group",
  "guruhini o'chirmoqchimisiz?": "group? Do you want to delete it?",
  "o'chirmoqchimisiz? Uning barcha baholari va davomat tarixi ham o'chiriladi.": "? All their grades and attendance history will also be deleted.",
  "Kirish — English Teacher": "Sign in — English Teacher",
  "English Teacher — Muzaffar Amirov": "English Teacher — Muzaffar Amirov",
  "8–10 A'lo": "8–10 Excellent",
});
(function (extra) {
  Object.keys(extra).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(I18N_EN, k)) I18N_EN[k] = extra[k];
  });
})({
  "Keldi": "Present",
  "Kelmadi": "Absent",
  "Sababli": "Excused",
  "Oylik jadval": "Monthly schedule",
  "Belgilash": "Set",
  "belgilanmagan": "not set",
  "Oylik to'lov": "Monthly fee",
  "Summa (so'mda)": "Amount (in sum)",
  "Maktab sinfi": "School class",
  "Sinfni tanlang": "Select class",
  "Dastlabki parol": "Initial password",
  "Parolni ko'rsatish": "Show password",
  "Joriy parol": "Current password",
  "Yangi parolni tasdiqlang": "Confirm new password",
  "Repetitorlik guruhi": "Tutoring group",
  "Vazifa (tavsif)": "Task (description)",
  "Nima bajarishi kerak...": "What should they do...",
  "O'quvchi ismini kiriting...": "Enter student name...",
  "O'quvchiga izoh...": "Comment for student...",
  "Xabar yozing...": "Type a message...",
  "Masalan: Present Perfect": "For example: Present Perfect",
  "Masalan: 100000": "For example: 100000",
  "Masalan: 50000": "For example: 50000",
  "Masalan: Noyabr 2026 yoki Oktyabr 2026": "For example: November 2026 or October 2026",
  "Masalan: IELTS Band 7.0": "For example: IELTS Band 7.0",
  "Masalan: 300000": "For example: 300000",
  "Masalan: Aziz Rahimov": "For example: Aziz Rahimov",
  "Masalan: jasur09": "For example: jasur09",
  "Masalan: 1234": "For example: 1234",
  "Masalan: A'lo faollik": "For example: Excellent participation",
  "ism@gmail.com": "name@gmail.com",
  "ustoz@gmail.com": "teacher@gmail.com",
  "Tanlangan faylni bekor qilish": "Cancel selected file",
  "Slot qo'shish": "Add slot",
  "Uyga vazifalar": "Homework",
  "Baholar": "Grades",
  "Speaking topshirish": "Submit Speaking",
  "Komentariyani tahrirlash": "Edit comment",
  "Kichraytirish": "Collapse",
  "Komentariyani o'chirish": "Delete comment",
  "Komentariyani o'chirasizmi?": "Delete this comment?",
  "O'qituvchi bilan suhbat": "Chat with Teacher",
  "tahrirlangan": "edited",
  "Xabarni o'chirasizmi?": "Delete this message?",
  "Ha": "Yes",
  "Tahrirlash": "Edit",
  "Ustoz ruxsati kerak": "Teacher permission required",
  "Speaking topshirish uchun ustozdan ruxsat so'rang.": "Ask your teacher for permission to submit speaking tasks.",
  "Saytda speaking topshirish": "Website speaking submission",
  "Saytda yozish yopiq": "Website recording is off",
  "Saytda video yozish uchun ustoz ruxsati kerak. Speaking topshirig'ini Telegram bot orqali yuboring.": "Website recording requires teacher permission. Submit your speaking task via the Telegram bot.",
  "Telegram botga o'tish": "Open the Telegram bot",
  "Botda ovozli xabar yoki dumaloq video yuboring.": "Send a voice message or a round video in the bot.",
  "Saytda speaking topshirishga ruxsat berildi": "Website speaking submission allowed",
  "Saytda speaking topshirish cheklandi": "Website speaking submission disabled",
  "Ruxsatni saqlashda xatolik": "Failed to save the permission",
  "Baholandi": "Graded",
  "Bekor qilindi": "Rejected",
  "Baholangan sayt videolari": "Graded website videos",
  "Video baholashdan keyin ham saqlanadi.": "The video is kept after grading.",
  "Yangi sayt speaking videosi": "New website speaking video",
  "Kameraga qarang! Ogohlantirish: {n}/3": "Look at the camera! Warning: {n}/3",
  "Ko'zingiz 3 marta kameradan chetga qaradi. Yozuv to'xtatildi, videoni qaytadan oling.": "Your eyes looked away from the camera 3 times. Recording stopped — please record a new video.",
  "Qayta olish": "Retake",
  "Sayt videolari": "Website videos",
  "Guruhlar bo'yicha": "By group",
  "Sayt videolari guruhlar bo'yicha shu yerda; bot topshiriqlari botda ko'rinadi. \"Baholash\" orqali 1–10 ball qo'yiladi, video saqlanadi, ball baholar jurnaliga tushadi va Speaking qarzi 1 ga kamayadi. Video faqat \"O'chirish\" tasdiqlanganda R2 va bazadan o'chadi.": "Website videos appear here grouped by group; bot submissions stay in the bot. Grade 1–10, the video is kept, the score goes to the gradebook and the Speaking debt drops by one. A video is removed from R2 and the database only after the teacher confirms Delete.",
  "yangi speaking videosi": "new speaking video",
  "Videoni shu yerda yozib topshirasiz.": "Record your video right here.",
  "Kamera va mikrofon ochilmoqda...": "Opening camera and microphone...",
  "Kamera yoki mikrofonga ruxsat berilmadi.": "Camera or microphone permission was not granted.",
  "Bu qurilmada video yozish qo'llab-quvvatlanmaydi.": "Video recording is not supported on this device.",
  "Yuz aniqlanmoqda...": "Detecting face...",
  "Yuz aniqlandi": "Face detected",
  "Yuz topilmadi": "No face detected",
  "Kameraga qarang": "Look at the camera",
  "Yozishni boshlash": "Start recording",
  "Yozishni to'xtatish": "Stop recording",
  "Yozib olinmoqda...": "Recording...",
  "Videoni ko'rish": "Watch Video",
  "Yuborilmoqda...": "Submitting...",
  "Speaking topshirildi": "Speaking submitted",
  "Hozircha topshiriq yo'q": "No submissions yet",
  "Speaking topshiriqlari (Inbox)": "Speaking submissions (Inbox)",
  "Yuborishda xatolik": "Submission failed",
  "Ko'z kontakti: {p}%": "Eye contact: {p}%",
  "Tayyor — videoni ko'ring yoki yuboring.": "Ready — watch the video or submit.",
  "Yuborilgan topshiriqlar": "Submitted work",
  "Video": "Video",
  "Audio": "Audio",
  "Kameraga qarash": "Eye contact",
  "Chetga qarash": "Look-aways",
  "Ko'z nazorati mavjud emas — yozish mumkin": "Eye tracking unavailable — recording is allowed",
  "Yozishni boshlab bo'lmadi": "Could not start recording",
  "Yozuv bo'sh chiqdi — qayta urinib ko'ring": "The recording is empty — please try again",
  "Qayta yozish": "Retake",
  "Kameraga qarab turing — yuz va ko'zlar ko'rinsin": "Look at the camera — keep your face and eyes in view",
  "Tayyor — yozishni boshlashingiz mumkin": "Ready — you can start recording",
  "Bulutga yozib bo'lmadi": "Could not save to the cloud",
  "Orqaga": "Back",
  "Speaking qarzingiz": "Your Speaking debt",
  "Speaking topshirib qarzni kamaytiring.": "Submit Speaking to reduce the debt.",
  "O'rtacha baho": "Average score",
  "Yopish": "Close",
  "Barchasini ko'rish": "View all",
  "Telegram orqali topshirish": "Submit via Telegram",
  "Muzaffar Amirovga Telegram botga ovozli xabar (voice) yoki dumaloq video (krujok) yuboring — brauzerda yozish shart emas.": "Send a voice message or a round video (video note) to Muzaffar Amirov via the Telegram bot — no need to record in the browser.",
  "Telegramda botga kiring": "Open the bot in Telegram",
  "ovozli xabar yuboring": "send a voice message",
  "Muzaffar Amirov baholaydi": "Muzaffar Amirov grades it",
  "Guruh tayinlanmagan": "No group assigned",
  "Muzaffar Amirov bilan Chat": "Chat with Muzaffar Amirov",
  "Sozlamalar": "Settings",
  "Muzaffar Amirovga xabar yozing...": "Write a message to Muzaffar Amirov...",
  "Yuborish": "Send",
  "Mening davomatim": "My attendance",
  "(Qarzdorlik mavjud emas)": "(no debt)",
  "Telegram topshiriqlari (Inbox)": "Telegram submissions (Inbox)",
  "Uyga vazifa qo'shish": "Assign homework",
  "Uyga vazifani tahrirlash": "Edit homework",
  "Hozircha yuklangan topshiriqlar yo'q": "No submitted homework yet",
  "Hozircha Telegram orqali topshirik yo'q": "No Telegram submissions yet",
  "Bu sanada slot yo'q — 'Slot' tugmasini bosing": "No slots for this date — tap 'Slot'",
  "Guruhlar oylik to'lov jadvali": "Groups monthly payment schedule",
  "oylik to'lovlar": "monthly payments",
  "oylik to'lov": "monthly fee",
  "Hozircha uyga vazifa yo'q": "No homework yet",
  "Hozircha fayl biriktirilmagan": "No file attached yet",
  "Hozircha to'lov yo'q": "No payments yet",
  "Hozircha to'lovlar mavjud emas": "No payments yet",
  "Hozircha slot biriktirilmagan": "No slot assigned yet",
  "Hozircha topshirilmagan": "Not submitted yet",
  "Hozircha baho yo'q": "No grades yet",
  "Repetitorlik o'quvchisi yo'q": "No tutoring students",
  "Repetitorlik guruhi yo'q": "No tutoring groups",
  "Qarzdor o'quvchi yo'q — hamma to'langan ✓": "No debtors — everyone has paid ✓",
  "Bu guruhda o'quvchi yo'q": "No students in this group",
  "Maktab guruhi yo'q": "No school groups",
  "Hozircha guruh yo'q": "No groups yet",
  "Slotga o'quvchi tayinlanadi. Ovozli/video topshiriklar botga tushadi (foydalanuvchi ruxsati bilan) — \"Baholash\" orqali 1–10 ball qo'yiladi, ball baholar jurnaliga tushadi va Speaking qarzi 1 ga kamayadi.": "A student is assigned to the slot. Voice/video submissions arrive in the bot (with the user's consent) — use \"Grade\" to give a score from 1 to 10; the score goes to the gradebook and the Speaking debt is reduced by 1.",
  "O'quvchilar repetitorlik to'lovini o'tkazishi uchun karta raqamingiz va ism-familiyangizni kiriting:": "Enter your card number and full name so students can transfer the tutoring fee:",
  "Diqqat:": "Attention:",
  "Tekshiruvni yakunlang": "Complete the verification",
  "Tekshiruv tasdiqlanmadi — qayta urinib ko'ring": "Verification failed — please try again",
  "so'm": "UZS",
  "Yangi baholar va xabarlarni o'tkazib yubormaslik uchun bildirishnomalarni yoqing": "Turn on notifications so you don't miss new grades and messages",
  "Ruxsat berish": "Allow",
  "Bildirishnomalar o'chirib qoldi": "Notifications were turned off",
  "Speaking qarzingiz: {n} ta": "Your Speaking debt: {n}",
  "Fayllar biriktirish — bir nechta fayl tanlash mumkin (rasm, video, audio, pdf, doc):": "Attach files — you can choose several (image, video, audio, pdf, doc):",
  "— Tanlanmagan —": "— Not selected —",
  "Hozircha oylar belgilanmagan": "No months set yet",
  "Sizda {sum} so'm to'lov qarzdorligi mavjud!": "You have an unpaid balance of {sum} UZS!",
  "Qarzdorlik mavjud emas": "No debt",
  "qabul qilindi": "received",
  "So'nggi to'lov: {date} da {sum} so'm ({month} uchun qabul qilindi)": "Last payment: {sum} so'm on {date} (accepted for {month})",
  "Chekingiz rad etildi:": "Your receipt was rejected:",
  "Noto'g'ri chek": "Invalid receipt",
  "Iltimos, qaytadan to'g'ri chekni yuklang:": "Please upload a valid receipt again:",
  "Karta orqali to'lash": "Pay by Card",
  "Ochish": "Open",
  "Baho:": "Score:",
  "Kutilmoqda": "Pending",
  "Topshiriq bekor qilindi": "Submission cancelled",
  "Muzaffar Amirov ko'rib chiqmoqda": "Muzaffar Amirov is reviewing",
  "Ovozli xabar": "Voice message",
  "Video": "Video",
  "Hozircha xabar yo'q": "No messages yet",
  "O'qituvchi {n} ta vazifangizga komentariya yozdi": "The teacher commented on {n} of your assignments",
  "Vazifa ichida o'qib, fayllaringizni ko'rishingiz mumkin.": "Open the assignment to read it and view your files.",
  "Ko'rdim": "Got it",
  "Darsdagi javob": "Answer in class",
  "Karta orqali to'lov": "Payment by card",
  "Karta egasi": "Cardholder",
  "Nusxalash": "Copy",
  "Oy:": "Month:",
  "To'lov chekini yuklash (Rasm):": "Upload payment receipt (image):",
  "Chekni yuborish": "Send receipt",
  "Chek rasmi": "Receipt image",
  "Fayl tanlash": "Choose file",
  "Fayl tanlanmagan": "No file chosen",
  "Tushunarli": "Got it",
  "Ovozli topshirish uchun Telegram botga kiring va u yerga ovozli xabar (voice) yoki krujok (video note) yuboring.": "To submit your speaking task, open the Telegram bot and send a voice message or a round video (video note) there.",
  "Davomat: {p}% qatnashgan ({n} ta qoldirilgan)": "Attendance: {p}% attended ({n} missed)",
  "{p} keldi · {a} kelmadi · {e} sababli": "{p} present · {a} absent · {e} excused",
  "{n} ta baholangan dars": "{n} graded lessons",
});
function getLang() { return store.get('app_lang', 'uz'); }
/* Mock Tests — ingliz tarjimalari */
Object.assign(I18N_EN, {
  'Mock testlar': 'Mock Tests',
  'Mock testlar natijalari': 'Mock test results',
  '6 bo‘lim: Reading, Listening, Writing, Speaking, Grammar va Vocabulary. Har bir bo‘lim yakunida ball, CEFR va izohlar ko‘rinadi.':
    'Six sections: Reading, Listening, Writing, Speaking, Grammar and Vocabulary. Each section ends with a score, a CEFR level and explanations.',
  '6 bo‘lim bo‘yicha topshirilgan ishlar: ball, CEFR, javoblar tahlili, yozma ish va speaking videolari.':
    'Submitted work across all six sections: score, CEFR, answer review, written work and speaking videos.',
  'Bo‘limni tanlang': 'Choose a section',
  'Mening natijalarim': 'My results',
  'Boshlanmagan': 'Not started',
  'Baholanmoqda': 'Awaiting review',
  'Ustoz tekshiruvi kutilmoqda': 'Waiting for teacher review',
  'Baho': 'Grade',
  'Baho:': 'Grade:',
  'Matn va savollar': 'Passage and questions',
  'Audio va savollar': 'Audio and questions',
  'Insho yozish': 'Write an essay',
  'Video javoblar': 'Video answers',
  'Grammatika testi': 'Grammar test',
  "Lug'at testi": 'Vocabulary test',
  'Javobingizni shu yerga yozing...': 'Write your answer here...',
  'so‘z': 'words',
  'kamida': 'at least',
  'Topshiriq': 'Task',
  'Audioni tinglang': 'Listen to the audio',
  'Tinglash': 'Play',
  'Matnni ko‘rsatish': 'Show transcript',
  'Barcha savollarga javob bering': 'Answer all questions',
  'Savol': 'Question',
  'Bu savolga video yozildi': 'Video recorded for this question',
  'Video hali yozilmagan': 'No video recorded yet',
  'Dumaloq video, ko‘z nazorati va 3 ogohlantirish bilan yoziladi.':
    'Recorded as a circular video with eye tracking and three warnings.',
  'Yakunlash': 'Finish',
  'Natija': 'Result',
  'Javoblarni yopish': 'Hide answers',
  'Javoblarni ko‘rib chiqish': 'Review answers',
  'Sizning javobingiz': 'Your answer',
  'To‘g‘ri javob': 'Correct answer',
  'Izoh': 'Explanation',
  'Ustoz izohi': 'Teacher feedback',
  'Video yuborilmagan': 'No video submitted',
  'Ko‘z kontakti': 'Eye contact',
  'Chetga qarash': 'Look-aways',
  'Davomiyligi': 'Duration',
  'Reading va Listening javoblari': 'Reading and Listening Answers',
  'Writing javoblari': 'Writing Answers',
  'Speaking javoblari': 'Speaking Answers',
  'Vocabulary va Grammar': 'Vocabulary and Grammar',
  'Hozircha natija yo‘q': 'No results yet',
  'O‘quvchi matni (tahrirlash mumkin)': "Student's text (editable)",
  'Asl matn': 'Original text',
  'O‘quvchiga izoh yozing...': 'Write feedback for the student...',
  'Baho (raqam yoki matn)': 'Grade (number or text)',
  'Masalan: 8 yoki 7.5 yoki A': 'e.g. 8 or 7.5 or A',
  'Saqlandi': 'Saved',
  'Audioni ijro etib bo‘lmadi': 'Could not play the audio',
  'Bu qurilmada audio ijro etish qo‘llab-quvvatlanmaydi': 'Audio playback is not supported on this device',
  'Audio ijro etilmoqda...': 'Playing audio...',
  'Yuklab bo‘lmadi. Qayta urinib ko‘ring.': 'Upload failed. Please try again.',
  'Video saqlandi': 'Video saved',
  'Writing javobi yuborildi': 'Writing answer submitted',
  'Speaking javobi yuborildi': 'Speaking answer submitted',
  'Natija saqlandi': 'Result saved',
  'Javob juda qisqa — kamida bir necha gap yozing': 'The answer is too short — write at least a few sentences',
  'Ustoz biriktirgan mock testlar. Yakunida ball, CEFR va izohlar ko‘rinadi.': 'Mock tests assigned by your teacher. At the end you see the score, CEFR level and explanations.',
  'Biriktirilgan mock testlar': 'Assigned mock tests',
  'Sizga hali mock test biriktirilmagan. Ustoz test biriktirgach shu yerda ko‘rinadi.': 'No mock test has been assigned to you yet. It will appear here once your teacher assigns one.',
  'Yozma topshiriq': 'Writing task',
  'savol': 'questions',
  'Mock test topilmadi': 'Mock test not found',
  'Test yarating, guruhlarga biriktiring va o‘quvchilar natijalarini tekshiring.': 'Create tests, assign them to groups and review student results.',
  "Yangi Mock qo'shish": 'Add New Mock',
  'Yaratilgan mock testlar': 'Created mock tests',
  'Bu bo‘limda hali mock test yaratilmagan': 'No mock test has been created in this section yet',
  'O‘quvchilar natijalari': 'Student results',
  'Guruh tanlanmagan': 'No group selected',
  'Tahrirlash': 'Edit',
  'Guruhlar': 'Groups',
  'O‘chirish': 'Delete',
  'Guruhlarni biriktirish': 'Assign groups',
  'Bekor qilish': 'Cancel',
  'Bu mock testni o‘chirishni tasdiqlaysizmi?': 'Delete this mock test?',
  'Ha, o‘chirish': 'Yes, delete',
  'Yangi Mock': 'New Mock',
  'Mock nomi': 'Mock name',
  'Masalan: Reading Practice 1': 'e.g. Reading Practice 1',
  'Matn': 'Text',
  'Savollar': 'Questions',
  'Javoblar': 'Answers',
  'Qism nomi': 'Part title',
  'Matnni kiriting': 'Enter the passage',
  'Savol matni': 'Question text',
  'variant': 'option',
  'Savol qo‘shish': 'Add question',
  'Add Task': 'Add Task',
  'Audio (R2)': 'Audio (R2)',
  'Fayl tanlanmagan': 'No file selected',
  'Shart (ixtiyoriy)': 'Instruction (optional)',
  'Masalan: Audioni bir marta tinglang': 'e.g. Listen to the audio once',
  'Rasm (ixtiyoriy, o‘rta o‘lcham)': 'Image (optional, medium size)',
  'Topshiriq matni': 'Task text',
  'O‘quvchi yozadigan topshiriq': 'The task the student writes about',
  'Shart': 'Instruction',
  'Masalan: kamida 70 so‘z yozing': 'e.g. Write at least 70 words',
  'Fayl (R2, ixtiyoriy)': 'File (R2, optional)',
  'Fayl': 'File',
  'Rasm tanlanmagan': 'No image selected',
  'Izoh (javob izohi)': 'Explanation (answer note)',
  'Mock nomini kiriting': 'Enter the mock name',
  'Kamida bitta savol va 2 ta variant kiriting': 'Add at least one question with 2 options',
  'Mock test saqlandi': 'Mock test saved',
  'Kamida bitta qism kerak': 'At least one part is required',
  'Kamida bitta topshiriq kerak': 'At least one task is required',
  'Kamida bitta savol kerak': 'At least one question is required',
  'Guruhlar saqlandi': 'Groups saved',
  "Mock test o'chirildi": 'Mock test deleted',
  'Yuklanmoqda...': 'Uploading...',
  'Fayl yuklandi': 'File uploaded',
  'Bu testda audio yuklanmagan': 'No audio was uploaded for this test',
  'Boshlash': 'Start',
  'Bu bo‘limda sizga hali mock test biriktirilmagan. Ustoz test biriktirgach shu yerda ko‘rinadi.':
    'No mock test has been assigned to you in this section yet. It will appear here once your teacher assigns one.',
  'CEFR darajasi': 'CEFR level',
  'CEFR darajalari': 'CEFR levels',
  'Mock bo‘yicha minimal to‘g‘ri javob': 'minimum correct answers for the whole mock',
  'Part qo‘shish': 'Add Part',
  'Audio avtomatik boshlanadi': 'Audio starts automatically',
  'Tinglandi': 'Played',
  'Audio bir marta ijro etiladi — to‘xtatib yoki orqaga qaytarib bo‘lmaydi.':
    'The audio plays once — it cannot be paused or rewound.',
  'Bu audio faqat bir marta tinglanadi': 'This audio can be played only once',
  'Vaqt tugadi': 'Time is up',
  'Biriktirilgan fayl': 'Attached file',
  'Hozircha guruh yo‘q': 'No groups yet',
  'Variantli': 'Multiple choice',
  'Yozma javob': 'Written answer',
  'To‘g‘ri javob (so‘z, son yoki gap)': 'Correct answer (word, number or sentence)',
  'Masalan: 25 | twenty five': 'e.g. 25 | twenty five',
  'Bir nechta qabul qilinadigan variantni | yoki / bilan ajrating':
    'Separate multiple accepted variants with | or /',
  'Harf / variant qo‘shish': 'Add option / letter',
  'Variantni o‘chirish': 'Delete option',
  'Javobingizni yozing': 'Type your answer',
  'Kamida bitta savol va javob kiriting': 'Add at least one question and its answer',
  'Natija o‘chirildi': 'Result deleted',
  'Bu natijani o‘chirishni tasdiqlaysizmi?': 'Delete this result?',
  'Kameraga qarang! {s}s...': 'Look at the camera! {s}s...',
  '5 soniya ichida kameraga qaytmadingiz. Yozuv bekor qilindi — videoni qaytadan oling.':
    'You did not return to the camera within 5 seconds. Recording cancelled — please record again.'
});

function t(s) {
  if (getLang() !== 'en') return s;
  const v = I18N_EN[s];
  return v == null ? s : v;
}
/* Dinamik matn yordamchilari: "9-sinf" → "Grade 9", "N ta" → "N" */
function tClass(c) {
  const s = String(c == null ? '' : c);
  if (getLang() !== 'en') return s;
  const m = /^(\d+)\s*-?\s*sinf$/i.exec(s.trim());
  return m ? 'Grade ' + m[1] : t(s);
}
function tTa(n) { return getLang() === 'en' ? String(n) : n + ' ta'; }
function tStudCnt(n) {
  return getLang() === 'en' ? n + ' student' + (n === 1 ? '' : 's') : n + " ta o'quvchi";
}
function tGrpCnt(n) {
  return getLang() === 'en' ? n + ' student' + (n === 1 ? '' : 's') : n + " o'quvchi";
}
/* --- DOM bo'ylab tarjima: qattiq yozilgan matnlar ham tanlangan tilga o'tadi --- */
/* UZ matn ichida tasodifan uchraydigan umumiy ingliz so'zlari teskari
   tarjimadan chiqariladi (masalan "Present Perfect shakli" buzilmasligi uchun). */
const I18N_REVERSE_SKIP = { 'Present': 1, 'Absent': 1, 'Excused': 1, 'Set': 1, 'Paid': 1 };
const I18N_UZ = (function () {
  /* Faqat bir xil ingliz matnga ega bo'lgan yagona o'zbek kaliti olinadi —
     aks holda "Speaking" kabi so'zlar noto'g'ri almashib ketadi. */
  const count = {};
  Object.keys(I18N_EN).forEach(function (k) {
    const en = I18N_EN[k];
    if (!en) return;
    count[en] = (count[en] || 0) + 1;
  });
  const m = {};
  Object.keys(I18N_EN).forEach(function (k) {
    const en = I18N_EN[k];
    if (en && count[en] === 1 && !I18N_REVERSE_SKIP[en]) m[en] = k;
  });
  return m;
})();
/* textarea ichidagi matn — foydalanuvchi/ustoz yozgan ma'lumot, tarjima qilinmaydi */
const I18N_SKIP_TAGS = ['script', 'style', 'noscript', 'svg', 'path', 'textarea'];
/* Ustoz kiritgan mock kontenti (sarlavha, qism nomi, matn, shart, savol, variant,
   javob, izoh) UZ/EN almashganda so'zma-so'z saqlanadi — faqat statik UI tarjima qilinadi. */
const I18N_SKIP_SEL = '.s-name, .profile-name, .login-val, .brand, ' +
  '.mock-def-card-title, .mock-def-title, .mock-def-group, .mock-def-groups, .mock-stu-meta, ' +
  '.mock-passage, .mock-passage-title, .mock-hint, .mock-speak-q, .mock-ans-badge, ' +
  '.mock-q-head, .mock-opt, .mock-opt-key, .mock-ans-input, .mock-rev, .mock-written, ' +
  '.mock-feedback, .mock-original, .mock-video-q, .mock-video-meta, .mock-file-link, ' +
  '.mock-history-row b, .mock-score-title, .mock-person-test, .mock-person-name, ' +
  '.mock-person-meta, .mock-build-part-head, .mock-build-answer-row, .mock-build-izoh, ' +
  '.mock-build-opt';
function i18nNorm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
/* Sonlar bilan keladigan dinamik matnlar */
function i18nPattern(s, lang) {
  if (lang !== 'en') return null;
  let m;
  if ((m = /^(\d+) ta guruh$/.exec(s))) return m[1] + ' groups';
  if ((m = /^(\d+) ta o'quvchi$/.exec(s))) return m[1] + ' students';
  if ((m = /^(\d+) nafar · umumiy qarz: (.+)$/.exec(s))) return m[1] + ' students · total debt: ' + m[2];
  if ((m = /^(\d+) nafar repetitor o'quvchisi · (.+)$/.exec(s))) return m[1] + ' tutoring students · ' + m[2];
  if ((m = /^(\d+) ta muammo topildi$/.exec(s))) return m[1] + ' issues found';
  if ((m = /^(\d+) ta fayl yuborildi$/.exec(s))) return m[1] + ' files sent';
  if ((m = /^(\d+)\/(\d+) fayl yuklandi · (\d+)%$/.exec(s))) return m[1] + '/' + m[2] + ' files uploaded · ' + m[3] + '%';
  if ((m = /^(\d+) ta$/.exec(s))) return m[1];
  if ((m = /^✓ Keldi: (\d+)$/.exec(s))) return '✓ Present: ' + m[1];
  if ((m = /^✕ Kelmadi: (\d+)$/.exec(s))) return '✕ Absent: ' + m[1];
  if ((m = /^\? Sababli: (\d+)$/.exec(s))) return '? Excused: ' + m[1];
  if ((m = /^Jami: (.+)$/.exec(s))) return 'Total: ' + m[1];
  if ((m = /^(?:To'lov|Payments) qarzi: (.+) so'm$/.exec(s))) return 'Payment debt: ' + m[1] + " so'm";
  if ((m = /^(.+) so'm qarz$/.exec(s))) return m[1] + " so'm debt";
  if ((m = /^1-on-1 slotlar • (\d+) ta slot$/.exec(s))) return '1-on-1 slots • ' + m[1] + (m[1] === '1' ? ' slot' : ' slots');
  if ((m = /^(\d+) ta slot$/.exec(s))) return m[1] + (m[1] === '1' ? ' slot' : ' slots');
  if ((m = /^(\d+)-sinf$/.exec(s))) return 'Grade ' + m[1];
  if ((m = /^(\d+)\/(\d+) belgilandi$/.exec(s))) return m[1] + '/' + m[2] + ' marked';
  if ((m = /^(\d+) keldi · (\d+) kelmadi · (\d+) sababli$/.exec(s)))
    return m[1] + ' present · ' + m[2] + ' absent · ' + m[3] + ' excused';
  if ((m = /^(\d+) ta baholangan dars$/.exec(s))) return m[1] + (m[1] === '1' ? ' graded lesson' : ' graded lessons');
  if ((m = /^(\d+)-sinf • (.+)$/.exec(s))) return 'Grade ' + m[1] + ' • ' + m[2];
  return null;
}
let i18nSegCache = { map: null, keys: [] };
function i18nSegments(s, map) {
  if (i18nSegCache.map !== map) {
    i18nSegCache = {
      map: map,
      keys: Object.keys(map).filter(function (k) { return k.length >= 3; })
        .sort(function (a, b) { return b.length - a.length; })
    };
  }
  let out = s;
  const keys = i18nSegCache.keys;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (out.indexOf(k) < 0) continue;
    const safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|[\\s:·(])' + safe + '(?=$|[\\s.,:;!?)·])', 'g');
    out = out.replace(re, function (_, pre) { return pre + map[k]; });
  }
  return out;
}
function i18nText(src, lang) {
  const core = i18nNorm(src);
  if (!core || !/[A-Za-z]/.test(core)) return null;
  const map = lang === 'en' ? I18N_EN : I18N_UZ;
  if (Object.prototype.hasOwnProperty.call(map, core)) return map[core];
  const pat = i18nPattern(core, lang);
  if (pat != null) return pat;
  const seg = i18nSegments(core, map);
  return seg !== core ? seg : null;
}
function i18nApply(root, lang) {
  if (!root || typeof document === 'undefined') return;
  const walker = document.createTreeWalker(root, 4, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const parent = node.parentNode;
    if (!parent || parent.nodeType !== 1) continue;
    if (I18N_SKIP_TAGS.indexOf(parent.tagName.toLowerCase()) >= 0) continue;
    if (parent.closest && parent.closest(I18N_SKIP_SEL)) continue;
    const raw = node.nodeValue;
    if (!raw || !/\S/.test(raw)) continue;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    const next = i18nText(raw, lang);
    if (next != null) node.nodeValue = lead + next + trail;
  }
  const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
  for (let i = 0; i < els.length; i++) {
    ['placeholder', 'title', 'aria-label'].forEach(function (at) {
      const v = els[i].getAttribute(at);
      if (!v) return;
      const next = i18nText(v, lang);
      if (next != null) els[i].setAttribute(at, next);
    });
  }
}
function applyCurrentLang(root) { i18nApply(root || document.body, getLang()); }
/* Dinamik qo'shilgan matnlar (toast, xato, modal) ham darhol tarjima qilinadi */
let i18nBusy = false;
function startI18nObserver() {
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  const obs = new MutationObserver(function (list) {
    if (getLang() !== 'en' || i18nBusy) return;
    i18nBusy = true;
    try {
      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (m.type === 'characterData' && m.target && m.target.parentNode) {
          i18nApply(m.target.parentNode, 'en');
        } else if (m.addedNodes) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const nd = m.addedNodes[j];
            if (nd.nodeType === 1) i18nApply(nd, 'en');
            else if (nd.nodeType === 3 && nd.parentNode) i18nApply(nd.parentNode, 'en');
          }
        }
      }
    } finally {
      setTimeout(function () { i18nBusy = false; }, 0);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
function toggleLang() {
  store.set('app_lang', getLang() === 'uz' ? 'en' : 'uz');
  const modalOpen = $('#modal-overlay') && !$('#modal-overlay').hidden;
  render();
  if (modalOpen) applyCurrentLang($('#modal-sheet'));
  applyCurrentLang(document.body);
  try { document.documentElement.setAttribute('lang', getLang()); } catch (e) {}
  toast(getLang() === 'en' ? 'Language: English' : "Til: o'zbekcha");
}

function getTheme() { return store.get('theme', 'light'); }
function applyTheme() {
  try { document.documentElement.setAttribute('data-theme', getTheme() === 'dark' ? 'dark' : 'light'); }
  catch (e) {}
}
function toggleTheme() {
  store.set('theme', getTheme() === 'dark' ? 'light' : 'dark');
  applyTheme();
  render();
}
/* Header nazorat tugmalari: rejim (sun/moon) + UZ | EN til */
function headerControlsHTML() {
  const dark = getTheme() === 'dark';
  const en = getLang() === 'en';
  return `<div class="header-controls">
    <button type="button" class="icon-btn mode-btn" data-act="toggle-theme" aria-label="${dark ? 'Kunduzgi rejim' : 'Tungi rejim'}" title="${dark ? 'Kunduzgi rejim' : 'Tungi rejim'}">${dark ? ico('sun', 18) : ico('moon', 18)}</button>
    <button type="button" class="lang-switch" data-act="toggle-lang" aria-label="Tilni almashtirish">
      <span class="lang-opt${!en ? ' active' : ''}">${ico('flagUZ', 14)} UZ</span><span class="lang-sep">|</span><span class="lang-opt${en ? ' active' : ''}">${ico('flagGB', 14)} EN</span>
    </button>
  </div>`;
}
function renderTopNavControls() {
  const el = document.getElementById('top-nav-right');
  if (!el) return;
  let box = document.getElementById('top-nav-controls');
  if (!box) {
    el.insertAdjacentHTML('afterbegin', '<span id="top-nav-controls"></span>');
    box = document.getElementById('top-nav-controls');
  }
  box.innerHTML = headerControlsHTML();

  /* Kirish ekranlarida desktop navigatsiyada ham "Kirish" ko'rinadi;
     foydalanuvchi belgisi va chiqish (✕) yashiriladi. */
  const auth = AUTH_SCREENS.indexOf(state.screen) >= 0;
  const badge = document.getElementById('top-user-badge');
  const outBtn = el.querySelector('[data-act="logout"]');
  if (badge) badge.style.display = auth ? 'none' : '';
  if (outBtn) outBtn.style.display = auth ? 'none' : '';

  const showEnter = auth && authStep() === 'landing';
  let enter = document.getElementById('top-auth-enter');
  if (!enter) {
    enter = document.createElement('button');
    enter.type = 'button';
    enter.id = 'top-auth-enter';
    enter.className = 'btn btn-primary btn-sm auth-head-btn';
    enter.setAttribute('data-act', 'auth-login-open');
    el.appendChild(enter);
  }
  enter.textContent = t('Kirish');
  enter.style.display = showEnter ? '' : 'none';
}

function scrLabel(s) {
  return {
    home: 'Bosh sahifa',
    groups: 'Guruhlar',
    students: "O'quvchilar",
    homework: 'Uyga vazifalar',
    payments: "To'lovlar",
    grades: 'Baholar jurnali',
    attendance: 'Tezkor davomat',
    speaking: 'Speaking (1-on-1)',
    submissions: 'Bajarilgan topshiriqlar',
    profile: 'Profil',
    mock: 'Mock testlar'
  }[s] || '';
}
function renderHeader() {
  const scr = state.screen;
  if (AUTH_SCREENS.indexOf(scr) >= 0) {
    const step = authStep();
    /* Kirish sahifasida header'da "Kirish"; ichki oynalarda yagona "Orqaga"
       karta ichida bo'ladi (header'da takrorlanmaydi). */
    const right = step === 'landing'
      ? `<button type="button" class="btn btn-primary btn-sm auth-head-btn" data-act="auth-login-open">${t('Kirish')}</button>`
      : '';
    return '<div class="header-inner"><span class="brand"><img class="brand-logo" src="logo.png" alt="" width="36" height="36" />English Teacher</span>' + headerControlsHTML() + right + '</div>';
  }
  const u = currentUser() || {};
  return `<div class="header-inner">
    <div class="brand-wrap">
      <span class="brand"><img class="brand-logo" src="logo.png" alt="" width="36" height="36" />English Teacher</span>
      <span class="brand-sub">${esc(t(scrLabel(scr)))}</span>
    </div>
      <span class="role-badge ${u.role === 'teacher' || u.role === 'support' ? 'is-teacher' : 'is-student'}">${u.role === 'teacher' ? 'Muzaffar Amirov' : u.role === 'support' ? 'Support teacher' : "O'quvchi"}</span>
    ${headerControlsHTML()}
  </div>`;
}
function navItems() {
  if (isSupport()) {
    const items = [['home', t('Bosh'), ICON.home]];
    if (supportPerm('students')) items.push(['students', t("O'quvchi"), ICON.students]);
    if (supportPerm('homework')) items.push(['homework', t('Uyga vazifalar'), ICON.bookOpen]);
    if (supportPerm('submissions')) items.push(['submissions', t('Topshiriqlar'), ICON.clipboardCheck]);
    if (supportPerm('mock')) items.push(['mock', t('Mock testlar'), ICON.gradCap]);
    if (supportPerm('grades')) items.push(['grades', t('Baholar'), ICON.grades]);
    if (supportPerm('attendance')) items.push(['attendance', t('Davomat'), ICON.cal]);
    if (supportPerm('speaking')) items.push(['speaking', t('Speaking'), ICON.mic]);
    items.push(['profile', t('Profil'), ICON.profile]);
    return items;
  }
  if (isTeacher()) {
    return [
      ['home', t('Bosh'), ICON.home],
      ['students', t("O'quvchi"), ICON.students],
      ['homework', t('Uyga vazifalar'), ICON.bookOpen],
      ['submissions', t('Topshiriqlar'), ICON.clipboardCheck],
      ['mock', t('Mock testlar'), ICON.gradCap],
      ['payments', t("To'lov"), ICON.star],
      ['grades', t('Baholar'), ICON.grades],
      ['attendance', t('Davomat'), ICON.cal],
      ['speaking', t('Speaking'), ICON.mic],
      ['profile', t('Profil'), ICON.profile]
    ];
  }
  /* O'quvchi: faqat o'z portali va profili */
  return [
    ['home', t('Kabinet'), ICON.home],
    ['profile', t('Profil'), ICON.profile]
  ];
}
/* Ko'rilmagan topshiriqlar soni — navigatsiya nishoni uchun */
function newSubmissionsCount() {
  return submissionsList().filter(function (s) { return !String(s.teacherComment || '').trim(); }).length;
}
function pendingWebSpeakingCount() {
  return getTgSubs().filter(function (x) {
    return isWebSubmission(x) && x.status !== 'baholandi' && x.status !== 'graded' && x.status !== 'rad_etildi';
  }).length;
}
function navBadgeHTML(key) {
  if (key === 'submissions') {
    const n = newSubmissionsCount();
    return n ? `<span class="nav-badge">${n > 99 ? '99+' : n}</span>` : '';
  }
  if (key === 'speaking') {
    const n = pendingWebSpeakingCount();
    return n ? `<span class="nav-badge nav-badge-speak">${n > 99 ? '99+' : n}</span>` : '';
  }
  if (key === 'mock') {
    const n = mockPendingCount();
    return n ? `<span class="nav-badge">${n > 99 ? '99+' : n}</span>` : '';
  }
  return '';
}
function renderNav() {
  if (AUTH_SCREENS.indexOf(state.screen) >= 0) return '';
  return navItems().map(it => {
    const active = state.screen === it[0] ? ' active' : '';
    return `<button type="button" class="nav-item${active}" data-act="nav" data-screen="${it[0]}">${it[2]}<span>${it[1]}${navBadgeHTML(it[0])}</span></button>`;
  }).join('');
}
function renderTopNavTabs() {
  const el = document.getElementById('top-nav-tabs');
  if (!el) return;
  if (AUTH_SCREENS.indexOf(state.screen) >= 0) { el.innerHTML = ''; return; }
  const labels = {
    home: 'Bosh sahifa',
    students: "O'quvchilar",
    homework: 'Uyga vazifalar',
    grades: 'Baholar jurnali',
    attendance: 'Davomat',
    speaking: 'Speaking',
    submissions: 'Bajarilgan topshiriqlar',
    profile: 'Profil',
    groups: 'Guruhlar',
    mock: 'Mock testlar'
  };
  el.innerHTML = navItems().map(it => {
    const active = state.screen === it[0] ? ' active' : '';
    return `<button type="button" class="top-nav-item${active}" data-act="nav" data-screen="${it[0]}">${esc(t(labels[it[0]] || it[1]))}${navBadgeHTML(it[0])}</button>`;
  }).join('');
}

/* ==================== KIRISH EKRANI (login / parol) ==================== */
/* ==================== CLOUDFLARE TURNSTILE ==================== */
const TURNSTILE_SITE_KEY = '0x4AAAAAAGDZyGmTRBp6DcVs';
const TURNSTILE_VERIFY_URL = R2_UPLOAD_URL + '/verify-turnstile';
/* workers.dev ba'zi ISP'larda osilib qoladi — 5 soniyadan keyin so'rov bekor qilinadi */
const TURNSTILE_VERIFY_TIMEOUT_MS = 5000;

function turnstileReady() {
  return !!(window.turnstile && typeof window.turnstile.render === 'function');
}
function turnstileTheme() { return getTheme() === 'dark' ? 'dark' : 'light'; }
function turnstileHost(kind) {
  return kind === 'recover' ? $('#recover-turnstile-box') : $('#turnstile-box');
}
function turnstileFallback(kind) {
  return kind === 'recover' ? $('#recover-captcha-fallback') : $('#login-captcha-fallback');
}
/* Vidjetni joylashtiradi. Skript hali yuklanmagan bo'lsa qisqa kutadi;
   umuman yuklanmasa — eski matematik CAPTCHA fallback bo'lib qoladi. */
function mountTurnstile(kind) {
  const host = turnstileHost(kind);
  if (!host) return false;
  const tryRender = function () {
    if (!document.body || !document.body.contains(host)) return true; /* boshqa ekranga o'tilgan */
    return renderTurnstile(kind);
  };
  if (tryRender()) return true;
  if (!host.__tsWait) {
    let tries = 0;
    host.__tsWait = setInterval(function () {
      if (tryRender() || ++tries > 30) {
        clearInterval(host.__tsWait);
        host.__tsWait = null;
      }
    }, 200);
  }
  return false;
}
function renderTurnstile(kind) {
  const host = turnstileHost(kind);
  const fallback = turnstileFallback(kind);
  if (!host || !turnstileReady()) return false;
  if (host.__tsRendered) return true;
  try {
    const id = window.turnstile.render(host, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: turnstileTheme(),
      callback: function (token) { state.turnstileToken = String(token || ''); },
      'expired-callback': function () { state.turnstileToken = ''; },
      'timeout-callback': function () { state.turnstileToken = ''; },
      'error-callback': function () { state.turnstileToken = ''; }
    });
    host.__tsRendered = true;
    host.__tsId = id;
    host.hidden = false;
    if (fallback) fallback.hidden = true;
    return true;
  } catch (e) {
    console.warn('[turnstile] render:', (e && e.message) || e);
    return false;
  }
}
function turnstileInUse(kind) {
  const host = turnstileHost(kind);
  return !!(host && host.__tsRendered);
}
function resetTurnstile(kind) {
  state.turnstileToken = '';
  try {
    const host = turnstileHost(kind);
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset(host && host.__tsId != null ? host.__tsId : undefined);
    }
  } catch (e) { console.warn('[turnstile] reset:', (e && e.message) || e); }
}
async function verifyTurnstileToken(token) {
  let timer = null;
  let ctrl = null;
  try {
    /* Osilib qolgan ulanishda login kutib qolmasligi uchun 5 s timeout */
    if (typeof AbortController === 'function') {
      ctrl = new AbortController();
      timer = setTimeout(function () {
        try { ctrl.abort(); } catch (e) {}
      }, TURNSTILE_VERIFY_TIMEOUT_MS);
    }
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: String(token || '') }),
      signal: ctrl ? ctrl.signal : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (data && data.ok === true) return { ok: true, data };
    /* Faqat serverning aniq rad javobi bloklaydi: 403 yoki ok: false.
       Boshqa javob (masalan 5xx yoki JSON yo'q) — foydalanuvchini bloklamaymiz. */
    const rejected = (data && data.ok === false) || (res && res.status === 403);
    if (!rejected) {
      console.warn('[turnstile] verify: noaniq server javobi — kirish bloklanmaydi',
        res && res.status);
      return { ok: true, data, detail: '' };
    }
    let detail = '';
    if (data) {
      const codes = data['error-codes'];
      if (Array.isArray(codes) && codes.length) detail = codes.join(', ');
      else if (codes) detail = String(codes);
      else if (data.error) detail = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      else if (data.message) detail = String(data.message);
    }
    if (!detail && res && !res.ok) detail = 'HTTP ' + res.status;
    return { ok: false, data, detail: String(detail || '').trim() };
  } catch (e) {
    /* Turnstile vidjeti token bergan bo'lsa, tarmoq/ISP xatosi (Failed to fetch)
       yoki 5 s timeout (AbortError) kirishni bloklamaydi — login parol xeshi,
       5 urinish qulfi va ustoz uchun 2FA bilan himoyalangan. */
    const aborted = !!(e && (e.name === 'AbortError' || /abort/i.test(String(e.message || ''))));
    console.warn('[turnstile] verify: ' + (aborted ? 'timeout (5 s)' : 'tarmoq xatosi') +
      ' — kirish bloklanmaydi', (e && e.message) || e);
    return { ok: true, data: null, detail: '' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ==================== CAPTCHA (matematik + Canvas, fallback) ==================== */
function makeCaptcha() {
  if (Math.random() < 0.5) {
    const c = 2 + Math.floor(Math.random() * 4);
    const d = 2 + Math.floor(Math.random() * 4);
    return { text: c + ' × ' + d, answer: String(c * d) };
  }
  const a = 3 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * (a - 1));
  if (Math.random() < 0.5) return { text: a + ' + ' + b, answer: String(a + b) };
  return { text: a + ' − ' + b, answer: String(a - b) };
}

/* Canvas mavjud bo'lsa misol rasmga chiziladi, aks holda matn ko'rinadi.
   Ikkala holatda ham savol canvas'ning data-q atributida turadi. */
function paintCaptcha() {
  mountTurnstile('login');
  const box = $('#captcha-canvas');
  const fallback = $('#captcha-text');
  const cap = state.captcha || (state.captcha = makeCaptcha());
  if (fallback) fallback.textContent = cap.text + ' = ?';
  if (!box) return;
  box.setAttribute('data-q', cap.text);
  box.setAttribute('aria-label', 'Tekshiruv misoli: ' + cap.text);
  let ctx = null;
  try { ctx = box.getContext ? box.getContext('2d') : null; } catch (e) { ctx = null; }
  if (!ctx) { if (fallback) fallback.style.display = ''; return; }
  if (typeof ctx.clearRect !== 'function') { if (fallback) fallback.style.display = ''; return; }
  if (fallback) fallback.style.display = 'none';
  const w = box.width || 170;
  const h = box.height || 44;
  ctx.clearRect(0, 0, w, h);
  const dark = getTheme() === 'dark';   /* tungi rejimda canvas ham qorong'i */
  ctx.fillStyle = dark ? '#1b2437' : '#eef2ff';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = dark ? 'rgba(129,140,248,0.30)' : 'rgba(99,102,241,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.04);
  ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap.text + ' = ?', 0, 0);
  ctx.restore();
}

function refreshCaptcha(silent) {
  state.captcha = makeCaptcha();
  paintCaptcha();
  const input = $('#login-captcha');
  if (input) {
    input.value = '';
    if (!silent) input.focus();
  }
}

function sixDigitCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += String(Math.floor(Math.random() * 10));
  return code;
}

function authStep() { return state.authStep === 'login' || state.authStep === 'recover' ? state.authStep : 'landing'; }
/* Har bir kirish bosqichiga o'tilganda sahifa tepasiga qaytadi
   (aks holda karta qotib turgan header ostiga kirib qoladi) */
function scrollAuthTop() { try { window.scrollTo(0, 0); } catch (e) {} }

function setAuthStep(step) {
  state.authStep = step;
  if (step === 'landing') { state.resetDone = ''; state.resetCtx = null; }
  render();
  scrollAuthTop();
}

/* --- 1-bosqich: Bosh sahifa (landing) --- */
function landingScreen() {
  return `<div class="landing">
    <section class="landing-hero">
      <span class="landing-kicker">${ico('gradCap', 15)} English Teacher</span>
      <h1 class="landing-title">${t('English Teacher — Muzaffar Amirov')}</h1>
      <p class="landing-sub">${t("5–11-sinf va repetitorlik guruhlari uchun ingliz tili ta'lim platformasi: uyga vazifalar, 10 ballik baholar jurnali, davomat va speaking nazorati.")}</p>
      <button type="button" class="btn btn-primary landing-cta" data-act="auth-login-open">${t('Tizimga kirish')} ${ico('arrowRight', 16)}</button>
    </section>

    <div class="landing-features">
      <article class="landing-feature">
        <span class="landing-fico tint-indigo">${ico('bookOpen', 20)}</span>
        <div class="landing-fbody">
          <b>${t('Uyga vazifalar va media darslar')}</b>
          <span>${t("Video, audio va hujjatlarni saytning o'zida tezlikni boshqarib o'rganish.")}</span>
        </div>
      </article>
      <article class="landing-feature">
        <span class="landing-fico tint-emerald">${ico('grades', 20)}</span>
        <div class="landing-fbody">
          <b>${t('10 ballik jurnal va davomat')}</b>
          <span>${t("Har bir darsdagi baholar, o'rtacha reyting va qatnashish statistikasi.")}</span>
        </div>
      </article>
      <article class="landing-feature">
        <span class="landing-fico tone-telegram">${ico('telegram', 20)}</span>
        <div class="landing-fbody">
          <b>${t('Telegram bot (@uzbekspeakingcheckbot)')}</b>
          <span>${t('Ovozli va video speaking topshirish hamda baho/xabarlarni tezkor olish.')}</span>
        </div>
      </article>
    </div>

    <footer class="landing-footer">
      <a href="https://teachermuzaffar.uz/" target="_blank" rel="noopener">teachermuzaffar.uz</a>
      <span class="landing-dot">•</span>
      <span>@uzbekspeakingcheckbot</span>
    </footer>
  </div>`;
}

/* --- 2-bosqich: Kirish oynasi --- */
function loginFormScreen() {
  return `<div class="auth">
    <div class="auth-panel">
      <button type="button" class="auth-back" data-act="auth-back">${ico('arrowLeft', 16)} ${t('Orqaga')}</button>
      <div class="card auth-card auth-compact">
        <div class="auth-card-head">
          <span class="auth-card-ico">${ico('lock', 18)}</span>
          <div>
            <div class="auth-card-title">${t('Kirish — English Teacher')}</div>
            <div class="muted small">${t('Login va parolingizni kiriting')}</div>
          </div>
        </div>

        <label class="field-label" for="login-input">Login</label>
        <input class="input" id="login-input" type="text" autocapitalize="none" autocorrect="off"
               autocomplete="username" placeholder="Login" />

        <label class="field-label" for="password-input">${t('Parol')}</label>
        <div class="pw-wrap">
          <input class="input" id="password-input" type="password"
                 autocomplete="current-password" placeholder="••••" />
          <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="password-input" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
        </div>
        <input type="text" name="bot_check_field" id="login-bot-hp" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div id="turnstile-box" class="turnstile-box" aria-label="Cloudflare Turnstile"></div>
        <div id="login-captcha-fallback" class="captcha-fallback">
          <label class="field-label" for="login-captcha">${t('Tekshiruv (CAPTCHA)')}</label>
          <div class="captcha-row">
            <canvas id="captcha-canvas" width="170" height="44" data-q="" aria-label="Tekshiruv misoli"></canvas>
            <span class="captcha-text" id="captcha-text">—</span>
            <button type="button" class="icon-btn" data-act="captcha-refresh" aria-label="CAPTCHA yangilash" title="Yangi misol">${ico('refresh', 16)}</button>
          </div>
          <input class="input" id="login-captcha" inputmode="numeric" autocomplete="off" placeholder="${t('Javob')}" />
        </div>

        <div class="field-error${state.forcedOut || state.loginError ? ' show' : ''}" id="login-error">${state.forcedOut ? 'Siz ushbu qurilmadan chiqarildingiz!' : esc(state.loginError || '')}</div>
        <button type="button" class="btn btn-primary btn-block" data-act="do-login">${t('Tizimga kirish')}</button>
        <button type="button" class="auth-link" data-act="open-forgot">${t('Login yoki parolni unutdingizmi?')}</button>
      </div>
    </div>
  </div>`;
}

/* --- 3-bosqich: Kirishni tiklash --- */
function recoverScreen() {
  const mode = state.resetMode === 'login' || state.resetMode === 'both' ? state.resetMode : 'password';
  const isPw = mode === 'password';
  const opt = function (value, title, sub) {
    return `<label class="recover-opt${mode === value ? ' active' : ''}">
      <input type="radio" name="fr-mode" value="${value}"${mode === value ? ' checked' : ''} />
      <span class="recover-opt-body">
        <span class="recover-opt-title">${t(title)}</span>
        <span class="recover-opt-sub">${t(sub)}</span>
      </span>
    </label>`;
  };
  return `<div class="auth">
    <div class="auth-panel">
      <button type="button" class="auth-back" data-act="auth-back">${ico('arrowLeft', 16)} ${t('Orqaga')}</button>
      <div class="card auth-card auth-compact">
        <div class="auth-card-head">
          <span class="auth-card-ico">${ico('key', 18)}</span>
          <div>
            <div class="auth-card-title">${t('Kirishni tiklash')}</div>
            <div class="muted small">${t('Muammoni tanlang — kod tasdiqlangan Telegram yoki Gmailga yuboriladi.')}</div>
          </div>
        </div>

        <div class="recover-modes">
          ${opt('login', 'Login yodimda yo\u2018q', 'Login tasdiqlangan telefon/Gmailga yuboriladi.')}
          ${opt('password', 'Parol yodimda yo\u2018q', 'Yangi parol olish uchun tasdiqlash kodi yuboriladi.')}
          ${opt('both', 'Ikkalasi ham yodimda yo\u2018q', 'Tasdiqlangan telefon/Gmail orqali tiklash yoki ustozga murojaat.')}
        </div>

        <label class="field-label" for="fp-contact">${isPw ? 'Login' : t('Telefon yoki Gmail')}</label>
        <input class="input" id="fp-contact" autocomplete="username" autocapitalize="none" autocorrect="off"
               value="${esc(state.resetContact || '')}"
               placeholder="${isPw ? 'Login' : t('+998 90 123 45 67 yoki ism@gmail.com')}" />

        ${isPw ? `<div id="recover-turnstile-box" class="turnstile-box" aria-label="Cloudflare Turnstile"></div>
        <div id="recover-captcha-fallback" class="captcha-fallback">
          <label class="field-label" for="fr-captcha-input">${t('Tekshiruv (CAPTCHA)')}</label>
          <div class="captcha-row">
            <canvas id="fr-captcha" class="recover-captcha" width="150" height="44" aria-label="Tekshiruv kodi"></canvas>
            <span class="captcha-text" id="fr-captcha-text">—</span>
            <button type="button" class="icon-btn" data-act="recover-captcha-refresh" aria-label="CAPTCHA yangilash" title="Yangi kod">${ico('refresh', 16)}</button>
          </div>
          <input class="input" id="fr-captcha-input" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="${t('5 xonali kod')}" />
        </div>` : ''}

        <div class="field-error" id="fp-error"></div>
        ${state.resetDone ? `<div class="field-hint" id="fp-done">${esc(state.resetDone)}</div>` : ''}
        <button type="button" class="btn btn-primary btn-block" data-act="forgot-send">${isPw ? t('Keyingi qadam') : t('Yuborish')}</button>

        <div id="fp-step2" hidden>
          <label class="field-label" for="fp-code" style="margin-top:10px">${t('Kod (6 xona)')}</label>
          <input class="input" id="fp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" />
          <label class="field-label" for="fp-new">${t('Yangi parol')}</label>
          <input class="input" id="fp-new" type="password" autocomplete="new-password" placeholder="••••" />
          <button type="button" class="btn btn-primary btn-block" data-act="forgot-reset">${t('Parolni yangilash')}</button>
          <button type="button" class="btn btn-ghost btn-block" data-act="resend-reset">${t(RESEND_TEXT)}</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* Faqat ICON/ico() SVG — emoji yo'q */
function loginScreen() {
  const step = authStep();
  if (step === 'login') return loginFormScreen();
  if (step === 'recover') return recoverScreen();
  return landingScreen();
}

/* ==================== TIKLASH CAPTCHASI (5 xonali raqam, nuqtali fon) ==================== */
function makeRecoverCaptcha() {
  let d = '';
  for (let i = 0; i < 5; i++) d += String(Math.floor(Math.random() * 10));
  return { text: d, answer: d };
}

function paintRecoverCaptcha() {
  mountTurnstile('recover');
  const box = $('#fr-captcha');
  const fallback = $('#fr-captcha-text');
  const cap = state.recoverCaptcha || (state.recoverCaptcha = makeRecoverCaptcha());
  if (fallback) fallback.textContent = cap.text;
  if (!box) return;
  box.setAttribute('aria-label', 'Tekshiruv kodi: ' + cap.text);
  let ctx = null;
  try { ctx = box.getContext ? box.getContext('2d') : null; } catch (e) { ctx = null; }
  if (!ctx || typeof ctx.clearRect !== 'function') { if (fallback) fallback.style.display = ''; return; }
  if (fallback) fallback.style.display = 'none';
  const w = box.width || 150;
  const h = box.height || 44;
  ctx.clearRect(0, 0, w, h);
  const dark = getTheme() === 'dark';   /* tungi rejimda canvas ham qorong'i */
  ctx.fillStyle = dark ? '#1b2437' : '#eef2ff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = dark ? 'rgba(129, 140, 248, 0.32)' : 'rgba(79, 70, 229, 0.30)';
  for (let y = 6; y < h; y += 8) {
    for (let x = 6; x < w; x += 8) {
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = dark ? '#e2e8f0' : '#1e293b';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cap.text.split('').join(' '), w / 2, h / 2 + 1);
}

function refreshRecoverCaptcha() {
  state.recoverCaptcha = makeRecoverCaptcha();
  paintRecoverCaptcha();
  const input = $('#fr-captcha-input');
  if (input) { input.value = ''; input.focus(); }
}

/* ==================== Yordamchilar ==================== */
function emptyState(text, icoName) {
  return `<div class="empty"><span class="empty-ico">${ICON[icoName] || ICON.clipboardCheck}</span>${esc(text)}</div>`;
}
function blockedScreen(msg) {
  return `<div class="blocked"><span class="empty-ico">${ICON.lock}</span>${esc(msg)}</div>`;
}

/* ==================== BOSH SAHIFA: USTOZ ==================== */
/* ==================== UYGA VAZIFALAR ==================== */
function hwDoneMap() { return store.get(K.homeworkDone, {}) || {}; }
function isHwDone(hid) {
  const st = linkedStudent();
  if (!st) return false;
  const arr = hwDoneMap()[st.id] || [];
  return arr.some(id => String(id) === String(hid));
}

function parseAttachments(raw) {
  let v = raw;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch (e) { v = null; }
  }
  if (!Array.isArray(v)) return [];
  return v.filter(a => a && typeof a === 'object' && a.url).map(function (a) {
    return {
      url: String(a.url),
      type: String(a.type || 'file').toLowerCase(),
      name: String(a.name || ''),
      size: Number(a.size) || 0
    };
  });
}

/* Vazifadagi barcha biriktirmalar (eski mediaUrl ham qo'llab-quvvatlanadi) */
function hwAttachments(h) {
  const list = parseAttachments(h && h.attachments);
  if (list.length) return list;
  if (h && h.mediaUrl) {
    return [{ url: String(h.mediaUrl), type: hwMediaType(h) || 'file', name: '', size: 0 }];
  }
  return [];
}

function hwMediaType(h) {
  const t = String((h && h.mediaType) || '').toLowerCase();
  if (t === 'pdf' || t === 'file' || t === 'doc') return 'pdf';
  return (t === 'image' || t === 'video' || t === 'audio') ? t : '';
}

function attLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'audio') return 'Audio';
  if (type === 'image') return 'Rasm';
  if (type === 'pdf' || type === 'doc' || type === 'file') return 'Hujjat';
  return 'Fayl';
}

function hwMediaHTML(h) {
  const list = hwAttachments(h);
  if (!list.length) return '';
  const videos = list.filter(a => a.type === 'video');
  const audios = list.filter(a => a.type === 'audio');
  const images = list.filter(a => a.type === 'image');
  const docs = list.filter(a => ['pdf', 'doc', 'file'].indexOf(a.type) >= 0 || !['video', 'audio', 'image'].includes(a.type));
  const videoHTML = videos.map(a => `<div class="hw-media-item">
      <video class="plyr-video" controls playsinline preload="metadata" src="${esc(a.url)}"></video>
      <div class="hw-media-bar"><span class="hw-media-tag">${ico('video', 14)} Video · Plyr (0.5x–2x, fullscreen, ±10s)</span></div>
    </div>`).join('');
  const audioHTML = audios.map(a => `<div class="hw-media-item">
      <audio class="plyr-audio" controls preload="metadata" src="${esc(a.url)}"></audio>
      <div class="hw-media-bar"><span class="hw-media-tag">${ico('headphones', 14)} Audio · listening uchun tezlikni o'zgartiring</span></div>
    </div>`).join('');
  const imgHTML = images.length ? `<div class="hw-gallery">${images.map(a =>
    `<a class="hw-gallery-item" href="${esc(a.url)}" target="_blank" rel="noopener"><img class="hw-media-img" src="${esc(a.url)}" alt="${esc(a.name || h.title || 'Rasm')}" loading="lazy" /></a>`
  ).join('')}</div>` : '';
  const docHTML = docs.length ? `<div class="hw-docs">${docs.map(a => {
    const isPdf = a.type === 'pdf' || /\.pdf($|\?)/i.test(a.url);
    return `<a class="hw-doc-link" href="${esc(a.url)}" target="_blank" rel="noopener" download>
      <span class="hw-doc-ico">${isPdf ? ico('fileText', 16) : ico('paperclip', 16)}</span>
      <span class="hw-doc-name">${esc(a.name || (isPdf ? 'PDF fayl' : 'Fayl'))}</span>
      <span class="hw-doc-dl">${ico('download', 14)} Yuklab olish</span>
    </a>`;
  }).join('')}</div>` : '';
  return `<div class="hw-media">${videoHTML}${audioHTML}${imgHTML}${docHTML}</div>`;
}

function fmtSom(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function hwRowHTML(h) {
  const g = groupById(h.groupId);
  const chip = `<span class="chip-class">${g ? esc(g.name) : '—'}</span>`;
  const meta = h.description ? `<div class="muted small" style="margin-top:3px">${esc(h.description)}</div>` : '';
  const due = h.dueDate
    ? `<div class="hw-due"><span class="hw-due-badge">${ico('calendar', 12)} ${t('Topshirish muddati')}: <b>${fmtDMY(h.dueDate)}</b></span></div>`
    : `<div class="muted small" style="margin-top:3px">${ico('calendar', 13)} ${t('Topshirish muddati')}: —</div>`;

  /* --- Ustoz: karta yuqori o'ng burchagida o'chirish tugmasi --- */
  if (isTeacher()) {
    return `<div class="hw-item">
      <div class="row between hw-head">
        <strong>${esc(h.title)}</strong>
        <span class="hw-head-right">${chip}
          <button type="button" class="hw-edit" data-act="hw-edit" data-hid="${esc(String(h.id))}" aria-label="Uyga vazifani tahrirlash">${ico('brush', 15)}</button>
          <button type="button" class="hw-del" data-act="del-hw" data-hid="${esc(String(h.id))}" aria-label="Uyga vazifani o'chirish">${ico('trash', 15)}</button>
        </span>
      </div>
      ${meta}
      ${due}
      ${hwMediaHTML(h)}
    </div>`;
  }

  /* --- O'quvchi: aylantirish checkbox (○ / ✓) + bajarildi nishoni --- */
  const done = isHwDone(h.id);
  const metaStruck = meta ? (done ? meta.replace('class="muted small"', 'class="muted small hw-struck"') : meta) : '';
  return `<div class="hw-item hw-task${done ? ' is-done' : ''}" data-hid="${esc(String(h.id))}">
    <div class="hw-task-row">
      <button type="button" class="hw-check${done ? ' on' : ''}" data-act="toggle-hw"
              data-hid="${esc(String(h.id))}" aria-pressed="${done ? 'true' : 'false'}"
              aria-label="Bajarildi deb belgilash">${done ? ico('check', 15) : ''}</button>
      <div class="hw-task-body">
        <div class="row between"><strong class="${done ? 'hw-struck' : ''}">${esc(h.title)}</strong>${chip}</div>
        ${done ? `<span class="hw-done-badge">${ico('check', 12)} Bajarildi</span>` : ''}
        ${metaStruck}
        ${due}
        ${hwMediaHTML(h)}
        ${hwStudentSubmissionHTML(h)}
      </div>
    </div>
  </div>`;
}

/* ==================== UYGA VAZIFA TOPSHIRIQLARI (o'quvchi → ustoz) ==================== */
function myHomeworkSubmission(h) {
  const st = linkedStudent();
  if (!st || !h || h.dbId == null || st.dbId == null) return null;
  const list = store.get(K.homeworkSubmissions, []) || [];
  return list.filter(function (s) {
    return String(s.homeworkDbId) === String(h.dbId) && String(s.studentDbId) === String(st.dbId);
  })[0] || null;
}

/* Yuklangan fayllar: rasm/video/audio shu yerda, hujjatlar — yuklab olish havolasi */
function submissionFilesHTML(files) {
  const list = parseAttachments(files);
  if (!list.length) return '';
  return '<div class="sub-files">' + list.map(function (f) {
    const type = f.type || detectMediaType({ name: f.name }) || 'file';
    if (type === 'image') {
      return `<a class="sub-file-img" href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.name || 'Rasm')}" loading="lazy" /></a>`;
    }
    if (type === 'video') {
      return `<div class="hw-media-item"><video controls playsinline preload="metadata" src="${esc(f.url)}"></video></div>`;
    }
    if (type === 'audio') {
      return `<div class="hw-media-item"><audio controls preload="metadata" src="${esc(f.url)}"></audio></div>`;
    }
    const isPdf = type === 'pdf' || /\.pdf($|\?)/i.test(f.url);
    return `<a class="hw-doc-link" href="${esc(f.url)}" target="_blank" rel="noopener" download>
      <span class="hw-doc-ico">${isPdf ? ico('fileText', 16) : ico('paperclip', 16)}</span>
      <span class="hw-doc-name">${esc(f.name || 'Fayl')}</span>
      <span class="hw-doc-dl">${ico('download', 14)} Yuklab olish</span>
    </a>`;
  }).join('') + '</div>';
}

/* O'quvchi vazifa ichida ko'radigan qism: ustoz komentariyasi + o'z fayllari + yuklash formasi.
   Ruxsat berilmagan o'quvchiga yuklash bo'limi DOM'ga umuman chiqarilmaydi. */
function hwStudentSubmissionHTML(h) {
  const st = linkedStudent();
  if (!st) return '';
  const sub = myHomeworkSubmission(h);
  const comment = sub && sub.teacherComment
    ? `<div class="hw-teacher-comment">${ico('message', 15)}
        <div><b>O'qituvchi komentariyasi</b><p>${esc(sub.teacherComment)}</p></div>
      </div>`
    : '';
  const mine = sub && sub.files && sub.files.length
    ? `<div class="hw-my-files">
        <div class="hw-my-files-h">${ico('paperclip', 14)} Siz yuklagan fayllar</div>
        ${submissionFilesHTML(sub.files)}
        ${sub.note ? `<p class="hw-sub-note">${esc(sub.note)}</p>` : ''}
        <div class="hw-my-files-actions">
          <button type="button" class="btn btn-xs danger" data-act="hw-del-sub" data-sub="${esc(String(sub.id))}">${ico('trash', 13)} ${t("O'chirish")}</button>
        </div>
      </div>`
    : '';
  const canUpload = st.homeworkUploadAllowed === true;
  const upload = canUpload
    ? `<details class="hw-more">
      <summary>${ico('upload', 15)} Topshiriqni yuklash</summary>
      <div class="hw-more-body">
        <input type="file" class="input hw-sub-input" multiple accept="*/*" data-hid="${esc(String(h.id))}" />
        <textarea class="input hw-sub-note" rows="2" placeholder="${t('Izoh (ixtiyoriy)')}"></textarea>
        <div class="hw-sub-progress" hidden><span class="hw-sub-progress-bar" style="width:0%"></span></div>
        <div class="hw-sub-status muted small" hidden></div>
        <div class="field-error hw-sub-error"></div>
        <button type="button" class="btn btn-primary btn-block" data-act="hw-submit" data-hid="${esc(String(h.id))}">${ico('upload', 15)} Yuborish</button>
        <p class="muted small">Rasm, Word, PDF, Excel, video va audio fayllarni yuklash mumkin (har biri 50MB gacha).</p>
      </div>
    </details>`
    : '';
  return comment + mine + upload;
}

/* O'quvchi fayl/izoh yuboradi: Storage → homework_submissions */
async function submitHomeworkFiles(btn) {
  const st = linkedStudent();
  const hid = btn ? btn.getAttribute('data-hid') : '';
  const h = getHomework().filter(function (x) { return String(x.id) === String(hid); })[0];
  const item = btn && btn.closest ? btn.closest('.hw-item') : null;
  const input = item ? item.querySelector('.hw-sub-input') : null;
  const noteEl = item ? item.querySelector('.hw-sub-note') : null;
  const errEl = item ? item.querySelector('.hw-sub-error') : null;
  const barEl = item ? item.querySelector('.hw-sub-progress') : null;
  const barFill = item ? item.querySelector('.hw-sub-progress-bar') : null;
  const statusEl = item ? item.querySelector('.hw-sub-status') : null;
  const fail = function (m) {
    if (errEl) { errEl.textContent = m; errEl.classList.add('show'); }
    toast(m, 'error');
  };
  if (!st || !h) return;
  if (st.homeworkUploadAllowed !== true) return fail("Uyga vazifa yuklashga ruxsat yo'q");
  if (h.dbId == null) return fail("Bu vazifa hali bulutga yozilmagan — keyinroq urinib ko'ring");
  if (st.dbId == null) return fail("Profilingiz bulutga ulanmagan — ustozga murojaat qiling");
  const files = input && input.files ? Array.prototype.slice.call(input.files) : [];
  const note = String((noteEl && noteEl.value) || '').trim();
  if (!files.length && !note) return fail('Fayl tanlang yoki izoh yozing');
  const big = files.filter(function (f) { return f.size > HW_SUBMIT_MAX_BYTES; })[0];
  if (big) return fail('Fayl hajmi 100 MB dan oshmasligi kerak: ' + (big.name || 'fayl'));
  const label = btn ? btn.innerHTML : '';
  /* Har bir fayl yuklangach indikator yangilanadi (supabase-js progress bermaydi) */
  const setProgress = function (done, total, name) {
    const pct = total ? Math.round(done / total * 100) : 0;
    if (barEl) barEl.hidden = false;
    if (barFill) barFill.style.width = pct + '%';
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = done + '/' + total + ' fayl yuklandi · ' + pct + '%' + (name ? ' · ' + name : '');
    }
    if (btn) btn.textContent = 'Yuklanmoqda ' + done + '/' + total + ' · ' + pct + '%';
  };
  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda 0/' + files.length + ' · 0%'; }
  try {
    const uploaded = [];
    if (barEl) barEl.hidden = false;
    if (barFill) barFill.style.width = '0%';
    for (let i = 0; i < files.length; i++) {
      setProgress(i, files.length, files[i].name || '');
      const up = await CloudSync.uploadSubmissionFile(files[i], st.dbId, h.dbId);
      uploaded.push({
        url: up.url,
        type: detectMediaType(files[i]) || 'file',
        name: files[i].name || '',
        size: files[i].size || 0
      });
      setProgress(i + 1, files.length);
    }
    const prev = myHomeworkSubmission(h);
    const all = ((prev && prev.files) || []).concat(uploaded);
    await CloudSync.saveHomeworkSubmission({
      studentDbId: st.dbId,
      homeworkDbId: h.dbId,
      studentName: st.fullName || '',
      groupName: (groupById(st.groupId) || {}).name || '',
      files: all,
      note: note || (prev && prev.note) || ''
    });
    render();
    toast(uploaded.length ? uploaded.length + ' ta fayl yuborildi' : 'Izoh yuborildi');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
    if (barEl) barEl.hidden = true;
    if (statusEl) statusEl.hidden = true;
    const raw = String((err && err.message) || err || 'xatolik');
    const code = (err && (err.statusCode || err.status)) || '';
    const stage = /^Storage/i.test(raw) ? 'Fayl yuklashda (Storage)'
      : /^Baza/i.test(raw) ? 'Bazaga yozishda (homework_submissions)'
      : 'Yuklashda';
    if (typeof console !== 'undefined' && console.error) console.error('[hw-submit]', stage, err);
    fail(stage + ' xatolik' + (code ? ' · HTTP ' + code : '') + ': ' + raw);
  }
}

/* --- O'quvchi: vazifani bajarilgan/qayta faol holatga o'tkazish (localStorage'da saqlanadi) --- */
function toggleHwDone(hid) {
  const st = linkedStudent();
  if (!st) { toast("Ruxsat yo'q", 'error'); return; }
  const map = hwDoneMap();
  const key = String(hid);
  const arr = (map[st.id] || []).map(String);
  const i = arr.indexOf(key);
  if (i >= 0) arr.splice(i, 1); else arr.push(key);
  if (arr.length) map[st.id] = arr; else delete map[st.id];
  store.set(K.homeworkDone, map);
  const task = getHomework().filter(x => String(x.id) === key)[0] || null;
  analyticsCall('capture', 'homework_task_toggled',
    { completed: arr.indexOf(key) >= 0, has_due: !!(task && task.dueDate) });
  render();
}

/* --- Ustoz: uyga vazifani o'chirish (tasdiq modali) --- */
function openDeleteHw(hid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const norm = String(hid);
  const h = getHomework().filter(x => String(x.id) === norm)[0];
  if (!h) return;
  openModal(`
    <div class="modal-head">
      <h3>O'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-rose">${ICON.trash}</div>
      <p class="confirm-text">Haqiqatan ham ushbu uyga vazifani o'chirmoqchimisiz?</p>
      <p class="muted small" style="margin-top:7px"><strong>${esc(h.title)}</strong></p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-del-hw" data-hid="${esc(norm)}">Ha, o'chirish</button>
    </div>
  `);
}

function doDeleteHw(hid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const norm = String(hid);
  const list = getHomework();
  const h = list.filter(x => String(x.id) === norm)[0];
  if (!h) return;

  store.set(K.homework, list.filter(x => String(x.id) !== norm));
  const hwUrls = hwAttachments(h).map(a => a.url);
  if (hwUrls.length || h.dbId != null) {
    CloudSync.deleteHomework(h.dbId, hwUrls)
      .catch(e => console.warn('[cloud] del hw:', (e && e.message) || e));
  }

  /* o'chirilgan vazifaning bajarilganlik izlarini ham tozalash */
  const map = hwDoneMap();
  let touched = false;
  Object.keys(map).forEach(sid => {
    const before = (map[sid] || []).map(String);
    const next = before.filter(id => id !== norm);
    if (next.length !== before.length) { map[sid] = next; touched = true; }
  });
  if (touched) store.set(K.homeworkDone, map);

  closeModal();
  render();
  toast("Uyga vazifa o'chirildi");
}

function homeworkListHTML(list) {
  return list.length ? list.map(hwRowHTML).join('') : emptyState("Hozircha uyga vazifa yo'q", 'clipboardCheck');
}

function openHwModal(hid, preGroup) {
  if (!canStaff('homework')) { toast("Ruxsat yo'q", 'error'); return; }
  const groups = scopedGroups();
  if (!groups.length) { toast("Avval guruh yarating", 'error'); return; }
  const cur = hid != null ? getHomework().filter(x => String(x.id) === String(hid))[0] : null;
  if (hid != null && !cur) return;
  state.hwEditId = cur ? String(cur.id) : null;
  state.hwNewFiles = [];
  state.hwAttachments = cur ? hwAttachments(cur) : [];
  revokeHwPreview();
  openModal(`
    <div class="modal-head">
      <h3>${cur ? 'Uyga vazifani tahrirlash' : "Uyga vazifa qo'shish"}</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <label class="field-label" for="hw-group">Guruh</label>
    <select class="input" id="hw-group">
      ${groups.map(g => `<option value="${g.id}"${(cur ? cur.groupId === g.id : (preGroup && preGroup === g.id)) ? ' selected' : ''}>${esc(g.name)}</option>`).join('')}
    </select>
    <label class="field-label" for="hw-title">Mavzu</label>
    <input class="input" id="hw-title" type="text" placeholder="${t('Masalan: Present Perfect')}" value="${cur ? esc(cur.title) : ''}" />
    <label class="field-label" for="hw-desc">Vazifa (tavsif)</label>
    <textarea class="input" id="hw-desc" rows="3" placeholder="${t('Nima bajarishi kerak...')}">${cur ? esc(cur.description) : ''}</textarea>
    <label class="field-label" for="hw-due">Topshirish muddati</label>
    <input class="input" id="hw-due" type="date" value="${cur && cur.dueDate ? esc(cur.dueDate) : todayKey()}" />

    <div class="hw-upload">
      <label class="field-label" for="hw-media-input">${ico('paperclip', 14)} Fayllar biriktirish — bir nechta fayl tanlash mumkin (rasm, video, audio, pdf, doc):</label>
      <div class="hw-upload-row">
        <label class="hw-upload-btn" for="hw-media-input">
          <span class="hw-upload-ico" aria-hidden="true">${ico('folder', 18)}</span>
          <span>Fayl tanlash</span>
        </label>
        <input type="file" id="hw-media-input" class="hw-file-input" multiple accept="image/*,video/*,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.mp4,.mov,.webm,.pdf,.doc,.docx" />
        <button type="button" id="hw-media-clear" class="hw-upload-clear" data-act="hw-clear-file" aria-label="Tanlangan faylni bekor qilish" hidden>✕</button>
      </div>
      <p id="hw-media-status" class="hw-upload-status">Har bir fayl uchun maksimal hajm: 50MB · bir nechta fayl tanlash mumkin</p>
      <div id="hw-file-box">${hwMediaPreviewHTML(cur)}</div>
    </div>

    <div class="field-error" id="hw-error"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="save-hw">Saqlash</button>
    </div>
  `);
  const fi = $('#hw-media-input');
  if (fi) fi.addEventListener('change', function () { onHwFilePick(fi); });
}

const HW_MAX_BYTES = 50 * 1024 * 1024; /* 50MB — ustoz media biriktirmasi */
const HW_SUBMIT_MAX_BYTES = 100 * 1024 * 1024; /* 100MB — o'quvchi topshirig'i (R2) */
const HW_ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', 'ogv', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'oga', 'pdf', 'doc', 'docx'];
function hwFileExt(name) {
  const n = String(name || '').toLowerCase();
  return n.indexOf('.') >= 0 ? n.split('.').pop() : '';
}

/* Fayl turi: MIME bo'sh bo'lsa ham kengaytma bo'yicha aniqlanadi */
function detectMediaType(file) {
  const name = String((file && file.name) || '').toLowerCase();
  const mime = String((file && file.type) || '').toLowerCase();
  const ext = name.indexOf('.') >= 0 ? name.split('.').pop() : '';
  if (mime.indexOf('image/') === 0 || /^(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/.test(ext)) return 'image';
  if (mime.indexOf('video/') === 0 || /^(mp4|mov|webm|avi|mkv|m4v|ogv)$/.test(ext)) return 'video';
  if (mime.indexOf('audio/') === 0 || /^(mp3|wav|m4a|aac|ogg|opus|oga|flac|weba)$/.test(ext)) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (/word|officedocument|msword/.test(mime) || /^(doc|docx|rtf|odt)$/.test(ext)) return 'doc';
  return '';
}

function fmtFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

function setHwStatus(text, kind) {
  const el = $('#hw-media-status');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('err', 'busy');
  if (kind === 'err') el.classList.add('err');
  if (kind === 'busy') el.classList.add('busy');
}

function currentHw() {
  return state.hwEditId
    ? getHomework().filter(x => String(x.id) === String(state.hwEditId))[0] || null
    : null;
}

function revokeHwPreview() {
  (state.hwNewFiles || []).forEach(function (f) {
    if (f && f.preview && window.URL && URL.revokeObjectURL) {
      try { URL.revokeObjectURL(f.preview); } catch (e) { /* ignore */ }
    }
  });
  state.hwPreviewUrl = null;
}

/* Modal ichidagi biriktirmalar ro'yxati: mavjudlar + hali yuklanmaganlar */
function hwMediaPreviewHTML(cur) {
  const existing = Array.isArray(state.hwAttachments) ? state.hwAttachments : hwAttachments(cur);
  const fresh = state.hwNewFiles || [];
  if (!existing.length && !fresh.length) {
    return `<div class="hw-file-empty">Hozircha fayl biriktirilmagan</div>`;
  }
  const row = function (a, idx, isNew) {
    const type = isNew ? a.type : String(a.type || 'file');
    const name = isNew ? a.file.name : (a.name || (String(a.url).split('/').pop() || 'Fayl'));
    const size = isNew ? a.file.size : (Number(a.size) || 0);
    return `<div class="hw-file-row">
      ${isNew && a.preview ? `<img class="hw-file-thumb" src="${a.preview}" alt="" />` : `<span class="hw-file-type">${attLabel(type)}</span>`}
      <span class="hw-file-name">${esc(name)}</span>
      <span class="hw-file-size">${size ? fmtFileSize(size) : ''}</span>
      <button type="button" class="btn btn-xs danger" data-act="hw-remove-att"
              data-kind="${isNew ? 'new' : 'existing'}" data-idx="${idx}">✕ O'chirish</button>
    </div>`;
  };
  return `<div class="hw-file-preview">
    <div class="hw-file-preview-head">Biriktirilgan fayllar (${existing.length + fresh.length})</div>
    ${existing.map((a, i) => row(a, i, false)).join('')}
    ${fresh.map((a, i) => row(a, i, true)).join('')}
  </div>`;
}

function refreshHwPreview() {
  const box = $('#hw-file-box');
  if (box) box.innerHTML = hwMediaPreviewHTML(currentHw());
  const clearBtn = $('#hw-media-clear');
  if (clearBtn) clearBtn.hidden = !(state.hwNewFiles || []).length;
}

/* Bir nechta faylni tanlash: har biri tekshiriladi va navbatga qo'shiladi */
function onHwFilePick(inp) {
  const files = Array.from((inp && inp.files) || []);
  if (inp) inp.value = '';
  if (!files.length) { refreshHwPreview(); return; }
  let added = 0;
  const errors = [];
  const addedNames = [];
  const typeLabel = { video: 'Video', audio: 'Audio', image: 'Rasm', pdf: 'PDF', doc: 'Word' };
  files.forEach(function (f) {
    /* Xavfli va tasdiqlanmagan kengaytmalar darhol bloklanadi */
    if (HW_ALLOWED_EXTS.indexOf(hwFileExt(f.name)) < 0) {
      errors.push(f.name + ' — fayl turi taqiqlangan');
      return;
    }
    if (Number(f.size) > HW_MAX_BYTES) {
      errors.push('Fayl hajmi 50 MB dan oshmasligi kerak!');
      return;
    }
    const type = detectMediaType(f);
    if (!type) { errors.push(f.name + ' — turi qo\'llab-quvvatlanmaydi'); return; }
    const preview = (type === 'image' && window.URL && URL.createObjectURL) ? URL.createObjectURL(f) : '';
    state.hwNewFiles.push({ file: f, type: type, preview: preview });
    added += 1;
    addedNames.push(f.name + ' (' + (typeLabel[type] || 'Fayl') + ')');
  });
  refreshHwPreview();
  if (errors.length) {
    setHwStatus('Xatolik: ' + errors.join('; '), 'err');
  } else {
    setHwStatus(added + ' ta fayl tanlandi: ' + addedNames.join(', '));
  }
}

/* Faqat hali yuklanmagan tanlovni bekor qiladi */
function clearHwFilePick() {
  revokeHwPreview();
  state.hwNewFiles = [];
  refreshHwPreview();
  setHwStatus("Har bir fayl uchun maksimal hajm: 50MB · bir nechta fayl tanlash mumkin");
}

/* Mavjud biriktirmani darhol o'chiradi (Storage + baza), yangisini navbatdan oladi */
function removeHwAttachment(kind, idx) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const i = Number(idx);
  if (kind === 'new') {
    const f = state.hwNewFiles[i];
    if (f && f.preview && window.URL && URL.revokeObjectURL) {
      try { URL.revokeObjectURL(f.preview); } catch (e) { /* ignore */ }
    }
    state.hwNewFiles.splice(i, 1);
    refreshHwPreview();
    return;
  }
  const att = state.hwAttachments[i];
  if (!att) return;
  state.hwAttachments.splice(i, 1);
  const cur = currentHw();
  if (cur) {
    const updated = Object.assign({}, cur, {
      attachments: state.hwAttachments.slice(),
      mediaUrl: state.hwAttachments.length ? state.hwAttachments[0].url : '',
      mediaType: state.hwAttachments.length ? state.hwAttachments[0].type : ''
    });
    store.set(K.homework, getHomework().map(x => String(x.id) === String(cur.id) ? updated : x));
    CloudSync.pushHomework(updated);
  }
  CloudSync.removeHomeworkMedia(att.url);
  refreshHwPreview();
  toast("Fayl o'chirildi");
}

function saveHomework() {
  if (!canStaff('homework')) { toast("Ruxsat yo'q", 'error'); return; }
  const gid = $('#hw-group') ? $('#hw-group').value : '';
  const title = $('#hw-title') ? $('#hw-title').value.trim() : '';
  const desc = $('#hw-desc') ? $('#hw-desc').value.trim() : '';
  const due = $('#hw-due') ? $('#hw-due').value : '';
  const err = $('#hw-error');
  if (!title) {
    if (err) { err.textContent = "Mavzuni kiriting"; err.classList.add('show'); }
    return;
  }
  const btn = $('[data-act="save-hw"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }
  const pending = (state.hwNewFiles || []).map(x => x.file);

  const finish = function (uploaded) {
    const attachments = (state.hwAttachments || []).concat(uploaded);
    const primary = attachments[0] || null;
    const payload = {
      groupId: gid || null, title: title, description: desc, dueDate: due,
      attachments: attachments,
      mediaUrl: primary ? primary.url : '',
      mediaType: primary ? primary.type : ''
    };
    const editId = state.hwEditId;
    const existing = editId ? getHomework().filter(x => String(x.id) === String(editId))[0] : null;
    let hw;
    if (existing) {
      hw = Object.assign({}, existing, payload);
      store.set(K.homework, getHomework().map(x => String(x.id) === String(existing.id) ? hw : x));
    } else {
      hw = Object.assign({ id: 'h' + Date.now(), dbId: null, createdAt: new Date().toISOString() }, payload);
      const list = getHomework(); list.unshift(hw); store.set(K.homework, list);
    }
    CloudSync.pushHomework(hw);
    state.hwEditId = null;
    state.hwNewFiles = [];
    state.hwAttachments = [];
    closeModal();
    render();
    toast(existing ? 'Uyga vazifa yangilandi ✓' : "Uyga vazifa qo'shildi");
  };

  if (!pending.length) { finish([]); return; }

  setHwStatus(pending.length + " ta fayl yuklanmoqda... (uzun videoda biroz kutish mumkin)", 'busy');
  const uploaded = [];
  const chain = pending.reduce(function (p, file) {
    return p.then(function () {
      return CloudSync.uploadHomeworkMedia(file).then(function (res) {
        uploaded.push({
          url: res.url, type: detectMediaType(file),
          name: file.name, size: Number(file.size) || 0
        });
        setHwStatus("Yuklanmoqda... " + uploaded.length + "/" + pending.length, 'busy');
      });
    });
  }, Promise.resolve());

  chain.then(function () {
    setHwStatus(uploaded.length + " ta fayl yuklandi");
    revokeHwPreview();
    state.hwNewFiles = [];
    finish(uploaded);
  }).catch(function (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Saqlash'; }
    if (err) { err.textContent = "Faylni yuklab bo'lmadi: " + ((e && e.message) || 'xatolik'); err.classList.add('show'); }
    setHwStatus("Yuklashda xatolik: " + ((e && e.message) || 'xatolik'), 'err');
  });
}

/* ==================== AVTOMATIK OYLIK TO'LOV ==================== */
function currentPeriod() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
/* Har oy boshida guruh oylik to'lovini o'quvchi qarziga bir marta qo'shadi */
function applyMonthlyFees() {
  if (!isTeacher()) return 0;
  const period = currentPeriod();
  let changed = 0;
  const list = getStudents().map(function (s) {
    const g = groupById(s.groupId);
    /* Maktab guruhi — bepul: oylik to'lov qarzga qo'shilmaydi */
    const fee = (g && !isSchoolGroup(g)) ? feeForGroup(g.id, period) : 0;
    if (!fee || s.feePeriod === period) return s;
    changed += 1;
    return Object.assign({}, s, {
      paymentDebt: Math.max(0, Number(s.paymentDebt) || 0) + fee,
      feePeriod: period
    });
  });
  if (!changed) return 0;
  store.set(K.students, list);
  list.forEach(function (s) { if (s.feePeriod === period) CloudSync.pushStudent(s.id); });
  return changed;
}

const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabel(period) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  if (!m) return String(period || '');
  const idx = Number(m[2]) - 1;
  const names = getLang() === 'en' ? MONTHS_EN : MONTHS_UZ;
  return (names[idx] || m[2]) + ' ' + m[1];
}

function paymentPeriod(p) {
  return String((p && p.period) || String((p && p.createdAt) || '').slice(0, 7) || '');
}

/* Guruh uchun oy summasi: monthly_fees jadvali, bo'lmasa legacy monthlyFee */
function feeForGroup(gid, period) {
  const row = getMonthlyFees().filter(function (x) { return x.gid === gid && x.period === period; })[0];
  if (row) return Math.max(0, Number(row.amount) || 0);
  const g = groupById(gid);
  return g ? Math.max(0, Number(g.monthlyFee) || 0) : 0;
}

function paidFor(sid, period) {
  return getPayments().filter(function (p) { return p.sid === sid && paymentPeriod(p) === period; })
    .reduce(function (a, p) { return a + (Number(p.amount) || 0); }, 0);
}

function studentPayments(sid) {
  return getPayments().filter(function (p) { return p.sid === sid; }).sort(function (a, b) {
    return String(paymentPeriod(b) + b.createdAt).localeCompare(String(paymentPeriod(a) + a.createdAt));
  });
}

function tutoringStudents() {
  return getStudents().filter(function (s) {
    const g = groupById(s.groupId);
    return !!g && groupTypeOf(g) === 'tutoring';
  });
}

/* O'quvchi kabineti: to'lovlar tarixi */
function payHistoryHTML(st) {
  const rows = getPayments().filter(function (p) { return p.sid === st.id; })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  if (!rows.length) return `<div class="empty"><span class="empty-ico">${ico('wallet', 22)}</span>Hozircha to'lov yo'q</div>`;
  return `<div class="pay-history att-scroll">${rows.map(function (p) {
    const d = String(p.createdAt || '').slice(0, 10);
    return `<div class="att-line">
      <span class="gr-date">${d ? fmtDM(d) : '—'}</span>
      <span class="col"><strong>${fmtSom(p.amount)} so'm</strong>${p.note ? `<span class="gr-note">${esc(p.note)}</span>` : ''}</span>
    </div>`;
  }).join('')}</div>`;
}

/* Asosiy ustoz: support teacherlarni boshqarish va nazorat paneli */
function supportWatchPanelHTML() {
  const list = supportTeachers();
  const on = !!state.supervise;
  const rows = list.map(function (rec) {
    const groups = supportRecordGroupIds(rec).map(function (id) { return groupById(id); }).filter(Boolean);
    return `<div class="sup-watch-row">
      <div class="row between">
        <div class="col">
          <strong>${esc(rec.name)}</strong>
          <div class="muted small">${esc(rec.login || '')} · ${groups.length} ${t('guruh')}</div>
        </div>
        <button type="button" class="btn btn-xs ghost" data-act="support-edit" data-id="${esc(rec.id)}">${ico('brush', 13)} ${t('Ruxsatlar')}</button>
      </div>
      ${groups.length
        ? `<div class="sup-watch-groups">${groups.map(function (g) {
            return `<button type="button" class="chip-btn" data-act="support-watch-group" data-gid="${esc(g.id)}">${esc(g.name)}</button>`;
          }).join('')}</div>`
        : `<div class="muted small">${t('Guruh biriktirilmagan')}</div>`}
    </div>`;
  }).join('');
  return `
  <div class="section-title">${ico('profile', 15)} Support teacherlar</div>
  <div class="card sup-watch">
    <div class="row between">
      <div class="col">
        <div class="strong-label">${t('Support teacherni nazorat qilish')}</div>
        <div class="muted small">${on
          ? t("Nazorat rejimi yoniq — support guruhlari ko'rinadi.")
          : t("O'chirilganda support guruhlari Guruhlar va O'quvchilar bo'limlarida ko'rinmaydi.")}</div>
      </div>
      <button type="button" class="switch${on ? ' on' : ''}" data-act="toggle-supervise" role="switch"
              aria-checked="${on}" aria-label="${t('Support teacherni nazorat qilish')}"></button>
    </div>
    <div class="sup-watch-list">${list.length ? rows : `<div class="muted small">${t("Hozircha support teacher qo'shilmagan")}</div>`}</div>
    <button type="button" class="btn btn-primary btn-block" data-act="nav" data-screen="support">${ico('userPlus', 16)} ${t("Support teacher qo'shish")}</button>
  </div>`;
}

function teacherHome() {
  applyMonthlyFees();
  const groups = scopedGroups();
  const students = scopedStudents();
  const classSet = {};
  students.forEach(s => { classSet[s.schoolClass] = 1; });
  const u = currentUser() || {};
  const name = u.name || TEACHER_NAME;

  return `
  <section class="card hero-card">
    <div class="greet-main">
      <div class="avatar avatar-lg">${esc(initials(name))}</div>
      <div class="col">
        <div class="greet-hi">Xush kelibsiz,</div>
        <div class="greet-name">${esc(name)}</div>
        <span class="role-badge is-teacher">Muzaffar Amirov</span>
      </div>
    </div>
  </section>

  <div class="stat-grid">
    <button type="button" class="card stat" data-act="stat-groups"><span class="stat-ico">${ICON.groups}</span><span class="stat-num">${groups.length}</span><span class="stat-label">Guruhlar</span></button>
    <button type="button" class="card stat" data-act="stat-students"><span class="stat-ico">${ICON.students}</span><span class="stat-num">${students.length}</span><span class="stat-label">O'quvchilar</span></button>
    <button type="button" class="card stat" data-act="stat-classes"><span class="stat-ico">${ICON.cal}</span><span class="stat-num">${Object.keys(classSet).length}</span><span class="stat-label">Sinflar</span></button>
  </div>

  <div class="section-title">Tez amallar</div>
  <div class="quick-grid">
    <button type="button" class="card quick" data-act="nav" data-screen="homework"><span class="quick-ico tint-blue">${ICON.bookOpen}</span><span>${t('Uyga vazifalar')}</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="attendance"><span class="quick-ico tint-emerald">${ICON.cal}</span><span>Tezkor davomat</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="submissions"><span class="quick-ico tint-rose">${ICON.clipboardCheck}</span><span>Bajarilgan topshiriqlar${navBadgeHTML('submissions')}</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="speaking"><span class="quick-ico tint-sky">${ICON.mic}</span><span>Speaking slotlari${navBadgeHTML('speaking')}</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="grades"><span class="quick-ico tint-indigo">${ICON.grades}</span><span>Baholar jurnali</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="payments"><span class="quick-ico tint-teal">${ICON.creditCard}</span><span>To'lovlar</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="students"><span class="quick-ico tint-amber">${ICON.gradCap}</span><span>O'quvchilar</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="groups"><span class="quick-ico tint-purple">${ICON.groups}</span><span>Guruhlar</span></button>
    <button type="button" class="card quick" data-act="open-add-student"><span class="quick-ico tint-slate">${ICON.userPlus}</span><span>O'quvchi qo'shish</span></button>
    <button type="button" class="card quick" data-act="nav" data-screen="mock"><span class="quick-ico tint-violet">${ICON.gradCap}</span><span>${t('Mock testlar')}${navBadgeHTML('mock')}</span></button>
  </div>

  ${supportWatchPanelHTML()}

  <button type="button" class="btn btn-primary btn-block" data-act="open-hw">${ico('bookOpen', 16)} Uyga vazifa berish</button>
  <div class="muted small" style="margin-top:6px;text-align:center">${t("Berilgan vazifalar «Uyga vazifalar» bo'limida ko'rinadi.")}</div>
  `;
}

/* ==================== BOSH SAHIFA: O'QUVCHI KABINETI ==================== */
function studentPortal() {
  const u = currentUser() || {};
  const st = linkedStudent();

  if (!st) {
    return `
    <section class="card profile-head">
      <div class="avatar avatar-xl">${esc(initials(u.name || "O'quvchi"))}</div>
      <div class="profile-name">${esc(u.name || "O'quvchi")}</div>
      <div class="muted">${esc(u.login || '')}</div>
      <div style="margin-top:9px"><span class="role-badge is-student">O'quvchi</span></div>
    </section>
    <div class="section-title">Mening ma'lumotlarim</div>
    <div class="card">${blockedScreen("Profilingiz guruhga biriktirilmagan. Muzaffar Amirov bilan bog'laning.")}</div>
    `;
  }

  const g = groupById(st.groupId);
  const school = isSchoolGroup(g);
  const hideMoney = school; /* maktab guruhida to'lov bo'limi umuman ko'rinmaydi */
  const gradeRec = getGrades()[st.id] || {};
  const attRec = getAttendance();

  /* --- To'lov banneri (faqat repetitorlik guruhlarida, eng yuqorida) --- */
  const per = currentPeriod();
  const currentDebt = Math.max(0, Number(st.paymentDebt) || 0);
  const hasDebt = currentDebt > 0;
  const payRows = studentPayments(st.id);
  const receipts = store.get(K.paymentReceipts, []);
  const pendingReceipt = receipts.filter(function (r) {
    return (r.month_key === per || !r.month_key) && r.status === 'kutilmoqda';
  })[0];
  const rejectedReceipt = !pendingReceipt ? receipts.filter(function (r) {
    return (r.month_key === per || !r.month_key) && r.status === 'rad_etildi';
  })[0] : null;

  /* Faqatgina so'nggi to'lov qatori */
  let lastPayHTML = `<div class="pay-last-line muted small" style="margin-top:8px">${t("Hozircha to'lovlar mavjud emas")}</div>`;
  if (st.lastPaymentInfo) {
    lastPayHTML = `<div class="pay-last-line" style="margin-top:8px;font-size:13px;color:var(--text,#1e293b)">
      ${ico('cal', 14)} <b>${t("So'nggi to'lov:")}</b> ${esc(st.lastPaymentInfo)} ${t('qabul qilindi')}
    </div>`;
  } else if (payRows.length > 0) {
    const lp = payRows[0];
    const lpDate = lp.createdAt ? fmtDMY(lp.createdAt.slice(0, 10)) : fmtDMY(todayKey());
    const lpMonth = lp.note ? lp.note.replace(" uchun to'lov", "") : monthLabel(paymentPeriod(lp));
    lastPayHTML = `<div class="pay-last-line" style="margin-top:8px;font-size:13px;color:var(--text,#1e293b)">
      ${ico('cal', 14)} ${t("So'nggi to'lov: {date} da {sum} so'm ({month} uchun qabul qilindi)").replace('{date}', lpDate).replace('{sum}', fmtSom(lp.amount)).replace('{month}', esc(lpMonth))}
    </div>`;
  }

  const payBanner = hideMoney ? '' : `
  <section class="card pay-banner ${hasDebt ? 'due' : 'ok'}">
    <div class="pay-banner-main">
      ${hasDebt
        ? `${ico('alert', 14)} <b>${t('Diqqat:')}</b> ${t("Sizda {sum} so'm to'lov qarzdorligi mavjud!").replace('{sum}', fmtSom(currentDebt))}`
        : `<b>${t("To'langan")}</b> <span class="muted">(${t('Qarzdorlik mavjud emas')})</span>`}
    </div>
    ${pendingReceipt ? `
    <div class="pay-pending-alert" style="margin:8px 0;padding:8px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;color:#92400e;font-size:13px">
      <b>${t("To'lov cheki ko'rib chiqilmoqda!")}</b> ${t("Ustoz tasdiqlashi bilan qarzingiz o'chiriladi.")}
    </div>` : ''}
    ${rejectedReceipt ? `
    <div class="pay-rejected-alert" style="margin:8px 0;padding:8px 12px;background:#fee2e2;border:1px solid #ef4444;border-radius:8px;color:#991b1b;font-size:13px">
      <b>${t('Chekingiz rad etildi:')}</b> ${esc(rejectedReceipt.note || t("Noto'g'ri chek"))}. ${t("Iltimos, qaytadan to'g'ri chekni yuklang:")}
    </div>` : ''}
    ${hasDebt && !pendingReceipt ? `
    <div style="margin:10px 0 6px 0">
      <button type="button" class="btn btn-primary btn-block" data-act="open-pay-receipt" data-amount="${currentDebt}" data-period="${esc(per)}">
        ${ico('creditCard', 16)} ${t("Karta orqali to'lash")}
      </button>
    </div>` : ''}
    ${lastPayHTML}
  </section>`;

  /* --- Davomat --- */
  const ownAtt = [];
  Object.keys(attRec).sort().reverse().forEach(dk => {
    const v = attRec[dk][st.id];
    if (v) ownAtt.push({ date: dk, status: v });
  });
  const cnt = { present: 0, absent: 0, excused: 0 };
  ownAtt.forEach(a => { cnt[a.status] = (cnt[a.status] || 0) + 1; });
  const statusLabel = { present: t('Keldi'), absent: t('Kelmadi'), excused: t('Sababli') };
  const attLine = a => `
    <div class="att-line">
      <span class="gr-date">${fmtDM(a.date)}</span>
      <span class="att-tag on-${a.status}">${statusLabel[a.status]}</span>
    </div>`;
  const attRows = ownAtt.length ? ownAtt.map(attLine).join('') : `<div class="empty"><span class="empty-ico">${ICON.cal}</span>${t("Davomat yozuvi yo'q")}</div>`;
  const attLastRows = ownAtt.length ? ownAtt.slice(0, 3).map(attLine).join('') : attRows;
  const attPct = ownAtt.length ? Math.round((cnt.present * 100) / ownAtt.length) : 0;
  const attMissed = (cnt.absent || 0) + (cnt.excused || 0);

  /* --- Speaking --- */
  const mineSlots = getSpeaking()
    .filter(x => x.studentId === st.id)
    .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
    .slice(0, 6);
  const slotRows = mineSlots.length ? mineSlots.map(x => `
    <div class="att-line">
      <span class="gr-date">${fmtDM(x.date)}</span>
      <span class="col">
        <strong>${esc(x.start)} – ${esc(x.end)}</strong>
        <span class="gr-note">1-on-1 speaking</span>
      </span>
      <span class="slot-badge ${x.score == null ? 'wait' : 'done'}">${x.score == null ? t('Kutilmoqda') : t('Baho:') + ' ' + x.score}</span>
    </div>`).join('') : `<div class="empty"><span class="empty-ico">${ICON.mic}</span>${t('Hozircha slot biriktirilmagan')}</div>`;

  const myTg = getTgSubs().filter(x => x.sid === st.id).slice().reverse();
  const mySubs = myTg.map(sub => `
    <div class="audio-item">
      <div class="audio-item__meta">
        ${sub.mediaType === 'voice' ? ico('mic', 14) + ' ' + t('Audio') : ico('video', 14) + ' ' + t('Video')} ·
        ${sub.status === 'baholandi' || sub.status === 'graded'
          ? `${ico('checkCircle', 14)} ${t('Baho:')} ${sub.score}/10`
          : sub.status === 'rad_etildi'
            ? `${ico('alert', 14)} ${t('Topshiriq bekor qilindi')}`
            : `${ico('clock', 14)} ${t("Muzaffar Amirov ko'rib chiqmoqda")}`}
      </div>
    </div>`).join('') || `<div class="empty"><span class="empty-ico">${ICON.mic}</span>${t('Hozircha topshirilmagan')}</div>`;

  /* --- Uyga vazifalar --- */
  const myHw = getHomework().filter(h => h.groupId && h.groupId === st.groupId);
  /* O'qituvchi komentariyasi — yangi bo'lsa kabinetda yaqqol bildirishnoma */
  const hwSeenAt = store.get(K.hwCommentsSeen, '') || '';
  const freshList = myHw.filter(function (h) {
    const sub = myHomeworkSubmission(h);
    return sub && sub.teacherComment && String(sub.commentedAt || '') > hwSeenAt;
  });
  const freshComments = freshList.length;
  const hwCommentBanner = freshComments ? `<div class="card hw-comment-notice">
      <span class="hw-comment-notice-ico">${ico('message', 18)}</span>
      <div class="hw-comment-notice-body">
        <b>${t("O'qituvchi {n} ta vazifangizga komentariya yozdi").replace('{n}', freshComments)}</b>
        <p class="muted small">${t("Vazifa ichida o'qib, fayllaringizni ko'rishingiz mumkin.")}</p>
      </div>
      <button type="button" class="btn btn-xs ghost" data-act="hw-comment-open" data-hid="${esc(String(freshList[0].id))}">${t('Ochish')}</button>
    </div>` : '';

  /* --- Baholar --- */
  const gradeKeys = Object.keys(gradeRec).sort().reverse();
  const nums = gradeKeys.map(k => gradeRec[k].score);
  const avg = avgOf(nums);
  const gradeRows = gradeKeys.length ? gradeKeys.map(k => {
    const r = gradeRec[k];
    return `<div class="grade-row">
      <span class="gr-date">${fmtDM(k)}</span>
      <span class="gr-score ${gradeClassOf(r.score)}">${r.score}</span>
      <span class="gr-main">
        <div>${esc(r.category || t('Darsdagi javob'))}</div>
        ${r.note ? `<div class="gr-note">${esc(r.note)}</div>` : ''}
      </span>
    </div>`;
  }).join('') : `<div class="empty"><span class="empty-ico">${ICON.grades}</span>${t("Hozircha baho yo'q")}</div>`;

  /* ---- 4 ta asosiy bo'lim: ichki oynalar ---- */
  const attendanceHTML = `
  <div class="section-title">${ico('cal', 13)} ${t('Mening davomatim')}</div>
  <div class="card att-card">
    <div class="row between att-head">
      <div class="col">
        <div class="strong-label">${ico('cal', 14)} ${t('Davomat: {p}% qatnashgan ({n} ta qoldirilgan)').replace('{p}', attPct).replace('{n}', attMissed)}</div>
        <div class="muted small">${t('{p} keldi · {a} kelmadi · {e} sababli').replace('{p}', cnt.present).replace('{a}', cnt.absent).replace('{e}', cnt.excused)}</div>
      </div>
      <button type="button" class="btn btn-xs ghost att-toggle" data-act="att-toggle" aria-expanded="${!!state.attOpen}">${state.attOpen ? t('Yopish') : t('Ochish')}</button>
    </div>
    ${state.attOpen ? `<div class="att-scroll">${attRows}</div>
    <button type="button" class="btn btn-xs ghost btn-block" data-act="att-toggle">${t('Yopish')}</button>`
    : `<div class="att-last">${attLastRows}</div>
    <button type="button" class="btn btn-xs ghost btn-block" data-act="att-toggle">${t('Barchasini ko\'rish')}</button>`}
  </div>`;

  const homeworkHTML = `
  <div class="card" id="hw-list">${homeworkListHTML(myHw)}</div>`;

  const gradesHTML = `
  <div class="card avg-card">
    <div class="col">
      <div class="strong-label">${t("O'rtacha baho")}</div>
      <div class="muted small">${t('{n} ta baholangan dars').replace('{n}', nums.length)}</div>
    </div>
    <div class="avg-badge ${avg == null ? 'g-empty' : gradeClassOf(avg)}">
      <span class="avg-num">${fmtAvg(avg)}</span>
      <span class="avg-lab">/ 10</span>
    </div>
  </div>
  <div class="card">${gradeRows}</div>`;

  const canSpeak = !!st && st.webSpeakingAllowed === true;
  const botFallback = !!st && st.webSpeakingAllowed !== true;
  const speakingHTML = `
  ${canSpeak ? `<button type="button" class="btn btn-primary btn-block speak-cta" data-act="speak-cta">${ico('video', 20)} ${t('Speaking topshirish')}</button>
  <div class="speak-rec-hint">${ico('cameraCheck', 14)} ${t('Videoni shu yerda yozib topshirasiz.')}</div>` : botFallback ? `<div class="card speak-locked speak-bot">
    <div class="speak-locked-ico">${ICON.telegram}</div>
    <div class="speak-locked-body">
      <div class="strong-label">${t('Saytda yozish yopiq')}</div>
      <div class="muted small">${t("Saytda video yozish uchun ustoz ruxsati kerak. Speaking topshirig'ini Telegram bot orqali yuboring.")}</div>
    </div>
  </div>
  <a class="btn btn-primary btn-block speak-bot-btn" href="${SPEAKING_BOT_URL}" target="_blank" rel="noopener">${ICON.telegram} ${t("Telegram botga o'tish")}</a>
  <div class="speak-rec-hint">${ico('cameraCheck', 14)} ${t('Botda ovozli xabar yoki dumaloq video yuboring.')}</div>` : `<div class="card speak-locked">
    <div class="speak-locked-ico">${ICON.lock}</div>
    <div class="speak-locked-body">
      <div class="strong-label">${t('Ustoz ruxsati kerak')}</div>
      <div class="muted small">${t("Speaking topshirish uchun ustozdan ruxsat so'rang.")}</div>
    </div>
  </div>`}
  <div class="card" style="margin-top:10px">${slotRows}</div>
  <div class="card" style="margin-top:9px">
    <div class="strong-label" style="margin-bottom:5px">${t('Yuborilgan topshiriqlar')}</div>
    <div id="my-submissions" class="audio-list">${mySubs}</div>
  </div>`;

  const chatHTML = `
  <div class="card chat-card">
    ${chatHint()}
    <div class="chat-list" id="chat-list">${chatListHTML(st.id, 'student')}</div>
    <div class="chat-input-row">
      <input class="input" id="chat-input" placeholder="${t('Muzaffar Amirovga xabar yozing...')}" autocomplete="off" />
      <button type="button" class="btn btn-primary" data-act="send-chat">${t('Yuborish')}</button>
    </div>
  </div>`;

  const studentViews = {
    mock: { title: t('Mock testlar'), html: mockStudentHTML() },
    attendance: { title: t('Davomat'), html: attendanceHTML },
    homework: { title: t('Uyga vazifalar'), html: homeworkHTML },
    grades: { title: t('Baholar'), html: gradesHTML },
    speaking: { title: t('Speaking topshirish'), html: speakingHTML },
    chat: { title: t("O'qituvchi bilan suhbat"), html: chatHTML }
  };
  const activeView = state.studentView && studentViews[state.studentView] ? state.studentView : '';
  if (activeView) {
    return `
  <div class="back-row">
    <button type="button" class="btn btn-xs ghost" data-act="student-back">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="back-title">${studentViews[activeView].title}</span>
  </div>
  ${studentViews[activeView].html}
  `;
  }

  const spDebt = Math.max(0, Number(st.speakingDebt) || 0);
  const speakBanner = spDebt > 0 ? `
  <section class="card speak-debt-banner">
    <span class="speak-debt-ico">${ico('alert', 16)}</span>
    <div class="col">
      <b>${t('Speaking qarzingiz: {n} ta').replace('{n}', spDebt)}</b>
      <div class="muted small">${t("Speaking topshirib qarzni kamaytiring.")}</div>
    </div>
    <button type="button" class="btn btn-xs ghost" data-act="student-view" data-view="speaking">${t('Speaking topshirish')}</button>
  </section>` : '';

  const cardsHTML = `
  <div class="student-actions">
    <button type="button" class="card student-action" data-act="student-view" data-view="attendance">
      <span class="quick-ico tint-emerald">${ICON.cal}</span>
      <span class="student-action-label">${t('Davomat')}</span>
    </button>
    <button type="button" class="card student-action" data-act="student-view" data-view="homework">
      <span class="quick-ico tint-indigo">${ICON.bookOpen}</span>
      <span class="student-action-label">${t('Uyga vazifalar')}</span>
    </button>
    <button type="button" class="card student-action" data-act="student-view" data-view="grades">
      <span class="quick-ico tint-amber">${ICON.grades}</span>
      <span class="student-action-label">${t('Baholar')}</span>
    </button>
    <button type="button" class="card student-action" data-act="student-view" data-view="speaking">
      <span class="quick-ico tint-sky">${ICON.mic}</span>
      <span class="student-action-label">${t('Speaking topshirish')}</span>
    </button>
    <button type="button" class="card student-action" data-act="student-view" data-view="mock">
      <span class="quick-ico tint-violet">${ICON.gradCap}</span>
      <span class="student-action-label">${t('Mock testlar')}</span>
    </button>
    <button type="button" class="card student-action" data-act="student-view" data-view="chat">
      <span class="quick-ico tint-rose">${ICON.message}</span>
      <span class="student-action-label">${t("O'qituvchi bilan suhbat")}</span>
      ${chatUnreadFor(st.id) ? `<span class="nav-badge student-action-badge">${chatUnreadFor(st.id)}</span>` : ''}
    </button>
  </div>`;

  return `
  <section class="card hero-card">
    <div class="portal-head">
      <div class="avatar avatar-lg">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="greet-name">${esc(st.fullName)}</div>
        <div class="portal-meta">
          <span class="chip-class">${esc(st.schoolClass)}</span>
          <span class="pill">${g ? esc(g.name) : t('Guruh tayinlanmagan')}</span>
        </div>
      </div>
    </div>
  </section>

  ${spDebt > 0
    ? `${payBanner}${speakBanner}${hwCommentBanner}`
    : (payBanner ? `${payBanner}${hwCommentBanner}` : hwCommentBanner)}

  ${cardsHTML}

  <div class="section-title">${t('Sozlamalar')}</div>
  <div class="card">
    <div class="list-row"><span>Login</span><span class="login-val">${esc(u.login || '')}</span></div>
    <div class="list-row"><span>${t('Parol')}</span><span class="muted">••••</span></div>
  </div>
  `;
}

/* Support teacher bosh sahifasi: faqat ruxsat etilgan bo'limlar */
function supportHome() {
  const u = currentUser() || {};
  const rec = supportRecord();
  const groups = scopedGroups();
  const students = scopedStudents();
  const perms = supportPermsOf(rec);
  const quick = [];
  if (perms.students) quick.push(['students', ICON.students, "O'quvchilar", 'tint-amber']);
  if (perms.homework) quick.push(['homework', ICON.bookOpen, 'Uyga vazifalar', 'tint-blue']);
  if (perms.attendance) quick.push(['attendance', ICON.cal, 'Davomat', 'tint-emerald']);
  if (perms.speaking) quick.push(['speaking', ICON.mic, 'Speaking', 'tint-sky']);
  if (perms.grades) quick.push(['grades', ICON.grades, 'Baholar', 'tint-indigo']);
  if (perms.mock) quick.push(['mock', ICON.gradCap, 'Mock testlar', 'tint-violet']);
  if (perms.submissions) quick.push(['submissions', ICON.clipboardCheck, 'Topshiriqlar', 'tint-rose']);
  return `
  <section class="card hero-card">
    <div class="greet-main">
      <div class="avatar avatar-lg">${esc(initials(u.name || 'Support'))}</div>
      <div class="col">
        <div class="greet-hi">Xush kelibsiz,</div>
        <div class="greet-name">${esc(u.name || 'Support teacher')}</div>
        <span class="role-badge is-teacher">Support teacher</span>
      </div>
    </div>
  </section>

  <div class="stat-grid">
    <button type="button" class="card stat" data-act="nav" data-screen="students"><span class="stat-ico">${ICON.groups}</span><span class="stat-num">${groups.length}</span><span class="stat-label">Guruhlar</span></button>
    <button type="button" class="card stat" data-act="nav" data-screen="students"><span class="stat-ico">${ICON.students}</span><span class="stat-num">${students.length}</span><span class="stat-label">O'quvchilar</span></button>
  </div>

  <div class="section-title">${t('Biriktirilgan guruhlar')}</div>
  ${groups.length
    ? `<div class="card sup-my-groups">${groups.map(function (g) {
        const cnt = students.filter(function (s) { return s.groupId === g.id; }).length;
        return `<div class="list-row"><span>${ico('groups', 14)} ${esc(g.name)}</span><span class="muted small">${cnt} ${t('o\'quvchi')}</span></div>`;
      }).join('')}</div>`
    : `<div class="card">${emptyState(t('Guruh biriktirilmagan — asosiy o\'qituvchiga murojaat qiling'), 'groups')}</div>`}

  <div class="section-title">${t('Tez amallar')}</div>
  <div class="quick-grid">
    ${quick.map(function (q) {
      return `<button type="button" class="card quick" data-act="nav" data-screen="${q[0]}"><span class="quick-ico ${q[3]}">${q[1]}</span><span>${esc(t(q[2]))}${q[0] === 'submissions' ? navBadgeHTML('submissions') : ''}</span></button>`;
    }).join('')}
  </div>`;
}

function homeScreen() {
  if (isTeacher()) return teacherHome();
  if (isSupport()) return supportHome();
  return studentPortal();
}

/* ==================== BAJARILGAN TOPSHIRIQLAR (ustoz paneli) ==================== */
function submissionsList() {
  return (store.get(K.homeworkSubmissions, []) || []).slice().sort(function (a, b) {
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}
function submissionStudent(s) {
  return getStudents().filter(function (x) {
    return x.dbId != null && String(x.dbId) === String(s.studentDbId);
  })[0] || null;
}
function submissionHomework(s) {
  return getHomework().filter(function (x) {
    return x.dbId != null && String(x.dbId) === String(s.homeworkDbId);
  })[0] || null;
}

function submissionCardHTML(s) {
  const st = submissionStudent(s);
  const hw = submissionHomework(s);
  const stGroup = st ? groupById(st.groupId) : null;
  const when = s.createdAt ? fmtDMY(String(s.createdAt).slice(0, 10)) : '';
  const haveComment = !!String(s.teacherComment || '').trim();
  const sid = esc(String(s.id));
  const editing = String(state.subEditId) === String(s.id);
  const deleting = String(state.subDelId) === String(s.id);
  const commentBlock = deleting
    ? `<div class="sub-teacher-note is-confirm">
        ${ico('alert', 14)}
        <span class="sub-note-text">${t("Komentariyani o'chirasizmi?")}</span>
        <span class="sub-note-actions">
          <button type="button" class="btn btn-xs danger" data-act="sub-comment-del-confirm" data-sub="${sid}">${t('Ha')}</button>
          <button type="button" class="btn btn-xs ghost" data-act="sub-comment-del-cancel">${t('Bekor qilish')}</button>
        </span>
      </div>`
    : editing
      ? `<div class="sub-note-edit">
          <label class="field-label" for="sub-edit-${sid}">${ico('message', 14)} ${t('Komentariyani tahrirlash')}</label>
          <textarea class="input sub-edit-comment" id="sub-edit-${sid}" rows="2">${esc(s.teacherComment || '')}</textarea>
          <div class="sub-note-edit-actions">
            <button type="button" class="btn btn-xs primary" data-act="sub-comment-save" data-sub="${sid}">${ico('check', 13)} ${t('Saqlash')}</button>
            <button type="button" class="btn btn-xs ghost" data-act="sub-comment-edit-cancel">${t('Bekor qilish')}</button>
          </div>
        </div>`
      : haveComment
        ? `<div class="sub-teacher-note">${ico('checkCircle', 14)}
            <span class="sub-note-text"><b>Komentariya:</b> ${esc(s.teacherComment)}${s.commentedAt ? ` <span class="muted small">${esc(timeAgoText(s.commentedAt))}</span>` : ''}</span>
            <span class="sub-note-actions">
              <button type="button" class="chat-ico" data-act="sub-comment-edit" data-sub="${sid}" aria-label="${esc(t('Tahrirlash'))}">${ico('brush', 14)}</button>
              <button type="button" class="chat-ico danger" data-act="sub-comment-del" data-sub="${sid}" aria-label="${esc(t("Komentariyani o'chirish"))}">${ico('trash', 14)}</button>
            </span>
          </div>`
        : `<div class="sub-new-badge">${ico('alert', 13)} Ko'rilmagan</div>`;
  return `<div class="card sub-card${haveComment ? ' is-seen' : ' is-new'}">
    <div class="row between sub-head">
      <div class="col sub-who">
        <div class="sub-name-row">
          <strong>${esc(st ? st.fullName : "O'quvchi")}</strong>
          ${stGroup ? `<span class="chip-class sub-gr-badge">${esc(stGroup.name)}</span>` : ''}
        </div>
        <span class="muted small">${esc(hw ? hw.title : 'Uyga vazifa')}</span>
      </div>
      <div class="sub-head-right">
        <span class="chip-class">${esc(when)}</span>
        <button type="button" class="btn btn-xs danger" data-act="sub-del" data-sub="${sid}">${ico('trash', 13)} ${t("O'chirish")}</button>
      </div>
    </div>
    ${submissionFilesHTML(s.files)}
    ${s.note ? `<p class="sub-note">${ico('message', 14)} ${esc(s.note)}</p>` : ''}
    ${commentBlock}
    ${editing || deleting ? '' : `<label class="field-label" for="sub-comment-${sid}">${ico('message', 14)} Komentariya yozish</label>
    <textarea class="input sub-comment" id="sub-comment-${sid}" rows="2" placeholder="${t("O'quvchiga izoh...")}"></textarea>
    <button type="button" class="btn btn-primary btn-block" data-act="sub-comment" data-sub="${sid}">${ico('upload', 15)} Yuborish</button>`}
  </div>`;
}

function submissionsScreen() {
  if (!canStaff('submissions')) return '';
  const groups = scopedGroups();
  const visibleGroups = {};
  groups.forEach(function (g) { visibleGroups[String(g.id)] = 1; });
  const all = submissionsList().filter(function (s) {
    const hw = submissionHomework(s);
    return !!hw && !!visibleGroups[String(hw.groupId)];
  });
  const list = all.filter(function (s) {
    if (!state.subGroup || state.subGroup === 'all') return true;
    const hw = submissionHomework(s);
    return hw && hw.groupId === state.subGroup;
  });
  const filterChips = [`<button type="button" class="chip-btn${(!state.subGroup || state.subGroup === 'all') ? ' active' : ''}" data-act="sub-group" data-gid="all">Barchasi</button>`]
    .concat(groups.map(function (g) {
      return `<button type="button" class="chip-btn${state.subGroup === g.id ? ' active' : ''}" data-act="sub-group" data-gid="${esc(g.id)}">${esc(g.name)}</button>`;
    })).join('');
  return `<div class="screen-head"><h2 class="screen-title">${ico('clipboardCheck', 16)} Bajarilgan topshiriqlar</h2></div>
  <div class="sub-filters" id="sub-filters" data-scroll="${Number(state.subScroll) || 0}">${filterChips}</div>
  ${list.length
    ? `<div class="sub-list">${list.map(submissionCardHTML).join('')}</div>`
    : `<div class="card">${emptyState("Hozircha yuklangan topshiriqlar yo'q", 'clipboardCheck')}</div>`}`;
}

/* Saqlangan komentariyani tahrirlash (Supabase + lokal kesh) */
async function saveSubmissionCommentEdit(id) {
  if (!canStaff('submissions')) { toast("Ruxsat yo'q", 'error'); return; }
  const box = $('#sub-edit-' + id);
  const text = String((box && box.value) || '').trim();
  if (!text) { toast('Avval komentariyani yozing', 'error'); return; }
  state.subEditId = null;
  try {
    await CloudSync.commentSubmission(id, text);
    toast('Komentariya yangilandi');
  } catch (e) {
    toast('Komentariyani saqlab bo\'lmadi: ' + ((e && e.message) || e), 'error');
  }
  render();
}

/* Komentariyani o'chirish (tasdiqdan keyin) */
async function removeSubmissionComment(id) {
  if (!canStaff('submissions')) { toast("Ruxsat yo'q", 'error'); return; }
  state.subDelId = null;
  try {
    await CloudSync.deleteSubmissionComment(id);
    toast("Komentariya o'chirildi");
  } catch (e) {
    toast('Komentariyani o\'chirib bo\'lmadi: ' + ((e && e.message) || e), 'error');
  }
  render();
}

/* Ustoz komentariyasi: bazaga + o'quvchining Telegramiga */
async function sendSubmissionComment(btn) {
  if (!canStaff('submissions')) { toast("Ruxsat yo'q", 'error'); return; }
  const id = btn ? btn.getAttribute('data-sub') : '';
  const sub = submissionsList().filter(function (x) { return String(x.id) === String(id); })[0];
  if (!sub) return;
  const box = $('#sub-comment-' + id);
  const text = String((box && box.value) || '').trim();
  if (!text) { toast('Avval komentariyani yozing', 'error'); return; }
  if (box) box.value = '';
  if (btn) btn.disabled = true;
  try {
    await CloudSync.commentSubmission(sub.id, text);
    const st = submissionStudent(sub);
    const hw = submissionHomework(sub);
    if (st && st.telegramChatId) {
      CloudSync.queueMessages([{
        chat_id: String(st.telegramChatId),
        student_id: st.dbId,
        text: "<b>O'qituvchi vazifangizga komentariya yozdi:</b>\n\n" + esc(text) +
          "\n\n<b>Vazifa:</b> " + esc((hw && hw.title) || 'Uyga vazifa')
      }]).catch(function (e) { console.warn('[cloud] comment msg:', (e && e.message) || e); });
    }
    render();
    toast('Komentariya yuborildi');
  } catch (e) {
    if (btn) btn.disabled = false;
    toast('Komentariyani saqlashda xatolik', 'error');
  }
}

/* ==================== GURUHLAR (faqat ustoz) ==================== */
/* Kunlar stringi: "Dushanba 09:15, Shanba 11:00" → kun+vaqt; eski "Dushanba" → vaqtsiz */
function parseGroupDays(g) {
  return String(g && g.days || '').split(',').map(function (x) {
    const t = x.trim().replace(/\s+/g, ' ');
    if (!t) return null;
    const p = t.split(' ');
    return { day: p[0], time: p.slice(1).join(' ') };
  }).filter(Boolean);
}
/* Hammasida vaqt bo'lsa → "Dushanba 09:15 • Shanba 11:00", aks holda null (eski format) */
function groupScheduleText(g) {
  const list = parseGroupDays(g);
  if (list.length && list.every(x => x.time)) {
    return list.map(x => x.day + ' ' + x.time).join(' • ');
  }
  return null;
}

/* Guruh turi: 'school' (maktab, bepul) yoki 'tutoring' (repetitorlik).
   FAQAT ustoz panelida ko'rsatiladi — o'quvchiga hech qachon chiqmaydi. */
function groupTypeOf(g) {
  /* Yangi guruhlar modalda 'school' bo'lib saqlanadi; eski (maydonsiz)
     guruhlar esa repetitorlik hisoblanadi — to'lovlari yashirilib qolmasin. */
  return (g && g.groupType === 'school') ? 'school' : 'tutoring';
}
function isSchoolGroup(g) {
  return groupTypeOf(g) === 'school';
}

function groupCard(g, students, opts) {
  opts = opts || {};
  const cardAct = opts.act || 'filter-group';
  const hint = opts.hint || t("Bosib, guruh o'quvchilarini ko'rish");
  const cnt = students.filter(s => s.groupId === g.id).length;
  const sched = groupScheduleText(g);
  const fee = Math.max(0, Number(g.monthlyFee) || 0);
  const tutoring = groupTypeOf(g) === 'tutoring';
  return `<div class="card group-card" data-act="${cardAct}" data-gid="${g.id}" style="cursor:pointer" role="button" title="${esc(hint)}">
    <div class="row between">
      <h3 class="card-h">${esc(g.name)}</h3>
      <span class="pill">${tGrpCnt(cnt)}</span>
    </div>
    ${supportTeacherOfGroup(g.id) && isStaff() ? `<div class="sup-group-badge">${ico('profile', 12)} ${esc(supportTeacherOfGroup(g.id).name)} (Support)</div>` : ''}
    <div class="gc-type ${tutoring ? 'is-tutoring' : 'is-school'}">${tutoring ? ico('gradCap', 14) + ' Repetitor guruhi' : ico('building', 14) + ' Maktab guruhi'}</div>
    <div class="meta-rows">
      ${sched
        ? `<div class="meta-row">${ico('calendar', 15)} <span>${esc(sched)}</span></div>`
        : `<div class="meta-row">${ico('calendar', 15)} <span>${esc(g.days)}</span></div>
           <div class="meta-row">${ico('clock', 15)} <span>${esc(g.time)}</span></div>`}
    </div>
    <div class="gc-fee">${tutoring
      ? `${ico('wallet', 14)} ${t("Oylik to'lov")}: ${fee > 0 ? `<b>${fmtSom(fee)} so'm</b>` : `<span class="muted">${t('belgilanmagan')}</span>`}`
      : `${ico('gift', 14)} <b>Bepul</b> <span class="muted">(maktab guruhi)</span>`}</div>
    <div class="muted small" style="margin-top:7px">${esc(hint)}</div>
    <div class="gc-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-act="grade-group-go" data-group="${g.id}">${ico('grades', 15)} Baholar</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="open-attendance" data-group="${g.id}">${ico('cal', 15)} Davomat</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="edit-group" data-gid="${g.id}">${ico('brush', 15)} Tahrirlash</button>
      <button type="button" class="btn btn-danger btn-sm" data-act="del-group" data-gid="${g.id}">${ico('trash', 15)} O'chirish</button>
    </div>
  </div>`;
}

/* ==================== TO'LOVLAR BO'LIMI (faqat ustoz) ==================== */
function paymentsScreen() {
  if (!isTeacher()) return blockedScreen("Bu bo'lim faqat Muzaffar Amirov uchun");
  if (!/^\d{4}-\d{2}$/.test(state.payMonth || '')) state.payMonth = currentPeriod();
  const period = state.payMonth;
  const groups = getGroups().filter(g => groupTypeOf(g) === 'tutoring');
  const list = tutoringStudents();
  let expected = 0, collected = 0;
  const rows = list.map(function (s) {
    const g = groupById(s.groupId);
    const fee = feeForGroup(s.groupId, period);
    const paid = paidFor(s.id, period);
    const debt = Math.max(0, Number(s.paymentDebt) || 0);
    const isDue = debt > 0;
    expected += fee; collected += paid;
    return `<div class="card pay-row">
      <div class="row between pay-row-head">
        <div class="col">
          <span class="s-name">${esc(s.fullName)}</span>
          <div class="muted small">${g ? esc(g.name) : '—'}</div>
        </div>
        <span class="pay-status ${isDue ? 'due' : 'ok'}">${isDue ? `${fmtSom(debt)} so'm qarz` : "To'langan"}</span>
      </div>
      <div class="pay-row-meta">
        <span>Oylik: <b>${fee ? fmtSom(fee) + " so'm" : 'belgilanmagan'}</b></span>
        <span>Joriy qarz: <b style="color:${isDue ? '#ef4444' : '#10b981'}">${fmtSom(debt)} so'm</b></span>
      </div>
      <div class="pay-actions">
        <button type="button" class="btn btn-xs btn-primary" data-act="pay-student"
                data-sid="${s.id}" data-period="${esc(period)}">${ico('wallet', 14)} To'lov kiritish</button>
        <button type="button" class="btn btn-xs ghost" data-act="debt-add" data-sid="${s.id}">${ico('plus', 14)} Qarz qo'shish</button>
        <button type="button" class="btn btn-xs ghost" data-act="remind-student" data-sid="${s.id}">${ico('bell', 13)} Eslatma yuborish</button>
        <button type="button" class="btn btn-xs ghost" data-act="fee-schedule" data-gid="${s.groupId}">${ico('cal', 14)} Oylik jadval</button>
      </div>
    </div>`;
  }).join('');
  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('creditCard', 16)} To'lovlar</h2>
      <div class="muted small">${list.length} nafar repetitor o'quvchisi · ${monthLabel(period)}</div>
    </div>
  </div>
  <div class="card pay-summary">
    <label class="field-label" for="pay-month">Oy</label>
    <input class="input" id="pay-month" type="month" value="${esc(period)}" />
    <div class="pay-summary-grid">
      <div><span class="muted small">Kutilgan</span><b>${fmtSom(expected)} so'm</b></div>
      <div><span class="muted small">Yig'ilgan</span><b>${fmtSom(collected)} so'm</b></div>
      <div><span class="muted small">Qolgan</span><b>${fmtSom(Math.max(0, expected - collected))} so'm</b></div>
    </div>
  </div>
  <button type="button" class="btn btn-ghost btn-block" data-act="nav" data-screen="debtors">${ico('creditCard', 16)} Qarzdorlar ro'yxati</button>
  ${rows || emptyState("Repetitorlik o'quvchisi yo'q", 'students')}

  <div class="section-title">${ico('cal', 15)} Guruhlar oylik to'lov jadvali</div>
  ${groups.length ? groups.map(function (g) {
    const fee = feeForGroup(g.id, period);
    return `<div class="card row between pay-row">
      <div class="col"><b>${esc(g.name)}</b><span class="muted small">${monthLabel(period)}: ${fee ? fmtSom(fee) + " so'm" : 'belgilanmagan'}</span></div>
      <button type="button" class="btn btn-xs ghost" data-act="fee-schedule" data-gid="${g.id}">Belgilash</button>
    </div>`;
  }).join('') : emptyState("Repetitorlik guruhi yo'q", 'groups')}
  `;
}

/* Guruh uchun oylar bo'yicha to'lov summasini belgilash */
function openFeeSchedule(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const g = groupById(gid);
  if (!g) return;
  if (isSchoolGroup(g)) { toast("Maktab guruhi bepul — jadval kerak emas", 'error'); return; }
  const rows = getMonthlyFees().filter(function (x) { return x.gid === gid; })
    .sort(function (a, b) { return String(b.period).localeCompare(String(a.period)); });
  openModal(`
    <div class="modal-head">
      <h3>${esc(g.name)} — oylik to'lovlar</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="muted small">Har bir oy uchun alohida summa belgilang. Kiritilmagan oyda guruhning eski oylik summasi ishlatiladi.</div>
    <div class="fee-list">
      ${rows.length ? rows.map(function (x) {
        return `<div class="fee-row">
          <span class="fee-period">${monthLabel(x.period)}</span>
          <b>${fmtSom(x.amount)} so'm</b>
          <button type="button" class="btn btn-xs danger" data-act="fee-del"
                  data-gid="${gid}" data-period="${esc(x.period)}">✕</button>
        </div>`;
      }).join('') : `<div class="muted small" style="margin:8px 0">Hozircha oylar belgilanmagan</div>`}
    </div>
    <label class="field-label" for="fee-period">Oy</label>
    <input class="input" id="fee-period" type="month" value="${esc(state.payMonth || currentPeriod())}" />
    <label class="field-label" for="fee-amount">Summa (so'mda)</label>
    <input class="input" id="fee-amount" type="number" min="0" step="1000" inputmode="numeric" placeholder="${t('Masalan: 100000')}" />
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Yopish</button>
      <button type="button" class="btn btn-primary" data-act="fee-add" data-gid="${gid}">+ Qo'shish</button>
    </div>
  `);
}

function addMonthlyFee(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const period = $('#fee-period') ? $('#fee-period').value : '';
  const amount = $('#fee-amount') ? $('#fee-amount').value : '';
  if (!/^\d{4}-\d{2}$/.test(period)) { toast("Oyni tanlang", 'error'); return; }
  if (!(Number(amount) > 0)) { toast("Summani kiriting", 'error'); return; }
  CloudSync.saveMonthlyFee(gid, period, amount);
  toast("Oylik to'lov saqlandi ✓");
  openFeeSchedule(gid);
}

function removeMonthlyFee(gid, period) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  CloudSync.deleteMonthlyFee(gid, period);
  toast("Oylik to'lov o'chirildi");
  openFeeSchedule(gid);
}

/* ==================== QARZDORLAR (faqat ustoz) ==================== */
function lastPaymentOf(sid) {
  const rows = getPayments().filter(function (p) { return p.sid === sid; });
  if (!rows.length) return null;
  return rows.slice().sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  })[0];
}

function debtorCard(s) {
  const g = groupById(s.groupId);
  const debt = Math.max(0, Number(s.paymentDebt) || 0);
  const lp = lastPaymentOf(s.id);
  const lpDate = lp ? String(lp.createdAt || '').slice(0, 10) : '';
  return `<div class="card debtor-card">
    <div class="row between debtor-top">
      <div class="col">
        <span class="s-name">${esc(s.fullName)}</span>
        <div class="muted small">${g ? esc(g.name) : 'Guruh taylanmagan'}</div>
      </div>
      <span class="pay-status due">${fmtSom(debt)} so'm</span>
    </div>
    <div class="debtor-meta">
      ${lp && lpDate
        ? `${ico('calendar', 13)} Oxirgi to'lov: <b>${fmtDMY(lpDate)}</b> · ${fmtSom(lp.amount)} so'm`
        : `${ico('calendar', 13)} Oxirgi to'lov: <span class="muted">hali to'lov yo'q</span>`}
    </div>
    <div class="debtor-actions">
      <button type="button" class="btn btn-xs btn-primary" data-act="pay-student" data-sid="${s.id}">${ico('wallet', 14)} To'lov kiritish</button>
      <button type="button" class="btn btn-xs ghost" data-act="open-chat" data-sid="${s.id}">${ico('message', 14)} Xabar</button>
    </div>
  </div>`;
}

function debtorsScreen() {
  if (!isTeacher()) return blockedScreen("Bu bo'lim faqat Muzaffar Amirov uchun");
  const debtors = debtorsList().slice().sort(function (a, b) {
    return (Number(b.paymentDebt) || 0) - (Number(a.paymentDebt) || 0);
  });
  const total = debtors.reduce(function (a, s) { return a + (Number(s.paymentDebt) || 0); }, 0);
  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('creditCard', 16)} Qarzdorlar</h2>
      <div class="muted small">${debtors.length} nafar · umumiy qarz: ${fmtSom(total)} so'm</div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" data-act="nav" data-screen="students">← Orqaga</button>
  </div>

  ${debtors.length ? `
  <button type="button" class="btn btn-primary btn-block debtors-btn" data-act="remind-debtors">
    <span class="debtors-ico">${ico('megaphone', 18)}</span> Barcha qarzdorlarga eslatma yuborish
  </button>
  <div class="debtor-list">${debtors.map(debtorCard).join('')}</div>`
  : emptyState("Qarzdor o'quvchi yo'q — hamma to'langan ✓", 'checkCircle')}
  `;
}

/* Guruhlar bo'limidagi qisqa ko'rinish: faqat ism + speaking qarzi.
   Boshqa ruxsatlar, tahrirlash/o'chirish va to'lovlar bu yerda ko'rsatilmaydi. */
function groupDebtStudentRow(s) {
  return `<div class="card group-student-debt">
    <span class="s-name">${esc(s.fullName)}</span>
    <div class="debt-controls">
      <button type="button" class="btn btn-xs ghost" data-act="debt-minus" data-sid="${s.id}" aria-label="${t('Kamaytirish')}">−</button>
      <span class="debt-num">${tTa(Number(s.speakingDebt) || 0)}</span>
      <button type="button" class="btn btn-xs ghost" data-act="debt-plus" data-sid="${s.id}" aria-label="${t('Ko\'paytirish')}">+</button>
    </div>
  </div>`;
}

/* Asosiy ustoz: support teacher boshqarayotgan guruh ichida uning kiritgan
   vazifalari, davomati, baholari va mock natijalari ko'rinadi. */
function supportGroupWatchHTML(g) {
  if (!isTeacher()) return '';
  const rec = supportTeacherOfGroup(g.id);
  if (!rec) return '';
  const list = getStudents().filter(function (s) { return s.groupId === g.id; });
  const hw = getHomework().filter(function (h) { return h.groupId === g.id; })
    .slice().sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    }).slice(0, 3);
  const att = getAttendance();
  const attDates = Object.keys(att).sort().reverse().slice(0, 3);
  const mockRows = mockSortResults(mockResults().filter(function (a) {
    const st = studentById(a.sid);
    return !!st && st.groupId === g.id;
  })).slice(0, 3);
  return `
  <div class="card sup-group-watch">
    <div class="row between">
      <div class="col">
        <div class="strong-label">${ico('profile', 15)} ${t('Support teacher nazorati')}</div>
        <div class="muted small">${esc(rec.name)} · ${esc(rec.login || '')}</div>
      </div>
      <span class="chip-class">Support</span>
    </div>

    <div class="sup-block">
      <div class="row between">
        <span class="sup-block-title">${ico('bookOpen', 14)} ${t('Uyga vazifalar')}</span>
        <button type="button" class="btn btn-xs ghost" data-act="hw-group" data-gid="${esc(g.id)}">${t('Ochish')}</button>
      </div>
      ${hw.length
        ? `<div class="sup-list">${hw.map(function (h) {
            return `<div class="sup-list-row"><span>${esc(h.title || '—')}</span><span class="muted small">${h.dueDate ? fmtDM(h.dueDate) : ''}</span></div>`;
          }).join('')}</div>`
        : `<div class="muted small">${t("Hozircha vazifa yo'q")}</div>`}
    </div>

    <div class="sup-block">
      <div class="row between">
        <span class="sup-block-title">${ico('cal', 14)} ${t('Davomat')}</span>
        <button type="button" class="btn btn-xs ghost" data-act="open-attendance" data-group="${esc(g.id)}">${t('Ochish')}</button>
      </div>
      ${attDates.length
        ? `<div class="sup-list">${attDates.map(function (dk) {
            const c = { present: 0, absent: 0, excused: 0 };
            list.forEach(function (s) { const v = att[dk] && att[dk][s.id]; if (v) c[v] = (c[v] || 0) + 1; });
            return `<div class="sup-list-row"><span>${fmtDM(dk)}</span><span class="muted small">✓ ${c.present} · ✕ ${c.absent} · ? ${c.excused}</span></div>`;
          }).join('')}</div>`
        : `<div class="muted small">${t("Davomat yozuvi yo'q")}</div>`}
    </div>

    <div class="sup-block">
      <div class="row between">
        <span class="sup-block-title">${ico('gradCap', 14)} ${t('Mock natijalari')}</span>
        <button type="button" class="btn btn-xs ghost" data-act="nav" data-screen="mock">${t('Ochish')}</button>
      </div>
      ${mockRows.length
        ? `<div class="sup-list">${mockRows.map(function (a) {
            return `<div class="sup-list-row"><span>${esc(a.studentName || '—')} · ${esc(a.mockTitle || t('Mock test'))}</span><span class="muted small">${a.teacherGrade ? esc(a.teacherGrade) + '/10' : t('Baholanmagan')}</span></div>`;
          }).join('')}</div>`
        : `<div class="muted small">${t("Hozircha natija yo'q")}</div>`}
    </div>

    <button type="button" class="btn btn-primary btn-block" data-act="grade-group-go" data-group="${esc(g.id)}">${ico('grades', 15)} ${t('Baholar jurnalini ochish')}</button>
  </div>`;
}

function groupDebtDetailScreen(g, students) {
  const list = students.filter(function (s) { return s.groupId === g.id; });
  return `
  <div class="back-row">
    <button type="button" class="btn btn-xs ghost" data-act="group-detail-back">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="back-title">${esc(g.name)}</span>
  </div>
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('groups', 16)} ${t("Guruh o'quvchilari")}</h2>
      <div class="muted small">${tGrpCnt(list.length)}</div>
    </div>
  </div>
  ${supportGroupWatchHTML(g)}
  ${list.length
    ? `<div class="group-debt-list">${list.map(groupDebtStudentRow).join('')}</div>`
    : emptyState(t("Hozircha guruhda o'quvchi yo'q"), 'students')}
  `;
}

function groupsScreen() {
  if (!canStaff('students')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  const all = scopedGroups();
  const students = scopedStudents();
  const detail = state.groupDetail ? all.filter(function (g) { return g.id === state.groupDetail; })[0] : null;
  if (detail) return groupDebtDetailScreen(detail, students);
  const typeF = state.groupTypeFilter === 'school' || state.groupTypeFilter === 'tutoring'
    ? state.groupTypeFilter : 'all';
  const groups = typeF === 'all' ? all : all.filter(g => groupTypeOf(g) === typeF);
  const typeChips = [
    { key: 'all', label: 'Barchasi', icon: 'groups' },
    { key: 'school', label: 'Maktab', icon: 'building' },
    { key: 'tutoring', label: 'Repetitorlik', icon: 'gradCap' }
  ];
  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${t('Guruhlar')}</h2>
      <div class="muted small">${groups.length} ta guruh${typeF === 'all' ? '' : typeF === 'school' ? ' · maktab' : ' · repetitorlik'}</div>
    </div>
    <button type="button" class="btn btn-primary btn-sm" data-act="open-add-group">+ Guruh</button>
  </div>
  ${isTeacher() && state.supervise ? `<div class="card supervise-banner">
    <span>${ico('eye', 15)} ${t("Support teacherni nazorat qilish rejimi yoniq — support guruhlari ko'rinadi.")}</span>
    <button type="button" class="btn btn-xs ghost" data-act="toggle-supervise">${t("O'chirish")}</button>
  </div>` : ''}
  <div class="chips groups-type-chips">
    ${typeChips.map(c => `<button type="button" class="chip-btn${typeF === c.key ? ' active' : ''}" data-act="filter-group-type" data-type="${c.key}" aria-pressed="${typeF === c.key ? 'true' : 'false'}">${ico(c.icon, 13)} ${c.label}</button>`).join('')}
  </div>
  ${groups.length ? groups.map(g => groupCard(g, students, { act: 'group-detail', hint: t('Bosib, speaking qarzini belgilash') })).join('') : emptyState(typeF === 'school' ? "Maktab guruhi yo'q" : typeF === 'tutoring' ? "Repetitorlik guruhi yo'q" : "Hozircha guruh yo'q", 'groups')}
  `;
}

/* ==================== UYGA VAZIFALAR BO'LIMI (faqat ustoz) ==================== */
/* Avval guruhlar ro'yxati: nom + vazifalar soni. Guruh tanlansa — shu guruhning
   barcha vazifalari, tahrirlash/o'chirish va topshiriqlarni ko'rib chiqish. */
function tHwCnt(n) {
  if (getLang() === 'en') return n + ' homework assignment' + (n === 1 ? '' : 's');
  return n + ' ta uyga vazifa';
}
function hwGroupCard(g) {
  const count = getHomework().filter(function (h) { return h.groupId === g.id; }).length;
  return `<button type="button" class="card hw-group-card" data-act="hw-group" data-gid="${esc(g.id)}">
    <span class="quick-ico tint-indigo">${ICON.groups}</span>
    <span class="hw-group-main">
      <span class="hw-group-name">${esc(g.name)}</span>
      <span class="muted small">${tHwCnt(count)}</span>
    </span>
    <span class="hw-group-arrow">${ico('arrowRight', 16)}</span>
  </button>`;
}

function homeworkScreen() {
  if (!canStaff('homework')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  const groups = scopedGroups();
  const sel = state.hwGroup ? groups.filter(function (g) { return g.id === state.hwGroup; })[0] : null;

  if (sel) {
    const list = getHomework().filter(function (h) { return h.groupId === sel.id; });
    const hwIds = list.map(function (h) { return h.dbId; })
      .filter(function (id) { return id != null; });
    const subs = submissionsList().filter(function (sub) {
      return hwIds.some(function (id) { return String(id) === String(sub.homeworkDbId); });
    });
    return `
  <div class="back-row">
    <button type="button" class="btn btn-xs ghost" data-act="hw-group-back">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="back-title">${esc(sel.name)}</span>
  </div>
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('bookOpen', 16)} ${t('Uyga vazifalar')}</h2>
      <div class="muted small">${esc(sel.name)} · ${tHwCnt(list.length)}</div>
    </div>
    <button type="button" class="btn btn-primary btn-sm" data-act="open-hw" data-gid="${esc(sel.id)}">+ ${t('Uyga vazifa berish')}</button>
  </div>
  <div class="card">${homeworkListHTML(list)}</div>
  <div class="section-title">${ico('clipboardCheck', 15)} ${t('Bajarilgan topshiriqlar')}</div>
  ${subs.length
    ? `<div class="sub-list">${subs.map(submissionCardHTML).join('')}</div>`
    : `<div class="card">${emptyState(t("Hozircha yuklangan topshiriqlar yo'q"), 'clipboardCheck')}</div>`}
    `;
  }

  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('bookOpen', 16)} ${t('Uyga vazifalar')}</h2>
      <div class="muted small">${t('Guruhni tanlang — vazifalar va topshiriqlar shu yerda')}</div>
    </div>
  </div>
  ${groups.length
    ? groups.map(hwGroupCard).join('')
    : emptyState(t("Hozircha guruh yo'q"), 'groups')}
  `;
}

/* ==================== O'QUVCHILAR (faqat ustoz) ==================== */
function studentCard(s) {
  const g = groupById(s.groupId);
  const full = isTeacher();
  const debt = Math.max(0, Number(s.paymentDebt) || 0);
  /* Pul/to'lov faqat repetitorlik guruhlarida (maktab guruhi — bepul) */
  const showMoney = !!g && !isSchoolGroup(g);
  const sLogin = loginOfStudent(s.id, s);
  return `<div class="card student-card">
    <div class="st-head">
      <div class="avatar st-avatar">${esc(initials(s.fullName))}</div>
      <div class="s-main">
        <span class="s-name">${esc(s.fullName)}</span>
        <div class="s-group">${g ? esc(g.name) : t("Guruh taylanmagan")}${s.homeworkUploadAllowed === true
          ? ` <span class="chip-hw-allow">${ico('upload', 12)} ${t('Yuklash')}</span>` : ''}</div>
        ${presenceHTML(s)}
        <div class="s-contacts">
          <span class="s-contact"><span class="lbl">Login</span><span class="login-val">${sLogin ? esc(sLogin) : '—'}</span></span>
        </div>
      </div>
      <span class="chip-class">${esc(tClass(s.schoolClass))}</span>
    </div>
    <div class="st-inset">
      <div class="s-debt row between">
        <span class="lbl-strong">${t('Speaking qarzi')}</span>
        <div class="debt-controls">
          <button type="button" class="btn btn-xs ghost" data-act="debt-minus" data-sid="${s.id}" aria-label="Kamaytirish">−</button>
          <span class="debt-num">${tTa(Number(s.speakingDebt) || 0)}</span>
          <button type="button" class="btn btn-xs ghost" data-act="debt-plus" data-sid="${s.id}" aria-label="Ko'paytirish">+</button>
        </div>
      </div>
      <div class="row between st-voice">
        <span class="lbl-strong">${ico('mic', 15)} ${t('Ovozli ruxsat')}</span>
        <button type="button" class="switch${s.voiceAllowed === true ? ' on' : ''}" data-act="voice-toggle" data-sid="${s.id}"
                role="switch" aria-checked="${s.voiceAllowed === true}" aria-label="${t('Ovozli ruxsat')}"></button>
      </div>
      <div class="row between st-voice st-web-speak">
        <span class="lbl-strong">${ico('video', 15)} ${t('Saytda speaking topshirish')}</span>
        <button type="button" class="switch${s.webSpeakingAllowed === true ? ' on' : ''}" data-act="web-speaking-toggle" data-sid="${s.id}"
                role="switch" aria-checked="${s.webSpeakingAllowed === true}" aria-label="${t('Saytda speaking topshirish')}"></button>
      </div>
      <div class="row between st-voice st-hw-allow">
        <span class="lbl-strong">${ico('upload', 15)} ${t('Uyga vazifa yuklashga ruxsat')}</span>
        <button type="button" class="switch${s.homeworkUploadAllowed === true ? ' on' : ''}" data-act="hw-upload-toggle" data-sid="${s.id}"
                role="switch" aria-checked="${s.homeworkUploadAllowed === true}" aria-label="${t('Uyga vazifa yuklashga ruxsat')}"></button>
      </div>
      ${showMoney && full ? `<div class="pay-line">
        <span class="pay-status ${debt > 0 ? 'due' : 'ok'}">${debt > 0 ? `To'lov qarzi: ${fmtSom(debt)} so'm` : "To'langan"}</span>
      </div>
      <div class="pay-actions">
        <button type="button" class="btn btn-xs ghost" data-act="debt-add" data-sid="${s.id}">${ico('plus', 14)} Qarz qo'shish</button>
        <button type="button" class="btn btn-xs ghost pay-btn" data-act="pay-student" data-sid="${s.id}">${ico('wallet', 14)} To'lov kiritish</button>
        <button type="button" class="btn btn-xs ghost" data-act="remind-student" data-sid="${s.id}">${ico('bell', 13)} Eslatma yuborish</button>
      </div>` : ''}
    </div>
    <div class="st-actions">
      <button type="button" class="btn btn-xs ghost" data-act="open-chat" data-sid="${s.id}">${ico('message', 14)} ${t('Xabar yozish')}</button>
      ${full ? `<button type="button" class="btn btn-xs ghost" data-act="reset-pwd" data-sid="${s.id}">${ico('key', 14)} ${t('Parol')}</button>
      <button type="button" class="btn btn-xs ghost" data-act="edit-student" data-sid="${s.id}">${ico('brush', 14)} ${t('Tahrirlash')}</button>
      <button type="button" class="btn btn-xs danger" data-act="del-student" data-sid="${s.id}">${ico('trash', 14)} ${t("O'chirish")}</button>` : ''}
    </div>
  </div>`;
}

function filteredStudents() {
  const q = state.search.trim().toLowerCase();
  return scopedStudents().filter(s => {
    const byClass = state.filterClass === 'Barchasi' || s.schoolClass === state.filterClass;
    const byGroup = !state.filterGroup || s.groupId === state.filterGroup;
    const byQuery = !q || String(s.fullName).toLowerCase().indexOf(q) >= 0;
    const byHwAllow = !state.filterHwAllow || s.homeworkUploadAllowed === true;
    return byClass && byGroup && byQuery && byHwAllow;
  });
}
function studentListHTML() {
  const list = filteredStudents();
  return list.length ? list.map(studentCard).join('') : emptyState("O'quvchi topilmadi", 'students');
}
function refreshStudentList() {
  const list = $('#students-list');
  if (list) list.innerHTML = studentListHTML();
  const cnt = $('#students-count');
  if (cnt) cnt.textContent = tStudCnt(filteredStudents().length);
}

function studentsScreen() {
  if (!canStaff('students')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  const chips = ['Barchasi'].concat(APP_DATA.classes);
  const gf = state.filterGroup ? groupById(state.filterGroup) : null;
  const allGroups = scopedGroups();
  const allStudents = scopedStudents();
  /* Maktab guruhi bepul — qarzdorlik tugmalari umuman kerak emas */
  const showDebtTools = !gf || groupTypeOf(gf) !== 'school';
  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${t("O'quvchilar")}</h2>
      <div class="muted small" id="students-count"></div>
    </div>
    ${isTeacher() ? `<button type="button" class="btn btn-primary btn-sm" data-act="open-add-student">+ Qo'shish</button>` : ''}
  </div>

  ${gf ? `<div class="card row between" style="margin-bottom:9px">
    <span class="muted small">${ico('groups', 14)} <b>${esc(gf.name)}</b> guruhidagi o'quvchilar</span>
    <button type="button" class="chip-btn" data-act="filter-group-all">Barcha o'quvchilar</button>
  </div>
` : allGroups.length ? `<div class="section-title">${ico('groups', 15)} ${t('Guruhlar')} — ${t('Guruhni tanlang')}</div>
  <div class="students-groups-list">${allGroups.map(g => groupCard(g, allStudents, { act: 'filter-group', hint: t("Bosib, o'quvchilarni boshqarish") })).join('')}</div>
` : ''}

  <div class="search-wrap">
    <input class="input" id="s-search" type="search" placeholder="${t("O'quvchi ismini kiriting...")}" value="${esc(state.search)}" />
  </div>

  ${(showDebtTools && isTeacher()) ? `<button type="button" class="btn btn-primary btn-block debtors-btn" data-act="remind-debtors">
    <span class="debtors-ico">${ico('megaphone', 18)}</span> Barcha qarzdorlarga eslatma yuborish
  </button>
  <button type="button" class="btn btn-ghost btn-block" data-act="nav" data-screen="debtors">${ico('creditCard', 16)} Qarzdorlar ro'yxati</button>` : ''}

  <div class="chips${state.classHint ? ' is-hl' : ''}">
    ${chips.map(c => `<button type="button" class="chip-btn ${state.filterClass === c ? 'active' : ''}" data-act="filter-class" data-class="${esc(c)}">${esc(tClass(c))}</button>`).join('')}
    <button type="button" class="chip-btn hw-allow-chip${state.filterHwAllow ? ' active' : ''}" data-act="filter-hw-allow"
            aria-pressed="${state.filterHwAllow ? 'true' : 'false'}">${ico('upload', 13)} ${t('Yuklash ruxsati')}</button>
  </div>

  <div id="students-list">${studentListHTML()}</div>
  <button type="button" class="btn btn-ghost btn-block" data-act="nav" data-screen="groups">${ico('groups', 16)} Guruhlar</button>
  `;
}

/* ==================== TO'LOV VA QARZ ESLATMALARI ==================== */
/* Qarz qo'shish — Telegramga xabar YUBORILMAYDI (jimjit yangilanadi) */
function openAddDebtModal(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const g = groupById(st.groupId);
  if (!g || isSchoolGroup(g)) { toast("Maktab guruhida qarz yo'q (bepul)", 'error'); return; }
  const debt = Math.max(0, Number(st.paymentDebt) || 0);
  openModal(`
    <div class="modal-head">
      <h3>Qarz qo'shish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${esc(g.name)}</div>
      </div>
    </div>
    <div class="card" style="margin:9px 0">
      <div class="row between"><span class="muted small">Joriy qarz</span>
        <span class="pay-status ${debt > 0 ? 'due' : 'ok'}">${debt > 0 ? fmtSom(debt) + " so'm" : "Qarz yo'q"}</span></div>
    </div>
    <label class="field-label" for="debt-sum">Qo'shiladigan summa (so'mda)</label>
    <input class="input" id="debt-sum" type="number" min="0" step="1000" inputmode="numeric" placeholder="${t('Masalan: 50000')}" />
    <p class="pay-hint">${ico('bellOff', 14)} Bu amalda o'quvchiga xabar yuborilmaydi. Eslatma faqat kartadagi <b>${ico('bell', 14)} Eslatma yuborish</b> tugmasi bilan ketadi.</p>
    <div class="field-error" id="debt-error"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="save-add-debt" data-sid="${esc(String(sid))}">${ico('plus', 14)} Qarzni qo'shish</button>
    </div>
  `);
}

function saveAddedDebt(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const g = groupById(st.groupId);
  if (!g || isSchoolGroup(g)) { toast("Maktab guruhida qarz yo'q (bepul)", 'error'); return; }
  const inp = $('#debt-sum');
  const sum = Math.round(Number(inp ? inp.value : 0) || 0);
  const err = $('#debt-error');
  if (!sum || sum <= 0) {
    if (err) { err.textContent = "Summani kiriting"; err.classList.add('show'); }
    return;
  }
  const before = Math.max(0, Number(st.paymentDebt) || 0);
  const after = before + sum;
  store.set(K.students, getStudents().map(x => String(x.id) === String(sid)
    ? Object.assign({}, x, { paymentDebt: after }) : x));
  CloudSync.pushStudent(sid);
  /* ATAYLAB xabar yuborilmaydi — faqat tugma orqali eslatma ketadi */
  closeModal();
  render();
  toast(`Qarz qo'shildi ✓ Jami: ${fmtSom(after)} so'm`);
}

/* Qarz eslatmasi matni (bitta o'quvchi va ommaviy uchun bir xil) */
function debtReminderText(s) {
  return `<b>To'lov eslatmasi!</b>\n\nHurmatli o'quvchi / ota-ona, <b>${esc(s.fullName)}</b>ning ingliz tili darslari uchun <b>${fmtSom(s.paymentDebt)} so'm</b> to'lov qarzdorligi mavjud.\n\nIltimos, to'lovni amalga oshirishingizni so'raymiz.`;
}

function debtRowOf(s) {
  return {
    student_id: s.dbId != null ? s.dbId : null,
    chat_id: s.telegramChatId || null,
    text: debtReminderText(s)
  };
}

/* outbox'ga qo'yadi va holatini qisqa kuzatadi */
function queueDebtReminders(rows, okText) {
  if (!rows.length) { toast("O'quvchilarda Telegram ulanmagan", 'error'); return; }
  CloudSync.queueMessages(rows).then(function () {
    toast(okText);
  }).catch(function (e) {
    toast('Eslatma yuborilmadi: ' + ((e && e.message) || 'xatolik'), 'error');
  });
}

/* Bitta o'quvchiga eslatma — faqat ustoz tugmani bosganda */
function remindStudent(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const g = groupById(st.groupId);
  if (!g || isSchoolGroup(g)) { toast("Maktab guruhida qarz yo'q (bepul)", 'error'); return; }
  if (!(Number(st.paymentDebt) || 0)) { toast("Bu o'quvchida qarz yo'q ✓"); return; }
  if (!st.telegramChatId) { toast("O'quvchida Telegram ulanmagan", 'error'); return; }
  queueDebtReminders([debtRowOf(st)], `${st.fullName}ga eslatma yuborildi!`);
}

function openPayModal(sid, period) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const g = groupById(st.groupId);
  if (g && isSchoolGroup(g)) { toast("Maktab guruhi bepul — to'lov yo'q", 'error'); return; }
  const per = /^\d{4}-\d{2}$/.test(period || '') ? period : currentPeriod();
  const debt = Math.max(0, Number(st.paymentDebt) || 0);
  const fee = feeForGroup(st.groupId, per);
  const defaultMonthName = monthLabel(per);

  openModal(`
    <div class="modal-head">
      <h3>To'lov kiritish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${g ? esc(g.name) : 'Guruh taylanmagan'}${fee ? ' • Oylik: ' + fmtSom(fee) + " so'm" : ''}</div>
      </div>
    </div>
    <div class="card" style="margin:9px 0">
      <div class="row between"><span class="muted small">Joriy qarz</span>
        <span class="pay-balance">${debt > 0 ? fmtSom(debt) + " so'm" : "Qarz yo'q"}</span></div>
    </div>
    <label class="field-label" for="pay-sum">To'lov summasi (so'mda)</label>
    <input class="input" id="pay-sum" type="number" min="0" step="1000" inputmode="numeric" value="${debt > 0 ? debt : (fee || '')}" />
    
    <label class="field-label" for="pay-month-name" style="margin-top:8px">Qaysi oy uchun to'lov</label>
    <input class="input" id="pay-month-name" type="text" placeholder="${t('Masalan: Noyabr 2026 yoki Oktyabr 2026')}" value="${esc(defaultMonthName)}" />
    
    <p class="pay-hint">Kiritilgan summa qarzdan ayiriladi va o'quvchi kabinetida so'nggi to'lov sifatida ko'rinadi.</p>
    <div class="field-error" id="pay-error"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="save-pay" data-sid="${esc(String(sid))}" data-period="${esc(per)}">${ico('wallet', 14)} To'lovni saqlash</button>
    </div>
  `);
}

function savePayment(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const sumInp = $('#pay-sum');
  const sum = Math.round(Number(sumInp ? sumInp.value : 0) || 0);
  const err = $('#pay-error');
  if (!sum || sum <= 0) {
    if (err) { err.textContent = "To'lov summasini kiriting"; err.classList.add('show'); }
    return;
  }
  const per = (function () {
    const el = $('[data-act="save-pay"]');
    const v = el ? el.getAttribute('data-period') : '';
    return /^\d{4}-\d{2}$/.test(v || '') ? v : currentPeriod();
  })();

  const monthNameInp = $('#pay-month-name');
  const monthName = (monthNameInp && monthNameInp.value.trim()) || monthLabel(per);
  const before = Math.max(0, Number(st.paymentDebt) || 0);
  const after = Math.max(0, before - sum);
  const todayStr = fmtDMY(todayKey());
  const lastPayInfo = todayStr + " da " + fmtSom(sum) + " so'm (" + monthName + " uchun)";

  const list = getStudents().map(x => String(x.id) === String(sid)
    ? Object.assign({}, x, { paymentDebt: after, lastPaymentInfo: lastPayInfo, lastPaidMonth: monthName }) : x);
  store.set(K.students, list);
  CloudSync.pushStudent(sid);
  CloudSync.addPayment(sid, st.dbId, sum, monthName + " uchun to'lov", per);

  /* student_payments jadvaliga saqlash */
  if (CloudSync.ready() && st.dbId != null) {
    const g = groupById(st.groupId);
    window.__cloud && window.__cloud.addStudentPaymentRecord && window.__cloud.addStudentPaymentRecord(
      st.dbId, g ? g.dbId : null, per, monthName, sum
    );
  }

  /* telegram_outbox ga xabar qo'yish */
  if (st.telegramChatId) {
    CloudSync.queueMessages([{
      student_id: st.dbId != null ? st.dbId : null,
      chat_id: String(st.telegramChatId),
      text: `<b>To'lov qabul qilindi!</b>\n\n<b>${esc(st.fullName)}</b>, ${esc(monthName)} uchun <b>${fmtSom(sum)} so'm</b> to'lov qabul qilindi.\n${after > 0 ? `Qolgan qarz: <b>${fmtSom(after)} so'm</b>` : "Qarzingiz yo'q — rahmat!"}`,
      status: 'pending'
    }]).catch(function (e) { console.warn('[outbox]', (e && e.message) || e); });
  }

  closeModal();
  render();
  toast(`To'lov kiritildi ✓${after > 0 ? ' Qarz: ' + fmtSom(after) + " so'm" : ''}`);
}

function debtorsList() {
  return getStudents().filter(s => (Number(s.paymentDebt) || 0) > 0 &&
    !isSchoolGroup(groupById(s.groupId)));
}

function openRemindDebtors() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const debtors = debtorsList();
  if (!debtors.length) { toast("Qarzdor o'quvchi yo'q ✓"); return; }
  const total = debtors.reduce((a, s) => a + (Number(s.paymentDebt) || 0), 0);
  const noTg = debtors.filter(s => !s.telegramChatId).length;
  openModal(`
    <div class="modal-head">
      <h3>Eslatma yuborish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-amber">${ico('megaphone', 22)}</div>
      <p class="confirm-text">${debtors.length} nafar qarzdor o'quvchiga Telegram orqali shaxsiy eslatma yuborilsinmi?</p>
      <p class="muted small" style="margin-top:7px">Umumiy qarzdorlik: <b>${fmtSom(total)} so'm</b></p>
      ${noTg ? `<p class="muted small" style="margin-top:7px">${ico('alert', 14)} ${noTg} nafar o'quvchida Telegram ulanmagan — ularga yuborilmaydi.</p>` : ''}
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="do-remind-debtors">Ha, yuborish</button>
    </div>
  `);
}

function sendDebtorsReminder() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const debtors = debtorsList();
  if (!debtors.length) { closeModal(); toast("Qarzdor o'quvchi yo'q ✓"); return; }
  const rows = debtors.filter(s => s.telegramChatId).map(debtRowOf);
  closeModal();
  queueDebtReminders(rows, `${rows.length} nafar qarzdorga eslatma yuborildi!`);
}

/* ==================== PROFIL ==================== */
function profileScreen() {
  const u = currentUser() || {};
  const st = !isTeacher() ? linkedStudent() : null;
  return `
  <div class="card profile-head">
    <div class="avatar avatar-xl avatar-gerb"><img src="logo.png" alt="Gerb" /></div>
    <div class="profile-name">${esc(st ? st.fullName : (u.name || ''))}</div>
    <div class="muted">${esc(u.login || '')}</div>
    <div style="margin-top:9px">
      <span class="role-badge ${isStaff() ? 'is-teacher' : 'is-student'}">${isTeacher() ? 'Muzaffar Amirov' : isSupport() ? 'Support teacher' : "O'quvchi"}</span>
      ${st ? `<span class="pill" style="margin-left:6px">${esc(tClass(st.schoolClass))}</span>` : ''}
    </div>
  </div>

  <div class="section-title">${t('Xavfsizlik')}</div>
  <div class="card list-card">
    <div class="list-row"><span>Login</span><span class="login-val">${esc(u.login || '')}</span></div>
    <div class="list-row"><span>${t('Parol')}</span><span class="muted">••••</span></div>
    <div class="list-row"><span>${t("Ko'rinish")}</span><span class="muted">${isTeacher() ? 'Muzaffar Amirov' : isSupport() ? 'Support teacher' : t("O'quvchi")}</span></div>
  </div>
  <button type="button" class="btn btn-ghost btn-block" data-act="open-change-pwd">${ico('key', 16)} ${t("Parolni o'zgartirish")}</button>

  ${(!isTeacher() && st) ? `
  <div class="section-title">${ico('smartphone', 15)} ${t("Aloqa va tiklash ma'lumotlari")}</div>
  <div class="card">
    <label class="field-label" for="st-phone">${t('Telefon raqam')}</label>
    <input class="input" id="st-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="+998 90 123 45 67" value="${esc(st.phone || '')}" />
    <label class="field-label" for="st-email" style="margin-top:6px">${t('Gmail manzili')}</label>
    <input class="input" id="st-email" type="email" autocomplete="email" placeholder="${t('ism@gmail.com')}" value="${esc(st.email || '')}" />
    <div class="muted small" style="margin-top:4px">${st.email ? (st.emailVerified ? ico('checkCircle', 14) + ' ' + t('Tasdiqlangan') : ico('alert', 14) + ' ' + t('Tasdiqlanmagan')) : ''}</div>
    ${(st.email && !st.emailVerified) ? `<button type="button" class="btn btn-ghost btn-block" data-act="resend-verify-existing" style="margin-top:6px">${ico('mail', 14)} ${t('Kod yuborish')}</button>` : ''}
    <div class="muted small" style="margin-top:6px">${t("Parolni tiklash kodi shu telefon (Telegram) yoki Gmail manzilga yuboriladi.")}</div>
    <button type="button" class="btn btn-primary btn-block" data-act="save-student-contact" style="margin-top:8px">${ico('save', 14)} ${t('Saqlash')}</button>
  </div>` : ''}

  ${isTeacher() ? `
  <div class="section-title">${ico('lock', 15)} ${t('2FA va tiklash sozlamalari')}</div>
  <div class="card">
    <div class="muted small" style="margin-bottom:8px">${t("Kirishdagi 2 bosqichli kod va parolni tiklash kodi shu manzillarga yuboriladi.")}</div>
    <label class="field-label" for="tc-email">${t('Ustoz Gmail manzili')}</label>
    <input class="input" id="tc-email" type="email" autocomplete="email" placeholder="${t('ustoz@gmail.com')}" value="${esc(adminContacts.email || '')}" />
    <div class="muted small" style="margin-top:4px">${adminContacts.email ? (adminContacts.verified ? ico('checkCircle', 14) + ' ' + t('Tasdiqlangan') : ico('alert', 14) + ' ' + t('Tasdiqlanmagan')) : ''}</div>
    ${(adminContacts.email && !adminContacts.verified) ? `<button type="button" class="btn btn-ghost btn-block" data-act="resend-verify-existing" style="margin-top:6px">${ico('mail', 14)} ${t('Kod yuborish')}</button>` : ''}
    <label class="field-label" for="tc-phone" style="margin-top:6px">${t('Telefon raqam')}</label>
    <input class="input" id="tc-phone" type="tel" inputmode="tel" maxlength="20" placeholder="+998 90 123 45 67" value="${esc(adminContacts.phone || '')}" />
    <button type="button" class="btn btn-primary btn-block" data-act="save-teacher-contact" style="margin-top:10px">${ico('save', 14)} ${t('Saqlash')}</button>
    <div class="muted small" style="margin-top:12px">${t('Ishonchli qurilmalar')}: <b>${adminTrusted.list.length}</b> ·
      ${t("bu qurilma")} ${trustedToken() ? ico('checkCircle', 14) + ' ' + t('ishonchli') : t('yangi')}</div>
    <button type="button" class="btn btn-ghost btn-block" data-act="clear-trusted" style="margin-top:6px">${ico('unlock', 14)} ${t('Ishonchli qurilmalarni tozalash')}</button>
  </div>` : ''}

  ${isTeacher() ? `
  <div class="section-title">${t("Ma'lumotlar Bazasi Zaxirasi")}</div>
  <div class="card backup-card">
    <div class="muted small">${t("Guruhlar, o'quvchilar, davomat, baholar, xabarlar va speaking topshiriqlari JSON faylda saqlanadi.")}</div>
    <button type="button" class="btn btn-primary btn-block" data-act="backup-dl">${ico('download', 16)} ${t('Bazani yuklab olish (Backup)')}</button>
    <button type="button" class="btn btn-ghost btn-block" data-act="backup-pick">${ico('upload', 16)} ${t('Bazani qayta tiklash (Restore)')}</button>
    <input type="file" id="backup-file" accept="application/json,.json" hidden />

    <div class="section-title" style="margin-top:14px">${t('Tozalash')}</div>
    <div class="muted small">${t("Tozalashdan oldin barcha jadvallar fayl ko'rinishida avtomatik yuklab olinadi.")}</div>
    <div class="chips">
      ${CLEANUP_TABLES.map(ct => `<button type="button" class="chip-btn${(state.cleanupTable || 'grades') === ct[0] ? ' active' : ''}" data-act="cleanup-pick" data-table="${ct[0]}">${t(ct[1])}</button>`).join('')}
    </div>
    <button type="button" class="btn btn-danger btn-block" data-act="cleanup-go">${ico('brush', 16)} ${t('Tanlangan jadvalni tozalash')}</button>
  </div>` : ''}

  
  ${isTeacher() ? `
  <div class="section-title">${ico('creditCard', 15)} To\'lov kartasi sozlamalari</div>
  <div class="card card-settings-block">
    <div class="muted small" style="margin-bottom:8px">O\'quvchilar repetitorlik to\'lovini o\'tkazishi uchun karta raqamingiz va ism-familiyangizni kiriting:</div>
    <label class="field-label" for="teacher-card-num">Karta raqami (16 ta raqam)</label>
    <input class="input" id="teacher-card-num" inputmode="numeric" maxlength="24" placeholder="8600 0000 0000 0000" value="${esc((store.get(K.cardSettings) || {}).number || '')}" />
    <label class="field-label" for="teacher-card-holder" style="margin-top:6px">Karta egasining ism-familiyasi</label>
    <input class="input" id="teacher-card-holder" autocapitalize="characters" placeholder="MUZAFFAR AMIROV" value="${esc((store.get(K.cardSettings) || {}).holder || '')}" />
    <button type="button" class="btn btn-primary btn-block" data-act="save-card-settings" style="margin-top:10px">${ico('save', 14)} Kartani saqlash</button>
  </div>` : ''}

  ${isTeacher() ? `
  <div class="section-title">${ico('shield', 15)} Diagnostika</div>
  <div class="card">
    <div class="muted small">Uyga vazifa yuklash ishlamasa: homework-media bucket public holati, Storage policy'lari va homework_submissions ustunlari shu yerda tekshiriladi.</div>
    <button type="button" class="btn btn-ghost btn-block" data-act="run-diagnostics" style="margin-top:8px">${ico('shield', 16)} Diagnostikani ishga tushirish</button>
  </div>` : ''}

  ${sessionsSectionHTML()}

  <div class="section-title">${t('Maxfiylik')}</div>
  <div class="card list-card">
    <div class="list-row"><span class="muted small">${t("Bu ilova tashqi tahlil xizmatlariga ma'lumot yubormaydi.")}</span></div>
  </div>

  <button type="button" class="btn btn-danger btn-block" data-act="logout">${t('Hisobdan chiqish')}</button>
  `;
}

/* ==================== MODALLAR ==================== */
function openModal(html) {
  $('#modal-sheet').innerHTML = html;
  $('#modal-overlay').hidden = false;
  applyCurrentLang($('#modal-sheet'));
}
function closeModal() {
  stopResendTimer();
  revokeHwPreview();
  $('#modal-overlay').hidden = true;
  $('#modal-sheet').innerHTML = '';
  state.editor = null;
  state.slotMode = 'create';
  state.slotId = '';
  state.chatSid = null;
}

function openAddGroup() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const short = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  openModal(`
    <div class="modal-head">
      <h3>Guruh qo'shish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <label class="field-label" for="f-gname">Guruh nomi</label>
    <input class="input" id="f-gname" placeholder="${t('Masalan: IELTS Band 7.0')}" />

    <div class="field-label">Dars kunlari</div>
    <div class="day-grid" id="f-days">
      ${APP_DATA.days.map((d, i) => `
        <label class="day-opt">
          <input type="checkbox" value="${d}" />
          <span class="day-box" title="${d}">${short[i]}</span>
        </label>`).join('')}
    </div>

    <div id="f-times" class="day-times" aria-live="polite"></div>
    <p class="muted small" style="margin-top:8px">Kunni tanlang — har bir kun uchun alohida vaqtni belgilang (masalan Dushanba 09:15, Shanba 11:00).</p>

    <div class="field-label">Guruh turi</div>
    <div class="gtype-grid" id="f-gtype">
      <label class="gtype-opt">
        <input type="radio" name="f-gtype" value="school" checked />
        <span>${ico('building', 14)} Maktab guruhi (bepul)</span>
      </label>
      <label class="gtype-opt">
        <input type="radio" name="f-gtype" value="tutoring" />
        <span>${ico('gradCap', 14)} Repetitorlik guruhi</span>
      </label>
    </div>
    <p class="muted small" style="margin-top:6px">Guruh turi faqat sizga ko'rinadi — o'quvchilarga hech qachon ko'rsatilmaydi.</p>

    <div id="f-gfee-wrap">
      <label class="field-label" for="f-gfee">Oylik to'lov summasi (so'mda)</label>
      <input class="input" id="f-gfee" type="number" min="0" step="1000" inputmode="numeric" placeholder="${t('Masalan: 300000')}" />
    </div>

    <button type="button" class="btn btn-primary btn-block" data-act="save-group">Saqlash</button>
  `);
  syncGroupFeeField();
}

/* Tanlangan kunlar uchun dinamik vaqt tanlagichlari (yagona vaqt inputi YO'Q) */
function renderDayTimes() {
  const wrap = $('#f-days') ? $('#f-times') : null;
  if (!wrap) return;
  const prev = {};
  $$('.dt-time', wrap).forEach(inp => {
    const d = inp.getAttribute('data-day');
    if (d) prev[d] = inp.value;
  });
  const days = $$('input:checked', $('#f-days')).map(i => i.value);
  if (!days.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div class="field-label">Dars vaqtlari (har kun uchun)</div>
    ${days.map(d => `
      <div class="day-time-row">
        <span class="dt-day">${esc(d)}</span>
        <input class="input dt-time" type="time" data-day="${esc(d)}" value="${esc(prev[d] || '')}" aria-label="${esc(d)} dars vaqti" />
      </div>`).join('')}`;
}

/* Guruh turi 'school' bo'lsa — oylik to'lov maydoni butunlay yashiriladi (bepul) */
function syncGroupFeeField() {
  const wrap = $('#f-gfee-wrap');
  if (!wrap) return;
  const typeBtn = $$('input[name="f-gtype"]').filter(i => i.checked)[0];
  const isSchool = !typeBtn || typeBtn.value === 'school';
  wrap.hidden = isSchool;
  const feeInput = $('#f-gfee');
  if (isSchool && feeInput) feeInput.value = '';
}

function openAddStudent() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const groups = getGroups();
  openModal(`
    <div class="modal-head">
      <h3>O'quvchi qo'shish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <label class="field-label" for="f-sname">Ism familiya</label>
    <input class="input" id="f-sname" placeholder="${t('Masalan: Aziz Rahimov')}" />

    <label class="field-label" for="f-sclass">Maktab sinfi</label>
    <select class="input" id="f-sclass">
      <option value="">Sinfni tanlang</option>
      ${APP_DATA.classes.map(c => `<option value="${c}">${c}</option>`).join('')}
    </select>

    <label class="field-label" for="f-sgroup">Guruh</label>
    <select class="input" id="f-sgroup">
      <option value="">Guruhni tanlang</option>
      ${groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
    </select>

    <div class="field-label">Kirish ma'lumotlari</div>
    <label class="field-label" for="f-slogin">Login</label>
    <input class="input" id="f-slogin" autocapitalize="none" autocorrect="off" placeholder="${t('Masalan: jasur09')}" />

    <label class="field-label" for="f-spass">Dastlabki parol</label>
    <div class="pw-wrap">
      <input class="input" id="f-spass" type="password" inputmode="numeric" placeholder="${t('Masalan: 1234')}" />
      <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="f-spass" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
    </div>

    <input type="text" name="bot_check_field" id="hp-student" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <button type="button" class="btn btn-primary btn-block" data-act="save-student">Saqlash</button>
  `);
}

function saveGroup() {
  const name = ($('#f-gname').value || '').trim();
  const days = $$('input:checked', $('#f-days')).map(i => i.value);
  const times = {};
  $$('#f-times .dt-time').forEach(inp => {
    const d = inp.getAttribute('data-day');
    if (d) times[d] = (inp.value || '').trim();
  });

  if (!name) { toast("Guruh nomini kiriting", 'error'); $('#f-gname').focus(); return; }
  if (!days.length) { toast("Dars kunlarini tanlang", 'error'); return; }

  /* Kun + vaqt bir xatorda saqlanadi: "Dushanba 09:15, Shanba 11:00" */
  const encoded = days.map(d => (times[d] ? d + ' ' + times[d] : d)).join(', ');
  const firstTime = days.map(d => times[d] || '').filter(Boolean)[0] || '';

  const typeBtn = $$('input[name="f-gtype"]').filter(i => i.checked)[0];
  const groupType = typeBtn && typeBtn.value === 'tutoring' ? 'tutoring' : 'school';
  /* Maktab guruhi — bepul: to'lov maydoni yashirin va summa 0 */
  const fee = groupType === 'school' ? 0
    : Math.max(0, Math.round(Number(($('#f-gfee') ? $('#f-gfee').value : 0)) || 0));
  const groups = getGroups();
  groups.push({ id: 'g' + Date.now(), name, days: encoded, time: firstTime, monthlyFee: fee, groupType: groupType });
  store.set(K.groups, groups);
  CloudSync.pushGroup(groups[groups.length - 1]);
  closeModal();
  render();
  toast("Guruh qo'shildi ✓");
}

/* --- Guruhni tahrirlash: har bir kun uchun alohida vaqt (qo'shish modali bilan bir xil UI) --- */
function openEditGroup(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const g = groupById(gid);
  if (!g) return;
  const short = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const checked = {};
  const preset = {};
  parseGroupDays(g).forEach(x => {
    checked[x.day] = true;
    if (x.time) preset[x.day] = x.time;
  });
  /* Eski format (kunlar + bitta time) — barcha tanlangan kunlar o'sha vaqt bilan to'ldiriladi */
  if (!Object.keys(preset).length && g.time) {
    Object.keys(checked).forEach(d => { preset[d] = g.time; });
  }
  openModal(`
    <div class="modal-head">
      <h3>Guruhni tahrirlash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <label class="field-label" for="f-gname">Guruh nomi</label>
    <input class="input" id="f-gname" value="${esc(g.name)}" />

    <div class="field-label">Dars kunlari</div>
    <div class="day-grid" id="f-days">
      ${APP_DATA.days.map((d, i) => `
        <label class="day-opt">
          <input type="checkbox" value="${d}" ${checked[d] ? 'checked' : ''} />
          <span class="day-box" title="${d}">${short[i]}</span>
        </label>`).join('')}
    </div>

    <div id="f-times" class="day-times" aria-live="polite"></div>
    <p class="muted small" style="margin-top:8px">Har bir tanlangan kun uchun alohida dars vaqtini belgilang.</p>

    <div class="field-label">Guruh turi</div>
    <div class="gtype-grid" id="f-gtype">
      <label class="gtype-opt">
        <input type="radio" name="f-gtype" value="school" ${groupTypeOf(g) === 'school' ? 'checked' : ''} />
        <span>${ico('building', 14)} Maktab guruhi (bepul)</span>
      </label>
      <label class="gtype-opt">
        <input type="radio" name="f-gtype" value="tutoring" ${groupTypeOf(g) === 'tutoring' ? 'checked' : ''} />
        <span>${ico('gradCap', 14)} Repetitorlik guruhi</span>
      </label>
    </div>
    <p class="muted small" style="margin-top:6px">Guruh turi faqat sizga ko'rinadi — o'quvchilarga hech qachon ko'rsatilmaydi.</p>

    <div id="f-gfee-wrap">
      <label class="field-label" for="f-gfee">Oylik to'lov summasi (so'mda)</label>
      <input class="input" id="f-gfee" type="number" min="0" step="1000" inputmode="numeric" value="${g && g.monthlyFee ? String(g.monthlyFee) : ''}" placeholder="${t('Masalan: 300000')}" />
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="save-edit-group" data-gid="${esc(String(gid))}">Saqlash</button>
    </div>
  `);
  renderDayTimes();
  $$('#f-times .dt-time').forEach(inp => {
    const d = inp.getAttribute('data-day');
    if (d && preset[d]) inp.value = preset[d];
  });
  syncGroupFeeField();
}

function saveEditGroup(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const name = (($('#f-gname') && $('#f-gname').value) || '').trim();
  const days = $$('input:checked', $('#f-days')).map(i => i.value);
  const times = {};
  $$('#f-times .dt-time').forEach(inp => {
    const d = inp.getAttribute('data-day');
    if (d) times[d] = (inp.value || '').trim();
  });

  if (!name) { toast("Guruh nomini kiriting", 'error'); if ($('#f-gname')) $('#f-gname').focus(); return; }
  if (!days.length) { toast("Dars kunlarini tanlang", 'error'); return; }

  /* "Dushanba 09:15, Shanba 11:00" — yangi format; legacy time = birinchi tanlangan vaqt */
  const encoded = days.map(d => (times[d] ? d + ' ' + times[d] : d)).join(', ');
  const firstTime = days.map(d => times[d] || '').filter(Boolean)[0] || '';

  const typeBtn = $$('input[name="f-gtype"]').filter(i => i.checked)[0];
  const groupType = typeBtn && typeBtn.value === 'tutoring' ? 'tutoring' : 'school';
  const fee = groupType === 'school' ? 0
    : Math.max(0, Math.round(Number(($('#f-gfee') ? $('#f-gfee').value : 0)) || 0));
  const list = getGroups().map(x => String(x.id) === String(gid)
    ? Object.assign({}, x, { name: name, days: encoded, time: firstTime, monthlyFee: fee, groupType: groupType })
    : x);
  store.set(K.groups, list);
  const updated = list.filter(x => String(x.id) === String(gid))[0];
  CloudSync.pushGroup(updated);
  closeModal();
  render();
  toast("Guruh yangilandi ✓");
}

function saveStudent() {
  /* Bot honeypot: maydon to'ldirilgan bo'lsa — jimjimrad rad etiladi */
  if ($('#hp-student') && $('#hp-student').value) return;
  const name = ($('#f-sname').value || '').trim();
  const cls = $('#f-sclass').value;
  const gid = $('#f-sgroup').value;
  const login = ($('#f-slogin').value || '').trim().toLowerCase();
  const pass = ($('#f-spass').value || '').trim();

  if (name.length < 3) { toast("Ism familiyani kiriting", 'error'); $('#f-sname').focus(); return; }
  if (!cls) { toast("Maktab sinfini tanlang", 'error'); return; }
  if (!gid) { toast("Guruhni tanlang", 'error'); return; }
  if (!/^[a-z0-9_.]{3,20}$/.test(login)) { toast("Login 3–20 ta: harf, raqam, _ yoki .", 'error'); $('#f-slogin').focus(); return; }
  if (loginTaken(login)) { toast("Bu login allaqachon band", 'error'); $('#f-slogin').focus(); return; }
  if (pass.length < 3) { toast("Dastlabki parol kamida 3 ta belgi bo'lsin", 'error'); $('#f-spass').focus(); return; }

  const id = 's' + Date.now();
  const students = getStudents();
  students.push({ id, login: login, fullName: name, schoolClass: cls, groupId: gid, speakingDebt: 0, paymentDebt: 0, feePeriod: '', audioSubmissions: [] });
  store.set(K.students, students);

  accounts[login] = { login, password: hashPasswordSync(pass), role: 'student', studentId: id, name };
  persistAccounts();
  CloudSync.pushStudent(id);

  closeModal();
  render();
  toast("O'quvchi qo'shildi ✓ Login: " + login);
}

/* ---- Ustoz: o'quvchi parolini yangilash ---- */
function openResetPwd(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  const sLogin = loginOfStudent(st.id, st);
  openModal(`
    <div class="modal-head">
      <h3>Parolni yangilash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${esc(st.schoolClass)} • Login: <span class="login-val">${sLogin ? esc(sLogin) : '—'}</span></div>
      </div>
    </div>
    ${sLogin ? '' : `<label class="field-label" for="rp-login">Login</label>
      <input class="input" id="rp-login" autocapitalize="none" value="${esc(suggestLogin(st.fullName))}" />`}
    <label class="field-label" for="rp-pass">Yangi parol</label>
    <div class="pw-wrap">
      <input class="input" id="rp-pass" type="password" inputmode="numeric" placeholder="${t('Masalan: 1234')}" />
      <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="rp-pass" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
    </div>
    <button type="button" class="btn btn-primary btn-block" data-act="save-reset" data-sid="${sid}">Saqlash</button>
  `);
}

function saveResetPwd(sid) {
  const st = studentById(sid);
  if (!st) return;
  const pass = ($('#rp-pass') ? $('#rp-pass').value : '').trim();
  if (pass.length < 3) { toast("Parol kamida 3 ta belgi bo'lsin", 'error'); return; }

  let acc = Object.keys(accounts).map(k => accounts[k]).filter(a => a.studentId === sid)[0];
  let finalLogin = acc ? acc.login : '';
  if (acc) {
    acc.password = hashPasswordSync(pass);
  } else {
    const loginEl = $('#rp-login');
    /* mavjud login (o'quvchi qatoridagi) ustuvor — ikkinchi hisob yaratilmaydi */
    const login = String(
      (loginEl ? loginEl.value : '') || st.login || suggestLogin(st.fullName)
    ).trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(login)) { toast("Login noto'g'ri", 'error'); return; }
    if (loginTaken(login, sid)) { toast("Bu login band", 'error'); return; }
    accounts[login] = { login, password: hashPasswordSync(pass), role: 'student', studentId: sid, name: st.fullName };
    finalLogin = login;
  }
  /* login o'quvchi qatoriga ham yoziladi (ro'yxat va kartada ko'rinishi uchun) */
  if (finalLogin && !st.login) {
    const rows = getStudents().map(x => x.id === sid ? Object.assign({}, x, { login: finalLogin }) : x);
    store.set(K.students, rows);
  }
  persistAccounts();
  CloudSync.pushStudent(sid);
  closeModal();
  render();
  toast("Parol yangilandi ✓");
}

/* ==================== O'QUVCHINI TAHRIRLASH (guruhni almashtirish) ==================== */
function openEditStudent(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = getStudents().filter(x => x.id === sid)[0];
  if (!st) return;
  const groups = getGroups();
  openModal(`
    <div class="modal-head">
      <h3>O'quvchini tahrirlash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <label class="field-label" for="es-name">Ism familiya</label>
    <input class="input" id="es-name" value="${esc(st.fullName)}" />

    <label class="field-label" for="es-class">Maktab sinfi</label>
    <select class="input" id="es-class">
      ${APP_DATA.classes.map(c => `<option value="${esc(c)}" ${c === st.schoolClass ? 'selected' : ''}>${esc(c)}</option>`).join('')}
    </select>

    <label class="field-label" for="es-group">Guruh</label>
    <select class="input" id="es-group">
      <option value="">Guruh tanlanmagan</option>
      ${groups.map(g => `<option value="${esc(g.id)}" ${g.id === st.groupId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
    </select>
    <p class="muted small" style="margin-top:8px">Guruh o'zgartirilsa, mavjud baholar va davomat tarixi saqlanib qoladi.</p>

    <label class="field-label" for="es-debt">To'lov qarzi (so'mda)</label>
    <input class="input" id="es-debt" type="number" min="0" step="1000" inputmode="numeric" value="${Math.max(0, Number(st.paymentDebt) || 0)}" />

    <div class="switch-row">
      <span class="switch-row-label">${ico('upload', 16)} Uyga vazifa yuklashga ruxsat</span>
      <button type="button" class="switch${st.homeworkUploadAllowed === true ? ' on' : ''}"
              data-act="hw-upload-toggle" data-sid="${esc(String(sid))}"
              role="switch" aria-checked="${st.homeworkUploadAllowed === true}" aria-label="Uyga vazifa yuklashga ruxsat"></button>
    </div>

    <div class="field-error" id="es-error"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="save-edit-student" data-sid="${esc(String(sid))}">Saqlash</button>
    </div>
  `);
}

/* Ustoz ruxsati: students.homework_upload_allowed */
function toggleHwUploadAllowed(sid) {
  if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
  const list = getStudents();
  const st = list.filter(function (x) { return x.id === sid; })[0];
  if (!st) return;
  st.homeworkUploadAllowed = st.homeworkUploadAllowed !== true;
  store.set(K.students, list);
  /* Karta va modalda bir xil switch bo'lishi mumkin — hammasini yangilaymiz */
  const btns = document.querySelectorAll('[data-act="hw-upload-toggle"][data-sid="' + sid + '"]');
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('on', st.homeworkUploadAllowed);
    btns[i].setAttribute('aria-checked', String(st.homeworkUploadAllowed));
  }
  CloudSync.pushStudent(sid);
  /* Kartadagi "Yuklash" belgisi va filtr natijasi darhol yangilansin */
  if (state.screen === 'students') refreshStudentList();
  toast(st.homeworkUploadAllowed ? 'Uyga vazifa yuklashga ruxsat berildi' : "Yuklash ruxsati o'chirildi");
}

function saveEditStudent(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const cur = getStudents().filter(x => x.id === sid)[0];
  if (!cur) return;
  const name = (($('#es-name') && $('#es-name').value) || '').trim();
  const cls = $('#es-class') ? $('#es-class').value : cur.schoolClass;
  const gid = $('#es-group') ? $('#es-group').value : '';
  const debt = Math.max(0, Math.round(Number(($('#es-debt') ? $('#es-debt').value : 0)) || 0));
  const err = $('#es-error');
  if (!name) {
    if (err) { err.textContent = "Ism familiyani kiriting"; err.classList.add('show'); }
    return;
  }
  /* Faqat name/schoolClass/group_id yangilanadi — baholar va davomat
     student_id bo'yicha qoladi (Supabase'da alohida jadvallar) */
  const list = getStudents().map(x => String(x.id) === String(sid)
    ? Object.assign({}, x, { fullName: name, schoolClass: cls, groupId: gid || null, paymentDebt: debt })
    : x);
  store.set(K.students, list);
  CloudSync.pushStudent(sid);
  closeModal();
  render();
  toast("O'quvchi yangilandi ✓");
}

/* ---- O'quvchi: parolni o'zgartirish ---- */
function openChangePwd() {
  const u = currentUser();
  if (!u) return;
  openModal(`
    <div class="modal-head">
      <h3>Parolni o'zgartirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="editor-info">
      <div class="avatar">${esc(initials(u.name || u.login))}</div>
      <div class="col">
        <div class="s-name">${esc(u.name || u.login)}</div>
        <div class="muted small">Login: <span class="login-val">${esc(u.login)}</span></div>
      </div>
    </div>

    <label class="field-label" for="cp-old">Joriy parol</label>
    <div class="pw-wrap">
      <input class="input" id="cp-old" type="password" autocomplete="current-password" placeholder="••••" />
      <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="cp-old" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
    </div>

    <label class="field-label" for="cp-new">Yangi parol</label>
    <div class="pw-wrap">
      <input class="input" id="cp-new" type="password" autocomplete="new-password" placeholder="••••" />
      <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="cp-new" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
    </div>

    <label class="field-label" for="cp-new2">Yangi parolni tasdiqlang</label>
    <div class="pw-wrap">
      <input class="input" id="cp-new2" type="password" autocomplete="new-password" placeholder="••••" />
      <button type="button" class="pw-toggle" data-act="toggle-pw" data-target="cp-new2" aria-label="Parolni ko'rsatish">${ico('eye', 18)}</button>
    </div>

    <button type="button" class="btn btn-primary btn-block" data-act="save-change-pwd">Saqlash</button>
  `);
}

function saveChangePwd() {
  const u = currentUser();
  if (!u) return;
  const oldP = ($('#cp-old') ? $('#cp-old').value : '');
  const n1 = ($('#cp-new') ? $('#cp-new').value : '');
  const n2 = ($('#cp-new2') ? $('#cp-new2').value : '');
  const supRec = isSupport() ? supportRecord() : null;
  const storedPw = supRec ? (supRec.passwordHash || supRec.password || '') : u.password;
  if (!passwordMatches(oldP, storedPw)) { toast("Joriy parol noto'g'ri", 'error'); return; }
  if (n1.length < 3) { toast("Yangi parol kamida 3 ta belgi bo'lsin", 'error'); return; }
  if (n1 !== n2) { toast("Parollar mos kelmadi", 'error'); return; }
  const newPw = (u.role === 'student' || supRec) ? hashPasswordSync(n1) : n1;
  u.password = newPw;
  if (supRec) {
    persistSupportTeachers(supportTeachers().map(function (r) {
      return String(r.id) === String(supRec.id)
        ? Object.assign({}, r, { passwordHash: newPw, password: '' }) : r;
    }));
  }
  /* currentUser() nusxa qaytaradi — haqiqiy hisob yozuvini ham yangilaymiz,
     aks holda pushStudent eski parolni yuboradi */
  const acc = accounts[u.login];
  if (acc) acc.password = newPw;
  persistAccounts();
  if (u.role === 'student' && u.studentId) CloudSync.pushStudent(u.studentId);
  if (u.role === 'teacher') { CloudSync.pushTeacherPassword(n1); resetTrustedSilently(); } /* bot_settings */
  closeModal();
  render();
  toast("Parol o'zgartirildi ✓");
}

/* ==================== DIAGNOSTIKA (faqat ustoz) ==================== */
function diagRowHTML(r) {
  return `<div class="diag-row ${r.ok ? 'is-ok' : 'is-err'}">
    <span class="diag-ico">${r.ok ? ico('checkCircle', 15) : ico('alert', 15)}</span>
    <span class="diag-body">
      <b>${esc(r.label)}</b>
      ${r.detail ? `<span class="diag-detail">${esc(r.detail)}</span>` : ''}
    </span>
  </div>`;
}

async function fillDiagnostics() {
  const box = $('#diag-list');
  if (!box) return;
  box.innerHTML = '<div class="muted small">Tekshirilmoqda...</div>';
  let rows = [];
  try {
    rows = await CloudSync.diagnostics();
  } catch (e) {
    rows = [{ ok: false, label: 'Diagnostika', detail: (e && e.message) || 'xatolik' }];
  }
  const target = $('#diag-list');
  if (!target) return;
  const fails = rows.filter(function (r) { return !r.ok; }).length;
  target.innerHTML = (fails
    ? `<div class="diag-summary is-err">${ico('alert', 15)} ${fails} ta muammo topildi</div>`
    : `<div class="diag-summary is-ok">${ico('checkCircle', 15)} Hammasi joyida — yuklash ishlashi kerak</div>`)
    + rows.map(diagRowHTML).join('');
}

async function openDiagnostics() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  openModal(`
    <div class="modal-head">
      <h3>${ico('shield', 16)} Diagnostika</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="muted small">Bucket public holati, Storage policy'lari (yozish/o'qish/o'chirish) va homework_submissions ustunlari tekshiriladi.</div>
    <div id="diag-list" class="diag-list"><div class="muted small">Tekshirilmoqda...</div></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Yopish</button>
      <button type="button" class="btn btn-primary" data-act="diag-rerun">${ico('refresh', 15)} Qayta tekshirish</button>
    </div>
  `);
  await fillDiagnostics();
}

/* ==================== O'CHIRISH (tasdiq bilan, faqat ustoz) ==================== */
function submissionById(id) {
  return (store.get(K.homeworkSubmissions, []) || []).filter(function (x) {
    return String(x.id) === String(id);
  })[0] || null;
}

/* O'quvchi o'z yozuvini, ustoz esa istalgan topshiriq yozuvini o'chiradi */
function openDeleteSubmission(subId) {
  const sub = submissionById(subId);
  if (!sub) { toast('Topshiriq yozuvi topilmadi', 'error'); return; }
  const teacher = isTeacher();
  if (!teacher) {
    const st = linkedStudent();
    if (!st || String(st.dbId) !== String(sub.studentDbId)) { toast("Ruxsat yo'q", 'error'); return; }
  }
  const st = submissionStudent(sub);
  const hw = submissionHomework(sub);
  const who = (st ? st.fullName : "O'quvchi") + (hw ? ' — ' + hw.title : '');
  openModal(`
    <div class="modal-head">
      <h3>O'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-rose">${ICON.trash}</div>
      <p class="confirm-text">${teacher
        ? `Haqiqatan ham <strong>${esc(who)}</strong> topshiriq yozuvini o'chirmoqchimisiz? Yuklangan fayllar Storage'dan ham o'chiriladi.`
        : `Haqiqatan ham yuklagan fayllaringiz va izohingizni o'chirmoqchimisiz? Fayllar Storage'dan ham o'chiriladi.`}</p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-del-sub" data-sub="${esc(String(sub.id))}">Ha, o'chirish</button>
    </div>
  `);
}

function doDeleteSubmission(subId) {
  const sub = submissionById(subId);
  if (!sub) { closeModal(); toast('Topshiriq yozuvi topilmadi', 'error'); return; }
  if (!isTeacher()) {
    const st = linkedStudent();
    if (!st || String(st.dbId) !== String(sub.studentDbId)) { toast("Ruxsat yo'q", 'error'); return; }
  }
  closeModal();
  /* UI da darhol olib tashlaymiz, keyin bulutni tozalaymiz */
  store.set(K.homeworkSubmissions, (store.get(K.homeworkSubmissions, []) || []).filter(function (x) {
    return String(x.id) !== String(sub.id);
  }));
  render();
  CloudSync.deleteSubmission(sub.id, sub.files)
    .then(function (r) {
      if (r && r.storageErrors && r.storageErrors.length) {
        console.warn('[hw-del] storage:', r.storageErrors.join(' | '));
      }
      toast("Topshiriq o'chirildi");
      render();
    })
    .catch(function (e) {
      console.error('[hw-del]', e);
      toast("O'chirishda xatolik: " + ((e && e.message) || 'xatolik'), 'error');
      /* Xato bo'lsa bazadan holatni tiklaymiz */
      CloudSync.pullSubmissions().then(function () { render(); });
    });
}

function openDeleteStudent(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  openModal(`
    <div class="modal-head">
      <h3>O'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-rose">${ICON.trash}</div>
      <p class="confirm-text">Haqiqatan ham <strong>${esc(st.fullName)}ni</strong> o'chirmoqchimisiz? Uning barcha baholari va davomat tarixi ham o'chiriladi.</p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-del-student" data-sid="${sid}">Ha, o'chirish</button>
    </div>
  `);
}

function doDeleteStudent(sid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;

  /* kirish hisobi (login) + cloud id (lokal o'chirishdan OLDIN!) */
  const acc = Object.keys(accounts).map(k => accounts[k]).filter(a => a.studentId === sid)[0];
  const dbId = st.dbId;

  /* lokal ma'lumotlarni tozalash */
  store.set(K.students, getStudents().filter(x => x.id !== sid));
  const grades = getGrades();
  delete grades[sid];
  store.set(K.grades, grades);
  const att = getAttendance();
  Object.keys(att).forEach(dk => {
    if (!att[dk]) return;
    delete att[dk][sid];
    if (!Object.keys(att[dk]).length) delete att[dk];
  });
  store.set(K.attendance, att);
  store.set(K.speaking, getSpeaking().map(x => x.studentId === sid
    ? Object.assign({}, x, { studentId: null, score: null }) : x));
  store.set(K.messages, store.get(K.messages, []).filter(m => m.sid !== sid));
  if (acc) { delete accounts[acc.login]; persistAccounts(); }

  /* bulutdan: messages, audio, grades, attendance → students */
  CloudSync.deleteStudent(dbId).catch(e => console.warn('[cloud] del student:', (e && e.message) || e));

  closeModal();
  render();
  toast("O'quvchi muvaffaqiyatli o'chirildi ✓");
}

function openDeleteGroup(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const g = groupById(gid);
  if (!g) return;
  openModal(`
    <div class="modal-head">
      <h3>O'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-rose">${ICON.trash}</div>
      <p class="confirm-text">Haqiqatan ham <strong>${esc(g.name)}</strong> guruhini o'chirmoqchimisiz?</p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-del-group" data-gid="${gid}">Ha, o'chirish</button>
    </div>
  `);
}

function doDeleteGroup(gid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const g = groupById(gid);
  if (!g) return;
  const dbId = g.dbId;

  store.set(K.groups, getGroups().filter(x => x.id !== gid));
  store.set(K.students, getStudents().map(st =>
    st.groupId === gid ? Object.assign({}, st, { groupId: null }) : st));

  CloudSync.deleteGroup(dbId).catch(e => console.warn('[cloud] del group:', (e && e.message) || e));

  if (state.gradeGroup === gid) state.gradeGroup = '';
  if (state.attGroup === gid) state.attGroup = '';
  state.attDraft = null;
  state.attDraftFor = '';

  closeModal();
  render();
  toast("Guruh muvaffaqiyatli o'chirildi ✓");
}

/* ==================== ZAXIRA: BAZANI YUKLASH / QAYTA TIKLASH ==================== */
function toNumId(v) {
  const n = Number(String(v == null ? '' : v).replace(/^[gs]/, ''));
  return isFinite(n) ? n : null;
}
function backupFilename() { return 'english_crm_backup_' + todayKey() + '.json'; }

/* Lokal (cloudsiz) rejimda zaxira ma'lumotini cloud-sxemada yig'amiz */
function localBackupData() {
  const accBySid = {};
  Object.keys(accounts).forEach(k => {
    const a = accounts[k];
    if (a.studentId) accBySid[a.studentId] = a;
  });
  const groups = getGroups().map(g => ({
    id: toNumId(g.id), name: g.name, days: g.days, time: g.time
  })).filter(g => g.id != null);

  const students = getStudents().map(st => {
    const acc = accBySid[st.id] || {};
    return {
      id: toNumId(st.id),
      name: st.fullName,
      school_class: st.schoolClass,
      group_id: st.groupId == null ? null : toNumId(st.groupId),
      login: acc.login || st.login || '',
      password: acc.password || st.password || '',
      speaking_debt: Number(st.speakingDebt) || 0
    };
  }).filter(x => x.id != null);

  const grades = [];
  const all = getGrades();
  Object.keys(all).forEach(sid => {
    const rec = all[sid] || {};
    Object.keys(rec).forEach(dk => {
      const r = rec[dk];
      const student_id = toNumId(sid);
      if (student_id == null) return;
      grades.push({ student_id, date: dk, grade: r.score, category: r.category || 'Darsdagi javob', note: r.note || '' });
    });
  });

  const attendance = [];
  const att = getAttendance();
  Object.keys(att).forEach(dk => {
    Object.keys(att[dk] || {}).forEach(sid => {
      const student_id = toNumId(sid);
      if (student_id == null) return;
      attendance.push({ student_id, date: dk, status: att[dk][sid] });
    });
  });

  const messages = store.get(K.messages, [])
    .filter(m => toNumId(m.sid) != null)
    .map(m => ({ student_id: toNumId(m.sid), sender: m.sender, text: m.text, created_at: m.createdAt }));

  const audio_submissions = [];
  getStudents().forEach(st => {
    const student_id = toNumId(st.id);
    if (student_id == null) return;
    (st.audioSubmissions || []).forEach(a => {
      if (!a || !a.url) return;
      audio_submissions.push({
        student_id, date: a.date, url: a.url,
        status: a.status || 'pending',
        score: a.score == null ? null : a.score,
        feedback: a.feedback || ''
      });
    });
  });

  return { groups, students, attendance, grades, messages, speaking_submissions: [], audio_submissions };
}

async function downloadBackup() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return false; }
  toast('Zaxira tayyorlanmoqda...');
  let data = null;
  if (CloudSync.ready()) data = await CloudSync.fetchBackup();
  if (!data) data = localBackupData();

  const payload = { app: 'english-tutor', version: 1, exported_at: new Date().toISOString() };
  Object.keys(data).forEach(k => { payload[k] = data[k]; });

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    toast('Zaxira yuklab olindi ✓');
    return true;
  } catch (e) {
    console.warn('[backup] download:', e);
    toast("Zaxirani yuklab bo'lmadi", 'error');
    return false;
  }
}

/* ==================== JADVALLARNI TOZALASH (avval zaxira bilan) ==================== */
const CLEANUP_TABLES = [
  ['grades', 'Baholar'],
  ['attendance', 'Davomat'],
  ['messages', 'Xabarlar'],
  ['speaking_submissions', 'Topshiriqlar']
];

async function startCleanup() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const key = state.cleanupTable || 'grades';
  const label = (CLEANUP_TABLES.filter(t => t[0] === key)[0] || ['', key])[1];
  /* 1) Avval BARCHA jadvallar to'liq zaxira fayl sifatida yuklab olinadi */
  const ok = await downloadBackup();
  if (!ok) return; /* yuklab bo'lmadi — tozalashni boshlamaymiz */
  /* 2) Tasdiq modali */
  openModal(`
    <div class="modal-head">
      <h3>Jadvalni tozalash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-amber">${ICON.brush}</div>
      <p class="confirm-text">Eski ma'lumotlar fayl ko'rinishida yuklandi. Bazani tozalashni tasdiqlaysizmi?</p>
      <p class="muted small" style="margin-top:9px">${ico('fileText', 14)} ${esc(label)} jadvalidagi yozuvlar o'chiriladi</p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-cleanup">Ha, tozalash</button>
    </div>
  `);
}

async function doCleanup() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  closeModal();
  const key = state.cleanupTable || 'grades';
  toast('Baza tozalanmoqda...');
  const ok = await CloudSync.clearTable(key);
  if (!ok) { toast("Bulutda tozalab bo'lmadi", 'error'); return; }
  if (key === 'grades') store.set(K.grades, {});
  else if (key === 'attendance') store.set(K.attendance, {});
  else if (key === 'messages') store.set(K.messages, []);
  else if (key === 'speaking_submissions') store.set(K.tgsubs, []);
  render();
  toast('Jadval tozalandi ✓');
}

/* Cloudsiz rejimda: backup (cloud sxema) → lokal ilova modeli */
function restoreLocal(data) {
  const groups = (data.groups || []).map(g => {
    const n = toNumId(g.id);
    if (n == null) return null;
    return { id: 'g' + n, dbId: n, name: g.name || '', days: g.days || '', time: g.time || '', monthlyFee: Number(g.monthly_fee) || 0, groupType: g.group_type === 'school' ? 'school' : 'tutoring' };
  }).filter(Boolean);

  /* ovozli topshiriklar (audio_submissions) — o'quvchiga bog'lab tiklaymiz */
  const audioBySid = {};
  (data.audio_submissions || []).forEach((a, i) => {
    const sid = toNumId(a && a.student_id);
    if (sid == null || !a || !a.url) return;
    const rid = (a.id != null && a.id !== '') ? toNumId(a.id) : null;
    audioBySid['s' + sid] = audioBySid['s' + sid] || [];
    audioBySid['s' + sid].push({
      id: rid != null ? 'a' + rid : 'a' + Date.now() + i,
      rid: rid,
      date: a.date || '',
      url: a.url,
      status: a.status || 'pending',
      score: a.score == null ? null : Number(a.score),
      feedback: a.feedback || ''
    });
  });

  const students = (data.students || []).map(st => {
    const n = toNumId(st.id);
    if (n == null) return null;
    return {
      id: 's' + n,
      dbId: n,
      fullName: st.name || '',
      schoolClass: st.school_class || '',
      groupId: st.group_id == null ? null : 'g' + toNumId(st.group_id),
      login: st.login || '',
      password: st.password || '',
      speakingDebt: Number(st.speaking_debt) || 0,
      paymentDebt: Number(st.payment_debt) || 0,
      feePeriod: st.fee_period || '',
      voiceAllowed: st.voice_allowed === true,
      webSpeakingAllowed: st.web_speaking_allowed === true,
      homeworkUploadAllowed: st.homework_upload_allowed === true,
      telegramChatId: st.telegram_chat_id == null ? null : Number(st.telegram_chat_id),
      lastDevice: st.last_device || '',
      lastSeen: st.last_seen || null,
      audioSubmissions: (audioBySid['s' + n] || [])
    };
  }).filter(Boolean);

  const grades = {};
  (data.grades || []).forEach(r => {
    const sid = toNumId(r.student_id);
    if (sid == null || !r.date) return;
    grades['s' + sid] = grades['s' + sid] || {};
    grades['s' + sid][r.date] = {
      score: Number(r.grade),
      category: r.category || 'Darsdagi javob',
      note: r.note || ''
    };
  });

  const attendance = {};
  (data.attendance || []).forEach(r => {
    const sid = toNumId(r.student_id);
    if (sid == null || !r.date || !r.status) return;
    attendance[r.date] = attendance[r.date] || {};
    attendance[r.date]['s' + sid] = r.status;
  });

  const messages = (data.messages || []).map((m, i) => ({
    id: 'm' + (m.id != null ? m.id : i + 1),
    sid: 's' + toNumId(m.student_id),
    sender: m.sender,
    text: m.text,
    createdAt: m.created_at || new Date().toISOString()
  })).filter(m => m.sid && m.sid !== 'snull');

  store.set(K.groups, groups);
  store.set(K.students, students);
  store.set(K.grades, grades);
  store.set(K.attendance, attendance);
  store.set(K.messages, messages);

  /* hisoblar: ustoz (m_amirov) + zaxiradagi login/parollar */
  const next = {};
  next[TEACHER_LOGIN] = { login: TEACHER_LOGIN, password: TEACHER_PASSWORD, role: 'teacher', name: TEACHER_NAME, studentId: null };
  students.forEach(st => {
    if (st.login) next[st.login] = { login: st.login, password: st.password || '', role: 'student', studentId: st.id, name: st.fullName };
  });
  accounts = next;
  persistAccounts();

  /* uyga vazifalar (homework) */
  const hw = (data.homework || []).map(h => {
    const n = toNumId(h && h.id);
    if (n == null) return null;
    const gid = toNumId(h.group_id);
    return {
      id: 'h' + n, dbId: n, groupId: gid != null ? 'g' + gid : null,
      title: h.title || '', description: h.description || '',
      dueDate: h.due_date || '', mediaUrl: h.media_url || '', mediaType: h.media_type || '',
      createdAt: h.created_at || ''
    };
  }).filter(Boolean);
  store.set(K.homework, hw);

  /* to'lovlar tarixi */
  store.set(K.payments, (data.payments || []).map((pm, i) => {
    const sid = toNumId(pm && pm.student_id);
    if (sid == null) return null;
    return {
      id: 'p' + (pm.id != null ? pm.id : i + 1),
      dbId: pm.id != null ? toNumId(pm.id) : null,
      sid: 's' + sid,
      amount: Number(pm.amount) || 0,
      note: pm.note || '',
      createdAt: pm.created_at || ''
    };
  }).filter(Boolean));

  /* Telegram speaking topshiriklari */
  const subs = (data.speaking_submissions || []).map(t => {
    const n = toNumId(t && t.id);
    const sid = toNumId(t && t.student_id);
    if (n == null || sid == null) return null;
    return {
      id: 't' + n, dbId: n, sid: 's' + sid,
      mediaType: t.media_type || 'voice', status: t.status || 'kutilmoqda',
      score: t.score == null ? null : Number(t.score),
      feedback: t.feedback || '', createdAt: t.created_at || ''
    };
  }).filter(Boolean);
  store.set(K.tgsubs, subs);

  /* speaking slotlari — eski zaxiralarda bo'lmasa lokal slotlar saqlanadi */
  const ids = {};
  students.forEach(st => { ids[st.id] = 1; });
  if (Array.isArray(data.speaking_slots)) {
    const slots = data.speaking_slots.map(sx => {
      const n = toNumId(sx && sx.id);
      if (n == null) return null;
      const sid = toNumId(sx.student_id);
      return {
        id: 'sp' + n, dbId: n, date: sx.date || '',
        start: String(sx.start_time || '').slice(0, 5),
        end: String(sx.end_time || '').slice(0, 5),
        studentId: sid != null ? 's' + sid : null,
        score: sx.score == null ? null : Number(sx.score)
      };
    }).filter(Boolean);
    store.set(K.speaking, slots);
  } else {
    store.set(K.speaking, getSpeaking().map(x =>
      x.studentId && !ids[x.studentId] ? Object.assign({}, x, { studentId: null, score: null }) : x));
  }

  /* sesiya hisobdan chiqqan bo'lsa tozalaymiz */
  const sess = getSession();
  if (sess && !accounts[sess.login]) store.del(K.session);
}

/* --- Faylni o'qish → tasdiq modali --- */
let pendingRestore = null;

function readBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    let data = null;
    try { data = JSON.parse(String(reader.result)); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.groups) || !Array.isArray(data.students)) {
      toast("Fayl noto'g'ri: bu mos kelmaydigan zaxira fayli", 'error');
      return;
    }
    pendingRestore = data;
    openRestoreConfirm(
      file.name || backupFilename(),
      (data.students || []).length,
      (data.groups || []).length
    );
  };
  reader.onerror = function () { toast("Faylni o'qib bo'lmadi", 'error'); };
  reader.readAsText(file);
}

function openRestoreConfirm(fileName, nStudents, nGroups) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); pendingRestore = null; return; }
  openModal(`
    <div class="modal-head">
      <h3>Bazani qayta tiklash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-indigo">${ICON.upload}</div>
      <p class="confirm-text">Haqiqatan ham bazani ushbu fayldan qayta tiklamoqchimisiz? Hozirgi ma'lumotlar yangilanadi.</p>
      <p class="muted small" style="margin-top:9px">${ico('fileText', 14)} ${esc(fileName)} • ${nGroups} guruh, ${nStudents} o'quvchi</p>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-restore">Ha, tiklash</button>
    </div>
  `);
}

async function doRestoreBackup() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); pendingRestore = null; return; }
  const data = pendingRestore;
  pendingRestore = null;
  if (!data) { toast('Zaxira fayli topilmadi', 'error'); return; }
  closeModal();
  toast('Baza qayta tiklanmoqda...');

  if (CloudSync.ready()) {
    const ok = await CloudSync.restoreBackup(data);
    if (!ok) { toast('Bazani qayta tiklashda xatolik', 'error'); return; }
    await CloudSync.pullAll();
    render();
    toast('Baza qayta tiklandi ✓');
  } else {
    restoreLocal(data);
    render();
    toast('Baza qayta tiklandi ✓ (lokal rejim)');
  }
}

/* ==================== 10 BALLIK BAHOLAR JURNALI (faqat ustoz) ==================== */
function ensureGradeState() {
  const groups = scopedGroups();
  if (!groups.some(g => g.id === state.gradeGroup)) {
    state.gradeGroup = groups.length ? groups[0].id : '';
  }
  const dates = journalDates(state.gradeGroup, 6);
  if (dates.indexOf(state.gradeDate) < 0) {
    state.gradeDate = dates.length ? dates[dates.length - 1] : '';
  }
}
function gradeCellHTML(sid, dkey) {
  const rec = (getGrades()[sid] || {})[dkey];
  const focus = state.gradeDate === dkey ? ' on' : '';
  if (!rec) {
    return `<td class="bj-cell"><button type="button" class="bj-grade g-empty" data-act="edit-grade" data-sid="${sid}" data-date="${dkey}" title="Baho qo'yish">–</button></td>`;
  }
  return `<td class="bj-cell"><button type="button" class="bj-grade ${gradeClassOf(rec.score)}${focus}" data-act="edit-grade" data-sid="${sid}" data-date="${dkey}"
    title="${esc(rec.category || '')}${rec.note ? ' — ' + esc(rec.note) : ''}">${rec.score}</button></td>`;
}

function gradesScreen() {
  if (!canStaff('grades')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  ensureGradeState();
  const groups = scopedGroups();
  if (!groups.length) {
    return `<div class="screen-head"><h2 class="screen-title">${t('Baholar')}</h2></div>` + emptyState("Avval guruh yarating", 'grades');
  }

  const dates = state.weekOffset !== 0
    ? weekDates(state.gradeGroup, state.weekOffset)
    : journalDates(state.gradeGroup, 6);
  const all = getStudents().filter(s => s.groupId === state.gradeGroup);
  const rows = all.filter(s => state.gradeClass === 'Barchasi' || s.schoolClass === state.gradeClass);
  const classChips = ['Barchasi'].concat(APP_DATA.classes);

  const head = `<tr>
    <th class="bj-name col-student">${t("O'quvchi")}</th>
    ${dates.map(d => `<th class="bj-date ${state.gradeDate === d ? 'is-focus' : ''}"><button type="button" class="bj-date-btn" data-act="grade-date" data-date="${d}">${fmtDM(d)}</button></th>`).join('')}
    <th class="bj-sum">${t("O'rtacha")}</th>
  </tr>`;

  const body = rows.map(s => {
    const nums = scoresFor(s.id, dates);
    const avg = avgOf(nums);
    return `<tr>
      <td class="bj-name col-student">
        <div class="bj-name-cell">
          <span class="s-name">${esc(s.fullName)}</span>
          <span class="chip-class">${esc(tClass(s.schoolClass))}</span>
        </div>
      </td>
      ${dates.map(d => gradeCellHTML(s.id, d)).join('')}
      <td class="bj-sum">
        <span class="sum-avg ${avg == null ? 'g-empty' : gradeClassOf(avg)}">${fmtAvg(avg)}</span>
        <span class="sum-total">Jami: ${totalOf(nums)}</span>
      </td>
    </tr>`;
  }).join('');

  /* Jadval oxirida umumiy o'rtacha (Average score) */
  const allNums = [];
  rows.forEach(s => scoresFor(s.id, dates).forEach(v => allNums.push(v)));
  const classAvg = avgOf(allNums);
  const foot = rows.length ? `<tfoot><tr class="bj-foot">
    <td class="bj-name col-student bj-foot-label">${t("O'rtacha bahosi")}</td>
    ${dates.map(() => '<td class="bj-cell"></td>').join('')}
    <td class="bj-sum bj-foot-label"><span class="sum-avg ${classAvg == null ? 'g-empty' : 'g-num'}">${fmtAvg(classAvg)}</span></td>
  </tr></tfoot>` : '';

  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${t('Baholar')}</h2>
      <div class="muted small">10 ballik tizim • ${rows.length} ta o'quvchi</div>
    </div>
  </div>

  <div class="selector-row">
    <span class="selector-label">${t('Guruh')}</span>
    <div class="chips">
      ${groups.map(g => `<button type="button" class="chip-btn ${state.gradeGroup === g.id ? 'active' : ''}" data-act="grade-group" data-group="${g.id}">${esc(g.name)}</button>`).join('')}
    </div>
  </div>

  <div class="selector-row">
    <span class="selector-label">${t('Sinf')}</span>
    <div class="chips">
      ${classChips.map(c => `<button type="button" class="chip-btn ${state.gradeClass === c ? 'active' : ''}" data-act="grade-class" data-class="${esc(c)}">${esc(tClass(c))}</button>`).join('')}
    </div>
  </div>

  <div class="week-nav-bar">
    <button type="button" id="btn-prev-week" class="week-btn prev" data-act="grade-week" data-dir="-1">&#8249; ${t('Oldingi hafta')}</button>
    <div class="week-label" id="current-week-label">${weekLabel(state.weekOffset || 0)}</div>
    <div style="display:flex;align-items:center;gap:6px;">
      <button type="button" id="btn-today-week" class="week-btn today" data-act="grade-week" data-dir="0">${t('Bugun')}</button>
      <button type="button" id="btn-next-week" class="week-btn next" data-act="grade-week" data-dir="1">${t('Keyingi hafta')} &#8250;</button>
    </div>
  </div>

  <div class="grid-scroll">
    <table class="bj">
      <thead>${head}</thead>
      <tbody>${body || `<tr><td class="bj-name col-student">${esc("Bu sinfda o'quvchi yo'q")}</td></tr>`}</tbody>
      ${foot}
    </table>
  </div>

  <div class="legend">
    <span>8–10 A'lo</span>
    <span>6–7 Yaxshi</span>
    <span>1–5 Qoniqarsiz</span>
  </div>
  <p class="muted small" style="margin-top:10px">Baho qo'yish uchun katakchaga bosing.</p>
  `;
}

/* ---- Baho editori (1-tap) ---- */
function renderGradeEditor() {
  const e = state.editor;
  if (!e) return;
  const st = studentById(e.sid);
  if (!st) return;
  const cats = APP_DATA.gradeCategories;

  $('#modal-sheet').innerHTML = `
    <div class="modal-head">
      <h3>Baho qo'yish</h3>
      <button type="button" class="icon-btn" data-act="close-grade" aria-label="Yopish">✕</button>
    </div>

    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${fmtDMY(e.date)} • ${esc(st.schoolClass)}</div>
      </div>
      ${e.score != null ? `<span class="gr-score ${gradeClassOf(e.score)}">${e.score}</span>` : ''}
    </div>

    <div class="field-label">Baho (1–10)</div>
    <div class="score-grid">
      ${[1,2,3,4,5,6,7,8,9,10].map(n => `
        <button type="button" class="score-btn ${e.score === n ? 'sel ' + gradeClassOf(n) : ''}" data-act="grade-set" data-score="${n}">${n}</button>`).join('')}
    </div>

    <div class="field-label">Vazifa turi</div>
    <div class="cat-wrap">
      ${cats.map(c => `<button type="button" class="chip-btn ${e.category === c ? 'active' : ''}" data-act="grade-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>

    <label class="field-label" for="grade-note">Izoh (ixtiyoriy)</label>
    <input class="input" id="grade-note" maxlength="60" placeholder="${t("Masalan: A'lo faollik")}" value="${esc(e.note || '')}" />

    <div class="row g8" style="margin-top:14px">
      <button type="button" class="btn btn-ghost" style="flex:1" data-act="grade-clear">O'chirish</button>
      <button type="button" class="btn btn-primary" style="flex:2" data-act="close-grade">Tayyor</button>
    </div>
  `;
  $('#modal-overlay').hidden = false;
}

function openGradeEditor(sid, dkey) {
  if (!canStaff('grades')) { toast("Baholash uchun ruxsat yo'q", 'error'); return; }
  const rec = (getGrades()[sid] || {})[dkey];
  state.gradeDate = dkey;
  state.editor = {
    sid: sid,
    date: dkey,
    score: rec ? rec.score : null,
    category: rec && rec.category ? rec.category : APP_DATA.gradeCategories[0],
    note: rec && rec.note ? rec.note : ''
  };
  renderGradeEditor();
}

function persistEditor(silent) {
  const e = state.editor;
  if (!e || e.score == null) return;
  const all = getGrades();
  all[e.sid] = all[e.sid] || {};
  all[e.sid][e.date] = { score: e.score, category: e.category, note: e.note || '' };
  store.set(K.grades, all);
  CloudSync.pushGrade(e.sid, e.date);
  if (!silent) toast('Baho saqlandi ✓');
}

/* ==================== TEZKOR DAVOMAT (faqat ustoz) ==================== */
function ensureAttState() {
  const groups = scopedGroups();
  if (!groups.some(g => g.id === state.attGroup)) {
    state.attGroup = groups.length ? groups[0].id : '';
  }
  if (!state.attDate) state.attDate = todayKey();
  if (state.attDraftFor !== state.attDate) {
    state.attDraft = Object.assign({}, (getAttendance()[state.attDate] || {}));
    state.attDraftFor = state.attDate;
  }
}

function attendanceScreen() {
  if (!canStaff('attendance')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  ensureAttState();
  const groups = scopedGroups();
  if (!groups.length) {
    return `<div class="screen-head"><h2 class="screen-title">${t('Davomat')}</h2></div>` + emptyState("Avval guruh yarating", 'cal');
  }

  const students = scopedStudents().filter(s => s.groupId === state.attGroup);
  const draft = state.attDraft || {};
  const cnt = { present: 0, absent: 0, excused: 0 };
  students.forEach(s => { if (draft[s.id]) cnt[draft[s.id]]++; });
  const marked = cnt.present + cnt.absent + cnt.excused;

  const rows = students.map(s => `
    <div class="att-row">
      <div class="att-top">
        <div class="row g8" style="min-width:0">
          <div class="avatar" style="width:34px;height:34px;font-size:13px">${esc(initials(s.fullName))}</div>
          <div class="col" style="min-width:0">
            <div class="s-name">${esc(s.fullName)}</div>
            <div class="muted small">${esc(s.schoolClass)}</div>
          </div>
        </div>
      </div>
      <div class="att-btns">
        ${APP_DATA.attendanceStatuses.map(st => `
          <button type="button" class="att-btn ${draft[s.id] === st.id ? 'on-' + st.id : ''}"
            data-act="att-set" data-sid="${s.id}" data-status="${st.id}">
            <span class="ic">${st.icon}</span>${st.label}
          </button>`).join('')}
      </div>
    </div>`).join('');

  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${t('Tezkor davomat')}</h2>
      <div class="muted small">${marked}/${students.length} belgilandi</div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" data-act="nav" data-screen="speaking">${ico('mic', 15)} Speaking</button>
  </div>

  <div class="selector-row">
    <span class="selector-label">${t('Guruh')}</span>
    <div class="chips">
      ${groups.map(g => `<button type="button" class="chip-btn ${state.attGroup === g.id ? 'active' : ''}" data-act="att-group" data-group="${g.id}">${esc(g.name)}</button>`).join('')}
    </div>
  </div>

  <div class="selector-row">
    <span class="selector-label">${t('Sana')}</span>
    <input class="input" id="att-date" type="date" value="${esc(state.attDate)}" max="${todayKey()}" />
  </div>

  <div class="att-summary">
    <span class="att-pill">✓ Keldi: ${cnt.present}</span>
    <span class="att-pill">✕ Kelmadi: ${cnt.absent}</span>
    <span class="att-pill">? Sababli: ${cnt.excused}</span>
  </div>

  <div class="card" style="padding-top:4px;padding-bottom:4px">
    ${students.length ? rows : emptyState("Bu guruhda o'quvchi yo'q", 'students')}
  </div>

  <button type="button" class="btn btn-primary btn-block" data-act="att-save">Davomatni saqlash</button>
  `;
}

/* ==================== SPEAKING (1-on-1) SLOTLARI ==================== */
function ensureSpeakState() { if (!state.speakDate) state.speakDate = todayKey(); }

function speakRowHTML(x) {
  const st = x.studentId ? studentById(x.studentId) : null;
  const scored = x.score != null;
  return `<div class="speak-row" data-slot="${esc(x.id)}">
    <div class="speak-top">
      <span class="slot-time">${esc(x.start)} – ${esc(x.end)}</span>
      <span class="slot-who">
        ${st ? `<span class="who-name">${esc(st.fullName)}</span>` : '<span class="who-free">Bosh (tayinlanmagan)</span>'}
      </span>
      <span class="slot-badge ${scored ? 'done' : 'wait'}">${scored ? 'Baho: ' + x.score : (st ? 'Baholanmagan' : 'Bo\'sh')}</span>
    </div>
    <div class="speak-actions">
      ${st ? '' : `<button type="button" class="btn btn-xs ghost" data-act="slot-assign" data-id="${esc(x.id)}">${ico('profile', 14)} Tayinlash</button>`}
      <button type="button" class="btn btn-xs ${scored ? 'ghost' : 'primary'}" data-act="slot-score" data-id="${esc(x.id)}">${scored ? "Bahoni o'zgartirish" : ico('star', 14) + ' Baholash'}</button>
      <button type="button" class="btn btn-xs danger" data-act="slot-del" data-id="${esc(x.id)}">O'chirish</button>
    </div>
  </div>`;
}

function speakingScreen() {
  if (!canStaff('speaking')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  ensureSpeakState();
  const scopeIds = {};
  scopedStudents().forEach(function (s) { scopeIds[s.id] = 1; });
  const list = getSpeaking()
    .filter(x => x.date === state.speakDate && (!x.studentId || scopeIds[x.studentId]))
    .sort((a, b) => a.start.localeCompare(b.start));

  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${t('Speaking')}</h2>
      <div class="muted small">1-on-1 slotlar • ${list.length} ta slot</div>
    </div>
    <button type="button" class="btn btn-primary btn-sm" data-act="open-slot">+ Slot</button>
  </div>

  <div class="selector-row">
    <span class="selector-label">${t('Sana')}</span>
    <input class="input" id="sp-date" type="date" value="${esc(state.speakDate)}" />
  </div>

  <div class="card" style="padding-top:4px;padding-bottom:4px">
    ${list.length ? list.map(speakRowHTML).join('') : emptyState("Bu sanada slot yo'q — 'Slot' tugmasini bosing")}
  </div>

  ${speakingLogHTML()}

  <div class="section-title">${ico('video', 15)} ${t('Speaking slotlari')} — ${t('Sayt videolari')}</div>
  <div class="muted small" style="margin:-4px 0 8px">${t('Speaking topshiriqlari (Inbox)')} · ${t("Guruhlar bo'yicha")}</div>
  <div class="card">
    ${renderTgInbox()}
  </div>

  <p class="muted small" style="margin-top:10px">Sayt videolari guruhlar bo'yicha shu yerda; bot topshiriqlari botda ko'rinadi. "Baholash" orqali 1–10 ball qo'yiladi, video saqlanadi, ball baholar jurnaliga tushadi va Speaking qarzi 1 ga kamayadi. Video faqat "O'chirish" tasdiqlanganda R2 va bazadan o'chadi.</p>
  `;
}

/* ---- Speaking sessiyalar jurnali (bir xil sana uchun ko'p sessiya — hammasi saqlanadi) ---- */
function logSpeakingSession(sid, date, score, source) {
  const log = store.get(K.speakLog, []) || [];
  log.unshift({ sid: sid, date: date, score: Number(score) || 0, source: source || '', at: new Date().toISOString() });
  store.set(K.speakLog, log.slice(0, 200));
}
function speakingLogHTML() {
  const log = (store.get(K.speakLog, []) || []).slice(0, 15);
  if (!log.length) return '';
  const byId = {};
  getStudents().forEach(s => { byId[s.id] = s; });
  return `
  <div class="section-title">Speaking sessiyalar jurnali</div>
  <div class="card">
    ${log.map(e => `
      <div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)">
        <span class="muted small">${e.date ? fmtDM(e.date) : '—'} • ${e.sid && byId[e.sid] ? esc(byId[e.sid].fullName) : '—'}</span>
        <span class="chip-class">${Number(e.score) || 0}/10</span>
      </div>`).join('')}
  </div>`;
}

/* ==================== SPEAKING: JONLI KRUJOK VIDEO YOZISH ==================== */
/* Ovozli xabar / fayl yuklash YO'Q — faqat brauzerda jonli dumaloq video.
   MediaPipe Face Landmarker CDN'dan faqat recorder ochilganda yuklanadi. */
const SPEAK_MP_VERSION = '0.10.14';
const SPEAK_MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + SPEAK_MP_VERSION;
const SPEAK_MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const SPEAK_DETECT_MS = 100;
/* Qat'iy ko'z nazorati: 1.0 s uzluksiz chetga qarash = 1 ogohlantirish, 3 tasida yozuv bekor qilinadi */
const SPEAK_AWAY_MS = 1000;
const SPEAK_AWAY_COOLDOWN_MS = 300;
const SPEAK_MAX_WARNINGS = 3;
/* Har qanday ogohlantirishdan keyin: 5 s ichida yuz va ko'z qaytmasa yozuv darhol bekor qilinadi */
const SPEAK_RETURN_MS = 5000;
const SPEAK_BLINK_MS = 400;
const SPEAK_BLINK_SCORE = 0.45;
const SPEAK_GAZE_SCORE = 0.5;
let speakRec = null;
let speakLandmarkerPromise = null;

function speakSubmitLabel() { return getLang() === 'en' ? 'Submit' : 'Yuborish'; }

function speakRecQ(sel) {
  return speakRec && speakRec.root ? speakRec.root.querySelector(sel) : null;
}
function speakRecStatus(text, kind) {
  const el = speakRecQ('#speak-rec-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'speak-rec-status' + (kind ? ' is-' + kind : '');
}
function speakRecRing(state) {
  const ring = speakRecQ('#speak-rec-ring');
  if (!ring) return;
  ring.classList.toggle('is-good', state === 'good');
  ring.classList.toggle('is-away', state === 'away');
  ring.classList.toggle('is-bad', state === 'bad');
}
function speakRecWarn(show, message, bad, count) {
  const el = speakRecQ('#speak-rec-warn');
  const txt = speakRecQ('#speak-rec-warn-text');
  if (el) {
    el.hidden = !show;
    el.classList.toggle('is-bad', !!bad);
    el.classList.toggle('is-count', !!count && !!show);
  }
  if (txt && message) txt.textContent = message;
}
/* 5 s qaytish sanoqi matni: 5s, 4s, 3s, 2s, 1s */
function speakCountdownText(ms) {
  const left = Math.max(0, Math.ceil(Number(ms) / 1000));
  return t('Kameraga qarang! {s}s...').replace('{s}', String(left));
}
/* Bekor qilish sababi: 3 ogohlantirish yoki 5 s ichida qaytmaslik */
function speakInvalidText(reason) {
  return reason === 'timeout'
    ? t('5 soniya ichida kameraga qaytmadingiz. Yozuv bekor qilindi — videoni qaytadan oling.')
    : t("Ko'zingiz 3 marta kameradan chetga qaradi. Yozuv to'xtatildi, videoni qaytadan oling.");
}
/* Ogohlantirish: qizil halqa + 5 s qaytish sanoqi. 3/3 da yozuv darhol bekor qilinadi. */
function speakRecWarning(n) {
  speakRec.warningUntil = Date.now() + 2200;
  /* Har qanday ogohlantirishdan keyin 5 s ichida yuz VA ko'z qaytishi shart */
  speakRec.awayDeadline = Date.now() + SPEAK_RETURN_MS;
  speakRecWarn(true, speakCountdownText(SPEAK_RETURN_MS), true, true);
  speakRecRing('bad');
  if (n >= SPEAK_MAX_WARNINGS) {
    speakRec.invalidReason = 'warnings';
    speakRecStatus(speakInvalidText('warnings'), 'error');
  }
}
function speakRecTimer(ms) {
  const el = speakRecQ('#speak-rec-timer');
  if (!el) return;
  const total = Math.max(0, Math.round(ms / 1000));
  el.textContent = String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

function speakRecMarkup() {
  const closeIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  return `
  <div class="speak-rec" id="speak-rec" role="dialog" aria-modal="true" aria-label="${esc(t('Speaking topshirish'))}">
    <button type="button" class="speak-rec-close" data-act="speak-rec-close" aria-label="${esc(t('Yopish'))}">${closeIco}</button>
    <div class="speak-rec-head">
      <div class="speak-rec-title">${t('Speaking topshirish')}</div>
      <div class="speak-rec-status" id="speak-rec-status">${t('Kamera va mikrofon ochilmoqda...')}</div>
    </div>
    <div class="speak-rec-stage">
      <div class="speak-rec-ring" id="speak-rec-ring"></div>
      <video id="speak-rec-video" class="speak-rec-video" autoplay playsinline muted></video>
      <div class="speak-rec-timer" id="speak-rec-timer">00:00</div>
    </div>
    <div class="speak-rec-eye" id="speak-rec-eye"><span class="speak-rec-dot"></span><span id="speak-rec-eye-text">${t('Yuz aniqlanmoqda...')}</span></div>
    <div class="speak-rec-warn" id="speak-rec-warn" hidden>${ICON.alert}<span id="speak-rec-warn-text">${t('Kameraga qarang')}</span></div>
    <div class="speak-rec-actions" id="speak-rec-actions">
      <button type="button" class="speak-rec-btn rec" data-act="speak-rec-start" disabled>${ICON.mic} ${t('Yozishni boshlash')}</button>
      <button type="button" class="speak-rec-btn stop" data-act="speak-rec-stop" hidden>${ICON.stopRec} ${t("Yozishni to'xtatish")}</button>
    </div>
    <div class="speak-rec-preview-actions" id="speak-rec-preview" hidden>
      <button type="button" class="speak-rec-btn watch" data-act="speak-rec-watch">${ICON.video} ${t("Videoni ko'rish")}</button>
      <button type="button" class="speak-rec-btn retake" data-act="speak-rec-retake">${ICON.refresh} ${t('Qayta yozish')}</button>
      <button type="button" class="speak-rec-btn submit" data-act="speak-rec-submit">${ICON.upload} ${speakSubmitLabel()}</button>
      <button type="button" class="speak-rec-btn cancel" data-act="speak-rec-cancel">${ICON.trash} ${t('Bekor qilish')}</button>
    </div>
    <div class="speak-rec-invalid" id="speak-rec-invalid" hidden>
      <div class="speak-rec-invalid-note">${ICON.alert}<span id="speak-rec-invalid-text">${speakInvalidText('warnings')}</span></div>
      <button type="button" class="speak-rec-btn retake" data-act="speak-rec-retake">${ICON.refresh} ${t('Qayta olish')}</button>
    </div>
  </div>`;
}

function openSpeakingRecorder(opts) {
  const st = linkedStudent();
  const mockCtx = (opts && opts.mock) || null;
  if (!st) { toast("Avval tizimga kiring", 'error'); return; }
  if (!mockCtx && st.webSpeakingAllowed !== true) { toast(t('Saytda yozish yopiq'), 'error'); return; }
  closeSpeakRecorder(true);
  const wrap = document.createElement('div');
  wrap.innerHTML = speakRecMarkup();
  document.body.appendChild(wrap.firstElementChild);
  const root = document.getElementById('speak-rec');
  speakRec = {
    root: root, video: root.querySelector('#speak-rec-video'),
    stream: null, recorder: null, chunks: [], blob: null, objectUrl: '', mime: '',
    mode: 'idle', looking: false, away: true, lastGoodAt: 0,
    lookAwayCount: 0, eyeSamples: 0, eyeGood: 0, startedAt: 0, endedAt: 0,
    awaySince: 0, awayCooldownUntil: 0, strikeCounted: false, blinkStartedAt: 0,
    warningUntil: 0, awayDeadline: 0, invalidReason: '', invalidated: false, lastSignals: null, mock: mockCtx,
    timerId: null, detectId: null, landmarker: null
  };
  document.body.classList.add('speak-rec-open');
  analyticsCall('capture', 'speaking_recorder_opened', { allowed: true });
  /* Model kamera ochilishi bilan parallel yuklanadi (faqat recorder ochilganda) */
  loadSpeakLandmarker();
  startSpeakCamera();
}

async function startSpeakCamera() {
  if (!speakRec) return;
  const unsupported = !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ||
    typeof MediaRecorder === 'undefined';
  if (unsupported) {
    speakRec.mode = 'error';
    speakRecRing('away');
    speakRecStatus(t("Bu qurilmada video yozish qo'llab-quvvatlanmaydi."), 'error');
    return;
  }
  try {
    speakRec.stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }
    });
  } catch (e) {
    if (!speakRec) return;
    speakRec.mode = 'error';
    speakRecRing('away');
    speakRecStatus(t('Kamera yoki mikrofonga ruxsat berilmadi.'), 'error');
    return;
  }
  if (!speakRec) return;
  speakRec.video.srcObject = speakRec.stream;
  speakRec.video.muted = true;
  try { await speakRec.video.play(); } catch (e) { /* autoplay */ }
  speakRec.mode = 'ready';
  speakRecStatus(t('Yuz aniqlanmoqda...'));
  speakRec.landmarker = await loadSpeakLandmarker();
  if (!speakRec) return;
  if (!speakRec.landmarker) {
    /* Face Landmarker yuklanmasa — yozishni bloklamaymiz, faqat ogohlantiramiz */
    speakRec.looking = true;
    speakRec.away = false;
    speakRecRing('good');
    speakRecStatus(t("Ko'z nazorati mavjud emas — yozish mumkin"), 'warn');
    const btn = speakRecQ('[data-act="speak-rec-start"]');
    if (btn) btn.disabled = false;
    return;
  }
  startSpeakDetection();
}

function loadSpeakLandmarker() {
  if (speakLandmarkerPromise) return speakLandmarkerPromise;
  speakLandmarkerPromise = (async function () {
    const vision = await import(SPEAK_MP_BASE + '/vision_bundle.mjs');
    const fileset = await vision.FilesetResolver.forVisionTasks(SPEAK_MP_BASE + '/wasm');
    const opts = {
      baseOptions: { modelAssetPath: SPEAK_MP_MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false
    };
    try {
      return await vision.FaceLandmarker.createFromOptions(fileset, opts);
    } catch (e) {
      opts.baseOptions.delegate = 'CPU';
      return await vision.FaceLandmarker.createFromOptions(fileset, opts);
    }
  })().catch(function (e) {
    console.warn('[speak] FaceLandmarker:', (e && e.message) || e);
    return null;
  });
  return speakLandmarkerPromise;
}

function startSpeakDetection() {
  if (!speakRec) return;
  clearInterval(speakRec.detectId);
  speakRec.detectId = setInterval(runSpeakDetection, SPEAK_DETECT_MS);
}

/* MediaPipe blendshape natijalarini {nom: ball} ko'rinishiga keltiradi */
function speakBlendMap(res) {
  const out = {};
  const cats = res && res.faceBlendshapes && res.faceBlendshapes[0] &&
    res.faceBlendshapes[0].categories;
  if (Array.isArray(cats)) {
    cats.forEach(function (c) {
      if (c && c.categoryName) out[c.categoryName] = Number(c.score) || 0;
    });
  }
  return out;
}

/* Uch signal: bosh burilishi (yaw/pitch), iris-qovoq nisbati va eyeLook* blendshapes.
   Blink ham aniqlanadi — qisqa pirpirash (<400 ms) chetga qarash hisoblanmaydi. */
function speakFaceSignals(lm, blends) {
  function pt(i) { return lm[i] || null; }
  const out = {
    face: false, headOk: false, irisAway: false, gazeAway: false,
    eyesClosed: false, yaw: 0, pitch: 0
  };
  if (!lm || !lm.length) return out;
  const lEye = pt(33), rEye = pt(263), nose = pt(1), chin = pt(152), forehead = pt(10);
  if (!lEye || !rEye || !nose || !chin || !forehead) return out;
  const faceW = Math.abs(rEye.x - lEye.x);
  const faceH = Math.abs(chin.y - forehead.y);
  if (faceW < 0.02 || faceH < 0.02) return out;
  out.face = true;
  out.yaw = (nose.x - (lEye.x + rEye.x) / 2) / faceW;
  out.pitch = (nose.y - (lEye.y + rEye.y) / 2) / faceH;
  out.headOk = Math.abs(out.yaw) <= 0.2 && out.pitch >= 0.05 && out.pitch <= 0.62;

  const b = blends || {};
  const blinkL = Number(b.eyeBlinkLeft) || 0;
  const blinkR = Number(b.eyeBlinkRight) || 0;
  let eyesClosedCount = 0;

  if (lm.length >= 478) {
    /* Har ko'z: tashqi burchak, ichki burchak, yuqori/pastki qovoq, iris nuqtalari */
    const eyes = [
      [33, 133, 159, 145, [468, 469, 470, 471, 472]],
      [263, 362, 386, 374, [473, 474, 475, 476, 477]]
    ];
    for (let k = 0; k < eyes.length; k++) {
      const a = pt(eyes[k][0]), c = pt(eyes[k][1]);
      const up = pt(eyes[k][2]), low = pt(eyes[k][3]);
      if (!a || !c || !up || !low) continue;
      const iris = eyes[k][4].map(pt).filter(Boolean);
      if (!iris.length) continue;
      const w = Math.abs(c.x - a.x);
      if (w < 0.005) continue;
      const lidGap = low.y - up.y;
      if (lidGap <= 0 || lidGap / w < 0.11) eyesClosedCount++;
      /* Gorizontal iris markazi: burun tomonga/chetga siljishi */
      const ix = iris.reduce(function (sum, q) { return sum + q.x; }, 0) / iris.length;
      if (Math.abs(ix - (a.x + c.x) / 2) / w > 0.22) out.irisAway = true;
      /* Vertikal iris markazi: tepaga/pastga qarash */
      const iy = iris.reduce(function (sum, q) { return sum + q.y; }, 0) / iris.length;
      const vy = (iy - up.y) / lidGap;
      if (vy < 0.30 || vy > 0.72) out.irisAway = true;
    }
  }

  out.eyesClosed = Math.max(blinkL, blinkR) > SPEAK_BLINK_SCORE || eyesClosedCount >= 2;
  const gazeKeys = ['eyeLookInLeft', 'eyeLookOutLeft', 'eyeLookInRight', 'eyeLookOutRight',
    'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight'];
  out.gazeAway = gazeKeys.some(function (k) { return (Number(b[k]) || 0) >= SPEAK_GAZE_SCORE; });
  return out;
}

function runSpeakDetection() {
  if (!speakRec || !speakRec.landmarker) return;
  if (speakRec.mode !== 'ready' && speakRec.mode !== 'recording') return;
  const video = speakRec.video;
  if (!video || video.readyState < 2 || !video.videoWidth) return;
  let res = null;
  try { res = speakRec.landmarker.detectForVideo(video, performance.now()); } catch (e) { return; }
  const lm = res && res.faceLandmarks && res.faceLandmarks[0];
  const now = Date.now();
  const blends = speakBlendMap(res);
  const sig = lm ? speakFaceSignals(lm, blends) : {
    face: false, headOk: false, irisAway: true, gazeAway: true, eyesClosed: false
  };
  speakRec.lastSignals = sig;

  const headAway = !sig.face || !sig.headOk;
  const eyeAway = sig.irisAway || sig.gazeAway;

  /* Qisqa blink (<400 ms) ko'z signallarini ishonchsiz qiladi, lekin yangi strike ochmaydi.
     Agar chetga qarash epizodi allaqachon boshlangan bo'lsa — uning uzluksizligini saqlaymiz. */
  if (sig.eyesClosed) {
    if (!speakRec.blinkStartedAt) speakRec.blinkStartedAt = now;
  } else {
    speakRec.blinkStartedAt = 0;
  }
  const shortBlink = sig.eyesClosed && speakRec.blinkStartedAt &&
    now - speakRec.blinkStartedAt < SPEAK_BLINK_MS;

  let rawAway = headAway || (!shortBlink && (eyeAway || sig.eyesClosed));
  if (shortBlink && !headAway && speakRec.awaySince) rawAway = true;
  if (shortBlink && !headAway && !speakRec.awaySince) rawAway = false;

  if (!rawAway) speakRec.lastGoodAt = now;
  const awayNow = rawAway && (speakRec.mode === 'recording' || now - speakRec.lastGoodAt > 350);

  if (speakRec.mode === 'recording') {
    speakRec.eyeSamples++;
    if (!rawAway) speakRec.eyeGood++;

    if (rawAway) {
      if (!speakRec.awaySince && now >= (speakRec.awayCooldownUntil || 0)) {
        speakRec.awaySince = now;
        speakRec.strikeCounted = false;
      }
      if (speakRec.awaySince && !speakRec.strikeCounted &&
          now - speakRec.awaySince >= SPEAK_AWAY_MS) {
        speakRec.strikeCounted = true;
        speakRec.lookAwayCount++;
        speakRecWarning(speakRec.lookAwayCount);
        if (speakRec.lookAwayCount >= SPEAK_MAX_WARNINGS) {
          speakRec.invalidReason = 'warnings';
          stopSpeakRecording(true);
          return;
        }
      }
      /* 5 s qaytish talabi: sanoq davom etadi; 0 ga tushsa — darhol bekor qilinadi */
      if (speakRec.awayDeadline) {
        const left = speakRec.awayDeadline - now;
        if (left <= 0) {
          speakRec.invalidReason = 'timeout';
          stopSpeakRecording(true);
          return;
        }
        speakRec.warningUntil = now + 400;
        speakRecWarn(true, speakCountdownText(left), true, true);
        speakRecRing('bad');
      }
    } else {
      if (speakRec.awaySince) speakRec.awayCooldownUntil = now + SPEAK_AWAY_COOLDOWN_MS;
      speakRec.awaySince = 0;
      speakRec.strikeCounted = false;
      /* 5 s ichida kameraga qaytdi: sanoq tozalanadi, ogohlantirish soni saqlanadi */
      if (speakRec.awayDeadline) {
        speakRec.awayDeadline = 0;
        speakRec.warningUntil = 0;
        speakRecWarn(false);
        speakRecRing('good');
      }
    }
  }

  speakRec.away = rawAway;
  speakRec.looking = !rawAway;
  const warningActive = now < (speakRec.warningUntil || 0);
  speakRecRing(warningActive ? 'bad' : awayNow ? 'away' : 'good');
  if (speakRec.mode !== 'recording' || speakRec.lookAwayCount === 0) {
    speakRecWarn(awayNow, null, false);
  }
  const eye = speakRecQ('#speak-rec-eye');
  if (eye) eye.classList.toggle('is-away', awayNow || warningActive);
  const eyeText = speakRecQ('#speak-rec-eye-text');
  if (eyeText) {
    if (speakRec.mode === 'recording') {
      const pct = speakRec.eyeSamples ? Math.round(speakRec.eyeGood / speakRec.eyeSamples * 100) : 0;
      eyeText.textContent = t("Ko'z kontakti: {p}%").replace('{p}', String(pct));
    } else {
      eyeText.textContent = awayNow ? t('Yuz topilmadi') : t('Yuz aniqlandi');
    }
  }
  if (speakRec.mode === 'ready') {
    speakRecStatus(awayNow
      ? t("Kameraga qarab turing — yuz va ko'zlar ko'rinsin")
      : t('Tayyor — yozishni boshlashingiz mumkin'), awayNow ? 'warn' : '');
  }
  const startBtn = speakRecQ('[data-act="speak-rec-start"]');
  if (startBtn && speakRec.mode === 'ready') startBtn.disabled = awayNow;
}

function speakPickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  /* Android/desktop Chrome: webm; iOS Safari: mp4 */
  const list = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'];
  for (let i = 0; i < list.length; i++) if (MediaRecorder.isTypeSupported(list[i])) return list[i];
  return '';
}

function startSpeakRecording() {
  if (!speakRec || speakRec.mode !== 'ready' || !speakRec.stream) return;
  if (speakRec.landmarker && speakRec.away) { toast(t('Kameraga qarang'), 'error'); return; }
  const mime = speakPickMime();
  try {
    speakRec.recorder = mime ? new MediaRecorder(speakRec.stream, { mimeType: mime })
      : new MediaRecorder(speakRec.stream);
  } catch (e) {
    speakRecStatus(t("Yozishni boshlab bo'lmadi"), 'error');
    return;
  }
  speakRec.mime = speakRec.recorder.mimeType || mime || 'video/webm';
  speakRec.chunks = [];
  speakRec.recorder.ondataavailable = function (ev) {
    if (ev.data && ev.data.size) speakRec.chunks.push(ev.data);
  };
  speakRec.recorder.onstop = finishSpeakRecording;
  try { speakRec.recorder.start(250); } catch (e) {
    speakRecStatus(t("Yozishni boshlab bo'lmadi"), 'error');
    return;
  }
  speakRec.mode = 'recording';
  speakRec.startedAt = Date.now();
  speakRec.endedAt = 0;
  speakRec.lookAwayCount = 0;
  speakRec.eyeSamples = 0;
  speakRec.eyeGood = 0;
  speakRec.lastGoodAt = Date.now();
  speakRec.away = false;
  speakRec.awaySince = 0;
  speakRec.awayCooldownUntil = 0;
  speakRec.strikeCounted = false;
  speakRec.blinkStartedAt = 0;
  speakRec.warningUntil = 0;
  speakRec.awayDeadline = 0;
  speakRec.invalidReason = '';
  speakRec.invalidated = false;
  speakRecTimer(0);
  clearInterval(speakRec.timerId);
  speakRec.timerId = setInterval(function () {
    if (!speakRec || speakRec.mode !== 'recording') return;
    speakRecTimer(Date.now() - speakRec.startedAt);
  }, 250);
  const startBtn = speakRecQ('[data-act="speak-rec-start"]');
  const stopBtn = speakRecQ('[data-act="speak-rec-stop"]');
  if (startBtn) startBtn.hidden = true;
  if (stopBtn) stopBtn.hidden = false;
  const invalid = speakRecQ('#speak-rec-invalid');
  if (invalid) invalid.hidden = true;
  speakRecWarn(false, '', false);
  speakRecRing('good');
  speakRecStatus(t('Yozib olinmoqda...'), 'rec');
}

function stopSpeakRecording(invalidated) {
  if (!speakRec || speakRec.mode !== 'recording' || !speakRec.recorder) return;
  speakRec.invalidated = invalidated === true;
  speakRec.mode = 'finishing';
  speakRec.endedAt = Date.now();
  clearInterval(speakRec.timerId);
  speakRecTimer(speakRec.endedAt - speakRec.startedAt);
  try { speakRec.recorder.stop(); } catch (e) { finishSpeakRecording(); }
}

/* 3/3: joriy yozuv butunlay tashlanadi — preview/submit ko'rsatilmaydi, faqat Retake. */
function finishInvalidSpeakRecording() {
  if (!speakRec) return;
  const reason = speakRec.invalidReason === 'timeout' ? 'timeout' : 'warnings';
  clearInterval(speakRec.timerId);
  clearInterval(speakRec.detectId);
  const hadChunks = speakRec.chunks && speakRec.chunks.length;
  speakRec.chunks = [];
  speakRec.blob = null;
  if (hadChunks) analyticsCall('capture', 'speaking_recording_discarded', {});
  if (speakRec.objectUrl) { try { URL.revokeObjectURL(speakRec.objectUrl); } catch (e) {} }
  speakRec.objectUrl = '';
  if (speakRec.stream) {
    try { speakRec.stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
  }
  speakRec.stream = null;
  const video = speakRec.video;
  if (video) {
    video.srcObject = null;
    video.muted = true;
    video.classList.remove('is-playback');
    try { video.pause(); } catch (e) {}
  }
  speakRec.mode = 'invalid';
  speakRec.invalidated = true;
  speakRec.away = true;
  speakRec.awaySince = 0;
  speakRec.strikeCounted = false;
  speakRecTimer(0);
  speakRecRing('bad');
  speakRecWarn(true, speakInvalidText(reason), true);
  const note = speakRecQ('#speak-rec-invalid-text');
  if (note) note.textContent = speakInvalidText(reason);
  const eye = speakRecQ('#speak-rec-eye');
  if (eye) eye.classList.add('is-away');
  const eyeText = speakRecQ('#speak-rec-eye-text');
  if (eyeText) eyeText.textContent = t("Ko'z kontakti: {p}%").replace('{p}', '0');
  const actions = speakRecQ('#speak-rec-actions');
  if (actions) actions.hidden = true;
  const preview = speakRecQ('#speak-rec-preview');
  if (preview) preview.hidden = true;
  const invalid = speakRecQ('#speak-rec-invalid');
  if (invalid) invalid.hidden = false;
  speakRecStatus(speakInvalidText(reason), 'error');
}

function finishSpeakRecording() {
  if (!speakRec) return;
  clearInterval(speakRec.timerId);
  clearInterval(speakRec.detectId);
  if (speakRec.invalidated) { finishInvalidSpeakRecording(); return; }
  const type = speakRec.mime || 'video/webm';
  const blob = new Blob(speakRec.chunks, { type: type });
  if (!blob.size) {
    speakRec.mode = 'ready';
    speakRecRing('away');
    speakRecStatus(t("Yozuv bo'sh chiqdi — qayta urinib ko'ring"), 'error');
    const startBtn = speakRecQ('[data-act="speak-rec-start"]');
    const stopBtn = speakRecQ('[data-act="speak-rec-stop"]');
    if (startBtn) { startBtn.hidden = false; startBtn.disabled = !!speakRec.landmarker && speakRec.away; }
    if (stopBtn) stopBtn.hidden = true;
    startSpeakDetection();
    return;
  }
  speakRec.blob = blob;
  speakRec.endedAt = speakRec.endedAt || Date.now();
  if (speakRec.objectUrl) URL.revokeObjectURL(speakRec.objectUrl);
  speakRec.objectUrl = URL.createObjectURL(blob);
  if (speakRec.stream) speakRec.stream.getTracks().forEach(function (tr) { tr.stop(); });
  speakRec.stream = null;
  const video = speakRec.video;
  if (video) {
    video.srcObject = null;
    video.muted = false;
    video.loop = true;
    video.classList.add('is-playback'); /* yozuv mirrorlanmagan — ko'rish ham ustoz ko'rgandek */
    video.src = speakRec.objectUrl;
    try { video.pause(); } catch (e) { /* preview */ }
  }
  speakRec.mode = 'preview';
  speakRecRing('good');
  speakRecWarn(false);
  const eye = speakRecQ('#speak-rec-eye');
  if (eye) eye.classList.remove('is-away');
  const eyeText = speakRecQ('#speak-rec-eye-text');
  if (eyeText) {
    const pct = speakRec.eyeSamples ? Math.round(speakRec.eyeGood / speakRec.eyeSamples * 100) : 0;
    eyeText.textContent = t("Ko'z kontakti: {p}%").replace('{p}', String(pct));
  }
  const stopBtn = speakRecQ('[data-act="speak-rec-stop"]');
  if (stopBtn) stopBtn.hidden = true;
  const actions = speakRecQ('#speak-rec-actions');
  if (actions) actions.hidden = true;
  const preview = speakRecQ('#speak-rec-preview');
  if (preview) preview.hidden = false;
  speakRecStatus(t("Tayyor — videoni ko'ring yoki yuboring."));
}

/* Qayta yozish: eski yozuv tashlanadi, kamera va ko'z nazorati qaytadan ishga tushadi */
function retakeSpeakRecording() {
  if (!speakRec || (speakRec.mode !== 'preview' && speakRec.mode !== 'invalid')) return;
  const v = speakRec.video;
  if (v) {
    try { v.pause(); } catch (e) { /* preview */ }
    v.classList.remove('is-playback');
    v.loop = false;
    v.muted = true;
    v.removeAttribute('src');
    v.srcObject = null;
    try { v.load(); } catch (e) { /* detached */ }
  }
  if (speakRec.objectUrl) { try { URL.revokeObjectURL(speakRec.objectUrl); } catch (e) {} }
  speakRec.objectUrl = '';
  speakRec.blob = null;
  speakRec.chunks = [];
  speakRec.recorder = null;
  speakRec.lookAwayCount = 0;
  speakRec.eyeSamples = 0;
  speakRec.eyeGood = 0;
  speakRec.startedAt = 0;
  speakRec.endedAt = 0;
  speakRec.looking = false;
  speakRec.away = true;
  speakRec.lastGoodAt = 0;
  speakRec.awaySince = 0;
  speakRec.awayCooldownUntil = 0;
  speakRec.strikeCounted = false;
  speakRec.blinkStartedAt = 0;
  speakRec.warningUntil = 0;
  speakRec.awayDeadline = 0;
  speakRec.invalidReason = '';
  speakRec.invalidated = false;
  speakRec.mode = 'idle';
  speakRecTimer(0);
  speakRecRing('');
  speakRecWarn(false, '', false);
  const eye = speakRecQ('#speak-rec-eye');
  if (eye) eye.classList.remove('is-away');
  const eyeText = speakRecQ('#speak-rec-eye-text');
  if (eyeText) eyeText.textContent = t('Yuz aniqlanmoqda...');
  const startBtn = speakRecQ('[data-act="speak-rec-start"]');
  const stopBtn = speakRecQ('[data-act="speak-rec-stop"]');
  const actions = speakRecQ('#speak-rec-actions');
  const preview = speakRecQ('#speak-rec-preview');
  if (startBtn) { startBtn.hidden = false; startBtn.disabled = true; }
  if (stopBtn) stopBtn.hidden = true;
  if (actions) actions.hidden = false;
  if (preview) preview.hidden = true;
  const invalid = speakRecQ('#speak-rec-invalid');
  if (invalid) invalid.hidden = true;
  speakRecStatus(t('Kamera va mikrofon ochilmoqda...'));
  startSpeakCamera();
}

function watchSpeakRecording() {
  if (!speakRec || !speakRec.blob || !speakRec.video) return;
  const v = speakRec.video;
  v.muted = false;
  try { v.currentTime = 0; } catch (e) { /* metadata */ }
  const p = v.play();
  if (p && p.catch) p.catch(function () {});
}

async function submitSpeakRecording() {
  if (!speakRec || !speakRec.blob || speakRec.mode !== 'preview') return;
  if (speakRec.mock) { submitMockSpeakRecording(); return; }
  const st = linkedStudent();
  if (!st) return;
  if (st.webSpeakingAllowed !== true) { toast(t('Saytda yozish yopiq'), 'error'); return; }
  const btn = speakRecQ('[data-act="speak-rec-submit"]');
  if (btn) btn.disabled = true;
  speakRec.mode = 'submitting';
  speakRecStatus(t('Yuborilmoqda...'), 'rec');
  const eyePercent = speakRec.eyeSamples ? Math.round(speakRec.eyeGood / speakRec.eyeSamples * 100) : 0;
  const metrics = {
    lookAwayCount: speakRec.lookAwayCount,
    eyeContactPercent: eyePercent,
    durationSec: Math.max(1, Math.round(((speakRec.endedAt || Date.now()) - speakRec.startedAt) / 1000))
  };
  try {
    const ext = /mp4/.test(speakRec.mime || '') ? 'mp4' : 'webm';
    const file = new File([speakRec.blob], 'speaking_' + Date.now() + '.' + ext,
      { type: speakRec.mime || 'video/webm' });
    const up = await uploadFileToR2(file, 'speaking/' + (st.dbId != null ? st.dbId : st.id));
    const g = groupById(st.groupId);
    const saved = await CloudSync.submitSpeakingVideo({
      studentDbId: st.dbId,
      studentName: st.fullName,
      groupName: g ? g.name : '',
      mediaUrl: up.url,
      durationSec: metrics.durationSec,
      lookAwayCount: metrics.lookAwayCount,
      eyeContactPercent: metrics.eyeContactPercent
    });
    /* Bazaga yozilmagan bo'lsa "topshirildi" deb yolg'on aytmaymiz */
    if (!saved) throw new Error(t("Bulutga yozib bo'lmadi"));
    const subs = getTgSubs();
    subs.push({
      id: saved && saved.id != null ? 't' + saved.id : 'tlocal' + Date.now(),
      dbId: saved && saved.id != null ? saved.id : null,
      sid: st.id, mediaType: 'video', mediaUrl: up.url, status: 'kutilmoqda',
      score: null, feedback: '', createdAt: new Date().toISOString(),
      lookAwayCount: metrics.lookAwayCount, eyeContactPercent: metrics.eyeContactPercent
    });
    store.set(K.tgsubs, subs);
    closeSpeakRecorder();
    toast(t('Speaking topshirildi'));
    analyticsCall('capture', 'speaking_video_submitted', metrics);
    render();
  } catch (e) {
    if (!speakRec) return;
    speakRec.mode = 'preview';
    if (btn) btn.disabled = false;
    speakRecStatus(t('Yuborishda xatolik') + ': ' + ((e && e.message) || ''), 'error');
  }
}

function closeSpeakRecorder() {
  if (!speakRec) return;
  const rec = speakRec;
  speakRec = null;
  clearInterval(rec.timerId);
  clearInterval(rec.detectId);
  if (rec.recorder && rec.recorder.state && rec.recorder.state !== 'inactive') {
    try { rec.recorder.stop(); } catch (e) { /* allaqachon to'xtagan */ }
  }
  if (rec.stream) rec.stream.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) {} });
  if (rec.objectUrl) { try { URL.revokeObjectURL(rec.objectUrl); } catch (e) {} }
  if (rec.video) {
    try { rec.video.pause(); } catch (e) { /* detached */ }
    rec.video.srcObject = null;
    rec.video.removeAttribute('src');
  }
  if (rec.root && rec.root.parentNode) rec.root.parentNode.removeChild(rec.root);
  document.body.classList.remove('speak-rec-open');
}

/* ---- Telegram topshiriklari (ustoz uchun inbox) ---- */
function speakGroupNameFor(sub) {
  const st = getStudents().filter(function (x) { return x.id === sub.sid; })[0];
  const g = st ? groupById(st.groupId) : null;
  return g ? g.name : t('Guruh tayinlanmagan');
}
function speakWhenLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return fmtDMY(String(iso).slice(0, 10)) + ' · ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function groupSpeakingSubs(subs) {
  const buckets = [], byName = {};
  subs.forEach(function (sub) {
    const name = speakGroupNameFor(sub);
    if (!byName[name]) { byName[name] = { name: name, list: [] }; buckets.push(byName[name]); }
    byName[name].list.push(sub);
  });
  buckets.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return buckets;
}
/* Bitta sayt videosi kartasi: ism, sana/vaqt, holat/ball, ko'z kontakti va inline pleyer */
function webSpeakCard(sub, st, archived) {
  const done = archived === true;
  const rejected = sub.status === 'rad_etildi';
  const statusLabel = rejected ? t('Bekor qilindi') : done ? t('Baholandi') : t('Kutilmoqda');
  const vid = esc(String(sub.id));
  return `
  <div class="${done ? 'speak-archived' : 'audio-item'}" data-tgcard="${done ? '' : vid}">
    <div class="speak-card-head">
      <div class="speak-card-who">
        <strong class="speak-card-name">${st ? esc(st.fullName) : '—'}</strong>
        ${st && st.schoolClass ? `<span class="chip-class speak-card-grade">${esc(tClass(st.schoolClass))}</span>` : ''}
      </div>
      <div class="speak-card-meta">
        <span class="speak-meta-item">${ico('video', 13)} ${t('Video')}</span>
        ${sub.createdAt ? `<span class="speak-meta-item">${ico('calendar', 13)} ${esc(speakWhenLabel(sub.createdAt))}</span>` : ''}
        <span class="speak-status ${done ? 'is-done' : 'is-wait'}">${statusLabel}${done && sub.score != null ? ': ' + sub.score + '/10' : ''}</span>
      </div>
    </div>
    ${sub.mediaUrl ? `<div class="speak-video-wrap" data-vid="${vid}">
      <video class="speak-video" controls playsinline preload="metadata" src="${esc(sub.mediaUrl)}"></video>
    </div>
    <button type="button" class="btn btn-xs ghost speak-video-toggle" data-act="speak-video-toggle" data-vid="${vid}" aria-expanded="false">
      ${ico('video', 13)} <span>${t("Videoni ko'rish")}</span>
    </button>` : ''}
    ${sub.eyeContactPercent != null || sub.lookAwayCount != null ? `<div class="speak-metrics">
      ${sub.eyeContactPercent != null ? `<span class="speak-metric${sub.eyeContactPercent < 60 ? ' is-low' : ''}">${ico('eye', 13)} ${t('Kameraga qarash')}: ${sub.eyeContactPercent}%</span>` : ''}
      ${sub.lookAwayCount != null ? `<span class="speak-metric${sub.lookAwayCount >= 3 ? ' is-low' : ''}">${ico('alert', 13)} ${t('Chetga qarash')}: ${sub.lookAwayCount}</span>` : ''}
      ${sub.durationSec != null ? `<span class="speak-metric">${ico('clock', 13)} ${Math.floor(sub.durationSec / 60)}:${String(sub.durationSec % 60).padStart(2, '0')}</span>` : ''}
    </div>` : ''}
    ${done && sub.feedback ? `<div class="speak-feedback">${ico('message', 13)} ${esc(sub.feedback)}</div>` : ''}
    <div class="grade-row">
      ${done ? `<span class="muted small">${t('Video baholashdan keyin ham saqlanadi.')}</span>` : [1,2,3,4,5,6,7,8,9,10].map(n => `
        <button type="button" class="btn btn-xs ${sub.score === n ? 'btn-primary' : 'ghost'}" data-act="tg-grade" data-tid="${sub.id}" data-score="${n}">${n}</button>`).join('')}
      ${done ? '' : `<input class="input" style="flex:1;min-width:140px" placeholder="${t('Izoh (ixtiyoriy)')}" value="${esc(sub.feedback || '')}" data-act="tg-feedback" data-tid="${sub.id}" />`}
      ${done ? '' : `<button type="button" class="btn btn-xs danger" data-act="tg-reject" data-tid="${sub.id}">${t('Bekor qilish')}</button>`}
      <button type="button" class="btn btn-xs danger" data-act="speak-del" data-tid="${sub.id}">${ico('trash', 13)} ${t("O'chirish")}</button>
    </div>
  </div>`;
}
function renderTgInbox() {
  /* Faqat saytdan topshirilganlar. Botdan kelganlar ustozga botda keladi. */
  const scopeIds = {};
  scopedStudents().forEach(function (s) { scopeIds[s.id] = 1; });
  const all = getTgSubs().filter(function (x) { return isWebSubmission(x) && scopeIds[x.sid]; });
  const isDone = function (x) {
    return x.status === 'baholandi' || x.status === 'graded' || x.status === 'rad_etildi';
  };
  const pending = all.filter(function (x) { return !isDone(x); }).slice().reverse();
  const graded = all.filter(isDone).slice().reverse();
  if (!pending.length && !graded.length) return emptyState(t("Hozircha topshiriq yo'q"));
  const byId = {};
  getStudents().forEach(function (s) { byId[s.id] = s; });
  const groupBlock = function (g, archived) {
    return `<div class="speak-group">
      <div class="speak-group-head">${ico('groups', 15)} <b>${esc(g.name)}</b>
        <span class="pill">${g.list.length}</span></div>
      <div class="speak-group-list">
        ${g.list.map(function (sub) { return webSpeakCard(sub, byId[sub.sid], archived); }).join('')}
      </div>
    </div>`;
  };
  const pendingHTML = pending.length
    ? `<div class="speak-groups">${groupSpeakingSubs(pending).map(function (g) { return groupBlock(g, false); }).join('')}</div>`
    : '';
  const gradedHTML = graded.length
    ? `<div class="section-title speak-archived-title">${ico('checkCircle', 15)} ${t('Baholangan sayt videolari')}</div>
       <div class="speak-groups speak-groups-done">${groupSpeakingSubs(graded).map(function (g) { return groupBlock(g, true); }).join('')}</div>`
    : '';
  return pendingHTML + gradedHTML;
}

/* ---- Sayt videosini butunlay o'chirish (faqat ustoz tasdiqi bilan) ---- */
function openDeleteSpeaking(tid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const sub = getTgSubs().filter(function (x) { return String(x.id) === String(tid); })[0];
  if (!sub) { toast('Topshiriq topilmadi', 'error'); return; }
  const st = getStudents().filter(function (x) { return x.id === sub.sid; })[0];
  const g = st ? groupById(st.groupId) : null;
  openModal(`
    <div class="modal-head">
      <h3>Videoni o'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="confirm-body">
      <div class="confirm-emoji tint-rose">${ICON.trash}</div>
      <p class="confirm-text"><strong>${esc(st ? st.fullName : "O'quvchi")}</strong>${g ? ' — <strong>' + esc(g.name) + '</strong>' : ''} yuborgan speaking videosi Cloudflare R2'dan va bazadan butunlay o'chiriladi. Davom etasizmi?</p>
      ${sub.mediaUrl ? `<p class="muted small" style="margin-top:7px;word-break:break-all">${esc(sub.mediaUrl)}</p>` : ''}
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="do-speak-del" data-tid="${esc(sub.id)}">Ha, o'chirish</button>
    </div>
  `);
}
function doDeleteSpeaking(tid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const sub = getTgSubs().filter(function (x) { return String(x.id) === String(tid); })[0];
  if (!sub) { closeModal(); return; }
  closeModal();
  /* Lokal ro'yxatdan darhol olib tashlaymiz */
  store.set(K.tgsubs, getTgSubs().filter(function (x) { return String(x.id) !== String(tid); }));
  render();
  CloudSync.deleteSpeakingSubmission(sub.dbId, sub.mediaUrl).then(function (r) {
    if (!r || !r.rowDeleted) {
      toast("Video bazadan o'chmadi — qayta urinib ko'ring", 'error');
      return;
    }
    toast(r.fileDeleted || !sub.mediaUrl ? "Video o'chirildi" : "Baza yozuvi o'chirildi, R2 fayli o'chmadi");
    render();
  }).catch(function (e) {
    toast("O'chirishda xatolik: " + ((e && e.message) || 'xatolik'), 'error');
    render();
  });
}

/* ---- Slot yaratish / tayinlash ---- */
function openSlotModal(mode, id) {
  if (!canStaff('speaking')) { toast("Ruxsat yo'q", 'error'); return; }
  ensureSpeakState();
  state.slotMode = mode;
  state.slotId = id || '';
  const students = scopedStudents();
  const cur = id ? getSpeaking().filter(x => x.id === id)[0] : null;
  const assignOnly = mode === 'assign';

  openModal(`
    <div class="modal-head">
      <h3>${assignOnly ? 'O\'quvchi tayinlash' : 'Slot qo\'shish'}</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    ${cur ? `<div class="editor-info">
      <div class="slot-time">${esc(cur.start)} – ${esc(cur.end)}</div>
      <div class="muted small">${fmtDMY(cur.date)}</div>
    </div>` : `
    <label class="field-label" for="sp-modal-date">Sana</label>
    <input class="input" id="sp-modal-date" type="date" value="${esc(state.speakDate)}" />

    <div class="row g8">
      <div class="col">
        <label class="field-label" for="sp-start">Boshlanish</label>
        <input class="input" id="sp-start" type="time" value="14:00" />
      </div>
      <div class="col">
        <label class="field-label" for="sp-end">Tugash</label>
        <input class="input" id="sp-end" type="time" value="14:20" />
      </div>
    </div>`}

    <label class="field-label" for="sp-student">O'quvchi</label>
    <select class="input" id="sp-student">
      <option value="">— Tanlanmagan —</option>
      ${students.map(s => {
        const g = groupById(s.groupId);
        return `<option value="${s.id}" ${cur && cur.studentId === s.id ? 'selected' : ''}>${esc(s.fullName)}${g ? ' — ' + esc(g.name) : ''}</option>`;
      }).join('')}
    </select>

    <button type="button" class="btn btn-primary btn-block" data-act="save-slot">${assignOnly ? 'Tayinlash' : 'Saqlash'}</button>
  `);
}

function saveSlot() {
  const list = getSpeaking();
  const sid = $('#sp-student') ? $('#sp-student').value : '';

  if (state.slotMode === 'assign') {
    const cur = list.filter(x => x.id === state.slotId)[0];
    if (!cur) return;
    cur.studentId = sid || null;
    cur.score = null;
    store.set(K.speaking, list);
    CloudSync.pushSlot(cur);
    closeModal();
    render();
    toast(sid ? 'O\'quvchi tayinlandi ✓' : 'Tayinlov o\'chirildi');
    return;
  }

  const date = $('#sp-modal-date').value;
  const start = $('#sp-start').value;
  const end = $('#sp-end').value;
  if (!date) { toast("Sanani tanlang", 'error'); return; }
  if (!start || !end) { toast("Vaqt oralig'ini kiriting", 'error'); return; }
  if (end <= start) { toast("Tugash vaqti boshlanishdan keyin bo'lishi kerak", 'error'); return; }
  if (list.some(x => x.date === date && x.start === start)) { toast("Bu sanada shu vaqtda slot bor", 'error'); return; }

  const slot = { id: 'sp' + Date.now(), date: date, start: start, end: end, studentId: sid || null, score: null };
  list.push(slot);
  store.set(K.speaking, list);
  CloudSync.pushSlot(slot);
  state.speakDate = date;
  closeModal();
  render();
  toast("Slot qo'shildi ✓");
}

/* ---- Slotni baholash → jurnalga sync ---- */
function openScoreSlot(id) {
  if (!canStaff('speaking')) { toast("Ruxsat yo'q", 'error'); return; }
  const x = getSpeaking().filter(s => s.id === id)[0];
  if (!x || !x.studentId) { toast("Avval o'quvchi tayinlang", 'error'); return; }
  const st = studentById(x.studentId);
  if (!st) return;

  openModal(`
    <div class="modal-head">
      <h3>Speaking bahosi</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${esc(st.schoolClass)} • ${fmtDMY(x.date)} • ${esc(x.start)} – ${esc(x.end)}</div>
      </div>
    </div>

    <div class="field-label">Speaking baho (1–10)</div>
    <div class="score-grid">
      ${[1,2,3,4,5,6,7,8,9,10].map(n => `
        <button type="button" class="score-btn ${x.score === n ? 'sel ' + gradeClassOf(n) : ''}" data-act="save-score" data-id="${esc(x.id)}" data-score="${n}">${n}</button>`).join('')}
    </div>
    <p class="muted small" style="margin-top:12px">Ball tanlansa, o'quvchining baholar jurnaliga darhol yoziladi.</p>
  `);
}

function saveSlotScore(id, score) {
  const list = getSpeaking();
  const x = list.filter(s => s.id === id)[0];
  if (!x || !x.studentId) return;

  x.score = score;
  store.set(K.speaking, list);
  CloudSync.pushSlot(x);

  /* Jurnalga sync */
  const all = getGrades();
  all[x.studentId] = all[x.studentId] || {};
  all[x.studentId][x.date] = {
    score: score,
    category: APP_DATA.speakingCategory,
    note: 'Speaking 1-on-1'
  };
  store.set(K.grades, all);
  CloudSync.pushGrade(x.studentId, x.date);

  closeModal();
  render();
  toast("Speaking bahosi saqlandi ✓ (jurnalga yozildi)");
}

/* ==================== KIRISH MANTIQI ==================== */
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000; /* 10 daqiqa qulf */

function loginLockRec() {
  const r = store.get(K.loginFails, null);
  if (!r) return null;
  if (r.until && Date.now() >= r.until) { store.del(K.loginFails); return null; }
  return r;
}
function loginLockText(r) {
  const left = Math.max(0, (r && r.until ? r.until : 0) - Date.now());
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return "Xavfsizlik: 5 marta xato kiritildi. Iltimos, " + mm + ':' + ss + " daqiqa kuting.";
}
function registerLoginFail() {
  const r = store.get(K.loginFails, null) || { count: 0, until: 0 };
  r.count = (r.count || 0) + 1;
  if (r.count >= LOGIN_MAX_FAILS) r.until = Date.now() + LOGIN_LOCK_MS;
  store.set(K.loginFails, r);
  return r;
}
/* Login ekranidagi jonli hisoblagich: qulf tugunicha 'Kirish' o'chiriladi */
function syncLoginLock() {
  if (state.loginTimer) { clearInterval(state.loginTimer); state.loginTimer = null; }
  if (state.screen !== 'login') return;
  const tick = () => {
    const r = loginLockRec();
    const btnEl = $('[data-act="do-login"]');
    const errEl = $('#login-error');
    if (!r || !r.until) {
      if (btnEl) btnEl.disabled = false;
      if (errEl && String(errEl.textContent).indexOf('Xavfsizlik:') === 0) {
        errEl.textContent = '';
        errEl.classList.remove('show');
        if (String(state.loginError || '').indexOf('Xavfsizlik:') === 0) state.loginError = '';
      }
      if (state.loginTimer) { clearInterval(state.loginTimer); state.loginTimer = null; }
      return;
    }
    if (btnEl) btnEl.disabled = true;
    if (errEl) { errEl.textContent = loginLockText(r); errEl.classList.add('show'); }
    state.loginError = loginLockText(r);
  };
  tick();
  if (loginLockRec() && loginLockRec().until) state.loginTimer = setInterval(tick, 1000);
}

/* Telegram WebApp initData tekshiruvi (identity spoofing ga qarshi).
   To'liq HMAC tekshiruvi bot tokeni (faqat serverda) talab qiladi — brauzerda
   token saqlab bo'lmaydi. Shu yerda xavfsiz cross-reference qilinadi:
   initData 'user' id → initDataUnsafe.user.id mosligi, 'hash' mavjudligi va
   auth_date yangiligi (24 soat) tekshiriladi; nomuvofiqlik → kirish rad etiladi. */
function telegramInitDataOK() {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg || !tg.initData) return true; /* Telegram'siz (brauzerda) kirish */
    const params = new URLSearchParams(tg.initData);
    if (!params.get('hash')) return false;
    const userStr = params.get('user');
    if (!userStr) return true;
    const user = JSON.parse(userStr);
    const du = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (!du || String(du.id) !== String(user.id)) return false; /* soxtalanish belgisi */
    const authDate = Number(params.get('auth_date') || 0);
    if (authDate && (Date.now() / 1000 - authDate) > 86400) return false; /* 24+ soat eskirgan */
    return true;
  } catch (e) { return false; }
}

async function doLogin() {
  /* Bot honeypot: bu maydon to'ldirilgan bo'lsa — jimjimrad rad etiladi */
  const hp = $('#login-bot-hp');
  if (hp && hp.value) return;

  const loginEl = $('#login-input');
  const passEl = $('#password-input');
  const err = $('#login-error');
  const loginBtn = $('[data-act="do-login"]');
  const login = (loginEl && loginEl.value || '').trim().toLowerCase();
  const pass = (passEl && passEl.value) || '';

  const fail = msg => {
    state.loginError = msg;
    if (err) { err.textContent = msg; err.classList.add('show'); }
  };

  /* Qayta bosishni bloklash (allaqachon tekshiruv ketayotgan bo'lsa) */
  if (loginBtn && loginBtn.disabled) return;

  /* Anti-brute-force: 5 ta ketma-ket xato → 10 daqiqa qulf */
  const locked = loginLockRec();
  if (locked && locked.until) { fail(loginLockText(locked)); syncLoginLock(); return; }

  /* Telegram kimlik soxtalanishini keskin rad etish */
  if (!telegramInitDataOK()) { fail("Telegram kirishi tekshiruvi majburiy — kirish rad etildi"); return; }

  if (!login || !pass) { fail("Login va parolni kiriting"); return; }

  /* CAPTCHA tekshiruvi: Turnstile bo'lsa token borligini darhol tekshiramiz,
     fallback bo'lsa matematik javobni sinxron tekshiramiz. Turnstile server
     tekshiruvi esa Supabase foydalanuvchi tekshiruvi bilan parallel yuboriladi. */
  let tsPromise = null;
  if (turnstileInUse('login')) {
    if (!state.turnstileToken) { fail('Tekshiruvni yakunlang'); return; }
    tsPromise = verifyTurnstileToken(state.turnstileToken);
  } else {
    const capEl = $('#login-captcha');
    const capExpected = String((state.captcha && state.captcha.answer) || '');
    const capGiven = String((capEl && capEl.value) || '').trim();
    if (!capExpected || capGiven !== capExpected) {
      refreshCaptcha(true);
      fail("Tekshiruv javobi noto'g'ri — yangi misolni yeching");
      if (capEl) capEl.focus();
      return;
    }
  }
  if (err) { err.textContent = ''; err.classList.remove('show'); }

  const btnText = loginBtn ? loginBtn.textContent : '';
  const setBusy = (busy) => {
    if (!loginBtn) return;
    loginBtn.disabled = !!busy;
    loginBtn.textContent = busy ? 'Tekshirilmoqda...' : btnText;
  };
  const restoreBtn = () => { if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = btnText; } };

  const onFail = () => {
    const r = registerLoginFail();
    if (r && r.until) {
      fail(loginLockText(r));
      syncLoginLock();
    } else {
      fail("Login yoki parol noto'g'ri");
    }
    if (passEl) { passEl.value = ''; passEl.focus(); }
  };

  const onSuccess = (userObj) => {
    state.loginError = '';
    store.del(K.loginFails);
    startSession(userObj);
    toast('Xush kelibsiz!');
  };

  /* 1. Ustoz kirishi (m_amirov) */
  if (login === TEACHER_LOGIN) {
    setBusy(true);
    try {
      /* Turnstile tekshiruvi va ustoz ma'lumotlarini yuklashni parallel bajarish */
      const teacherPrep = (async () => {
        if (CloudSync.ready()) {
          await CloudSync.pullAll(login);
          let teachPw = null;
          try {
            if (typeof CloudSync.pullTeacherPassword === 'function') {
              teachPw = await CloudSync.pullTeacherPassword();
            }
          } catch (e) { teachPw = null; }
          return { ready: true, teachPw: teachPw || TEACHER_PASSWORD };
        }
        return { ready: false, teachPw: TEACHER_PASSWORD };
      })();
      const [tsVerify, prep] = await Promise.all([
        tsPromise || Promise.resolve({ ok: true, skip: true }),
        teacherPrep
      ]);
      if (tsPromise && (!tsVerify || !tsVerify.ok)) {
        resetTurnstile('login');
        const detail = tsVerify && tsVerify.detail ? ' (' + tsVerify.detail + ')' : '';
        restoreBtn();
        fail("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring" + detail);
        return;
      }
      if (!passwordMatches(pass, (prep && prep.teachPw) || TEACHER_PASSWORD)) { restoreBtn(); onFail(); return; }
      await beginTeacherLogin({ login: TEACHER_LOGIN, role: 'teacher', name: TEACHER_NAME, studentId: null });
      /* Muvaffaqiyatda sahifa almashadi; xatolik/2FA holatida tugmani tiklash */
      restoreBtn();
    } catch (e) {
      restoreBtn();
      if (tsPromise) { try { resetTurnstile('login'); } catch (ex) {} }
      onFail();
    }
    return;
  }

  /* 1b. Support teacher (yordamchi o'qituvchi) kirishi */
  let supRec = supportTeacherByLogin(login);
  if (!supRec && CloudSync.ready()) {
    try { await CloudSync.pullSupportTeachers(); } catch (e) {}
    supRec = supportTeacherByLogin(login);
  }
  if (supRec) {
    setBusy(true);
    try {
      const tsVerify = tsPromise ? await tsPromise : { ok: true, skip: true };
      if (tsPromise && (!tsVerify || !tsVerify.ok)) {
        resetTurnstile('login');
        const detail = tsVerify && tsVerify.detail ? ' (' + tsVerify.detail + ')' : '';
        restoreBtn();
        fail("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring" + detail);
        return;
      }
      const stored = supRec.passwordHash || supRec.password || '';
      if (!passwordMatches(pass, stored)) { restoreBtn(); onFail(); return; }
      if (CloudSync.ready()) {
        try { await CloudSync.pullAll(TEACHER_LOGIN); } catch (e) { /* lokal ma'lumot bilan davom */ }
      }
      accounts[login] = { login: login, role: 'support', name: supRec.name, studentId: null };
      store.del(K.loginFails);
      state.loginError = '';
      startSession({ login: login, role: 'support', name: supRec.name, studentId: null });
      toast('Xush kelibsiz!');
      restoreBtn();
    } catch (e) {
      restoreBtn();
      onFail();
    }
    return;
  }

  /* 2. O'quvchi kirishi */
  if (CloudSync.ready()) {
    setBusy(true);
    try {
      /* Turnstile tekshiruvi va o'quvchi qatorini olishni parallel bajarish */
      const studentPrep = (async () => {
        const client = window.__cloudClient || (window.supabase && window.supabase.createClient && window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY));
        let studentRow = null;
        if (client) {
          const res = await CloudSync.selectStudentRows(
            'id, name, login, password, password_hash, web_speaking_allowed',
            function (q) { return q.ilike('login', login).limit(1); }
          );
          if (res && res.data && res.data.length) studentRow = res.data[0];
        }
        return { client, studentRow };
      })();
      const [tsVerify, prep] = await Promise.all([
        tsPromise || Promise.resolve({ ok: true, skip: true }),
        studentPrep
      ]);
      if (tsPromise && (!tsVerify || !tsVerify.ok)) {
        resetTurnstile('login');
        const detail = tsVerify && tsVerify.detail ? ' (' + tsVerify.detail + ')' : '';
        restoreBtn();
        fail("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring" + detail);
        return;
      }
      const client = prep && prep.client;
      const studentRow = prep && prep.studentRow;
      if (!studentRow) { restoreBtn(); onFail(); return; }

      const storedHash = studentRow.password_hash || studentRow.password || '';
      if (!passwordMatches(pass, storedHash)) { restoreBtn(); onFail(); return; }

      /* Avtomatik migratsiya: agar parol hali ochiq matn bo'lsa xeshga o'tkazish */
      if (!isSha256Hex(storedHash) && client) {
        const hashed = hashPasswordSync(pass);
        await client.from('students').update({ password_hash: hashed, password: hashed }).eq('id', studentRow.id);
      }

      /* O'quvchi ma'lumotlarini yuklash */
      await CloudSync.pullAll(login);
      /* Tekshirilgan xesh faqat xotirada saqlanadi (localStorage'ga yozilmaydi):
         parolni o'zgartirishda "joriy parol" shu bilan solishtiriladi. */
      const accKey = String(studentRow.login || login).trim().toLowerCase();
      if (accounts[accKey]) accounts[accKey].password = storedHash;
      onSuccess({
        login: studentRow.login,
        role: 'student',
        name: studentRow.name,
        studentId: 's' + studentRow.id
      });
    } catch (e) {
      restoreBtn();
      onFail();
    }
  } else {
    /* Bulut tayyor bo'lmasa o'quvchi kirishi imkonsiz */
    if (tsPromise) {
      setBusy(true);
      try {
        const tsVerify = await tsPromise;
        if (!tsVerify || !tsVerify.ok) {
          resetTurnstile('login');
          const detail = tsVerify && tsVerify.detail ? ' (' + tsVerify.detail + ')' : '';
          restoreBtn();
          fail("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring" + detail);
          return;
        }
      } catch (e) { restoreBtn(); fail("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring"); return; }
      restoreBtn();
    }
    onFail();
  }
}

function logout() {
  /* Faol qurilmalar: o'z seansimiz user_sessions dan o'chiriladi */
  Sessions.onLogout();
  analyticsCall('reset');
  store.del(K.session);
  state.attDraft = null;
  state.attDraftFor = '';
  state.editor = null;
  state.filterGroup = null;
  state.filterClass = 'Barchasi';
  state.search = '';
  state.pending2fa = null;
  state.studentView = '';
  state.attOpen = false;
  state.supervise = false;
  state.groupDetail = '';
  state.supportEditId = '';
  state.supportDelId = '';
  state.resetCtx = null;
  state.resetMode = 'password';
  state.resetContact = '';
  state.resetDone = '';
  state.authStep = 'landing';
  closeModal();
  state.screen = 'login';
  render();
  scrollAuthTop();
  toast('Hisobdan chiqdingiz');
}

/* ==================== ISHONCHLI QURILMA (tanilgan qurilmada 2FA'siz) ==================== */
const TRUSTED_KEY = 'et_teacher_trusted_device';
const TRUSTED_DAYS = 30;

function randToken() {
  const arr = new Uint32Array(4);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
  else for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 4294967296);
  return Array.prototype.map.call(arr, function (n) { return n.toString(16); }).join('');
}

/* Serverdagi ro'yxat: faqat muddati o'tmagan tokenlar */
function parseTrustedList(raw) {
  try {
    const arr = JSON.parse(String(raw || '[]'));
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (d) { return d && d.token && Number(d.until) > Date.now(); });
  } catch (e) { return []; }
}

/* Bu qurilmada saqlangan token (30 kun) */
function trustedToken() {
  let meta = null;
  try { meta = JSON.parse(localStorage.getItem(TRUSTED_KEY) || 'null'); } catch (e) { meta = null; }
  if (!meta || !meta.token || !meta.until) return null;
  if (Date.now() > Number(meta.until)) return null;
  return meta;
}

/* Token server ro'yxatida ham bo'lishi shart */
async function isTrustedTeacherDevice() {
  const t = trustedToken();
  if (!t) return false;
  const raw = await CloudSync.getSetting('trusted_devices');
  return parseTrustedList(raw).some(function (d) { return d.token === t.token; });
}

/* Ishonchli qurilmalar ro'yxati serverga ketma-ket yoziladi: yozish va tozalash
   bir-birini bosib ketmasin (parallel setSetting poyga holati). */
let trustedQueue = Promise.resolve();

/* 2FA muvaffaqiyatli o'tgach qurilmani eslab qolamiz */
async function rememberTrustedDevice() {
  await resolveDeviceModel();
  const token = randToken();
  const until = Date.now() + TRUSTED_DAYS * 24 * 3600 * 1000;
  const name = (detectDevice() || {}).name || "Noma'lum qurilma";
  try { localStorage.setItem(TRUSTED_KEY, JSON.stringify({ token: token, until: until, name: name })); } catch (e) {}
  trustedQueue = trustedQueue.then(async function () {
    const raw = await CloudSync.getSetting('trusted_devices');
    const list = parseTrustedList(raw).slice(-9);
    list.push({ token: token, until: until, name: name });
    await CloudSync.setSetting('trusted_devices', JSON.stringify(list));
    if (typeof adminTrusted !== 'undefined') adminTrusted.list = list;
  }).catch(function () {});
  await trustedQueue;
}

/* Ustoz paroli o'zgarsa — barcha ishonchli qurilmalar bekor qilinadi */
async function resetTrustedSilently() {
  try { localStorage.removeItem(TRUSTED_KEY); } catch (e) {}
  trustedQueue = trustedQueue.then(function () {
    return CloudSync.setSetting('trusted_devices', '[]');
  }).catch(function () {});
  if (typeof adminTrusted !== 'undefined') adminTrusted.list = [];
  await trustedQueue;
}

async function forgetTrustedDevices() {
  await resetTrustedSilently();
  render();
  toast('Ishonchli qurilmalar tozalandi ✓');
}

/* Ustoz kirishi: tanilgan qurilmada 2FA o'tkazib yuboriladi */
async function beginTeacherLogin(userObj) {
  let trusted = false;
  try { trusted = await isTrustedTeacherDevice(); } catch (e) { trusted = false; }
  if (trusted) {
    store.del(K.loginFails);
    startSession(userObj);
    toast('Xush kelibsiz!');
    return;
  }
  await startTeacher2FA(userObj);
}

/* ==================== "KODNI QAYTA YUBORISH" — 60 SONIYALIK COOLDOWN ==================== */
/* state.resendUntil — kod yuborilgan paytdan boshlab 60 soniya.
   Tugma shu vaqt ichida nofaol bo'lib, har soniyada (mm:ss) sanaydi. */
const RESEND_TEXT = 'Kodni qayta yuborish';
let resendTimer = null;

function resendLeftMs() {
  const left = Number(state.resendUntil || 0) - Date.now();
  return left > 0 ? left : 0;
}
function resendClock(ms) {
  /* 60 s dan boshlanadi, lekin ekranda darhol 00:59 ko'rinadi (mm:ss) */
  let total = Math.floor(ms / 1000);
  if (total > 59) total = 59;
  if (total < 0) total = 0;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}
function resendButtons() {
  return document.querySelectorAll(
    '[data-act="resend-2fa"],[data-act="resend-verify-email"],[data-act="resend-reset"]');
}
/* Taymerni to'xtatadi (modal yopilganda / vaqt tugaganda) */
function stopResendTimer() {
  if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
}
/* Tugmalar matni va holatini joriy vaqtga moslaydi */
function paintResendButtons() {
  const left = resendLeftMs();
  const label = left > 0 ? (t(RESEND_TEXT) + ' (' + resendClock(left) + ')') : t(RESEND_TEXT);
  const list = resendButtons();
  for (let i = 0; i < list.length; i++) {
    list[i].textContent = label;
    list[i].disabled = left > 0;
    list[i].setAttribute('aria-disabled', left > 0 ? 'true' : 'false');
  }
  if (left <= 0) stopResendTimer();
  return left;
}
function startResendTimer() {
  paintResendButtons();
  if (resendLeftMs() <= 0) { stopResendTimer(); return; }
  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(paintResendButtons, 1000);
}
/* Kod yuborilishi bilanoq 60 soniya qulf yoqiladi (qayta yuborishda yangilanadi) */
function armResendCooldown() {
  state.resendUntil = Date.now() + 60000;
  startResendTimer();
}
/* Test/diagnostika uchun (smoke testlar vaqtni tezlashtiradi) */
window.__resend = {
  left: resendLeftMs,
  arm: armResendCooldown,
  start: startResendTimer,
  expire: function () { state.resendUntil = Date.now() - 1; paintResendButtons(); },
  stop: stopResendTimer
};

/* ==================== USTOZ 2-BOSQICHLI HIMOYA (2FA) ==================== */
async function startTeacher2FA(userObj) {
  await resolveDeviceModel();
  const code = sixDigitCode();
  const dev = (detectDevice() || {}).name || "Noma'lum qurilma";
  const until = Date.now() + 3 * 60 * 1000;   /* 3 daqiqa */
  state.pending2fa = { user: userObj, code: code, until: until };

  /* Kod bazaga (3 daqiqa) va bir vaqtda Telegram + Gmail outbox'ga yoziladi */
  CloudSync.saveAuthCode({
    purpose: 'teacher_2fa',
    code: code,
    contact: 'ADMIN',
    expiresAt: new Date(until).toISOString()
  });
  CloudSync.queueMessages([{
    chat_id: 'ADMIN',
    text: '<b>2-bosqichli tasdiqlash</b>\nQurilma: ' + esc(dev) +
          '\nKod: <b>' + code + '</b>\nKod 3 daqiqa amal qiladi.'
  }]);
  /* Xat faqat TASDIQLANGAN ustoz Gmailiga yuboriladi */
  (async function () {
    const addr = await teacherVerifiedEmail();
    if (!addr) return;
    CloudSync.queueEmail([{
      to_email: addr,
      subject: 'English Teacher — Admin panelga kirish kodi: ' + code,
      body_html: buildEmailHtml(
        'Admin panelga kirish',
        'Admin panelga yangi qurilmadan kirish so\'rovi keldi. Tasdiqlash uchun bir martalik kodingiz:',
        code, 'Qurilma: ' + dev, 3)
    }]);
  })();

  armResendCooldown();   /* kod yuborildi — 60 soniya qulf */
  openTwoFA();
}

async function openTwoFA() {
  const p = state.pending2fa;
  if (!p) return;
  await resolveDeviceModel();
  const dev = (detectDevice() || {}).name || '';
  openModal(`
    <div class="modal-head">
      <h3>${ico('lock', 18)} 2-bosqichli tasdiqlash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="muted small">Yangi qurilma aniqlandi — 6 xonali kod Telegram (ustoz) va Gmail orqali yuborildi.
      Qurilma: <b>${esc(dev)}</b>. Tasdiqlangach bu qurilma 30 kun eslab qolinadi.</div>
    <label class="field-label" for="twofa-code" style="margin-top:10px">Tasdiqlash kodi</label>
    <input class="input" id="twofa-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" />
    <div class="field-error" id="twofa-error"></div>
    <button type="button" class="btn btn-primary btn-block" data-act="do-2fa">Tasdiqlash</button>
    <button type="button" class="btn btn-ghost btn-block" data-act="resend-2fa">${t(RESEND_TEXT)}</button>
  `);
  /* Modal qayta ochilganda qolgan vaqt saqlanadi */
  startResendTimer();
  setTimeout(function () { const el = $('#twofa-code'); if (el) el.focus(); }, 30);
}

function submitTwoFA() {
  const p = state.pending2fa;
  const err = $('#twofa-error');
  const showErr = function (m) { if (err) { err.textContent = m; err.classList.add('show'); } };
  const val = String(($('#twofa-code') || {}).value || '').trim();
  if (!p) { showErr("So'rov eskirgan — qaytadan kiring"); return; }
  if (Date.now() > p.until) { showErr('Kod muddati tugadi — qayta yuboring'); return; }
  if (val !== p.code) {
    showErr("Kod noto'g'ri");
    const el = $('#twofa-code');
    if (el) { el.value = ''; el.focus(); }
    return;
  }
  CloudSync.consumeAuthCode('teacher_2fa', val);
  state.pending2fa = null;
  closeModal();
  store.del(K.loginFails);
  startSession(p.user);
  /* Bu qurilma 30 kun tanilgan hisoblanadi — keyingi kirishda kod so'ralmaydi */
  rememberTrustedDevice();
  toast('Qurilma eslab qolindi ✓');
}

/* ==================== PAROLNI TIKLASH (telefon / Gmail / login) ==================== */
function openForgotPwd() {
  state.resetCtx = null;
  state.resetDone = '';
  state.resetContact = '';
  state.resetMode = 'password';
  state.recoverCaptcha = makeRecoverCaptcha();
  state.authStep = 'recover';
  render();
  scrollAuthTop();
}

/* Tiklash ekranidagi xato matni */
function resetError(m) {
  const err = $('#fp-error');
  if (!err) return;
  err.textContent = m || '';
  err.classList.toggle('show', !!m);
}

/* bot_settings.admin_phone oxirgi 9 raqami (ustoz raqami) */
async function adminPhoneLast9() {
  if (!CloudSync.ready()) return '';
  let stored = '';
  try { stored = String((await CloudSync.getSetting('admin_phone')) || ''); } catch (e) { stored = ''; }
  const d = stored.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
}

/* Login esda yo'q: tasdiqlangan Telegram/Gmailga login yuboriladi */
async function sendLoginReminder(raw) {
  const mode = state.resetMode === 'both' ? 'both' : 'login';
  const clean = String(raw || '').trim();
  let chat = null;
  let mail = '';
  let login = '';
  let name = '';

  if (clean.toLowerCase() === TEACHER_LOGIN) {
    login = TEACHER_LOGIN;
    name = TEACHER_NAME;
    chat = 'ADMIN';
    mail = await teacherVerifiedEmail();
  } else {
    let row = null;
    try { row = await CloudSync.lookupStudentByContact(raw); } catch (e) { row = null; }
    if (!row) { resetError("Bunday telefon, Gmail yoki login topilmadi — qayta tekshirib ko'ring"); return; }
    login = String(row.login || '');
    name = String(row.name || '');
    if (row.telegram_chat_id) chat = String(row.telegram_chat_id);
    if (row.email && row.email_verified) mail = String(row.email).trim();
    if (!chat && !mail) {
      resetError('Bu raqamga Telegram bot ulanmagan va Gmail ham tasdiqlanmagan. Avval @uzbekspeakingcheckbot da /login qiling yoki ustozga murojaat qiling.');
      toast('Bu raqamga Telegram bot ulanmagan. Avval @uzbekspeakingcheckbot da /login qiling', 'error');
      return;
    }
  }
  if (!login) { resetError("Login topilmadi — ustozga murojaat qiling"); return; }

  const extra = mode === 'both'
    ? "\n\nParolni ham eslay olmasangiz, «Parol yodimda yo'q» bo'limidan yangi parol oling yoki ustozga murojaat qiling: @uzbekspeakingcheckbot."
    : '';
  const tgText = '<b>Login ma’lumoti</b>\nAssalomu alaykum, ' + esc(name) + '!\nSizning loginingiz: <b>' + esc(login) + '</b>' + extra;
  let sent = false;

  if (chat) {
    try {
      const ids = await CloudSync.queueMessages([{ chat_id: chat, text: tgText }]);
      if (ids && ids.length) sent = true;
    } catch (e) {
      resetError('Xatolik: ' + ((e && e.message) || e));
      return;
    }
  }
  if (mail) {
    try {
      await CloudSync.queueEmail([{
        to_email: mail,
        subject: 'English Teacher — login ma’lumoti',
        body_html: buildEmailHtml('Login ma’lumoti', 'Hisobingizga kirish uchun login:', login, extra, 10)
      }]);
      sent = true;
    } catch (e) {
      console.warn('[mail] login reminder:', (e && e.message) || e);
    }
  }
  if (!sent) { resetError("Yuborishda xatolik — keyinroq urinib ko'ring"); return; }
  state.resetDone = "Login ma'lumoti yuborildi — tasdiqlangan Telegram/Gmailni tekshiring.";
  resetError('');
  render();
  toast('Login yuborildi');
}

let resetSendBusy = false;
/* Tiklash tugmasi: tekshiruv paytida "Tekshirilmoqda..." + qayta bosishni bloklash */
function setResetSendBusy(busy, label) {
  const b = $('[data-act="forgot-send"]');
  if (!b) return;
  b.disabled = !!busy;
  b.textContent = busy ? 'Tekshirilmoqda...' : label;
}

async function sendResetCode() {
  const raw = String(($('#fp-contact') || {}).value || '').trim();
  if (!raw) { resetError('Telefon, Gmail yoki loginni kiriting'); return; }

  /* Bir vaqtda faqat bitta so'rov yuboriladi (tugma ikki marta bosilmasin) */
  if (resetSendBusy) return;
  const submitBtn = $('[data-act="forgot-send"]');
  const btnText = submitBtn ? submitBtn.textContent : '';
  resetSendBusy = true;
  setResetSendBusy(true, btnText);
  try {
    await sendResetCodeWork(raw);
  } catch (e) {
    console.warn('[reset] send:', (e && e.message) || e);
    resetError('Xatolik: ' + ((e && e.message) || e));
  } finally {
    resetSendBusy = false;
    setResetSendBusy(false, btnText);
  }
}

async function sendResetCodeWork(raw) {
  /* 1 va 3-tanlov: login eslatmasi (kod kerak emas) */
  if (state.resetMode === 'login' || state.resetMode === 'both') {
    await sendLoginReminder(raw);
    return;
  }

  /* 2-tanlov: Turnstile (bo'lsa) yoki 5 xonali CAPTCHA majburiy.
     Turnstile server tekshiruvi kontakt izlash bilan parallel yuboriladi. */
  let tsPromise = null;
  if (turnstileInUse('recover')) {
    if (!state.turnstileToken) { resetError('Tekshiruvni yakunlang'); return; }
    tsPromise = verifyTurnstileToken(state.turnstileToken);
  } else {
    const capExpected = String((state.recoverCaptcha && state.recoverCaptcha.answer) || '');
    const capGiven = String((($('#fr-captcha-input') || {}).value || '')).trim();
    if (!capExpected || capGiven !== capExpected) {
      refreshRecoverCaptcha();
      resetError("Tekshiruv kodi noto'g'ri — yangi kodni yeching");
      return;
    }
  }

  const digits = raw.replace(/\D/g, '');
  const last9 = digits.length >= 9 ? digits.slice(-9) : '';
  const isTeacherLogin = raw.toLowerCase() === TEACHER_LOGIN;

  /* Turnstile bilan bir vaqtda (Promise.all): ustoz telefonini aniqlash va
     o'quvchi kontaktini izlash — ikkalasi ham faqat o'qish so'rovlari. */
  const admin9Promise = (!isTeacherLogin && last9)
    ? adminPhoneLast9().catch(function () { return ''; })
    : Promise.resolve('');
  const rowPromise = isTeacherLogin
    ? Promise.resolve(null)
    : Promise.resolve().then(function () {
        return CloudSync.lookupStudentByContact(raw);
      }).catch(function () { return null; });

  const tsResults = await Promise.all([
    tsPromise || Promise.resolve({ ok: true, skip: true }),
    admin9Promise,
    rowPromise
  ]);
  const tsVerify = tsResults[0];
  const admin9 = tsResults[1];
  const lookedUpRow = tsResults[2];

  if (tsPromise && (!tsVerify || !tsVerify.ok)) {
    resetTurnstile('recover');
    const detail = tsVerify && tsVerify.detail ? ' (' + tsVerify.detail + ')' : '';
    resetError("Tekshiruv tasdiqlanmadi — qayta urinib ko'ring" + detail);
    return;
  }

  /* Ustoz telefoni kiritilgan bo'lsa ham kod ADMIN kanaliga ketadi */
  let isTeacher = isTeacherLogin;
  if (!isTeacher && last9 && admin9 && admin9 === last9) isTeacher = true;

  let row = null;
  let telegramChat = null;
  let emailTo = '';

  if (isTeacher) {
    /* Ustoz: kod ADMIN kanallariga (bot_settings.admin_email yoki config.ADMIN_EMAIL) */
    telegramChat = 'ADMIN';
    emailTo = await teacherVerifiedEmail();   /* faqat tasdiqlangan Gmail */
  } else {
    row = lookedUpRow;
    if (!row) { resetError("Bunday telefon, Gmail yoki login topilmadi — qayta tekshirib ko'ring"); return; }
    if (row.telegram_chat_id) telegramChat = String(row.telegram_chat_id);
    if (row.email && row.email_verified) emailTo = String(row.email).trim();   /* faqat tasdiqlangan */

    /* Raqam kiritilgan, lekin bot ulanmagan — aniq sabab aytiladi */
    if (!telegramChat && last9) {
      toast('Bu raqamga Telegram bot ulanmagan. Avval @uzbekspeakingcheckbot da /login qiling', 'error');
    }
    if (!telegramChat && !emailTo) {
      resetError(last9
        ? 'Bu raqamga Telegram bot ulanmagan. Avval @uzbekspeakingcheckbot da /login qiling. Gmail ham tasdiqlanmagan.'
        : 'Telegram ulanmagan va Gmail tasdiqlanmagan — parolni tiklash uchun ustozga murojaat qiling');
      return;
    }
  }

  const code = sixDigitCode();
  const until = Date.now() + 10 * 60 * 1000;   /* 10 daqiqa */
  const saved = await CloudSync.saveAuthCode({
    purpose: 'reset',
    studentId: row ? row.id : null,
    contact: raw,
    code: code,
    expiresAt: new Date(until).toISOString()
  });
  if (!saved) { resetError("Kodni yozishda xatolik — keyinroq urinib ko'ring"); return; }

  /* Ulangan kanallarga yuboramiz */
  if (telegramChat) {
    try {
      const ids = await CloudSync.queueMessages([{
        chat_id: telegramChat,
        student_id: row ? row.id : null,
        text: '<b>Parolni tiklash kodi</b>\nKod: <b>' + code + '</b>\n10 daqiqa amal qiladi.' +
              "\n\nAgar bu so'rovni siz yubormagan bo'lsangiz, kodni hech kimga bermang."
      }]);
      if (!ids || !ids.length) toast("Telegram navbati yozilmadi — bot sozlanmagan bo'lishi mumkin", 'error');
    } catch (e) {
      resetError('Xatolik: ' + ((e && e.message) || e));
      return;
    }
  }
  if (emailTo) {
    try {
      await CloudSync.queueEmail([{
        to_email: emailTo,
        subject: 'English Teacher — Parolni tiklash kodi: ' + code,
        body_html: buildEmailHtml(
          'Parolni tiklash',
          'Hisobingiz parolini tiklash uchun bir martalik kodingiz:',
          code, '', 10)
      }]);
    } catch (e) {
      console.warn('[mail] reset code:', (e && e.message) || e);
    }
  }

  state.resetCtx = {
    code: code,
    until: until,
    isTeacher: isTeacher,
    studentId: row ? row.id : null,
    contact: raw
  };
  const step2 = $('#fp-step2');
  if (step2) step2.hidden = false;
  armResendCooldown();   /* kod yuborildi — 60 soniya qulf */
  resetError('');
  const codeEl = $('#fp-code');
  if (codeEl) codeEl.focus();
  toast(isTeacher ? 'Kod ustoz kanallariga yuborildi' : 'Kod yuborildi — Telegram/Gmailni tekshiring');
}

let resetPwBusy = false;
/* "Parolni yangilash" tugmasi: "Tekshirilmoqda..." + qayta bosishni bloklash */
function setResetPwBusy(busy, label) {
  const b = $('[data-act="forgot-reset"]');
  if (!b) return;
  b.disabled = !!busy;
  b.textContent = busy ? 'Tekshirilmoqda...' : label;
}

async function resetPassword() {
  if (resetPwBusy) return;
  const submitBtn = $('[data-act="forgot-reset"]');
  const btnText = submitBtn ? submitBtn.textContent : '';
  resetPwBusy = true;
  setResetPwBusy(true, btnText);
  try {
    await resetPasswordWork();
  } catch (e) {
    console.warn('[reset] password:', (e && e.message) || e);
    resetError('Xatolik: ' + ((e && e.message) || e));
  } finally {
    resetPwBusy = false;
    setResetPwBusy(false, btnText);
  }
}

async function resetPasswordWork() {
  const ctx = state.resetCtx;
  const code = String(($('#fp-code') || {}).value || '').trim();
  const n1 = String(($('#fp-new') || {}).value || '');

  if (!ctx) { resetError("Avval kod so'rang"); return; }
  if (Date.now() > ctx.until) { resetError("Kod muddati tugadi — qaytadan so'rang"); return; }
  if (!/^\d{6}$/.test(code)) { resetError("Kod 6 xonali bo'lishi kerak"); return; }
  if (code !== ctx.code) { resetError("Kod noto'g'ri"); return; }
  if (n1.length < 3) { resetError("Yangi parol kamida 3 ta belgi bo'lsin"); return; }

  /* Kod bazada bir marta ishlaydi (purpose: 'reset') */
  const used = await CloudSync.consumeAuthCode('reset', code);
  if (!used) { resetError('Kod eskirgan yoki allaqachon ishlatilgan'); return; }
  /* Kod aynan shu hisob uchun so'ralgan bo'lishi shart */
  if (used.contact && String(used.contact).toLowerCase() !== String(ctx.contact).toLowerCase()) {
    resetError('Kod boshqa hisob uchun berilgan'); return;
  }
  if (used.student_id != null && ctx.studentId != null && Number(used.student_id) !== Number(ctx.studentId)) {
    resetError('Kod boshqa hisob uchun berilgan'); return;
  }

  if (ctx.isTeacher) {
    /* bot_settings.teacher_password yangilanadi */
    CloudSync.pushTeacherPassword(n1);
    resetTrustedSilently();
    accounts[TEACHER_LOGIN] = Object.assign({}, accounts[TEACHER_LOGIN] || {},
      { login: TEACHER_LOGIN, role: 'teacher', name: TEACHER_NAME, password: n1 });
  } else {
    const hashed = hashPasswordSync(n1);
    const client = window.__cloudClient || (window.supabase && window.supabase.createClient &&
      window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY));
    if (!client) { resetError("Bulut bilan aloqa yo'q — keyinroq urinib ko'ring"); return; }
    const res = await client.from('students')
      .update({ password_hash: hashed, password: hashed }).eq('id', ctx.studentId);
    if (res.error) { resetError('Parolni saqlashda xatolik'); return; }
  }

  state.resetCtx = null;
  state.resetDone = '';
  state.authStep = 'login';
  closeModal();
  render();
  toast('Parol yangilandi ✓ — endi yangi parol bilan kiring');
}

/* ==================== YAGONA XAT SHABLONI (email_outbox) ==================== */
const EMAIL_LOGO_URL = 'https://teachermuzaffar.uz/logo.png';
const EMAIL_BRAND = 'English Teacher — Muzaffar Amirov';

/* verify_email, teacher_2fa va reset kodlari uchun chiroyli HTML xat */
function buildEmailHtml(title, subtitle, code, extraText, minutes) {
  const mins = Number(minutes) > 0 ? Number(minutes) : 10;
  const extra = extraText
    ? '<p style="margin:0 0 14px;font-size:14px;color:#334155">' + esc(String(extraText)) + '</p>'
    : '';
  return '<div style="margin:0;padding:24px 12px;background:#eef2f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">' +
    '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;' +
      'box-shadow:0 8px 24px rgba(15,23,42,0.10);padding:28px 24px;text-align:center">' +
      '<img src="' + EMAIL_LOGO_URL + '" alt="English Teacher" width="64" height="64" ' +
        'style="display:block;margin:0 auto 10px;border-radius:12px" />' +
      '<div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px">' + esc(EMAIL_BRAND) + '</div>' +
      '<h2 style="margin:0 0 8px;font-size:20px;color:#0f172a">' + esc(String(title || '')) + '</h2>' +
      '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569">Assalomu alaykum! ' +
        esc(String(subtitle || '')) + '</p>' +
      extra +
      '<div style="margin:18px 0;padding:16px 12px;border:2px solid #2563eb;border-radius:12px;background:#eff6ff">' +
        '<div style="font-size:28px;font-weight:800;letter-spacing:6px;color:#1d4ed8;' +
          'font-family:Consolas,Menlo,monospace">' + esc(String(code || '')) + '</div>' +
      '</div>' +
      '<p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">' + ico('clock', 14) + ' Kod ' + mins +
        ' daqiqa davomida amal qiladi. Agar bu amalni siz bajarmagan bo‘lsangiz, ' +
        'ushbu xatni e’tiborsiz qoldiring.</p>' +
      '<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">teachermuzaffar.uz</p>' +
    '</div></div>';
}

/* ==================== GMAILNI 6 XONALI KOD BILAN TASDIQLASH ==================== */
/* Xat faqat TASDIQLANGAN manzilga ketadi (parol tiklash, ustoz 2FA) */
async function teacherVerifiedEmail() {
  const email = String((await CloudSync.getSetting('admin_email')) || '').trim();
  const ver = String((await CloudSync.getSetting('admin_email_verified')) || '').trim().toLowerCase();
  return (email && validEmail(email) && ver === 'true') ? email : '';
}

async function sendEmailVerifyCode(newEmail, kind) {
  if (!CloudSync.ready()) {
    toast("Xatolik: bulut bilan aloqa yo'q (Supabase sozlanmagan)", 'error');
    return false;
  }
  const code = sixDigitCode();
  const until = Date.now() + 10 * 60 * 1000;   /* 10 daqiqa */
  const saved = await CloudSync.saveAuthCode({
    purpose: 'verify_email',
    contact: newEmail,
    code: code,
    expiresAt: new Date(until).toISOString()
  });
  if (!saved) {
    toast("Xatolik: kod bazaga yozilmadi (auth_codes jadvali yoki ruxsati yo'q)", 'error');
    return false;
  }

  /* Xatni bot yuboradi (email_outbox). Navbat yozilmasa — buni yashirmaymiz. */
  let mailQueued = true;
  try {
    const ids = await CloudSync.queueEmail([{
      to_email: newEmail,
      subject: 'English Teacher — Gmailni tasdiqlash kodi: ' + code,
      body_html: buildEmailHtml(
        'Gmail manzilni tasdiqlash',
        'teachermuzaffar.uz platformasida Gmail manzilingizni tasdiqlash uchun bir martalik kodingiz:',
        code, '', 10)
    }]);
    mailQueued = !!(ids && ids.length);
  } catch (e) {
    mailQueued = false;
    console.warn('[mail] verify code:', (e && e.message) || e);
  }

  state.verifyEmail = { email: newEmail, code: code, until: until, kind: kind };
  openModal(`
    <div class="modal-head">
      <h3>${ico('mail', 18)} Gmailni tasdiqlash</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="muted small">Gmailingizga yuborilgan 6 xonali kodni kiriting:
      <b>${esc(newEmail)}</b></div>
    ${mailQueued ? '' : `<div class="field-error show">Gmail yuborish navbati ishlamadi — botda <b>GMAIL_USER</b> va <b>GMAIL_APP_PASSWORD</b> sozlanmagan bo'lishi mumkin. Kod kelmasa ustozga murojaat qiling.</div>`}
    <label class="field-label" for="ev-code" style="margin-top:10px">Tasdiqlash kodi</label>
    <input class="input" id="ev-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" />
    <div class="field-error" id="ev-error"></div>
    <button type="button" class="btn btn-primary btn-block" data-act="do-verify-email">Tasdiqlash</button>
    <button type="button" class="btn btn-ghost btn-block" data-act="resend-verify-email">${t(RESEND_TEXT)}</button>
  `);
  armResendCooldown();   /* kod yuborildi — 60 soniya qulf */
  setTimeout(function () { const el = $('#ev-code'); if (el) el.focus(); }, 30);
  toast(mailQueued ? 'Kod Gmailga yuborildi' : "Gmail yuborish navbati ishlamadi — kod yetib bormasligi mumkin", mailQueued ? undefined : 'error');
  return true;
}

function verifyEmailError(m) {
  const el = $('#ev-error');
  if (!el) return;
  el.textContent = m || '';
  el.classList.toggle('show', !!m);
}

async function submitEmailVerify() {
  const ctx = state.verifyEmail;
  const val = String(($('#ev-code') || {}).value || '').trim();
  if (!ctx) { verifyEmailError("So'rov eskirgan — qaytadan so'rang"); return; }
  if (Date.now() > ctx.until) { verifyEmailError('Kod muddati tugadi — qayta yuboring'); return; }
  if (!/^\d{6}$/.test(val)) { verifyEmailError("Kod 6 xonali bo'lishi kerak"); return; }
  if (val !== ctx.code) { verifyEmailError("Kod noto'g'ri"); return; }

  const used = await CloudSync.consumeAuthCode('verify_email', val);
  if (!used || String(used.contact || '').toLowerCase() !== String(ctx.email).toLowerCase()) {
    verifyEmailError('Kod eskirgan yoki boshqa manzil uchun'); return;
  }

  if (ctx.kind === 'teacher') {
    /* bot_settings.admin_email + admin_email_verified */
    const ok1 = await CloudSync.setSettingChecked('admin_email', ctx.email);
    if (!ok1.ok) { verifyEmailError('Xatolik: ' + ok1.error); return; }
    const ok2 = await CloudSync.setSettingChecked('admin_email_verified', 'true');
    if (!ok2.ok) { verifyEmailError('Xatolik: ' + ok2.error); return; }
    adminContacts.email = ctx.email;
    adminContacts.verified = true;
  } else {
    const st = linkedStudent();
    if (!st) { verifyEmailError("O'quvchi topilmadi"); return; }
    const r = await CloudSync.updateStudentContactChecked(st.id, { email: ctx.email, emailVerified: true });
    if (!r.ok) { verifyEmailError('Xatolik: ' + r.error); return; }
  }

  state.verifyEmail = null;
  closeModal();
  render();
  toast('Gmail tasdiqlandi ✓');
}

/* ==================== ALOQA MA'LUMOTLARI (o'quvchi / ustoz) ==================== */
let adminContacts = { email: '', phone: '', loaded: false, verified: false, busy: false };
let adminTrusted = { list: [], loaded: false };

/* Telefonni +998XXXXXXXXX ko'rinishida normallashtiradi */
function normPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.indexOf('998') === 0) return '+' + digits;
  if (digits.length === 13 && digits.indexOf('998') === 1) return digits;
  return String(raw || '').trim();
}

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validPhone(v) { return /^\+\d{9,15}$/.test(v); }

/* O'quvchi: telefon + Gmail → yagona saveProfileContact (rol bo'yicha ajratiladi) */
function saveStudentContact() {
  if (isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  return saveProfileContact();
}

/* Saqlangan, lekin hali TASDIQLANMAGAN manzilga qayta kod yuborish */
function sendVerifyExisting() {
  const email = isTeacher()
    ? String(adminContacts.email || '').trim()
    : String((linkedStudent() || {}).email || '').trim();
  if (!email || !validEmail(email)) { toast('Avval Gmail manzilni kiriting', 'error'); return; }
  sendEmailVerifyCode(email, isTeacher() ? 'teacher' : 'student');
}

/* Ustoz: bot_settings.admin_email / admin_phone (2FA va tiklash kanallari) */
async function ensureAdminContacts() {
  if (!isTeacher() || adminContacts.busy) return;
  adminContacts.busy = true;
  if (!adminContacts.loaded) {
    const email = await CloudSync.getSetting('admin_email');
    const phone = await CloudSync.getSetting('admin_phone');
    adminContacts.email = email || '';
    adminContacts.phone = phone || '';
    adminContacts.loaded = true;
  }
  const verRaw = await CloudSync.getSetting('admin_email_verified');
  const trustedRaw = await CloudSync.getSetting('trusted_devices');
  const verified = String(verRaw || '').trim().toLowerCase() === 'true';
  const list = parseTrustedList(trustedRaw);
  const changed = (verified !== adminContacts.verified) || (list.length !== adminTrusted.list.length);
  adminContacts.verified = verified;
  adminTrusted.list = list;
  adminTrusted.loaded = true;
  adminContacts.busy = false;
  if (changed && state.screen === 'profile') render();
}

/* Ustoz: bot_settings.admin_email / admin_phone → yagona saveProfileContact */
function saveTeacherContact() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  return saveProfileContact();
}

/* Profil: aloqa ma'lumotlarini saqlash — rol ANIQ ajratiladi.
   O'quvchi → students (id = st.dbId), ustoz → bot_settings (admin_email, admin_phone).
   Supabase xatosi yashirilmaydi: toast("Xatolik: ...") ko'rsatiladi. */
async function saveProfileContact() {
  const teacher = isTeacher();
  const st = teacher ? null : linkedStudent();
  /* Ustoz kanallari hali yuklanmagan bo'lsa — joriy qiymatlarni avval o'qiymiz */
  if (teacher && !adminContacts.loaded) {
    try { await ensureAdminContacts(); } catch (e) { /* yuqoridagi toast yetarli */ }
  }
  if (!teacher && !st) { toast("O'quvchi ma'lumoti topilmadi — qayta kiring", 'error'); return; }
  if (!CloudSync.ready()) { toast("Xatolik: bulut bilan aloqa yo'q (Supabase sozlanmagan)", 'error'); return; }

  const phoneEl = teacher ? $('#tc-phone') : $('#st-phone');
  const emailEl = teacher ? $('#tc-email') : $('#st-email');
  const phone = normPhone(String((phoneEl || {}).value || '').trim());
  const email = String((emailEl || {}).value || '').trim();

  if (phone && !validPhone(phone)) { toast("Telefon raqam noto'g'ri: +998 90 123 45 67", 'error'); return; }
  if (email && !validEmail(email)) { toast("Gmail manzil noto'g'ri", 'error'); return; }

  const curEmail = teacher ? String(adminContacts.email || '').trim() : String(st.email || '').trim();
  const curPhone = teacher ? String(adminContacts.phone || '').trim() : String(st.phone || '').trim();
  const emailChanged = email.toLowerCase() !== curEmail.toLowerCase();
  const phoneChanged = phone !== curPhone;
  let phoneSaved = false;

  /* 1) Telefon tasdiqlash talab qilmaydi — darhol saqlanadi */
  if (phoneChanged) {
    if (teacher) {
      const r = await CloudSync.setSettingChecked('admin_phone', phone);
      if (!r.ok) { toast('Xatolik: ' + r.error, 'error'); return; }
      adminContacts.phone = phone;
    } else {
      const r = await CloudSync.updateStudentContactChecked(st.id, { phone: phone });
      if (!r.ok) { toast('Xatolik: ' + r.error, 'error'); return; }
    }
    phoneSaved = true;
  }

  if (!emailChanged) {
    render();
    toast(phoneSaved ? 'Telefon saqlandi ✓' : "Aloqa ma'lumotlari saqlandi ✓");
    return;
  }

  /* 2) Gmailni olib tashlash — tasdiqlash shart emas */
  if (!email) {
    if (teacher) {
      const r1 = await CloudSync.setSettingChecked('admin_email', '');
      if (!r1.ok) { toast('Xatolik: ' + r1.error, 'error'); return; }
      const r2 = await CloudSync.setSettingChecked('admin_email_verified', 'false');
      if (!r2.ok) { toast('Xatolik: ' + r2.error, 'error'); return; }
      adminContacts.email = '';
      adminContacts.verified = false;
    } else {
      const r = await CloudSync.updateStudentContactChecked(st.id, { email: '', emailVerified: false });
      if (!r.ok) { toast('Xatolik: ' + r.error, 'error'); return; }
    }
    render();
    toast('Gmail olib tashlandi');
    return;
  }

  /* 3) Yangi Gmail — modal yopilmaydi, 6 xonali kod oynasi ochiladi */
  if (phoneSaved) render();
  await sendEmailVerifyCode(email, teacher ? 'teacher' : 'student');
}

/* ==================== MOCK TESTS (6 BO'LIM) ==================== */
/* Ustoz yaratgan mock testlar Supabase "mock_tests" jadvalida (payload — to'liq
   ta'rif). O'quvchi faqat o'z guruhiga biriktirilgan testlarni ko'radi.
   O'quvchi natijalari "mock_attempts" jadvali + localStorage'da saqlanadi.
   Demo/sinov testlari YO'Q — hamma kontent ustoz tomonidan kiritiladi. */

const MOCK_CATS = [
  { key: 'reading', label: 'Reading', desc: 'Matn va savollar', icon: 'bookOpen', kind: 'mcq' },
  { key: 'listening', label: 'Listening', desc: 'Audio va savollar', icon: 'headphones', kind: 'mcq' },
  { key: 'writing', label: 'Writing', desc: 'Insho yozish', icon: 'fileText', kind: 'write' },
  { key: 'speaking', label: 'Speaking', desc: 'Video javoblar', icon: 'mic', kind: 'speak' },
  { key: 'grammar', label: 'Grammar', desc: 'Grammatika testi', icon: 'clipboardCheck', kind: 'mcq' },
  { key: 'vocabulary', label: 'Vocabulary', desc: "Lug'at testi", icon: 'star', kind: 'mcq' }
];
const MOCK_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function mockCat(key) {
  return MOCK_CATS.filter(function (c) { return c.key === key; })[0] || MOCK_CATS[0];
}
function mockWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return speakWhenLabel(iso);
}
function mockNewId(prefix) {
  return (prefix || 'mk') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function mockCefr(pct) {
  if (pct >= 90) return 'C1';
  if (pct >= 80) return 'B2';
  if (pct >= 65) return 'B1';
  if (pct >= 50) return 'A2';
  return 'A1';
}
function mockCefrPill(level) {
  const lvl = String(level || '').trim().toUpperCase();
  if (!lvl) return '';
  return `<span class="mock-cefr is-${esc(lvl.toLowerCase())}">${esc(lvl)}</span>`;
}
function mockFieldValue(obj, path) {
  let node = obj;
  String(path || '').split('.').forEach(function (key) {
    if (node == null) return;
    node = node[key];
  });
  return node == null ? '' : node;
}

/* --- Mock ta'riflari (ustoz yaratadi) --- */
function mockDefs() {
  const list = store.get(K.mocks, []);
  return Array.isArray(list) ? list : [];
}
function mockSortDefs(list) {
  return list.slice().sort(function (a, b) {
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}
function mockDefById(id) {
  return mockDefs().filter(function (d) { return String(d.id) === String(id); })[0] || null;
}
function mockGroupIds(def) {
  const raw = def && Array.isArray(def.groupIds) ? def.groupIds : [];
  const seen = {};
  const out = [];
  raw.forEach(function (g) {
    const id = String(g == null ? '' : g);
    if (!id || seen[id]) return;
    seen[id] = 1;
    out.push(id);
  });
  return out;
}
function mockAllQuestions(def) {
  if (!def) return [];
  const out = [];
  const push = function (list, cefr) {
    (Array.isArray(list) ? list : []).forEach(function (q) {
      out.push(Object.assign({}, q, { cefr: q.cefr || cefr || def.cefr || '' }));
    });
  };
  if (def.category === 'reading') {
    (def.parts || []).forEach(function (p) { push(p.questions, p.cefr); });
  } else if (def.category === 'listening') {
    (def.tasks || []).forEach(function (tk) { push(tk.questions, tk.cefr); });
  } else {
    push(def.questions, def.cefr);
  }
  return out;
}
function mockDefQuestionCount(def) {
  return mockAllQuestions(def).length;
}
function mockDefCefr(def) {
  if (!def) return '';
  if (def.cefr) return def.cefr;
  const qs = mockDefQuestionsWithCefr(def);
  return qs.length ? (qs[0].cefr || '') : '';
}
function mockDefQuestionsWithCefr(def) {
  return mockAllQuestions(def).filter(function (q) { return !!q.cefr; });
}
function mockAssignedDefs(st) {
  if (!st || !st.groupId) return [];
  const gid = String(st.groupId);
  return mockSortDefs(mockDefs().filter(function (d) {
    return mockGroupIds(d).indexOf(gid) >= 0;
  }));
}
/* Savol harflari: A..Z, keyin AA, AB, ... — variantlar soni cheklanmagan */
function mockLetter(i) {
  let n = Math.max(0, Number(i) || 0);
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}
/* Yozma javobni solishtirish uchun normalizatsiya */
function mockNormAnswer(v) {
  return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
}
/* Ustoz bergan javob variantlari: "25 | twenty five" yoki "color / colour" */
function mockAcceptedAnswers(q) {
  const raw = q && q.answer != null ? String(q.answer) : '';
  return raw.split(/[|/]/).map(mockNormAnswer).filter(function (x) { return !!x; });
}
function mockIsWritten(q) { return !!q && q.type === 'written'; }
function mockCheckAnswer(q, given) {
  if (!q) return false;
  if (mockIsWritten(q)) {
    const val = mockNormAnswer(given);
    return !!val && mockAcceptedAnswers(q).indexOf(val) >= 0;
  }
  if (given == null || given === '') return false;
  return Number(given) === Number(q.ans);
}
/* Ko'rsatish uchun to'g'ri javob matni */
function mockAnswerText(q) {
  if (!q) return '';
  if (mockIsWritten(q)) return String(q.answer || '');
  return (q.opts && q.opts[q.ans]) || '';
}
function mockGivenText(q, given) {
  if (given == null || given === '') return '';
  if (mockIsWritten(q)) return String(given);
  return (q.opts && q.opts[Number(given)]) || '';
}
function mockNormalizeQuestion(q) {
  q = q || {};
  const type = q.type === 'written' ? 'written' : 'mcq';
  /* Bo'sh variantlar chiqarib tashlanadi, lekin to'g'ri javob indeksi
     qaysi variant tanlanganiga qarab qayta hisoblanadi. */
  const raw = Array.isArray(q.opts) ? q.opts : [];
  const opts = [];
  const wanted = Number(q.ans);
  let ans = -1;
  raw.forEach(function (o, i) {
    const s = String(o == null ? '' : o).trim();
    if (!s) return;
    if (i === wanted) ans = opts.length;
    opts.push(s);
  });
  if (ans < 0) ans = isFinite(wanted) && wanted >= 0 && wanted < opts.length ? wanted : 0;
  if (opts.length && ans >= opts.length) ans = 0;
  return {
    id: q.id || mockNewId('q'),
    type: type,
    text: String(q.text || '').trim(),
    cefr: String(q.cefr || '').trim().toUpperCase(),
    opts: type === 'written' ? [] : opts,
    ans: type === 'written' ? 0 : ans,
    answer: type === 'written' ? String(q.answer == null ? '' : q.answer).trim() : '',
    izoh: String(q.izoh || '').trim()
  };
}
function mockNormalizeDef(def) {
  const out = Object.assign({}, def);
  const cat = mockCat(out.category).key;
  out.kind = 'mock';
  out.id = out.id || mockNewId('md');
  out.category = cat;
  out.title = String(out.title || '').trim();
  out.groupIds = mockGroupIds(out);
  out.cefr = String(out.cefr || '').trim().toUpperCase();
  const thRaw = out.cefrThresholds && typeof out.cefrThresholds === 'object' ? out.cefrThresholds : {};
  out.cefrThresholds = {};
  MOCK_CEFR_LEVELS.forEach(function (l) {
    const v = Number(thRaw[l]);
    out.cefrThresholds[l] = isFinite(v) && v > 0 ? Math.round(v) : '';
  });
  out.createdAt = out.createdAt || new Date().toISOString();
  out.updatedAt = new Date().toISOString();
  if (cat === 'reading') {
    out.parts = (Array.isArray(out.parts) ? out.parts : []).map(function (p, i) {
      return {
        id: p.id || mockNewId('p'),
        title: String(p.title || '').trim() || ('Part ' + (i + 1)),
        cefr: String(p.cefr || out.cefr || '').trim().toUpperCase(),
        passage: String(p.passage || '').trim(),
        questions: (Array.isArray(p.questions) ? p.questions : []).map(mockNormalizeQuestion)
      };
    });
  } else if (cat === 'listening') {
    out.tasks = (Array.isArray(out.tasks) ? out.tasks : []).map(function (tk, i) {
      return {
        id: tk.id || mockNewId('tk'),
        title: String(tk.title || '').trim() || ('Task ' + (i + 1)),
        cefr: String(tk.cefr || out.cefr || '').trim().toUpperCase(),
        instruction: String(tk.instruction || '').trim(),
        audioUrl: String(tk.audioUrl || '').trim(),
        audioName: String(tk.audioName || '').trim(),
        imageUrl: String(tk.imageUrl || '').trim(),
        imageName: String(tk.imageName || '').trim(),
        questions: (Array.isArray(tk.questions) ? tk.questions : []).map(mockNormalizeQuestion)
      };
    });
  } else if (cat === 'writing') {
    out.prompt = String(out.prompt || '').trim();
    out.instruction = String(out.instruction || '').trim();
    out.fileUrl = String(out.fileUrl || '').trim();
    out.fileName = String(out.fileName || '').trim();
  } else if (cat === 'speaking') {
    out.questions = (Array.isArray(out.questions) ? out.questions : []).map(function (q) {
      return {
        id: q.id || mockNewId('sp'),
        text: String(q.text || '').trim(),
        imageUrl: String(q.imageUrl || '').trim(),
        imageName: String(q.imageName || '').trim()
      };
    });
  } else {
    out.questions = (Array.isArray(out.questions) ? out.questions : []).map(mockNormalizeQuestion);
  }
  return out;
}
function mockSaveDef(def, skipCloud) {
  if (!def) return null;
  const row = mockNormalizeDef(def);
  /* Support teacher yaratgan mock — o'z guruhlariga tegishli ekanini bilish uchun */
  if (isSupport()) row.createdBy = String((currentUser() || {}).login || '');
  const list = mockDefs();
  const i = list.map(function (d) { return String(d.id); }).indexOf(String(row.id));
  if (i >= 0) list[i] = row; else list.push(row);
  store.set(K.mocks, list);
  if (!skipCloud) MockSync.pushDef(row);
  return row;
}
function mockDeleteDef(id) {
  store.set(K.mocks, mockDefs().filter(function (d) { return String(d.id) !== String(id); }));
  MockSync.deleteDef(id);
}

/* --- Natijalar (urinishlar) --- */
function mockResults() {
  const list = store.get(K.mock, []);
  return Array.isArray(list) ? list : [];
}
function mockSortResults(list) {
  return list.slice().sort(function (a, b) {
    return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
  });
}
function mockResultById(id) {
  return mockResults().filter(function (a) { return String(a.id) === String(id); })[0] || null;
}
function mockMyResults() {
  const st = linkedStudent();
  if (!st) return [];
  return mockResults().filter(function (a) { return a.sid === st.id; });
}
function mockPendingCount() {
  return scopedMockResults().filter(function (a) {
    return (a.category === 'writing' || a.category === 'speaking') &&
      !String(a.teacherGrade == null ? '' : a.teacherGrade).trim();
  }).length;
}
function mockUpsert(attempt, skipCloud) {
  const list = mockResults();
  const row = Object.assign({}, attempt);
  row.updatedAt = new Date().toISOString();
  const i = list.map(function (x) { return String(x.id); }).indexOf(String(row.id));
  if (i >= 0) list[i] = row; else list.push(row);
  store.set(K.mock, list);
  if (!skipCloud) MockSync.push(row);
  return row;
}

/* --- Supabase: mock_tests (ta'riflar) + mock_attempts (natijalar) --- */
const MockSync = (function () {
  const url = window.SUPABASE_URL || 'https://mvjoeqyqaylfccqcnwwe.supabase.co';
  const key = window.SUPABASE_ANON_KEY || '';
  let client = null;
  let enabled = true;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try { client = window.supabase.createClient(url, key); } catch (e) { client = null; }
  }
  function ready() { return !!client && enabled; }
  function tableMissing(err) {
    const code = String((err && err.code) || '');
    const msg = String((err && err.message) || '');
    return code === 'PGRST205' || /could not find the table|does not exist/i.test(msg);
  }
  function mergeDefs(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    const local = mockDefs();
    const byId = {};
    local.forEach(function (d) { byId[String(d.id)] = d; });
    let changed = false;
    rows.forEach(function (r) {
      const payload = r && r.payload ? r.payload : null;
      if (!payload || payload.kind !== 'mock' || payload.id == null) return;
      const id = String(payload.id);
      const cur = byId[id];
      if (!cur || String(payload.updatedAt || '') > String(cur.updatedAt || '')) {
        byId[id] = Object.assign({}, payload, { id: id });
        changed = true;
      }
    });
    if (changed) store.set(K.mocks, Object.keys(byId).map(function (k) { return byId[k]; }));
    return changed;
  }
  function mergeAttempts(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    const local = mockResults();
    const byId = {};
    local.forEach(function (a) { byId[String(a.id)] = a; });
    let changed = false;
    rows.forEach(function (r) {
      const payload = r && r.payload ? r.payload : null;
      if (!payload || payload.kind === 'mock' || payload.id == null) return;
      const id = String(payload.id);
      const cur = byId[id];
      if (!cur || String(payload.updatedAt || '') > String(cur.updatedAt || '')) {
        byId[id] = Object.assign({}, payload, { id: id });
        changed = true;
      }
    });
    if (changed) store.set(K.mock, Object.keys(byId).map(function (k) { return byId[k]; }));
    return changed;
  }
  async function pushDef(def) {
    if (!ready() || !def) return false;
    const row = {
      id: String(def.id),
      title: String(def.title || ''),
      category: String(def.category || ''),
      group_ids: mockGroupIds(def),
      payload: def,
      updated_at: new Date().toISOString()
    };
    try {
      const res = await client.from('mock_tests').upsert(row, { onConflict: 'id' });
      if (res.error) {
        if (tableMissing(res.error)) enabled = false;
        console.warn('[mock] def save:', res.error.message || res.error);
        return false;
      }
      return true;
    } catch (e) {
      if (tableMissing(e)) enabled = false;
      return false;
    }
  }
  async function deleteDef(id) {
    if (!ready() || !id) return false;
    try {
      const res = await client.from('mock_tests').delete().eq('id', String(id));
      if (res.error) { if (tableMissing(res.error)) enabled = false; return false; }
      return true;
    } catch (e) { return false; }
  }
  async function deleteAttempt(id) {
    if (!ready() || !id) return false;
    try {
      const res = await client.from('mock_attempts').delete().eq('id', String(id));
      if (res.error) { if (tableMissing(res.error)) enabled = false; return false; }
      return true;
    } catch (e) { return false; }
  }
  async function push(attempt) {
    if (!ready() || !attempt) return false;
    const st = getStudents().filter(function (x) { return x.id === attempt.sid; })[0] || null;
    const row = {
      id: String(attempt.id),
      student_id: st && st.dbId != null ? st.dbId : null,
      sid: String(attempt.sid || ''),
      category: String(attempt.category || ''),
      payload: attempt,
      updated_at: new Date().toISOString()
    };
    try {
      const res = await client.from('mock_attempts').upsert(row, { onConflict: 'id' });
      if (res.error) {
        if (tableMissing(res.error)) enabled = false;
        return false;
      }
      return true;
    } catch (e) {
      if (tableMissing(e)) enabled = false;
      return false;
    }
  }
  async function pullDefs() {
    if (!ready()) return false;
    try {
      const res = await client.from('mock_tests').select('*').order('updated_at', { ascending: false }).limit(500);
      if (res.error) { if (tableMissing(res.error)) enabled = false; return false; }
      return mergeDefs(res.data);
    } catch (e) { return false; }
  }
  async function pullMine(sid) {
    if (!ready()) return false;
    let changed = false;
    try {
      const defs = await pullDefs();
      changed = !!defs || changed;
      if (sid) {
        const res = await client.from('mock_attempts').select('*').eq('sid', String(sid));
        if (!res.error) changed = mergeAttempts(res.data) || changed;
        else if (tableMissing(res.error)) enabled = false;
      }
    } catch (e) { /* lokal rejim */ }
    return changed;
  }
  async function pullAll() {
    if (!ready()) return false;
    let changed = false;
    try {
      changed = !!await pullDefs() || changed;
      const res = await client.from('mock_attempts').select('*').order('updated_at', { ascending: false }).limit(500);
      if (!res.error) changed = mergeAttempts(res.data) || changed;
      else if (tableMissing(res.error)) enabled = false;
    } catch (e) { /* lokal rejim */ }
    return changed;
  }
  return {
    ready: ready, pushDef: pushDef, deleteDef: deleteDef, deleteAttempt: deleteAttempt, push: push,
    pullMine: pullMine, pullAll: pullAll, mergeDefs: mergeDefs, mergeAttempts: mergeAttempts
  };
})();

/* --- O'quvchi: biriktirilgan mock testlar --- */
function mockAttemptSummary(a) {
  if (a.category === 'writing') {
    return a.teacherGrade ? t('Baho') + ': ' + a.teacherGrade : t('Baholanmoqda');
  }
  if (a.category === 'speaking') {
    return a.teacherGrade ? t('Baho') + ': ' + a.teacherGrade : t('Ustoz tekshiruvi kutilmoqda');
  }
  const total = a.total || mockDefQuestionCount(a.def);
  return (a.score || 0) + '/' + total + ' · ' + (a.cefr || mockCefr(a.percent || 0));
}
function mockLastForDef(def, mine) {
  return mockSortResults((mine || mockMyResults()).filter(function (a) {
    return String(a.mockId) === String(def.id);
  }))[0] || null;
}
/* Ikkala panelda bir xil 6 kartali grid */
function mockCatGridHTML() {
  return `<div class="mock-cats mock-cats-6">${MOCK_CATS.map(function (c) {
    return `<button type="button" class="card mock-cat" data-act="mock-cat-open" data-cat="${c.key}">
      <span class="mock-cat-ico">${ico(c.icon, 20)}</span>
      <span class="mock-cat-body">
        <span class="mock-cat-name">${esc(t(c.label))}</span>
        <span class="mock-cat-desc">${esc(t(c.desc))}</span>
      </span>
      <span class="mock-cat-go">${ico('arrowRight', 14)}</span>
    </button>`;
  }).join('')}</div>`;
}
function mockStudentDefHTML(def) {
  const c = mockCat(def.category);
  const last = mockLastForDef(def);
  const total = mockDefQuestionCount(def);
  const groups = mockGroupIds(def).map(groupById).filter(function (g) { return !!g; });
  const meta = c.kind === 'write' ? t('Yozma topshiriq') : (total + ' ' + t('savol'));
  const stateCls = last
    ? (String(last.teacherGrade || '').trim() || c.kind === 'mcq' ? 'is-done' : 'is-wait')
    : 'is-new';
  return `<div class="card mock-def-card mock-stu-row">
    <span class="mock-cat-ico">${ico(c.icon, 18)}</span>
    <div class="mock-stu-body">
      <div class="mock-def-card-title">${esc(def.title || t(c.label))}</div>
      <div class="mock-stu-meta">
        ${groups.map(function (g) {
          return `<span class="mock-def-group">${ico('groups', 12)} ${esc(g.name)}</span>`;
        }).join('')}
        <span>${esc(meta)}</span>
      </div>
      <div class="mock-cat-state ${stateCls}">${esc(last ? mockAttemptSummary(last) : t('Boshlanmagan'))}</div>
    </div>
    <button type="button" class="btn mock-start-btn" data-act="mock-start" data-id="${esc(def.id)}">
      ${ico('arrowRight', 14)} ${t('Boshlash')}
    </button>
  </div>`;
}
function mockStudentCatHTML(key) {
  const c = mockCat(key);
  const st = linkedStudent();
  const defs = mockAssignedDefs(st).filter(function (d) { return d.category === c.key; });
  return `<div class="mock-run-head">
    <button type="button" class="btn btn-xs ghost" data-act="mock-cat-back">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="mock-run-title">${esc(t(c.label))}</span>
  </div>
  ${defs.length
    ? `<div class="mock-defs mock-stu-list">${defs.map(mockStudentDefHTML).join('')}</div>`
    : `<div class="empty mock-empty"><span class="empty-ico">${ico(c.icon, 22)}</span>${t('Bu bo‘limda sizga hali mock test biriktirilmagan. Ustoz test biriktirgach shu yerda ko‘rinadi.')}</div>`}`;
}
function mockStudentHTML() {
  if (state.mockRun) return mockRunnerHTML();
  if (state.mockResultId) {
    const a = mockResultById(state.mockResultId);
    if (a) return mockResultHTML(a, 'student');
    state.mockResultId = '';
  }
  if (state.mockCatView) return mockStudentCatHTML(state.mockCatView);
  const st = linkedStudent();
  const defs = mockAssignedDefs(st);
  return `
  <section class="card mock-hero">
    <span class="mock-hero-ico">${ico('clipboardCheck', 22)}</span>
    <div class="col">
      <div class="strong-label">${t('Mock testlar')}</div>
      <div class="muted small">${t('Ustoz biriktirgan mock testlar. Yakunida ball, CEFR va izohlar ko‘rinadi.')}</div>
    </div>
  </section>
  <div class="section-title">${t('Bo‘limni tanlang')}</div>
  ${mockCatGridHTML()}
  ${defs.length ? '' : `<div class="empty mock-empty"><span class="empty-ico">${ico('clipboardCheck', 22)}</span>${t('Sizga hali mock test biriktirilmagan. Ustoz test biriktirgach shu yerda ko‘rinadi.')}</div>`}
  ${mockMyHistoryHTML()}`;
}
function mockMyHistoryHTML() {
  const mine = mockSortResults(mockMyResults());
  if (!mine.length) return '';
  return `<div class="section-title">${t('Mening natijalarim')}</div>
  <div class="card mock-history">${mine.slice(0, 8).map(function (a) {
    const c = mockCat(a.category);
    return `<button type="button" class="mock-history-row" data-act="mock-open-result" data-id="${esc(a.id)}">
      <span class="mock-history-ico">${ico(c.icon, 16)}</span>
      <span class="col">
        <b>${esc(a.mockTitle || t(c.label))}</b>
        <span class="muted small">${esc(mockWhen(a.createdAt))}</span>
      </span>
      <span class="mock-history-val">${esc(mockAttemptSummary(a))}</span>
    </button>`;
  }).join('')}</div>`;
}

/* --- O'quvchi: testni yechish --- */
function mockRunHeadHTML(c, step) {
  const run = state.mockRun;
  return `<div class="mock-run-head">
    <button type="button" class="btn btn-xs ghost" data-act="mock-exit">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="mock-run-title">${esc(t(c.label))}${step ? ' · ' + step : ''}</span>
    ${run && run.deadline ? `<span class="mock-timer" id="mock-timer">${mockFmtClock(mockTimerLeft(run))}</span>` : ''}
  </div>`;
}
function mockRunSections(def) {
  if (def.category === 'reading') {
    return (def.parts || []).map(function (p, i) {
      return { id: p.id, title: p.title || ('Part ' + (i + 1)), cefr: p.cefr, passage: p.passage, instruction: '', imageUrl: '', audioUrl: '', questions: p.questions || [] };
    });
  }
  if (def.category === 'listening') {
    return (def.tasks || []).map(function (tk, i) {
      return { id: tk.id, title: tk.title || ('Task ' + (i + 1)), cefr: tk.cefr, passage: '', instruction: tk.instruction, imageUrl: tk.imageUrl, audioUrl: tk.audioUrl, questions: tk.questions || [] };
    });
  }
  return [{ id: 'main', title: '', cefr: def.cefr, passage: '', instruction: def.instruction || '', imageUrl: '', audioUrl: '', questions: def.questions || [] }];
}
function mockQCardHTML(q, num, run) {
  const sel = run.answers ? run.answers[q.id] : null;
  const written = mockIsWritten(q);
  return `<div class="card mock-q" data-mq="${esc(q.id)}">
    <div class="mock-q-head"><span class="mock-q-num">${num}</span><span>${esc(q.text || '')}</span>${mockCefrPill(q.cefr)}</div>
    ${written
      ? `<div class="mock-written-ans">
        <input type="text" class="input mock-ans-input" data-mock-ans="${esc(q.id)}" value="${esc(sel == null ? '' : sel)}" placeholder="${esc(t('Javobingizni yozing'))}" autocomplete="off" autocapitalize="off" spellcheck="false" />
      </div>`
      : `<div class="mock-opts">${(q.opts || []).map(function (o, oi) {
        return `<button type="button" class="mock-opt${Number(sel) === oi ? ' is-sel' : ''}" data-act="mock-pick" data-mq="${esc(q.id)}" data-mopt="${oi}">
          <span class="mock-opt-key">${mockLetter(oi)}</span><span>${esc(o)}</span>
        </button>`;
      }).join('')}</div>`}
  </div>`;
}
function mockRunnerHTML() {
  const run = state.mockRun;
  const def = run.def;
  const c = mockCat(def.category);
  if (c.kind === 'speak') return mockSpeakRunnerHTML();
  if (c.key === 'writing') return mockWritingRunnerHTML(def);
  const qs = mockAllQuestions(def);
  const answered = Object.keys(run.answers || {}).length;
  const sections = mockRunSections(def);
  let num = 0;
  return `${mockRunHeadHTML(c, answered + '/' + qs.length)}
  ${sections.map(function (sec) {
    return `${(sec.title || sec.passage || sec.instruction || sec.audioUrl || sec.imageUrl) ? `<div class="card mock-passage">
      ${sec.title ? `<div class="mock-passage-title">${ico(c.icon, 14)} ${esc(sec.title)}${mockCefrPill(sec.cefr)}</div>` : ''}
      ${sec.passage ? `<p>${esc(sec.passage)}</p>` : ''}
      ${sec.instruction ? `<div class="mock-hint">${ico('alert', 13)} <span>${esc(sec.instruction)}</span></div>` : ''}
      ${sec.audioUrl ? `<div class="mock-listen-lock">
        <div class="mock-listen-status">${ico('headphones', 14)} <span id="mock-audio-${esc(sec.id)}-status">${t('Audio avtomatik boshlanadi')}</span></div>
        <audio id="mock-audio-${esc(sec.id)}" class="mock-audio" preload="auto" playsinline src="${esc(sec.audioUrl)}"></audio>
        <button type="button" class="btn btn-xs ghost mock-audio-nudge" id="mock-audio-${esc(sec.id)}-nudge" hidden data-act="mock-play" data-aid="${esc(sec.id)}">${ico('headphones', 14)} ${t('Tinglash')}</button>
        <div class="mock-listen-locknote">${ico('alert', 13)} <span>${t('Audio bir marta ijro etiladi — to‘xtatib yoki orqaga qaytarib bo‘lmaydi.')}</span></div>
      </div>` : ''}
      ${sec.imageUrl ? `<img class="mock-q-img mock-listen-img" src="${esc(sec.imageUrl)}" alt="" />` : ''}
    </div>` : ''}
    <div class="mock-qs">${(sec.questions || []).map(function (q) { num++; return mockQCardHTML(q, num, run); }).join('')}</div>`;
  }).join('')}
  <div class="mock-submit-bar">
    <button type="button" class="btn btn-primary btn-block" id="mock-submit-btn" data-act="mock-submit"${answered < qs.length || !qs.length ? ' disabled' : ''}>
      ${ico('upload', 15)} ${t('Yuborish')}
    </button>
    <div class="mock-submit-hint">${t('Barcha savollarga javob bering')} — ${answered}/${qs.length}</div>
  </div>`;
}
function mockWritingRunnerHTML(def) {
  const c = mockCat('writing');
  const run = state.mockRun;
  const val = run.text || '';
  return `${mockRunHeadHTML(c)}
  <div class="card mock-passage">
    <div class="section-title">${t('Topshiriq')}</div>
    <p>${esc(def.prompt || '')}</p>
    ${def.instruction ? `<div class="mock-hint">${ico('alert', 13)} <span>${esc(def.instruction)}</span></div>` : ''}
    ${def.fileUrl ? `<a class="btn btn-xs ghost mock-file-link" href="${esc(def.fileUrl)}" target="_blank" rel="noopener">${ico('paperclip', 14)} ${esc(def.fileName || t('Biriktirilgan fayl'))}</a>` : ''}
  </div>
  <div class="card">
    <textarea class="input mock-ta" id="mock-writing" rows="8" placeholder="${esc(t('Javobingizni shu yerga yozing...'))}">${esc(val)}</textarea>
    <div class="mock-wordcount"><span id="mock-word-count">${mockWordCount(val)}</span> ${t('so‘z')}</div>
    <button type="button" class="btn btn-primary btn-block" data-act="mock-submit">${ico('upload', 15)} ${t('Yuborish')}</button>
  </div>`;
}
function mockWordCount(v) {
  return String(v || '').trim() ? String(v || '').trim().split(/\s+/).length : 0;
}
function mockSpeakRunnerHTML() {
  const run = state.mockRun;
  const def = run.def;
  const c = mockCat('speaking');
  const qs = def.questions || [];
  if (!qs.length) return `${mockRunHeadHTML(c)}<div class="empty"><span class="empty-ico">${ico('mic', 22)}</span>${t('Savollar kiritilmagan')}</div>`;
  const idx = Math.min(Math.max(0, run.idx || 0), qs.length - 1);
  const q = qs[idx];
  const attempt = run.attemptId ? mockResultById(run.attemptId) : null;
  const videos = (attempt && attempt.videos) || [];
  const rec = videos.filter(function (v) { return v.qid === q.id; })[0] || null;
  return `${mockRunHeadHTML(c, (idx + 1) + '/' + qs.length)}
  <div class="card mock-speak-card">
    <div class="mock-speak-step">${t('Savol')} ${idx + 1} / ${qs.length}</div>
    <p class="mock-speak-q">${esc(q.text || '')}</p>
    ${q.imageUrl ? `<img class="mock-q-img" src="${esc(q.imageUrl)}" alt="" width="360" height="225" />` : ''}
    <div class="mock-speak-recdot${rec ? ' is-done' : ''}">${ico(rec ? 'checkCircle' : 'video', 14)}
      ${rec ? esc(t('Bu savolga video yozildi')) : esc(t('Video hali yozilmagan'))}
    </div>
    ${rec ? `<div class="mock-video-wrap"><video class="mock-teacher-video" controls playsinline preload="metadata" src="${esc(rec.url)}"></video></div>` : ''}
    <button type="button" class="btn btn-primary btn-block" data-act="mock-speak-record" data-qid="${esc(q.id)}">
      ${ico('video', 16)} ${rec ? t('Qayta yozish') : t('Yozishni boshlash')}
    </button>
    <div class="mock-speak-note">${ico('cameraCheck', 13)} ${t('Dumaloq video, ko‘z nazorati va 3 ogohlantirish bilan yoziladi.')}</div>
  </div>
  <div class="mock-prog">${qs.map(function (x, i) {
    return `<span class="mock-dot${i < idx ? ' is-done' : ''}${i === idx ? ' is-now' : ''}"></span>`;
  }).join('')}</div>
  ${videos.length ? `<button type="button" class="btn btn-xs ghost btn-block mock-finish" data-act="mock-speak-finish">${ico('check', 14)} ${t('Yakunlash')}</button>` : ''}`;
}
/* --- Reading: 60 daqiqalik sanoq (60:00 → 00:00) --- */
const MOCK_READING_MS = 60 * 60 * 1000;
let mockTimerId = 0;
function mockFmtClock(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function mockTimerLeft(run) {
  if (!run || !run.deadline) return 0;
  return Math.max(0, Math.round((run.deadline - Date.now()) / 1000));
}
function mockTimerStop() {
  if (mockTimerId) { clearInterval(mockTimerId); mockTimerId = 0; }
}
function mockTimerTick() {
  const run = state.mockRun;
  if (!run || !run.deadline) { mockTimerStop(); return; }
  const left = mockTimerLeft(run);
  const el = document.getElementById('mock-timer');
  if (el) {
    el.textContent = mockFmtClock(left);
    el.classList.toggle('is-low', left <= 300);
  }
  if (left <= 0) {
    run.deadline = 0;
    mockTimerStop();
    if (state.mockRun === run) { toast(t('Vaqt tugadi')); mockSubmitRun(); }
  }
}
function mockTimerEnsure() {
  const run = state.mockRun;
  if (!run || !run.deadline) { mockTimerStop(); return; }
  mockTimerTick();
  if (!mockTimerId) mockTimerId = setInterval(mockTimerTick, 1000);
}

/* --- Listening: avtomatik ijro, pauza/seek/qayta ijro taqiqlangan --- */
function mockAudioStatus(el, text) {
  const node = el && el.id ? document.getElementById(el.id + '-status') : null;
  if (node) node.textContent = text;
}
function mockAudioNudge(el) {
  const btn = el && el.id ? document.getElementById(el.id + '-nudge') : null;
  if (btn) btn.hidden = false;
}
function mockAudioPlay(el) {
  if (!el) return null;
  try {
    const p = el.play();
    if (p && p.catch) p.catch(function () { mockAudioNudge(el); });
    return p;
  } catch (e) {
    mockAudioNudge(el);
    return null;
  }
}
function mockAudioLock(el) {
  if (!el || el.__mockLock) return;
  el.__mockLock = true;
  el.controls = false;
  el.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen');
  el.setAttribute('disablepictureinpicture', '');
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  el.addEventListener('play', function () { el.__started = true; mockAudioStatus(el, t('Audio ijro etilmoqda...')); });
  el.addEventListener('pause', function () {
    if (el.__allowPause || el.__ended) return;
    mockAudioPlay(el);
  });
  el.addEventListener('seeking', function () {
    if (el.__ended) return;
    const max = Number(el.__maxTime) || 0;
    if (Math.abs((Number(el.currentTime) || 0) - max) > 1.5) {
      try { el.currentTime = max; } catch (e) { /* ijro etilmayapti */ }
    }
  });
  el.addEventListener('timeupdate', function () {
    if (!el.seeking) el.__maxTime = Number(el.currentTime) || 0;
  });
  el.addEventListener('ended', function () {
    el.__ended = true;
    mockAudioStatus(el, t('Tinglandi'));
    if (el.__mockNext) mockAudioPlay(el.__mockNext);
  });
}
function mockListenAutoplay() {
  const run = state.mockRun;
  if (!run || run.cat !== 'listening') return;
  const els = $$('.mock-audio').filter(function (el) { return !!el.getAttribute('src'); });
  els.forEach(function (el, i) {
    mockAudioLock(el);
    el.__mockNext = els[i + 1] || null;
  });
  const first = els.filter(function (el) { return !el.__ended && !el.__started; })[0];
  if (first) mockAudioPlay(first);
}
function mockStart(id) {
  const def = mockDefById(id);
  if (!def) { toast(t('Mock test topilmadi'), 'error'); return; }
  mockTimerStop();
  state.mockResultId = '';
  state.mockRun = {
    defId: def.id, def: JSON.parse(JSON.stringify(def)), cat: def.category,
    answers: {}, idx: 0, text: '', attemptId: '',
    deadline: def.category === 'reading' ? Date.now() + MOCK_READING_MS : 0
  };
  render();
  const el = $('#screen');
  if (el) el.scrollTop = 0;
  if (def.category === 'reading') mockTimerEnsure();
  /* "Boshlash" klikining o'zida — mobil brauzerlar avtomatik ijroga ruxsat beradi */
  if (def.category === 'listening') mockListenAutoplay();
}
function mockRunProgress() {
  const run = state.mockRun;
  if (!run) return;
  const total = mockAllQuestions(run.def).length;
  const done = Object.keys(run.answers || {}).length;
  const btn = $('#mock-submit-btn');
  if (btn) btn.disabled = done < total || !total;
  const hint = $('.mock-submit-hint');
  if (hint) hint.textContent = t('Barcha savollarga javob bering') + ' — ' + done + '/' + total;
  const title = $('.mock-run-title');
  if (title) title.textContent = t(mockCat(run.cat).label) + ' · ' + done + '/' + total;
}
function mockPick(qid, opt) {
  if (!state.mockRun) return;
  state.mockRun.answers[qid] = Number(opt);
  const q = $('[data-mq="' + String(qid).replace(/"/g, '') + '"]');
  if (q) {
    $$('[data-act="mock-pick"]', q).forEach(function (b) {
      b.classList.toggle('is-sel', Number(b.getAttribute('data-mopt')) === Number(opt));
    });
  }
  mockRunProgress();
}
/* Yozma javob maydoni: bo'sh qiymat javob hisoblanmaydi */
function mockWrittenInput(el) {
  const run = state.mockRun;
  if (!run || !el) return;
  const qid = el.getAttribute('data-mock-ans');
  const val = String(el.value || '');
  if (val.trim()) run.answers[qid] = val;
  else delete run.answers[qid];
  mockRunProgress();
}
/* Mock bo'yicha yagona CEFR chegaralari: eng yuqori daraja, uning
   minimal to'g'ri javob soni ballga yetgan bo'lsa beriladi. */
function mockCefrByThresholds(def, score) {
  const th = (def && def.cefrThresholds) || {};
  let best = '';
  MOCK_CEFR_LEVELS.forEach(function (l) {
    const v = Number(th[l]);
    if (isFinite(v) && v > 0 && Number(score) >= v) best = l;
  });
  return best;
}
function mockGrade(def, answers) {
  const qs = mockAllQuestions(def);
  let score = 0;
  qs.forEach(function (q) {
    if (mockCheckAnswer(q, answers ? answers[q.id] : null)) score++;
  });
  const total = qs.length;
  const percent = total ? Math.round(score * 100 / total) : 0;
  return {
    score: score, total: total, percent: percent,
    cefr: mockCefrByThresholds(def, score) || mockCefr(percent)
  };
}
function mockCefrScaleHTML(level) {
  const lvl = String(level || '').toUpperCase();
  return `<div class="mock-cefr-scale">${MOCK_CEFR_LEVELS.map(function (l) {
    const band = ['A1', 'A2', 'B1'].indexOf(l) >= 0 ? 'is-amber' : 'is-green';
    return `<span class="mock-cefr-lvl ${band}${l === lvl ? ' is-active' : ''}">${l}</span>`;
  }).join('')}</div>`;
}
function mockStudentMeta(st) {
  const g = st ? groupById(st.groupId) : null;
  return {
    sid: st ? st.id : '',
    studentName: st ? st.fullName : '',
    gradeClass: st ? st.schoolClass : '',
    groupName: g ? g.name : ''
  };
}
function mockSubmitRun() {
  const run = state.mockRun;
  if (!run) return;
  mockTimerStop();
  const st = linkedStudent();
  if (!st) { toast(t('Avval tizimga kiring'), 'error'); return; }
  const def = run.def;
  const c = mockCat(def.category);
  const meta = mockStudentMeta(st);
  const base = {
    mockId: def.id, mockTitle: def.title || t(c.label), category: c.key,
    studentName: meta.studentName, gradeClass: meta.gradeClass, groupName: meta.groupName, sid: meta.sid,
    def: JSON.parse(JSON.stringify(def)), createdAt: new Date().toISOString()
  };
  if (c.kind === 'write') {
    const ta = $('#mock-writing');
    const text = ta ? String(ta.value || '').trim() : String(run.text || '').trim();
    const words = mockWordCount(text);
    if (words < 10) { toast(t('Javob juda qisqa — kamida bir necha gap yozing'), 'error'); return; }
    const attempt = mockUpsert(Object.assign(base, {
      id: mockNewId(), status: 'pending', text: text, words: words,
      teacherText: '', feedback: '', teacherGrade: ''
    }));
    state.mockRun = null;
    state.mockResultId = attempt.id;
    render();
    toast(t('Writing javobi yuborildi'));
    return;
  }
  const g = mockGrade(def, run.answers);
  const attempt = mockUpsert(Object.assign(base, {
    id: mockNewId(), status: 'graded', answers: run.answers || {},
    score: g.score, total: g.total, percent: g.percent, cefr: g.cefr
  }));
  state.mockRun = null;
  state.mockResultId = attempt.id;
  render();
  toast(t('Natija saqlandi'));
}
function mockEnsureSpeakingAttempt() {
  const run = state.mockRun;
  if (!run) return null;
  if (run.attemptId) {
    const cur = mockResultById(run.attemptId);
    if (cur) return cur;
  }
  const st = linkedStudent();
  if (!st) return null;
  const def = run.def;
  const meta = mockStudentMeta(st);
  const attempt = mockUpsert({
    id: mockNewId(), mockId: def.id, mockTitle: def.title || t('Speaking'),
    category: 'speaking', status: 'pending', createdAt: new Date().toISOString(),
    studentName: meta.studentName, gradeClass: meta.gradeClass, groupName: meta.groupName, sid: meta.sid,
    def: JSON.parse(JSON.stringify(def)), videos: [], feedback: '', teacherGrade: ''
  });
  run.attemptId = attempt.id;
  return attempt;
}
/* Video yozilgach: savol bo'yicha saqlash va keyingi savolga avtomatik o'tish */
function mockSaveSpeakingVideo(attemptId, qid, url, metrics) {
  const attempt = mockResultById(attemptId);
  if (!attempt) return false;
  const videos = (attempt.videos || []).filter(function (v) { return v.qid !== qid; });
  videos.push({
    qid: qid, url: url || '',
    lookAwayCount: metrics && metrics.lookAwayCount != null ? metrics.lookAwayCount : null,
    eyeContactPercent: metrics && metrics.eyeContactPercent != null ? metrics.eyeContactPercent : null,
    durationSec: metrics && metrics.durationSec != null ? metrics.durationSec : null,
    createdAt: new Date().toISOString()
  });
  const qs = (attempt.def && attempt.def.questions) || [];
  const order = qs.map(function (q) { return q.id; });
  videos.sort(function (a, b) { return order.indexOf(a.qid) - order.indexOf(b.qid); });
  attempt.videos = videos;
  attempt.status = 'pending';
  mockUpsert(attempt);
  if (state.mockRun && String(state.mockRun.attemptId) === String(attemptId)) {
    const i = order.indexOf(qid);
    if (i >= 0 && i + 1 < order.length) state.mockRun.idx = i + 1;
    else state.mockRun.idx = Math.max(0, order.length - 1);
    render();
  }
  return true;
}
function mockStartSpeaking(qid) {
  const run = state.mockRun;
  if (!run) return;
  const attempt = mockEnsureSpeakingAttempt();
  if (!attempt) { toast(t('Avval tizimga kiring'), 'error'); return; }
  const st = linkedStudent();
  if (!st) return;
  openSpeakingRecorder({ mock: { attemptId: attempt.id, qid: qid, studentId: st.id } });
}

/* --- Natijani ko'rish / ustoz tekshiruvi --- */
function mockReviewHTML(a) {
  const qs = mockAllQuestions(a.def);
  if (!qs.length) return '';
  return `<div class="mock-review">${qs.map(function (q, i) {
    const chosen = a.answers ? a.answers[q.id] : null;
    const ok = mockCheckAnswer(q, chosen);
    const given = mockGivenText(q, chosen);
    return `<div class="mock-rev ${ok ? 'is-ok' : 'is-bad'}">
      <div class="mock-rev-q"><span class="mock-q-num">${i + 1}</span> ${esc(q.text || '')}</div>
      <div class="mock-rev-line"><span>${t('Sizning javobingiz')}:</span>
        <b class="${ok ? 'is-correct' : 'is-wrong'}">${given ? esc(given) : '—'}</b></div>
      <div class="mock-rev-line"><span>${t('To‘g‘ri javob')}:</span>
        <b class="is-correct">${esc(mockAnswerText(q) || '—')}</b></div>
      ${q.izoh ? `<div class="mock-rev-why">${ico('alert', 13)}<span><b>${t('Izoh')}:</b> ${esc(q.izoh)}</span></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
function mockCefrBadge(a) {
  const lvl = a.cefr || mockCefr(a.percent || 0);
  return mockCefrPill(lvl);
}
function mockScoreHTML(a) {
  if (a.category === 'writing' || a.category === 'speaking') {
    const grade = String(a.teacherGrade == null ? '' : a.teacherGrade).trim();
    return grade
      ? `<span class="mock-grade-badge">${t('Baho')}: ${esc(grade)}</span>`
      : `<span class="mock-status-wait">${t('Baholanmoqda')}</span>`;
  }
  return `<span class="mock-score">${a.score || 0}/${a.total || mockDefQuestionCount(a.def)}</span>
    <span class="mock-pct">${a.percent || 0}%</span>${mockCefrBadge(a)}`;
}
function mockResultHTML(a, who) {
  const c = mockCat(a.category);
  const isMcq = c.kind === 'mcq';
  const open = !!state.mockOpen[a.id];
  return `${who === 'student' ? `<div class="mock-run-head">
      <button type="button" class="btn btn-xs ghost" data-act="mock-home">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
      <span class="mock-run-title">${esc(t('Natija'))}</span>
    </div>` : ''}
  <section class="card mock-score-card">
    ${isMcq ? `<div class="mock-result-cefr">
      <div class="mock-result-cefr-label">${t('CEFR darajasi')}</div>
      ${mockCefrScaleHTML(a.cefr || mockCefr(a.percent || 0))}
    </div>` : ''}
    <div class="mock-score-top">
      <span class="mock-cat-ico">${ico(c.icon, 20)}</span>
      <div class="col">
        <div class="mock-score-title">${esc(a.mockTitle || t(c.label))}</div>
        <div class="muted small">${esc(t(c.label))} · ${esc(mockWhen(a.createdAt))}</div>
      </div>
      <div class="mock-score-right">${mockScoreHTML(a)}</div>
    </div>
    ${isMcq ? `<button type="button" class="btn btn-xs ghost btn-block" data-act="mock-review" data-id="${esc(a.id)}" aria-expanded="${open}">
      ${ico('eye', 14)} ${open ? t('Javoblarni yopish') : t('Javoblarni ko‘rib chiqish')}</button>
      ${open ? mockReviewHTML(a) : ''}` : ''}
    ${c.key === 'writing' ? `<div class="mock-written">${esc(a.teacherText || a.text || '')}</div>` : ''}
    ${c.key === 'speaking' ? mockVideosHTML(a) : ''}
    ${a.feedback ? `<div class="mock-feedback"><b>${t('Ustoz izohi')}:</b> ${esc(a.feedback)}</div>` : ''}
  </section>`;
}
function mockVideosHTML(a) {
  const qs = (a.def && a.def.questions) || [];
  const vids = a.videos || [];
  if (!vids.length) return `<div class="empty"><span class="empty-ico">${ICON.video}</span>${t('Video yuborilmagan')}</div>`;
  return `<div class="mock-videos">${vids.map(function (v) {
    const q = qs.filter(function (x) { return x.id === v.qid; })[0];
    return `<div class="mock-video-row">
      <div class="mock-video-q">${esc(q ? q.text : v.qid)}</div>
      <video class="mock-teacher-video" controls playsinline preload="metadata" src="${esc(v.url)}"></video>
      <div class="mock-video-meta muted small">
        ${v.eyeContactPercent != null ? `<span>${t('Ko‘z kontakti')}: ${v.eyeContactPercent}%</span>` : ''}
        ${v.lookAwayCount != null ? `<span>${t('Chetga qarash')}: ${v.lookAwayCount}</span>` : ''}
        ${v.durationSec != null ? `<span>${t('Davomiyligi')}: ${v.durationSec}s</span>` : ''}
      </div>
    </div>`;
  }).join('')}</div>`;
}
function mockPlayListening(aid) {
  const el = aid ? document.getElementById('mock-audio-' + aid) : document.querySelector('.mock-audio');
  if (!el || !el.getAttribute('src')) {
    toast(t('Bu testda audio yuklanmagan'), 'error');
    return;
  }
  if (el.__ended) { toast(t('Bu audio faqat bir marta tinglanadi'), 'error'); return; }
  mockAudioLock(el);
  mockAudioPlay(el);
}
async function submitMockSpeakRecording() {
  if (!speakRec || !speakRec.blob || !speakRec.mock) return;
  const mock = speakRec.mock;
  const st = linkedStudent();
  if (!st) return;
  const btn = speakRecQ('[data-act="speak-rec-submit"]');
  if (btn) btn.disabled = true;
  speakRec.mode = 'submitting';
  speakRecStatus(t('Yuborilmoqda...'), 'rec');
  try {
    const ext = /mp4/.test(speakRec.mime || '') ? 'mp4' : 'webm';
    const file = new File([speakRec.blob], 'mock_' + Date.now() + '.' + ext, { type: speakRec.mime || 'video/webm' });
    const up = await uploadFileToR2(file, 'mock/' + (st.dbId != null ? st.dbId : st.id));
    const metrics = {
      lookAwayCount: speakRec.lookAwayCount,
      eyeContactPercent: speakRec.eyeSamples ? Math.round(speakRec.eyeGood / speakRec.eyeSamples * 100) : null,
      durationSec: Math.max(1, Math.round(((speakRec.endedAt || Date.now()) - speakRec.startedAt) / 1000))
    };
    closeSpeakRecorder();
    mockSaveSpeakingVideo(mock.attemptId, mock.qid, up.url, metrics);
    toast(t('Video saqlandi'));
  } catch (e) {
    if (!speakRec) return;
    speakRec.mode = 'preview';
    speakRecStatus(t('Yuklab bo‘lmadi. Qayta urinib ko‘ring.'), 'error');
    if (btn) btn.disabled = false;
  }
}

/* --- Ustoz: mock ro'yxati + builder --- */
const MOCK_SECTIONS = [
  { key: 'rl', cats: ['reading', 'listening'], title: 'Reading and Listening Answers', uz: 'Reading va Listening javoblari', icon: 'bookOpen' },
  { key: 'writing', cats: ['writing'], title: 'Writing Answers', uz: 'Writing javoblari', icon: 'fileText' },
  { key: 'speaking', cats: ['speaking'], title: 'Speaking Answers', uz: 'Speaking javoblari', icon: 'mic' },
  { key: 'vg', cats: ['grammar', 'vocabulary'], title: 'Vocabulary and Grammar', uz: 'Vocabulary va Grammar', icon: 'star' }
];
function mockGroupBadgesHTML(def) {
  const ids = mockGroupIds(def);
  if (!ids.length) return `<span class="mock-def-group is-none">${t('Guruh tanlanmagan')}</span>`;
  return ids.map(function (gid) {
    const g = groupById(gid);
    return `<span class="mock-def-group">${ico('groups', 12)} ${esc(g ? g.name : gid)}</span>`;
  }).join('');
}
function mockDefRowHTML(def) {
  const c = mockCat(def.category);
  const total = mockDefQuestionCount(def);
  const assignOpen = String(state.mockAssignId) === String(def.id);
  const delOpen = String(state.mockDelId) === String(def.id);
  return `<div class="card mock-def" data-def="${esc(def.id)}">
    <div class="mock-def-groups">${mockGroupBadgesHTML(def)}</div>
    <div class="mock-def-head">
      <span class="mock-cat-ico">${ico(c.icon, 18)}</span>
      <div class="col">
        <div class="mock-def-title">${esc(def.title || t(c.label))}</div>
        <div class="mock-def-meta">
          <span>${esc(t(c.label))}</span>
          ${mockCefrPill(mockDefCefr(def))}
          <span>${total} ${t('savol')}</span>
          <span>${esc(mockWhen(def.updatedAt || def.createdAt))}</span>
        </div>
      </div>
    </div>
    <div class="mock-def-actions">
      <button type="button" class="btn btn-xs ghost" data-act="mock-edit" data-id="${esc(def.id)}">${ico('fileText', 13)} ${t('Tahrirlash')}</button>
      <button type="button" class="btn btn-xs ghost" data-act="mock-assign" data-id="${esc(def.id)}">${ico('groups', 13)} ${t('Guruhlar')}</button>
      <button type="button" class="btn btn-xs ghost mock-danger" data-act="mock-del" data-id="${esc(def.id)}">${ico('trash', 13)} ${t('O‘chirish')}</button>
    </div>
    ${assignOpen ? `<div class="mock-assign">
      <div class="mock-field-label">${t('Guruhlarni biriktirish')}</div>
      <div class="mock-groups">${mockGroupChecksHTML((state.mockAssignDraft || []), 'mock-assign-toggle')}</div>
      <div class="mock-btns">
        <button type="button" class="btn btn-primary btn-sm" data-act="mock-assign-save" data-id="${esc(def.id)}">${ico('save', 13)} ${t('Saqlash')}</button>
        <button type="button" class="btn btn-xs ghost" data-act="mock-assign-cancel">${t('Bekor qilish')}</button>
      </div>
    </div>` : ''}
    ${delOpen ? `<div class="mock-confirm">
      <span>${t('Bu mock testni o‘chirishni tasdiqlaysizmi?')}</span>
      <div class="mock-btns">
        <button type="button" class="btn btn-xs danger" data-act="mock-del-yes" data-id="${esc(def.id)}">${t('Ha, o‘chirish')}</button>
        <button type="button" class="btn btn-xs ghost" data-act="mock-del-cancel">${t('Bekor qilish')}</button>
      </div>
    </div>` : ''}
  </div>`;
}
function mockTeacherRowHTML(a) {
  const c = mockCat(a.category);
  const open = !!(state.mockTOpen && state.mockTOpen[a.id]);
  const isMcq = c.kind === 'mcq';
  const delOpen = String(state.mockDelResultId || '') === String(a.id);
  return `<div class="card mock-person ${isMcq ? 'is-mcq' : 'is-manual'}" data-mockrow="${esc(a.id)}">
    <div class="mock-person-head">
      <span class="avatar mock-avatar">${esc(initials(a.studentName || '?'))}</span>
      <div class="col">
        <div class="mock-person-name">${esc(a.studentName || '—')}</div>
        <div class="mock-person-meta">
          <span class="chip-class">${esc(tClass(a.gradeClass || ''))}</span>
          <span class="pill">${esc(a.groupName || t('Guruh tayinlanmagan'))}</span>
          <span class="mock-person-when">${esc(mockWhen(a.createdAt))}</span>
        </div>
        ${a.mockTitle ? `<div class="mock-person-test">${esc(a.mockTitle)}</div>` : ''}
      </div>
      <div class="mock-score-right">${mockScoreHTML(a)}</div>
    </div>
    ${isMcq ? `<button type="button" class="btn btn-xs ghost btn-block" data-act="mock-review" data-scope="teacher" data-id="${esc(a.id)}" aria-expanded="${open}">
        ${ico('eye', 14)} ${open ? t('Javoblarni yopish') : t('Javoblarni ko‘rib chiqish')}</button>
      ${open ? mockReviewHTML(a) : ''}` : ''}
    ${c.key === 'speaking' ? mockVideosHTML(a) : ''}
    ${!isMcq ? mockTeacherGradeForm(a) : ''}
    ${delOpen
      ? `<div class="mock-confirm">
        <span>${t('Bu natijani o‘chirishni tasdiqlaysizmi?')}</span>
        <div class="mock-btns">
          <button type="button" class="btn btn-xs danger" data-act="mock-result-del-yes" data-id="${esc(a.id)}">${t('Ha, o‘chirish')}</button>
          <button type="button" class="btn btn-xs ghost" data-act="mock-result-del-cancel">${t('Bekor qilish')}</button>
        </div>
      </div>`
      : `<div class="mock-person-actions">
        <button type="button" class="btn btn-xs ghost mock-danger" data-act="mock-result-del" data-id="${esc(a.id)}">${ico('trash', 13)} ${t('O‘chirish')}</button>
      </div>`}
  </div>`;
}
function mockTeacherGradeForm(a) {
  const isWriting = a.category === 'writing';
  const body = isWriting
    ? `<label class="mock-field-label">${t('O‘quvchi matni (tahrirlash mumkin)')}</label>
       <textarea class="input mock-ta" id="mock-t-text-${esc(a.id)}" rows="6">${esc(a.teacherText || a.text || '')}</textarea>
       ${a.text && a.teacherText && a.teacherText !== a.text ? `<div class="mock-original"><b>${t('Asl matn')}:</b> ${esc(a.text)}</div>` : ''}`
    : '';
  return `<div class="mock-grade-form">
    ${body}
    <label class="mock-field-label">${t('Izoh')}</label>
    <textarea class="input mock-ta" id="mock-t-feedback-${esc(a.id)}" rows="3" placeholder="${esc(t('O‘quvchiga izoh yozing...'))}">${esc(a.feedback || '')}</textarea>
    <label class="mock-field-label">${t('Baho (raqam yoki matn)')}</label>
    <div class="mock-grade-row">
      <input class="input" id="mock-t-grade-${esc(a.id)}" value="${esc(a.teacherGrade == null ? '' : a.teacherGrade)}" placeholder="${esc(t('Masalan: 8 yoki 7.5 yoki A'))}" />
      <button type="button" class="btn btn-primary btn-sm" data-act="mock-save-grade" data-id="${esc(a.id)}">${ico('save', 14)} ${t('Saqlash')}</button>
    </div>
  </div>`;
}
function mockResultSectionHTML(sec, rows) {
  return `<section class="mock-sec" id="mock-sec-${sec.key}">
    <div class="mock-sec-head">
      <span class="mock-sec-ico">${ico(sec.icon, 16)}</span>
      <span class="mock-sec-title">${esc(t(sec.uz))}</span>
      <span class="mock-sec-count">${rows.length}</span>
    </div>
    ${rows.length ? rows.map(mockTeacherRowHTML).join('')
      : `<div class="empty"><span class="empty-ico">${ico(sec.icon, 22)}</span>${t('Hozircha natija yo‘q')}</div>`}
  </section>`;
}
/* Ustoz: kategoriya kartasi ochilganda — yaratish/tahrirlash/guruhlash */
function mockTeacherCatScreen(key) {
  const c = mockCat(key);
  const defs = mockSortDefs(scopedMockDefs().filter(function (d) { return d.category === c.key; }));
  const sec = MOCK_SECTIONS.filter(function (s) { return s.cats.indexOf(c.key) >= 0; })[0] || MOCK_SECTIONS[0];
  const rows = mockSortResults(scopedMockResults().filter(function (a) { return sec.cats.indexOf(a.category) >= 0; }));
  return `<div class="mock-run-head">
    <button type="button" class="btn btn-xs ghost" data-act="mock-cat-back">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="mock-run-title">${esc(t(c.label))}</span>
  </div>
  <button type="button" class="btn btn-primary btn-block mock-add-btn" data-act="mock-add">${ico('plus', 16)} ${t("Yangi Mock qo'shish")}</button>
  <div class="section-title">${esc(t(c.label))} · ${t('Yaratilgan mock testlar')}</div>
  <div class="mock-defs">${defs.length ? defs.map(mockDefRowHTML).join('')
    : `<div class="empty mock-empty"><span class="empty-ico">${ico(c.icon, 20)}</span>${t('Bu bo‘limda hali mock test yaratilmagan')}</div>`}</div>
  <div class="section-title">${t('O‘quvchilar natijalari')}</div>
  ${mockResultSectionHTML(sec, rows)}`;
}
/* Mock ma'lumotlari: support teacher faqat o'z guruhlarini ko'radi */
function scopedMockResults() {
  const ids = {};
  scopedStudents().forEach(function (s) { ids[String(s.id)] = 1; });
  return mockResults().filter(function (a) { return !!ids[String(a.sid)]; });
}
function scopedMockDefs() {
  const list = mockDefs();
  if (!isSupport()) return list;
  const rec = supportRecord();
  const gids = supportRecordGroupIds(rec);
  const myLogin = String((currentUser() || {}).login || '');
  return list.filter(function (d) {
    const ids = mockGroupIds(d);
    if (!ids.length) return String(d.createdBy || '') === myLogin;
    return ids.some(function (id) { return gids.indexOf(String(id)) >= 0; });
  });
}
function mockTeacherScreen() {
  if (!canStaff('mock')) return blockedScreen("Bu bo'limga ruxsat yo'q");
  if (state.mockBuilder) return mockBuilderHTML();
  if (state.mockCatView) return mockTeacherCatScreen(state.mockCatView);
  const all = mockSortResults(scopedMockResults());
  return `
  <div class="card mock-hero">
    <span class="mock-hero-ico">${ico('clipboardCheck', 22)}</span>
    <div class="col">
      <div class="strong-label">${t('Mock testlar')}</div>
      <div class="muted small">${t('Test yarating, guruhlarga biriktiring va o‘quvchilar natijalarini tekshiring.')}</div>
    </div>
  </div>
  <div class="section-title">${t('Bo‘limni tanlang')}</div>
  ${mockCatGridHTML()}
  <div class="section-title">${t('O‘quvchilar natijalari')}</div>
  <div class="mock-sections">${MOCK_SECTIONS.map(function (sec) {
    return mockResultSectionHTML(sec, mockSortResults(all.filter(function (a) { return sec.cats.indexOf(a.category) >= 0; })));
  }).join('')}</div>`;
}
/* Natijani o'chirish: R2 videolar + lokal holat + Supabase (mock_attempts) */
async function mockDeleteResult(id) {
  if (!canStaff('mock')) { toast("Ruxsat yo'q", 'error'); return; }
  const a = mockResultById(id);
  if (!a) return;
  const urls = (a.videos || []).map(function (v) { return v && v.url; }).filter(function (u) { return !!u; });
  for (let i = 0; i < urls.length; i++) {
    try { await deleteFileFromR2(urls[i]); } catch (e) { /* fayl o'chmasa ham davom etamiz */ }
  }
  store.set(K.mock, mockResults().filter(function (x) { return String(x.id) !== String(id); }));
  if (state.mockTOpen) delete state.mockTOpen[id];
  if (state.mockDelResultId === id) state.mockDelResultId = '';
  if (state.mockResultId === id) state.mockResultId = '';
  MockSync.deleteAttempt(id);
  render();
  toast(t('Natija o‘chirildi'));
}
function mockSaveTeacherGrade(id) {
  if (!canStaff('mock')) { toast("Ruxsat yo'q", 'error'); return; }
  const a = mockResultById(id);
  if (!a) return;
  const tEl = document.getElementById('mock-t-text-' + id);
  const fEl = document.getElementById('mock-t-feedback-' + id);
  const gEl = document.getElementById('mock-t-grade-' + id);
  if (tEl) a.teacherText = String(tEl.value || '');
  if (fEl) a.feedback = String(fEl.value || '');
  if (gEl) a.teacherGrade = String(gEl.value || '').trim();
  a.status = a.teacherGrade ? 'graded' : 'pending';
  a.gradedAt = a.teacherGrade ? new Date().toISOString() : '';
  mockUpsert(a);
  render();
  toast(t('Saqlandi'));
}

/* --- Builder: yangi/tahrirlash --- */
function mockNewQuestion(cefr) {
  return { id: mockNewId('q'), type: 'mcq', text: '', cefr: cefr || '', opts: ['', '', ''], ans: 0, answer: '', izoh: '' };
}
function mockQuestionValid(q) {
  if (!q || !String(q.text || '').trim()) return false;
  if (q.type === 'written') return !!String(q.answer || '').trim();
  return (Array.isArray(q.opts) ? q.opts : []).filter(function (o) { return String(o == null ? '' : o).trim(); }).length >= 2;
}
function mockNewPart(index, cefr) {
  return { id: mockNewId('p'), title: 'Part ' + (index + 1), cefr: cefr || 'B1', passage: '', questions: [mockNewQuestion(cefr || 'B1')] };
}
function mockNewTask(index, cefr) {
  return { id: mockNewId('tk'), title: 'Task ' + (index + 1), cefr: cefr || 'B1', instruction: '', audioUrl: '', audioName: '', imageUrl: '', imageName: '', questions: [mockNewQuestion(cefr || 'B1')] };
}
function mockNewDraft(cat) {
  const c = mockCat(cat);
  const base = {
    id: mockNewId('md'), kind: 'mock', category: c.key, title: '', groupIds: [], cefr: 'B1',
    cefrThresholds: { A1: '', A2: '', B1: '', B2: '', C1: '', C2: '' }
  };
  if (c.key === 'reading') base.parts = [mockNewPart(0), mockNewPart(1)];
  else if (c.key === 'listening') base.tasks = [mockNewTask(0)];
  else if (c.key === 'writing') return Object.assign(base, { prompt: '', instruction: '', fileUrl: '', fileName: '' });
  else if (c.key === 'speaking') base.questions = [
    { id: mockNewId('sp'), text: '', imageUrl: '', imageName: '' },
    { id: mockNewId('sp'), text: '', imageUrl: '', imageName: '' }
  ];
  else base.questions = [mockNewQuestion('B1')];
  return base;
}
function mockBSet(path, value) {
  if (!state.mockBuilder) return;
  const parts = String(path || '').split('.');
  if (!parts.length) return;
  let node = state.mockBuilder.draft;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (node[key] == null) node[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}
function mockBGet(path) {
  return state.mockBuilder ? mockFieldValue(state.mockBuilder.draft, path) : '';
}
function mockBArray(path) {
  const arr = mockBGet(path);
  return Array.isArray(arr) ? arr : [];
}
function mockBInput(path, ph, cls) {
  return `<input class="input${cls ? ' ' + cls : ''}" data-mb="${esc(path)}" value="${esc(mockBGet(path))}" placeholder="${esc(ph || '')}" />`;
}
function mockBTextarea(path, rows, ph) {
  return `<textarea class="input mock-ta" data-mb="${esc(path)}" rows="${rows || 4}" placeholder="${esc(ph || '')}">${esc(mockBGet(path))}</textarea>`;
}
/* Mock darajasidagi yagona CEFR ustuni: har bir daraja uchun minimal to'g'ri javob */
function mockThresholdsHTML(def) {
  const th = (def && def.cefrThresholds) || {};
  const total = mockDefQuestionCount(def);
  return `<div class="mock-cefr-col">
    <div class="mock-build-sub">${t('CEFR darajalari')} · ${t('Mock bo‘yicha minimal to‘g‘ri javob')} (${total} ${t('savol')})</div>
    ${MOCK_CEFR_LEVELS.map(function (l) {
      const band = ['A1', 'A2', 'B1'].indexOf(l) >= 0 ? 'is-amber' : 'is-green';
      const val = th[l] == null ? '' : th[l];
      return `<label class="mock-cefr-row">
        <span class="mock-cefr-lvl ${band}">${l}</span>
        <input class="input" type="number" inputmode="numeric" min="0" step="1" data-mb="cefrThresholds.${l}" value="${esc(val)}" placeholder="0" />
      </label>`;
    }).join('')}
  </div>`;
}
function mockBAnswerSelect(path, val, optCount) {
  const n = Math.max(2, Number(optCount) || 2);
  const cur = Number(val) || 0;
  return `<select class="input" data-mb="${esc(path)}">${Array.from({ length: n }).map(function (_, i) {
    return `<option value="${i}"${i === cur ? ' selected' : ''}>${mockLetter(i)}</option>`;
  }).join('')}</select>`;
}
function mockBNode(path) {
  if (!state.mockBuilder) return null;
  const parts = String(path || '').split('.');
  let node = state.mockBuilder.draft;
  for (let i = 0; i < parts.length; i++) {
    if (node == null) return null;
    node = node[parts[i]];
  }
  return node == null ? null : node;
}
function mockBRemove(act, path) {
  return `<button type="button" class="btn btn-xs ghost mock-danger" data-act="${act}" data-path="${esc(path)}">${ico('trash', 12)}</button>`;
}
function mockBQFields(base, q, idx) {
  const parent = base.slice(0, base.lastIndexOf('.'));
  const written = q.type === 'written';
  const opts = Array.isArray(q.opts) ? q.opts : [];
  return `<div class="mock-build-q">
    <div class="mock-build-q-head"><span class="mock-q-num">${idx + 1}</span>
      <div class="mock-qtype">
        <button type="button" class="mock-tab${written ? '' : ' is-active'}" data-act="mock-b-qtype" data-path="${esc(base)}" data-qtype="mcq">${t('Variantli')}</button>
        <button type="button" class="mock-tab${written ? ' is-active' : ''}" data-act="mock-b-qtype" data-path="${esc(base)}" data-qtype="written">${t('Yozma javob')}</button>
      </div>
      <button type="button" class="btn btn-xs ghost mock-danger" data-act="mock-b-del-q" data-path="${esc(parent)}" data-idx="${idx}">${ico('trash', 12)}</button>
    </div>
    ${mockBInput(base + '.text', t('Savol matni'))}
    ${written
      ? `<label class="mock-field-label">${t('To‘g‘ri javob (so‘z, son yoki gap)')}</label>
        ${mockBInput(base + '.answer', t('Masalan: 25 | twenty five'))}
        <div class="muted small mock-answer-hint">${t('Bir nechta qabul qilinadigan variantni | yoki / bilan ajrating')}</div>`
      : `<div class="mock-build-opts">${opts.map(function (_, oi) {
          return `<div class="mock-build-opt">
            ${mockBInput(base + '.opts.' + oi, mockLetter(oi) + ' ' + t('variant'))}
            ${opts.length > 2 ? `<button type="button" class="btn btn-xs ghost mock-danger" data-act="mock-b-del-opt" data-path="${esc(base)}" data-idx="${oi}" aria-label="${esc(t('Variantni o‘chirish'))}">${ico('trash', 12)}</button>` : ''}
          </div>`;
        }).join('')}</div>
        <button type="button" class="btn btn-xs ghost mock-add-opt" data-act="mock-b-add-opt" data-path="${esc(base)}">${ico('plus', 12)} ${t('Harf / variant qo‘shish')}</button>
        <div class="mock-build-answer">
          <span>${t('To‘g‘ri javob')}</span>
          ${mockBAnswerSelect(base + '.ans', q.ans, opts.length)}
        </div>`}
    ${mockBTextarea(base + '.izoh', 2, t('Izoh'))}
  </div>`;
}
function mockBQuestionsBlock(path, label) {
  const qs = mockBArray(path);
  return `<div class="mock-build-qs">
    <div class="mock-build-sub">${esc(label)}</div>
    ${qs.map(function (q, i) { return mockBQFields(path + '.' + i, q, i); }).join('')}
    <button type="button" class="btn btn-xs ghost" data-act="mock-b-add-q" data-path="${esc(path)}">${ico('plus', 13)} ${t('Savol qo‘shish')}</button>
  </div>`;
}
function mockGroupChecksHTML(selected, act) {
  const groups = scopedGroups();
  if (!groups.length) return `<div class="muted small">${t('Hozircha guruh yo‘q')}</div>`;
  const set = (selected || []).map(String);
  return groups.map(function (g) {
    return `<label class="mock-group-check">
      <input type="checkbox" ${act === 'data' ? `data-mb="group" data-gid="${esc(g.id)}"` : `data-act="${act}" data-gid="${esc(g.id)}"`}${set.indexOf(String(g.id)) >= 0 ? ' checked' : ''} />
      <span>${esc(g.name)}</span>
    </label>`;
  }).join('');
}
function mockBuilderHTML() {
  const b = state.mockBuilder;
  const def = b.draft;
  const c = mockCat(def.category);
  const step = state.mockBStep || 'text';
  return `<div class="mock-run-head">
    <button type="button" class="btn btn-xs ghost" data-act="mock-b-cancel">${ico('arrowLeft', 14)} ${t('Orqaga')}</button>
    <span class="mock-run-title">${b.isNew ? t('Yangi Mock') : t('Tahrirlash')} · ${esc(t(c.label))}</span>
  </div>
  <div class="card mock-build">
    <label class="mock-field-label">${t('Mock nomi')}</label>
    ${mockBInput('title', t('Masalan: Reading Practice 1'))}
    <label class="mock-field-label">${t('Guruhlar')}</label>
    <div class="mock-groups">${mockGroupChecksHTML(def.groupIds || [], 'data')}</div>
    ${mockBuilderBodyHTML(def, c, step)}
  </div>
  <div class="mock-btns mock-build-actions">
    <button type="button" class="btn btn-primary btn-block" data-act="mock-save">${ico('save', 15)} ${t('Saqlash')}</button>
    <button type="button" class="btn btn-xs ghost" data-act="mock-b-cancel">${t('Bekor qilish')}</button>
  </div>`;
}
function mockBuilderBodyHTML(def, c, step) {
  if (c.key === 'reading') {
    const steps = [['text', 'Matn'], ['questions', 'Savollar'], ['answers', 'Javoblar'], ['izoh', 'Izoh']];
    return `<div class="mock-tabs mock-step-tabs">${steps.map(function (s) {
      return `<button type="button" class="mock-tab${step === s[0] ? ' is-active' : ''}" data-act="mock-b-step" data-step="${s[0]}">${t(s[1])}</button>`;
    }).join('')}</div>
    ${mockThresholdsHTML(def)}
    ${(def.parts || []).map(function (p, i) {
      const base = 'parts.' + i;
      const head = (p.title || 'Part ' + (i + 1));
      if (step === 'text') {
        return `<div class="mock-build-part">
          <div class="mock-build-part-head"><b>${esc(head)}</b>
            <span class="mock-build-part-tools">${mockBRemove('mock-b-del-part', String(i))}</span></div>
          ${mockBInput(base + '.title', t('Qism nomi'))}
          ${mockBTextarea(base + '.passage', 6, t('Matnni kiriting'))}
        </div>`;
      }
      if (step === 'questions') {
        return `<div class="mock-build-part">
          <div class="mock-build-part-head"><b>${esc(head)}</b><span class="mock-build-part-tools">${mockCefrPill(p.cefr)}</span></div>
          ${mockBQuestionsBlock(base + '.questions', t('Savollar'))}
        </div>`;
      }
      if (step === 'answers') {
        return `<div class="mock-build-part">
          <div class="mock-build-part-head"><b>${esc(head)}</b></div>
          ${(p.questions || []).map(function (q, qi) {
            return `<div class="mock-build-answer-row">
              <span>${qi + 1}. ${esc(q.text || '—')}</span>
              ${q.type === 'written'
                ? `<b class="mock-ans-badge">${esc(q.answer || '—')}</b>`
                : mockBAnswerSelect(base + '.questions.' + qi + '.ans', q.ans, (q.opts || []).length)}
            </div>`;
          }).join('')}
        </div>`;
      }
      return `<div class="mock-build-part">
        <div class="mock-build-part-head"><b>${esc(head)}</b></div>
        ${(p.questions || []).map(function (q, qi) {
          return `<div class="mock-build-izoh">
            <div class="mock-build-sub">${qi + 1}. ${esc(q.text || '—')}</div>
            ${mockBTextarea(base + '.questions.' + qi + '.izoh', 2, t('Izoh (javob izohi)'))}
          </div>`;
        }).join('')}
      </div>`;
    }).join('')}
    <button type="button" class="btn btn-xs ghost mock-add-task" data-act="mock-b-add-part">${ico('plus', 13)} ${t('Part qo‘shish')}</button>`;
  }
  if (c.key === 'listening') {
    return mockThresholdsHTML(def) + (def.tasks || []).map(function (tk, i) {
      const base = 'tasks.' + i;
      return `<div class="mock-build-part">
        <div class="mock-build-part-head"><b>${esc(tk.title || 'Task ' + (i + 1))}</b>
          <span class="mock-build-part-tools">${mockBRemove('mock-b-del-task', String(i))}</span></div>
        <label class="mock-field-label">${t('Audio (R2)')}</label>
        <div class="mock-file-row">
          <input type="file" accept="audio/*" data-mb-file="${esc(base + '.audioUrl')}" data-mb-name="${esc(base + '.audioName')}" data-mb-folder="mock/audio" />
          ${mockBGet(base + '.audioUrl') ? `<audio controls preload="metadata" class="mock-audio" src="${esc(mockBGet(base + '.audioUrl'))}"></audio>
            <button type="button" class="btn btn-xs ghost" data-act="mock-b-file-clear" data-path="${esc(base + '.audioUrl')}">${ico('trash', 12)}</button>` : `<span class="muted small">${t('Fayl tanlanmagan')}</span>`}
        </div>
        <label class="mock-field-label">${t('Shart (ixtiyoriy)')}</label>
        ${mockBTextarea(base + '.instruction', 2, t('Masalan: Audioni bir marta tinglang'))}
        <label class="mock-field-label">${t('Rasm (ixtiyoriy, o‘rta o‘lcham)')}</label>
        <div class="mock-file-row">
          <input type="file" accept="image/*" data-mb-file="${esc(base + '.imageUrl')}" data-mb-name="${esc(base + '.imageName')}" data-mb-folder="mock/images" />
          ${mockBGet(base + '.imageUrl') ? `<img class="mock-q-img mock-builder-img" src="${esc(mockBGet(base + '.imageUrl'))}" alt="" />
            <button type="button" class="btn btn-xs ghost" data-act="mock-b-file-clear" data-path="${esc(base + '.imageUrl')}">${ico('trash', 12)}</button>` : ''}
        </div>
        ${mockBQuestionsBlock(base + '.questions', t('Savollar'))}
      </div>`;
    }).join('') + `<button type="button" class="btn btn-xs ghost mock-add-task" data-act="mock-b-add-task">${ico('plus', 13)} ${t('Add Task')}</button>`;
  }
  if (c.key === 'writing') {
    return `<label class="mock-field-label">${t('Topshiriq matni')}</label>
      ${mockBTextarea('prompt', 5, t('O‘quvchi yozadigan topshiriq'))}
      <label class="mock-field-label">${t('Shart')}</label>
      ${mockBTextarea('instruction', 2, t('Masalan: kamida 70 so‘z yozing'))}
      <label class="mock-field-label">${t('Fayl (R2, ixtiyoriy)')}</label>
      <div class="mock-file-row">
        <input type="file" data-mb-file="fileUrl" data-mb-name="fileName" data-mb-folder="mock/files" />
        ${mockBGet('fileUrl') ? `<a class="btn btn-xs ghost" href="${esc(mockBGet('fileUrl'))}" target="_blank" rel="noopener">${ico('paperclip', 13)} ${esc(mockBGet('fileName') || t('Fayl'))}</a>
          <button type="button" class="btn btn-xs ghost" data-act="mock-b-file-clear" data-path="fileUrl">${ico('trash', 12)}</button>` : `<span class="muted small">${t('Fayl tanlanmagan')}</span>`}
      </div>`;
  }
  if (c.key === 'speaking') {
    return (def.questions || []).map(function (q, i) {
      const base = 'questions.' + i;
      return `<div class="mock-build-part">
        <div class="mock-build-part-head"><b>${t('Savol')} ${i + 1}</b>${mockBRemove('mock-b-del-speak', String(i))}</div>
        ${mockBInput(base + '.text', t('Savol matni'))}
        <div class="mock-file-row">
          <input type="file" accept="image/*" data-mb-file="${esc(base + '.imageUrl')}" data-mb-name="${esc(base + '.imageName')}" data-mb-folder="mock/images" />
          ${mockBGet(base + '.imageUrl') ? `<img class="mock-q-img mock-builder-img" src="${esc(mockBGet(base + '.imageUrl'))}" alt="" />
            <button type="button" class="btn btn-xs ghost" data-act="mock-b-file-clear" data-path="${esc(base + '.imageUrl')}">${ico('trash', 12)}</button>` : `<span class="muted small">${t('Rasm tanlanmagan')}</span>`}
        </div>
      </div>`;
    }).join('') + `<button type="button" class="btn btn-xs ghost mock-add-task" data-act="mock-b-add-speak">${ico('plus', 13)} ${t('Savol qo‘shish')}</button>`;
  }
  return mockThresholdsHTML(def) + mockBQuestionsBlock('questions', t('Savollar')) +
    `<button type="button" class="btn btn-xs ghost mock-add-task" data-act="mock-b-add-q" data-path="questions">${ico('plus', 13)} ${t('Savol qo‘shish')}</button>`;
}
function mockOpenBuilder(def) {
  if (!canStaff('mock')) { toast("Ruxsat yo'q", 'error'); return; }
  state.mockAssignId = '';
  state.mockDelId = '';
  state.mockBStep = 'text';
  state.mockBuilder = {
    draft: def ? JSON.parse(JSON.stringify(def)) : mockNewDraft(state.mockCatView || state.mockTab || 'reading'),
    isNew: !def
  };
  render();
  const el = $('#screen');
  if (el) el.scrollTop = 0;
}
function mockBuilderSave() {
  if (!canStaff('mock')) { toast("Ruxsat yo'q", 'error'); return; }
  const draft = state.mockBuilder && state.mockBuilder.draft;
  if (!draft) return;
  if (!String(draft.title || '').trim()) { toast(t('Mock nomini kiriting'), 'error'); return; }
  const def = mockNormalizeDef(draft);
  const c = mockCat(def.category);
  let valid = false;
  if (c.key === 'writing') valid = !!def.prompt;
  else if (c.key === 'speaking') valid = def.questions.some(function (q) { return !!q.text; });
  else if (c.key === 'reading') valid = def.parts.some(function (p) { return p.questions.some(mockQuestionValid); });
  else if (c.key === 'listening') valid = def.tasks.some(function (tk) { return tk.questions.some(mockQuestionValid); });
  else valid = def.questions.some(mockQuestionValid);
  if (!valid) { toast(t('Kamida bitta savol va javob kiriting'), 'error'); return; }
  mockSaveDef(def);
  state.mockBuilder = null;
  state.mockTab = def.category;
  state.mockCatView = def.category;
  render();
  toast(t('Mock test saqlandi'));
}
function mockBAddQuestion(path) {
  if (!state.mockBuilder) return;
  const arr = mockFieldValue(state.mockBuilder.draft, path);
  if (Array.isArray(arr)) arr.push(mockNewQuestion('B1'));
  render();
}
/* Savol turi: variantli (A, B, C, ...) yoki yozma javob (so'z/gap) */
function mockBSetQType(path, type) {
  const q = mockBNode(path);
  if (!q) return;
  q.type = type === 'written' ? 'written' : 'mcq';
  if (q.type === 'mcq' && (!Array.isArray(q.opts) || q.opts.length < 2)) q.opts = ['', '', ''];
  if (q.type === 'written' && typeof q.answer !== 'string') q.answer = '';
  render();
}
function mockBAddOption(path) {
  const q = mockBNode(path);
  if (!q) return;
  if (!Array.isArray(q.opts)) q.opts = [];
  q.opts.push('');
  render();
}
function mockBDelOption(path, idx) {
  const q = mockBNode(path);
  if (!q || !Array.isArray(q.opts) || q.opts.length <= 2) return;
  const i = Number(idx);
  q.opts.splice(i, 1);
  if (Number(q.ans) >= q.opts.length) q.ans = 0;
  else if (Number(q.ans) > i) q.ans = Number(q.ans) - 1;
  render();
}
function mockBDelQuestion(path, idx) {
  if (!state.mockBuilder) return;
  const arr = mockFieldValue(state.mockBuilder.draft, path);
  if (Array.isArray(arr) && arr.length > 1) arr.splice(Number(idx), 1);
  render();
}

/* Diagnostika (smoke testlar uchun) */
window.__mock = {
  saveDef: mockSaveDef,
  defs: mockDefs,
  deleteDef: mockDeleteDef,
  saveSpeakingVideo: mockSaveSpeakingVideo,
  results: mockResults,
  pending: mockPendingCount
};

/* ==================== SUPPORT TEACHERLAR (faqat asosiy o'qituvchi) ==================== */
function supportPermChipsHTML(rec) {
  const perms = supportPermsOf(rec);
  return SUPPORT_PERM_LIST.map(function (p) {
    return `<span class="sup-perm${perms[p.key] ? ' on' : ''}">${perms[p.key] ? ico('check', 11) : ico('close', 11)} ${esc(t(p.label))}</span>`;
  }).join('');
}
function supportCardHTML(rec) {
  const groups = supportRecordGroupIds(rec).map(function (id) { return groupById(id); }).filter(Boolean);
  return `<div class="card sup-card">
    <div class="sup-card-head">
      <div class="avatar">${esc(initials(rec.name))}</div>
      <div class="col">
        <div class="s-name">${esc(rec.name)}</div>
        <div class="muted small">Login: <span class="login-val">${esc(rec.login || '')}</span></div>
      </div>
      <span class="chip-class">Support</span>
    </div>
    <div class="sup-card-groups">${groups.length
      ? groups.map(function (g) { return `<span class="sup-group-pill">${ico('groups', 11)} ${esc(g.name)}</span>`; }).join('')
      : `<span class="muted small">${t('Guruh biriktirilmagan')}</span>`}</div>
    <div class="sup-card-perms">${supportPermChipsHTML(rec)}</div>
    <div class="st-actions">
      <button type="button" class="btn btn-xs ghost" data-act="support-edit" data-id="${esc(rec.id)}">${ico('brush', 14)} ${t('Tahrirlash')}</button>
      <button type="button" class="btn btn-xs danger" data-act="support-del" data-id="${esc(rec.id)}">${ico('trash', 14)} ${t("O'chirish")}</button>
    </div>
  </div>`;
}
function supportScreen() {
  if (!isTeacher()) return blockedScreen("Bu bo'lim faqat asosiy o'qituvchi uchun");
  const list = supportTeachers();
  return `
  <div class="screen-head">
    <div>
      <h2 class="screen-title">${ico('profile', 16)} ${t('Support teacherlar')}</h2>
      <div class="muted small">${list.length} ta support teacher</div>
    </div>
    <button type="button" class="btn btn-primary btn-sm" data-act="support-add">+ ${t("Support teacher qo'shish")}</button>
  </div>
  <div class="card sup-info">
    <div class="strong-label">${ico('alert', 14)} ${t('Qanday ishlaydi')}</div>
    <div class="muted small">Support teacher faqat shu yerda biriktirilgan guruhlar va belgilangan ruxsatlar bilan ishlaydi. Uning guruhlari <b>Guruhlar</b> va <b>O'quvchilar</b> bo'limlarida faqat <b>«Support teacherni nazorat qilish»</b> rejimi yoniq bo'lganda ko'rinadi.</div>
  </div>
  ${list.length
    ? list.map(supportCardHTML).join('')
    : emptyState("Hozircha support teacher qo'shilmagan — «Support teacher qo'shish» tugmasini bosing", 'profile')}
  `;
}

function openSupportModal(id) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const rec = id ? supportTeacherById(id) : null;
  const sel = supportRecordGroupIds(rec);
  const perms = supportPermsOf(rec);
  const groups = getGroups();
  state.supportEditId = rec ? String(rec.id) : '';
  openModal(`
    <div class="modal-head">
      <h3>${rec ? 'Support teacherni tahrirlash' : "Support teacher qo'shish"}</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <label class="field-label" for="sup-name">Ism familiya</label>
    <input class="input" id="sup-name" type="text" placeholder="Masalan: Dilshod Karimov" value="${rec ? esc(rec.name) : ''}" />
    <div class="row g8">
      <div class="col">
        <label class="field-label" for="sup-login">Login</label>
        <input class="input" id="sup-login" type="text" autocomplete="off" placeholder="support1" value="${rec ? esc(rec.login || '') : ''}" />
      </div>
      <div class="col">
        <label class="field-label" for="sup-pass">Parol</label>
        <input class="input" id="sup-pass" type="password" autocomplete="new-password" placeholder="${rec ? "Bo'sh qoldirsangiz o'zgarmaydi" : 'Kamida 3 ta belgi'}" />
      </div>
    </div>

    <div class="field-label">${t("Guruhlar (support faqat shu guruhlarni ko'radi)")}</div>
    <div class="sup-check-list" id="sup-groups">
      ${groups.length ? groups.map(function (g) {
        return `<label class="sup-check"><input type="checkbox" class="sup-group-check" value="${esc(g.id)}"${sel.indexOf(String(g.id)) >= 0 ? ' checked' : ''} /><span>${esc(g.name)}</span></label>`;
      }).join('') : `<div class="muted small">${t("Hozircha guruh yo'q")}</div>`}
    </div>

    <div class="field-label">${t('Ruxsatlar')}</div>
    <div class="sup-check-list" id="sup-perms">
      ${SUPPORT_PERM_LIST.map(function (p) {
        return `<label class="sup-check"><input type="checkbox" class="sup-perm-check" value="${p.key}"${perms[p.key] ? ' checked' : ''} /><span><b>${esc(t(p.label))}</b><span class="muted small sup-check-hint">${esc(t(p.hint))}</span></span></label>`;
      }).join('')}
    </div>

    <div class="field-error" id="sup-error"></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-primary" data-act="support-save">${ico('save', 15)} Saqlash</button>
    </div>
  `);
}

function saveSupportTeacher() {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const errEl = $('#sup-error');
  const showErr = function (msg) {
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
    toast(msg, 'error');
  };
  const nameEl = $('#sup-name');
  const loginEl = $('#sup-login');
  const passEl = $('#sup-pass');
  const name = String((nameEl && nameEl.value) || '').trim();
  const login = String((loginEl && loginEl.value) || '').trim().toLowerCase();
  const pass = String((passEl && passEl.value) || '');
  const cur = state.supportEditId ? supportTeacherById(state.supportEditId) : null;

  if (name.length < 3) { showErr('Ism familiyani kiriting'); return; }
  if (!/^[a-z0-9_]{3,24}$/.test(login)) { showErr('Login 3–24 belgi: faqat lotin harflari, raqam va _'); return; }
  if (login === TEACHER_LOGIN) { showErr("Bu login asosiy o'qituvchiga tegishli"); return; }
  if (getStudents().some(function (s) { return String(loginOfStudent(s.id, s) || '').toLowerCase() === login; })) {
    showErr("Bu login o'quvchiga band — boshqa login tanlang"); return;
  }
  if (supportTeachers().some(function (r) {
    return String(r.login || '').toLowerCase() === login && (!cur || String(r.id) !== String(cur.id));
  })) { showErr('Bu login boshqa support teacherda band'); return; }
  if (!cur && pass.length < 3) { showErr("Parol kamida 3 ta belgi bo'lsin"); return; }
  if (pass && pass.length < 3) { showErr("Parol kamida 3 ta belgi bo'lsin"); return; }

  const groupIds = $$('.sup-group-check').filter(function (el) { return el.checked; })
    .map(function (el) { return String(el.value); });
  if (!groupIds.length) { showErr('Kamida bitta guruhni tanlang'); return; }
  const perms = {};
  SUPPORT_PERM_LIST.forEach(function (p) { perms[p.key] = false; });
  $$('.sup-perm-check').forEach(function (el) { perms[el.value] = !!el.checked; });

  const rec = {
    id: cur ? cur.id : ('sup' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
    name: name,
    login: login,
    groupIds: groupIds,
    perms: perms,
    createdAt: cur ? cur.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (pass) rec.passwordHash = hashPasswordSync(pass);
  else if (cur) rec.passwordHash = cur.passwordHash || '';

  const list = supportTeachers();
  const i = list.map(function (r) { return String(r.id); }).indexOf(String(rec.id));
  if (i >= 0) list[i] = rec; else list.push(rec);
  persistSupportTeachers(list);
  closeModal();
  render();
  toast(cur ? 'Support teacher yangilandi ✓' : "Support teacher qo'shildi ✓");
}

function openDeleteSupport(id) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const rec = supportTeacherById(id);
  if (!rec) return;
  state.supportDelId = String(rec.id);
  openModal(`
    <div class="modal-head">
      <h3>Support teacherni o'chirish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <p>Haqiqatan ham <b>${esc(rec.name)}</b>ni o'chirmoqchimisiz? Uning kirish hisobi o'chadi, guruhlari yana asosiy o'qituvchi panelida ko'rinadi.</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">Bekor qilish</button>
      <button type="button" class="btn btn-danger" data-act="support-do-del" data-id="${esc(rec.id)}">Ha, o'chirish</button>
    </div>
  `);
}

function doDeleteSupport(id) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  persistSupportTeachers(supportTeachers().filter(function (r) { return String(r.id) !== String(id); }));
  state.supportDelId = '';
  closeModal();
  render();
  toast("Support teacher o'chirildi");
}

/* ==================== Render ==================== */
const SCREENS = {
  'login': loginScreen,
  'home': homeScreen,
  'groups': groupsScreen,
  'students': studentsScreen,
  'homework': homeworkScreen,
  'debtors': debtorsScreen,
  'payments': paymentsScreen,
  'grades': gradesScreen,
  'attendance': attendanceScreen,
  'speaking': speakingScreen,
  'submissions': submissionsScreen,
  'profile': profileScreen,
  'mock': mockTeacherScreen,
  'support': supportScreen
};

/* Xavfsizlik chegarasi: noto'g'ri rol o'ziga tegishli ekranlara kira olmaydi */
function canAccess(scr) {
  if (scr === 'login') return true;
  if (scr === 'home' || scr === 'profile') return true;
  if (scr === 'support') return isTeacher();
  if (TEACHER_SCREENS.indexOf(scr) >= 0) {
    if (isTeacher()) return true;
    if (!isSupport()) return false;
    /* Support teacher faqat ruxsat berilgan bo'limlarga kiradi */
    const p = SUPPORT_SCREEN_PERM[scr];
    return !!p && supportPerm(p);
  }
  return false;
}

function render() {
  let scr = state.screen;
  if (!currentUser()) scr = 'login';
  else if (!canAccess(scr)) scr = 'home';
  state.screen = scr;
  /* Rol almashganda mock ko'rinish holati qolib ketmasin */
  const mockRole = isTeacher() ? 'teacher' : 'student';
  if (state.mockRole !== mockRole) {
    state.mockRole = mockRole;
    mockTimerStop();
    state.mockRun = null;
    state.mockResultId = '';
    state.mockCatView = '';
    state.mockOpen = {};
  }

  document.body.classList.toggle('auth-mode', AUTH_SCREENS.indexOf(scr) >= 0);
  $('#app-header').innerHTML = renderHeader();
  $('#bottom-nav').innerHTML = renderNav();
  renderTopNavTabs();
  renderTopNavControls();
  /* Filtr pillari skroll holatini saqlab qolamiz (qayta renderda 0 ga sakramasin) */
  if (scr === 'submissions') {
    const oldBar = $('#sub-filters');
    if (oldBar) state.subScroll = oldBar.scrollLeft || 0;
  }
  $('#screen').innerHTML = (SCREENS[scr] || loginScreen)();
  if (scr === 'submissions') {
    const bar = $('#sub-filters');
    if (bar) {
      bar.scrollLeft = Number(state.subScroll) || 0;
      bar.setAttribute('data-scroll', String(Number(state.subScroll) || 0));
    }
  }
  if (scr === 'login') {
    state.turnstileToken = '';
    if (authStep() === 'recover') { paintRecoverCaptcha(); startResendTimer(); }
    else if (authStep() === 'login') paintCaptcha();
  }
  if (scr === 'profile') ensureAdminContacts();
  if (scr === 'students') refreshStudentList();
  if (scr === 'grades') ensureGradeState();
  if (scr === 'attendance') ensureAttState();
  if (scr === 'speaking') ensureSpeakState();
  if (state.mockRun && (scr === 'mock' || (scr === 'home' && state.studentView === 'mock'))) mockTimerEnsure();
  else mockTimerStop();
  if (scr === 'home' && !isTeacher()) refreshChat();
  syncLoginLock();
  applyCurrentLang();
}

/* ==================== CHAT (Ustoz ↔ O'quvchi) ==================== */
function chatSeenMap() { return store.get(K.chatSeen, {}) || {}; }
function chatUnreadFor(sid) {
  const seen = String(chatSeenMap()[sid] || '');
  return messagesFor(sid).filter(function (m) {
    return m.sender === 'teacher' && String(m.createdAt || '') > seen;
  }).length;
}
function markChatSeen(sid) {
  if (!sid) return;
  const map = chatSeenMap();
  map[sid] = new Date().toISOString();
  store.set(K.chatSeen, map);
}
function fmtHM(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function messagesFor(sid) {
  const rows = store.get(K.messages, []).filter(m => m.sid === sid);
  /* Takroriy xabarlarni yagona id bo'yicha kesib tashlaymiz */
  const uniqueMessages = Array.from(new Map(rows.map(m => [m.id, m])).values());
  return uniqueMessages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}
function chatListHTML(sid, viewer) {
  const msgs = messagesFor(sid);
  if (!msgs.length) return `<div class="empty"><span class="empty-ico">${ICON.message}</span>${t("Hozircha xabar yo'q")}</div>`;
  return msgs.map(function (m) {
    const mine = m.sender === viewer;
    const mid = String(m.id);
    if (mine && state.chatEditId === mid) {
      return `<div class="chat-msg mine chat-editing" data-message-id="${esc(mid)}">
        <input class="input chat-edit-input" id="chat-edit-input" value="${esc(m.text)}" />
        <div class="chat-actions">
          <button type="button" class="chat-ico" data-act="chat-save" data-mid="${esc(mid)}" aria-label="${esc(t('Saqlash'))}">${ico('check', 15)}</button>
          <button type="button" class="chat-ico" data-act="chat-cancel" aria-label="${esc(t('Bekor qilish'))}">${ico('close', 15)}</button>
        </div>
      </div>`;
    }
    if (mine && state.chatDelId === mid) {
      return `<div class="chat-msg mine chat-deleting" data-message-id="${esc(mid)}">
        <div class="chat-text">${t("Xabarni o'chirasizmi?")}</div>
        <div class="chat-actions">
          <button type="button" class="chat-ico danger" data-act="chat-del-confirm" data-mid="${esc(mid)}" aria-label="${esc(t('Ha'))}">${ico('check', 15)}</button>
          <button type="button" class="chat-ico" data-act="chat-del-cancel" aria-label="${esc(t('Bekor qilish'))}">${ico('close', 15)}</button>
        </div>
      </div>`;
    }
    return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}" data-message-id="${esc(mid)}">
      <div class="chat-text">${esc(m.text)}${m.editedAt ? ` <span class="chat-edited">(${t('tahrirlangan')})</span>` : ''}</div>
      <div class="chat-foot">
        <span class="chat-time">${fmtHM(m.createdAt)}</span>
        ${mine ? `<span class="chat-actions">
          <button type="button" class="chat-ico" data-act="chat-edit" data-mid="${esc(mid)}" aria-label="${esc(t('Tahrirlash'))}">${ico('brush', 14)}</button>
          <button type="button" class="chat-ico danger" data-act="chat-del" data-mid="${esc(mid)}" aria-label="${esc(t('O\'chirish'))}">${ico('trash', 14)}</button>
        </span>` : ''}
      </div>
    </div>`;
  }).join('');
}
function chatHint() {
  if (CloudSync.messagesAvailable()) return '';
  return `<div class="chat-hint">${ico('alert', 14)} Supabase'da <code>messages</code> jadvali topilmadi — xabarlar shu qurilmada saqlanadi (<code>supabase.sql</code> ni ishga tushiring).</div>`;
}
function activeChat() {
  if (state.chatSid) return { sid: state.chatSid, viewer: 'teacher' };
  const st = linkedStudent();
  return st ? { sid: st.id, viewer: 'student' } : null;
}
function updateChatView() {
  const list = $('#chat-list');
  const c = activeChat();
  if (!list || !c) return;
  list.innerHTML = '';
  list.innerHTML = chatListHTML(c.sid, c.viewer);
  list.scrollTop = list.scrollHeight;
}
function refreshChat() {
  const c = activeChat();
  if (!c) return Promise.resolve(false);
  return CloudSync.fetchMessages(c.sid).then(function () { updateChatView(); return true; });
}
function openChat(sid) {
  if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
  const st = studentById(sid);
  if (!st) return;
  state.chatSid = sid;
  state.chatEditId = null;
  state.chatDelId = null;
  openModal(`
    <div class="modal-head">
      <h3>${ico('message', 20)} Xabar yozish</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>
    <div class="editor-info">
      <div class="avatar">${esc(initials(st.fullName))}</div>
      <div class="col">
        <div class="s-name">${esc(st.fullName)}</div>
        <div class="muted small">${esc(st.schoolClass)} • ${groupById(st.groupId) ? esc(groupById(st.groupId).name) : "Guruh taylanmagan"}</div>
      </div>
    </div>
    ${chatHint()}
    <div class="chat-list" id="chat-list">${chatListHTML(sid, 'teacher')}</div>
    <div class="chat-input-row">
      <input class="input" id="chat-input" placeholder="${t('Xabar yozing...')}" autocomplete="off" />
      <button type="button" class="btn btn-primary" data-act="send-chat">Yuborish</button>
    </div>`);
  updateChatView();
  refreshChat();
  setTimeout(function () { const el = $('#chat-input'); if (el) el.focus(); }, 60);
}
function saveChatEdit(mid) {
  const inp = $('#chat-edit-input');
  const text = inp ? String(inp.value || '').trim() : '';
  if (!text) { toast('Xabar matnini kiriting', 'error'); return; }
  state.chatEditId = null;
  const saving = CloudSync.editMessage(mid, text);
  updateChatView(); /* lokal kesh darhol yangilandi */
  Promise.resolve(saving)
    .catch(function (e) { console.warn('[cloud] edit:', (e && e.message) || e); })
    .then(function () { updateChatView(); });
}

function confirmChatDelete(mid) {
  state.chatDelId = null;
  const removing = CloudSync.deleteMessage(mid);
  updateChatView(); /* lokal kesh darhol yangilandi */
  Promise.resolve(removing)
    .catch(function (e) { console.warn('[cloud] del:', (e && e.message) || e); })
    .then(function () { updateChatView(); });
}

function sendChat() {
  const c = activeChat();
  const input = $('#chat-input');
  if (!c || !input) return;
  const text = (input.value || '').trim();
  if (!text) { toast('Xabar matnini kiriting', 'error'); return; }
  const sendBtn = document.querySelector('[data-act="send-chat"]');
  if (sendBtn) sendBtn.disabled = true; /* Supabase insert tugaguncha o'chiriladi */
  input.value = '';
  /* Lokal xabar keshga darhol tushadi (sendMessage ichida) — shuning uchun
     natroniy ham render qilamiz, insert tugagach esa qayta render + tugma ochiladi. */
  const sending = CloudSync.sendMessage(c.sid, c.viewer, text);
  updateChatView();
  Promise.resolve(sending)
    .catch(function (e) { console.warn('[cloud] send:', (e && e.message) || e); })
    .then(function () {
      updateChatView();
      if (sendBtn) sendBtn.disabled = false;
    });
}

/* ==================== Hodisalar ==================== */
/* ==================== SPEAKING QARZI ==================== */
function changeDebt(sid, delta) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const list = getStudents();
  const st = list.filter(x => x.id === sid)[0];
  if (!st) return;
  st.speakingDebt = Math.max(0, (Number(st.speakingDebt) || 0) + delta);
  store.set(K.students, list);
  CloudSync.adjustDebt(sid, delta);
  render();
  toast("Speaking qarzi: " + st.speakingDebt + " ta");
}

/* ==================== TELEGRAM TOPSHIRIKLARINI BAHOLASH (Ustoz) ==================== */
function gradeTgSub(tid, score) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const subs = getTgSubs();
  const sub = subs.filter(x => x.id === tid)[0];
  if (!sub) return;
  const wasGraded = sub.status === 'baholandi' || sub.status === 'graded';
  sub.status = 'baholandi';
  sub.score = score;
  const fbInput = document.querySelector('[data-act="tg-feedback"][data-tid="' + tid + '"]');
  if (fbInput) sub.feedback = fbInput.value.trim();
  store.set(K.tgsubs, subs);

  const st = getStudents().filter(x => x.id === sub.sid)[0];
  const dateKey = sub.createdAt ? String(sub.createdAt).slice(0, 10) : todayKey();

  /* Baholangan har bir topshirik = qarzdan −1 (faqat birinchi marta) */
  if (st && !wasGraded) {
    const list = getStudents();
    const t = list.filter(x => x.id === sub.sid)[0];
    if (t) {
      t.speakingDebt = Math.max(0, (Number(t.speakingDebt) || 0) - 1);
      store.set(K.students, list);
      CloudSync.adjustDebt(t.id, -1);
    }
  }

  /* O'quvchi baholar jurnaliga yozish — bir xil sana uchun OLDINGI sessiyalar yo'qolmaydi */
  if (st) {
    const grades = getGrades();
    if (!grades[st.id]) grades[st.id] = {};
    logSpeakingSession(st.id, dateKey, score, 'telegram');
    const prev = grades[st.id][dateKey];
    if (prev) {
      /* Shu kunda sessiya allaqachon bor: avvalgi yozuv ustiga yozilmaydi,
         yangi sessiya qo'shimcha sifatida note ga qo'shiladi */
      prev.note = (prev.note ? prev.note + ' • ' : '') + 'Sessiya ' + prev.score + '/10 → ' + score + '/10' + (sub.feedback ? ' — ' + sub.feedback : '');
      prev.score = score;
    } else {
      grades[st.id][dateKey] = { score: score, category: 'Speaking', note: sub.feedback || 'Speaking (Telegram)' };
    }
    store.set(K.grades, grades);
    CloudSync.pushGrade(st.id, dateKey);
  }

  CloudSync.pushSpeakingGrade(tid);
  /* Baholangan karta INBOXdan silliq chiqib ketadi */
  const card = document.querySelector('[data-tgcard="' + tid + '"]');
  if (card && card.classList) {
    card.classList.add('is-leaving');
    setTimeout(function () { render(); }, 200);
  } else {
    render();
  }
  toast("Baho saqlandi ✓ (qarz kamaydi)");
}

/* ==================== TELEGRAM TOPSHIRIQLARINI BEKOR QILISH (Ustoz) ==================== */
/* Faqat status 'rad_etildi' bo'ladi: qarz KAMAYMAYDI va baholar jurnaliga yozilmaydi */
function rejectTgSub(tid) {
  if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
  const subs = getTgSubs();
  const sub = subs.filter(x => x.id === tid)[0];
  if (!sub || sub.status === 'rad_etildi') return;
  sub.status = 'rad_etildi';
  sub.score = null;
  store.set(K.tgsubs, subs);
  CloudSync.pushSpeakingGrade(tid);  /* Supabase'ga status='rad_etildi' — qarz/jurnal tegilmaydi */

  /* Karta INBOXdan silliq chiqib ketadi */
  const card = document.querySelector('[data-tgcard="' + tid + '"]');
  if (card && card.classList) {
    card.classList.add('is-leaving');
    setTimeout(function () { render(); }, 200);
  } else {
    render();
  }
  toast("Topshirik bekor qilindi ✓ (qarz o'zgarmadi)");
}


/* ==================== TO'LOV CHEKI VA KARTA FUNKSIYALARI ==================== */
function openPayReceiptModal(amount, period) {
  const card = store.get(K.cardSettings, { number: '8600 0000 0000 0000', holder: 'MUZAFFAR AMIROV' });
  const rawNum = String(card.number || '8600 0000 0000 0000').replace(/\s+/g, '');
  const fmtCard = rawNum.replace(/(\d{4})/g, '$1 ').trim();
  const cardHolder = card.holder || 'MUZAFFAR AMIROV';
  const sum = Number(amount) || 0;
  const per = period || currentPeriod();

  openModal(`
    <div class="modal-head">
      <h3>${ico('creditCard', 18)} ${t("Karta orqali to'lov")}</h3>
      <button type="button" class="icon-btn" data-act="close-modal" aria-label="Yopish">✕</button>
    </div>

    <div class="bank-card-box" style="background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);color:#fff;border-radius:14px;padding:16px;margin:8px 0 12px 0;box-shadow:0 6px 18px rgba(37,99,235,0.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:12px;letter-spacing:1px;font-weight:700;opacity:0.9">UZCARD / HUMO</span>
        <span style="display:inline-flex;vertical-align:middle">${ico('creditCard', 20)}</span>
      </div>
      <div style="font-family:monospace;font-size:18px;letter-spacing:2px;font-weight:700;margin-bottom:12px">${esc(fmtCard)}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="font-size:10px;opacity:0.75;text-transform:uppercase">${t('Karta egasi')}</div>
          <div style="font-size:13px;font-weight:600;letter-spacing:0.5px">${esc(cardHolder)}</div>
        </div>
        <button type="button" class="btn btn-xs" data-act="copy-card" data-card="${esc(rawNum)}" style="background:#fff;color:#1e3a8a;font-weight:600;border:none;border-radius:6px;padding:4px 10px">${ico('copy', 14)} ${t('Nusxalash')}</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:10px;padding:10px">
      <div class="row between"><span class="muted small">${t('Oy:')}</span><b>${esc(monthLabel(per))}</b></div>
      <div class="row between" style="margin-top:4px"><span class="muted small">${t("To'lanadigan summa:")}</span><b style="color:var(--primary,#2563eb);font-size:16px">${fmtSom(sum)} so'm</b></div>
    </div>

    <div class="receipt-upload" style="margin-bottom:12px">
      <label class="field-label" for="receipt-file">${ico('paperclip', 14)} ${t("To'lov chekini yuklash (Rasm):")}</label>
      <div class="hw-upload-row">
        <label class="hw-upload-btn" for="receipt-file">
          <span class="hw-upload-ico" aria-hidden="true">${ico('folder', 18)}</span>
          <span>${t('Fayl tanlash')}</span>
        </label>
        <input type="file" id="receipt-file" accept="image/*" class="hw-file-input" />
        <span class="muted small" id="receipt-file-name">${t('Fayl tanlanmagan')}</span>
      </div>
      <div id="receipt-preview-wrap" style="display:none;margin-top:8px;text-align:center">
        <img id="receipt-preview-img" src="" alt="${esc(t('Chek rasmi'))}" style="max-height:160px;max-width:100%;border-radius:8px;border:1px solid #e2e8f0" />
      </div>
      <div class="field-error" id="receipt-error"></div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-act="close-modal">${t('Bekor qilish')}</button>
      <button type="button" class="btn btn-primary" data-act="do-submit-receipt" data-amount="${sum}" data-period="${esc(per)}">${ico('upload', 14)} ${t('Chekni yuborish')}</button>
    </div>
  `);

  const fi = $('#receipt-file');
  if (fi) {
    fi.addEventListener('change', function () {
      const file = fi.files && fi.files[0];
      const wrap = $('#receipt-preview-wrap');
      const img = $('#receipt-preview-img');
      const nameEl = $('#receipt-file-name');
      if (nameEl) nameEl.textContent = file ? (file.name || '') : t('Fayl tanlanmagan');
      if (file && wrap && img && window.URL) {
        img.src = URL.createObjectURL(file);
        wrap.style.display = 'block';
      }
    });
  }
}

async function doSubmitPaymentReceipt() {
  const fi = $('#receipt-file');
  const file = fi && fi.files && fi.files[0];
  const err = $('#receipt-error');
  if (!file) {
    if (err) { err.textContent = "Iltimos, to'lov cheki rasmini tanlang"; err.classList.add('show'); }
    return;
  }
  const btn = $('[data-act="do-submit-receipt"]');
  const amount = Number(btn ? btn.getAttribute('data-amount') : 0) || 0;
  const period = btn ? btn.getAttribute('data-period') : currentPeriod();
  const st = linkedStudent();
  if (!st || st.dbId == null) {
    toast("O'quvchi ma'lumoti topilmadi", 'error');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Yuklanmoqda...'; }
  try {
    const uploadRes = await CloudSync.uploadReceiptImage(file);
    await CloudSync.submitPaymentReceipt(st.dbId, period, amount, uploadRes.url);
    closeModal();
    render();
    toast("Chekingiz qabul qilindi! Ustoz tasdiqlashi bilan qarzingiz o'chiriladi.");
  } catch (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = ico('upload', 14) + ' ' + t('Chekni yuborish'); }
    if (err) { err.textContent = "Yuklashda xatolik: " + ((e && e.message) || 'xatolik'); err.classList.add('show'); }
  }
}


document.addEventListener('input', function (e) {
  const ta = e.target;
  if (!ta) return;
  const mb = ta.getAttribute ? ta.getAttribute('data-mb') : '';
  if (mb === 'group' || (ta.type || '').toLowerCase() === 'checkbox') return;
  if (mb && state.mockBuilder) { mockBSet(mb, String(ta.value || '')); return; }
  if (ta.id !== 'mock-writing') return;
  if (state.mockRun) state.mockRun.text = String(ta.value || '');
  const el = document.getElementById('mock-word-count');
  if (el) el.textContent = String(mockWordCount(ta.value));
});

/* Mock builder: fayl (audio/rasm/hujjat) R2'ga yuklanadi */
async function mockBBuilderUpload(input, path) {
  const file = input && input.files && input.files[0];
  if (!file || !state.mockBuilder) return;
  const folder = input.getAttribute('data-mb-folder') || 'mock/uploads';
  toast(t('Yuklanmoqda...'));
  try {
    const up = await uploadFileToR2(file, folder);
    mockBSet(path, up.url);
    const namePath = input.getAttribute('data-mb-name');
    if (namePath) mockBSet(namePath, file.name || up.name || '');
    render();
    toast(t('Fayl yuklandi'));
  } catch (err) {
    toast(t('Yuklab bo‘lmadi. Qayta urinib ko‘ring.'), 'error');
  }
}
document.addEventListener('click', function (e) {
  const btn = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
  if (!btn) return;
  const act = btn.getAttribute('data-act');

  /* Support teacher: faqat asosiy ustoz ruxsat bergan amallar bajariladi */
  if (isSupport()) {
    const permForAct = {
      'open-hw': 'homework', 'save-hw': 'homework', 'edit-hw': 'homework',
      'del-hw': 'homework', 'do-del-hw': 'homework', 'hw-group': 'homework',
      'open-slot': 'speaking', 'save-slot': 'speaking', 'slot-assign': 'speaking',
      'slot-score': 'speaking', 'slot-del': 'speaking', 'slot-del-yes': 'speaking',
      'edit-grade': 'grades', 'grade-set': 'grades', 'grade-cat': 'grades',
      'grade-clear': 'grades', 'group-detail': 'students'
    };
    let need = permForAct[act] || '';
    if (!need && /^mock-/.test(act)) need = 'mock';
    if (!need && /^att-/.test(act)) need = 'attendance';
    if (!need && /^grade-/.test(act)) need = 'grades';
    if (need && !supportPerm(need)) {
      toast('Bu amal uchun ruxsat berilmagan', 'error');
      return;
    }
    const teacherOnly = [
      'open-add-group', 'save-group', 'edit-group', 'save-edit-group', 'del-group', 'do-del-group',
      'open-add-student', 'save-student', 'edit-student', 'save-edit-student', 'del-student', 'do-del-student',
      'reset-pwd', 'save-reset', 'pay-student', 'save-pay', 'debt-add', 'save-add-debt',
      'remind-student', 'remind-debtors', 'backup-dl', 'backup-pick', 'do-restore',
      'start-cleanup', 'do-cleanup', 'run-diagnostics', 'support-add', 'support-edit',
      'support-save', 'support-del', 'support-do-del', 'toggle-supervise', 'support-watch-group'
    ];
    if (teacherOnly.indexOf(act) >= 0) {
      toast("Bu amal faqat asosiy o'qituvchi uchun", 'error');
      return;
    }
  }

  const actions = {
    /* --- Kirish --- */
    'do-login': doLogin,
    'captcha-refresh': function () { refreshCaptcha(); },
    'open-forgot': openForgotPwd,
    'auth-login-open': function () { state.loginError = ''; setAuthStep('login'); },
    'auth-back': function () { setAuthStep(authStep() === 'recover' ? 'login' : 'landing'); },
    'recover-captcha-refresh': function () { refreshRecoverCaptcha(); },
    'forgot-send': function () { sendResetCode(); },
    'forgot-reset': function () { resetPassword(); },
    'resend-reset': function () { sendResetCode(); },
    'do-2fa': submitTwoFA,
    'resend-2fa': function () { if (state.pending2fa) startTeacher2FA(state.pending2fa.user); },
    'save-student-contact': saveStudentContact,
    'save-teacher-contact': saveTeacherContact,
    'clear-trusted': function () { forgetTrustedDevices(); },
    'resend-verify-existing': sendVerifyExisting,
    'do-verify-email': submitEmailVerify,
    'resend-verify-email': function () {
      const c = state.verifyEmail;
      if (c) sendEmailVerifyCode(c.email, c.kind);
    },
    'logout': logout,
    'nav': function () {
      const scr = btn.getAttribute('data-screen');
      if (scr === 'homework') state.hwGroup = null;
      if (scr === 'groups') state.groupDetail = '';
      go(scr);
    },

    /* --- Dashboard stat kartalari (bosiladigan) --- */
    'stat-groups': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      state.groupTypeFilter = 'all';
      state.groupDetail = '';
      go('groups');
    },
    'stat-students': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      state.filterGroup = null;
      state.filterClass = 'Barchasi';
      state.search = '';
      go('students');
    },
    'stat-classes': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      state.filterGroup = null;
      state.filterClass = 'Barchasi';
      state.search = '';
      state.classHint = true;
      go('students');
      clearTimeout(state.classHintTimer);
      state.classHintTimer = setTimeout(function () {
        state.classHint = false;
        render();
      }, 1800);
    },
    'filter-class': function () {
      state.filterClass = btn.getAttribute('data-class');
      render();
    },
    /* Faqat uyga vazifa yuklashga ruxsati bor o'quvchilar */
    'filter-hw-allow': function () {
      state.filterHwAllow = !state.filterHwAllow;
      render();
    },
    /* Guruhlar ekrani: Maktab / Repetitorlik ajratmasi */
    'filter-group-type': function () {
      state.groupTypeFilter = btn.getAttribute('data-type') || 'all';
      render();
    },

    /* --- Guruhlar bo'limida guruh ichiga kirish: faqat ism + speaking qarzi --- */
    'group-detail': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      state.groupDetail = btn.getAttribute('data-gid') || '';
      render();
    },
    'group-detail-back': function () {
      state.groupDetail = '';
      render();
    },

    /* --- Support teacherlarni boshqarish va nazorat qilish --- */
    'support-add': function () { openSupportModal(''); },
    'support-edit': function () { openSupportModal(btn.getAttribute('data-id')); },
    'support-save': saveSupportTeacher,
    'support-del': function () { openDeleteSupport(btn.getAttribute('data-id')); },
    'support-do-del': function () { doDeleteSupport(btn.getAttribute('data-id')); },
    'toggle-supervise': function () {
      state.supervise = !state.supervise;
      if (!state.supervise) state.groupDetail = '';
      render();
      toast(state.supervise ? 'Support nazorat rejimi yoniq' : "Support nazorat rejimi o'chirildi");
    },
    'support-watch-group': function () {
      state.supervise = true;
      state.groupDetail = btn.getAttribute('data-gid') || '';
      go('groups');
    },

    /* --- O'quvchilar bo'limida guruh kartasi → to'liq o'quvchi boshqaruvi --- */
    'filter-group': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      state.filterGroup = btn.getAttribute('data-gid');
      state.filterClass = 'Barchasi';
      state.search = '';
      go('students');
    },
    'filter-group-all': function () {
      state.filterGroup = null;
      state.filterClass = 'Barchasi';
      state.search = '';
      render();
    },

    /* --- Uyga vazifalar bo'limi: guruh tanlash --- */
    'hw-group': function () {
      if (!canStaff('homework')) { toast("Ruxsat yo'q", 'error'); return; }
      state.hwGroup = btn.getAttribute('data-gid');
      render();
    },
    'hw-group-back': function () { state.hwGroup = null; render(); },

    /* --- Guruhlar / o'quvchilar --- */
    'open-add-group': openAddGroup,
    'edit-group': function () { openEditGroup(btn.getAttribute('data-gid')); },
    'save-edit-group': function () { saveEditGroup(btn.getAttribute('data-gid')); },
    'open-add-student': openAddStudent,
    'close-modal': closeModal,
    'save-group': saveGroup,
    'save-student': saveStudent,
    'reset-pwd': function () { openResetPwd(btn.getAttribute('data-sid')); },
    'edit-student': function () { openEditStudent(btn.getAttribute('data-sid')); },
    'save-edit-student': function () { saveEditStudent(btn.getAttribute('data-sid')); },
    'hw-upload-toggle': function () { toggleHwUploadAllowed(btn.getAttribute('data-sid')); },
    'hw-submit': function () { submitHomeworkFiles(btn); },
    'hw-comments-seen': function () { store.set(K.hwCommentsSeen, new Date().toISOString()); render(); },
    'hw-del-sub': function () { openDeleteSubmission(btn.getAttribute('data-sub')); },
    'sub-del': function () { openDeleteSubmission(btn.getAttribute('data-sub')); },
    'do-del-sub': function () { doDeleteSubmission(btn.getAttribute('data-sub')); },
    'run-diagnostics': function () { openDiagnostics(); },
    'diag-rerun': function () { fillDiagnostics(); },
    'speak-video-toggle': function () {
      const vid = btn.getAttribute('data-vid');
      const wrap = document.querySelector('.speak-video-wrap[data-vid="' + String(vid).replace(/"/g, '') + '"]');
      if (!wrap) return;
      const open = !wrap.classList.contains('is-expanded');
      wrap.classList.toggle('is-expanded', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const label = btn.querySelector('span');
      if (label) label.textContent = open ? t('Kichraytirish') : t("Videoni ko'rish");
    },
    'sub-group': function () {
      const bar = $('#sub-filters');
      if (bar) state.subScroll = bar.scrollLeft || 0;
      state.subGroup = btn.getAttribute('data-gid') || 'all';
      state.subEditId = null;
      state.subDelId = null;
      render();
    },
    'sub-comment': function () { sendSubmissionComment(btn); },
    'sub-comment-edit': function () {
      state.subEditId = btn.getAttribute('data-sub');
      state.subDelId = null;
      render();
      setTimeout(function () {
        const box = $('#sub-edit-' + state.subEditId);
        if (box && box.focus) { box.focus(); try { box.setSelectionRange(box.value.length, box.value.length); } catch (e) {} }
      }, 40);
    },
    'sub-comment-edit-cancel': function () { state.subEditId = null; render(); },
    'sub-comment-save': function () { saveSubmissionCommentEdit(btn.getAttribute('data-sub')); },
    'sub-comment-del': function () {
      state.subDelId = btn.getAttribute('data-sub');
      state.subEditId = null;
      render();
    },
    'sub-comment-del-cancel': function () { state.subDelId = null; render(); },
    'sub-comment-del-confirm': function () { removeSubmissionComment(btn.getAttribute('data-sub')); },
    'save-reset': function () { saveResetPwd(btn.getAttribute('data-sid')); },

    /* --- Zaxira (backup/restore) --- */
    'backup-dl': function () { downloadBackup(); },
    'backup-pick': function () {
      const el = $('#backup-file');
      if (el) el.click();
      else toast('Zaxira maydoni topilmadi', 'error');
    },
    'do-restore': function () { doRestoreBackup(); },

    /* --- Parol ko'zgusi --- */
    'toggle-pw': function () {
      const inp = document.getElementById(btn.getAttribute('data-target'));
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.innerHTML = show ? ICON.eyeOff : ICON.eye;
      btn.setAttribute('aria-label', show ? "Parolni yashirish" : "Parolni ko'rsatish");
    },

    /* --- Portal: Speaking topshirish (jonli dumaloq video yozgich) --- */
    'speak-cta': function () {
      const stu = linkedStudent();
      analyticsCall('capture', 'speaking_intent_opened',
        { has_debt: !!(stu && Number(stu.speakingDebt) > 0) });
      openSpeakingRecorder();
    },
    'speak-rec-close': function () { closeSpeakRecorder(); },
    'speak-rec-start': function () { startSpeakRecording(); },
    'speak-rec-stop': function () { stopSpeakRecording(); },
    'speak-rec-watch': function () { watchSpeakRecording(); },
    'speak-rec-retake': function () { retakeSpeakRecording(); },
    'speak-rec-submit': function () { submitSpeakRecording(); },
    'speak-rec-cancel': function () { closeSpeakRecorder(); },

    /* --- O'chirish (tasdiq bilan) --- */
    'del-student': function () { openDeleteStudent(btn.getAttribute('data-sid')); },
    'do-del-student': function () { doDeleteStudent(btn.getAttribute('data-sid')); },
    'del-group': function () { openDeleteGroup(btn.getAttribute('data-gid')); },
    'do-del-group': function () { doDeleteGroup(btn.getAttribute('data-gid')); },
    'open-change-pwd': openChangePwd,
    'save-change-pwd': saveChangePwd,

    /* --- Baholar jurnali --- */
    'grade-group': function () {
      state.gradeGroup = btn.getAttribute('data-group');
      state.gradeDate = '';
      render();
    },
    'grade-group-go': function () {
      state.gradeGroup = btn.getAttribute('data-group');
      state.gradeDate = '';
      go('grades');
    },
    'grade-date': function () {
      state.gradeDate = btn.getAttribute('data-date');
      render();
    },
    'grade-class': function () {
      state.gradeClass = btn.getAttribute('data-class');
      render();
    },
    'grade-week': function () {
      const dir = Number(btn.getAttribute('data-dir'));
      if (dir === 0) {
        state.weekOffset = 0;
      } else {
        state.weekOffset = (state.weekOffset || 0) + dir;
      }
      state.gradeDate = '';
      render();
    },
    'edit-grade': function () {
      openGradeEditor(btn.getAttribute('data-sid'), btn.getAttribute('data-date'));
    },
    'grade-set': function () {
      if (!state.editor) return;
      state.editor.score = Number(btn.getAttribute('data-score'));
      persistEditor(false);
      renderGradeEditor();
    },
    'grade-cat': function () {
      if (!state.editor) return;
      state.editor.category = btn.getAttribute('data-cat');
      if (state.editor.score != null) persistEditor(true);
      renderGradeEditor();
    },
    'grade-clear': function () {
      if (!state.editor) return;
      const all = getGrades();
      if (all[state.editor.sid]) {
        delete all[state.editor.sid][state.editor.date];
        store.set(K.grades, all);
        CloudSync.pushGrade(state.editor.sid, state.editor.date);
      }
      state.editor.score = null;
      renderGradeEditor();
      toast("Baho o'chirildi");
    },
    'close-grade': function () {
      closeModal();
      render();
    },

    /* --- Chat --- */
    'open-chat': function () { openChat(btn.getAttribute('data-sid')); },
    'send-chat': sendChat,
    'chat-edit': function () {
      state.chatEditId = btn.getAttribute('data-mid');
      state.chatDelId = null;
      updateChatView();
      setTimeout(function () {
        const inp = $('#chat-edit-input');
        if (inp) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {} }
      }, 40);
    },
    'chat-cancel': function () { state.chatEditId = null; updateChatView(); },
    'chat-save': function () { saveChatEdit(btn.getAttribute('data-mid')); },
    'chat-del': function () {
      state.chatDelId = btn.getAttribute('data-mid');
      state.chatEditId = null;
      updateChatView();
    },
    'chat-del-cancel': function () { state.chatDelId = null; updateChatView(); },
    'chat-del-confirm': function () { confirmChatDelete(btn.getAttribute('data-mid')); },
    'hw-comment-open': function () {
      store.set(K.hwCommentsSeen, new Date().toISOString());
      state.studentView = 'homework';
      state.hwFocus = btn.getAttribute('data-hid') || '';
      render();
      setTimeout(function () {
        if (!state.hwFocus) return;
        const el = document.querySelector('.hw-item[data-hid="' + String(state.hwFocus).replace(/"/g, '') + '"]');
        state.hwFocus = '';
        if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'center' }); } catch (e) {} }
      }, 60);
    },

    /* --- Speaking qarzi --- */
    'debt-plus': function () { changeDebt(btn.getAttribute('data-sid'), +1); },
    'debt-minus': function () { changeDebt(btn.getAttribute('data-sid'), -1); },

    /* --- Telegram topshiriklarini baholash --- */
    'tg-grade': function () {
      gradeTgSub(btn.getAttribute('data-tid'), Number(btn.getAttribute('data-score')));
    },
    'tg-reject': function () {
      rejectTgSub(btn.getAttribute('data-tid'));
    },
    'speak-del': function () { openDeleteSpeaking(btn.getAttribute('data-tid')); },
    'do-speak-del': function () { doDeleteSpeaking(btn.getAttribute('data-tid')); },

    /* --- Ovozli topshirishga ruxsat (voice_allowed) --- */
    'voice-toggle': function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      const list = getStudents();
      const st = list.filter(x => x.id === btn.getAttribute('data-sid'))[0];
      if (!st) return;
      st.voiceAllowed = !(st.voiceAllowed === true);
      store.set(K.students, list);
      CloudSync.pushStudent(st.id);
      render();
      toast(st.voiceAllowed ? "Ovozli topshirishga ruxsat berildi" : "Ovozli topshirish cheklandi");
    },

    /* --- Saytda speaking topshirishga ruxsat (web_speaking_allowed) --- */
    'web-speaking-toggle': async function () {
      if (!canStaff('students')) { toast("Ruxsat yo'q", 'error'); return; }
      const sid = btn.getAttribute('data-sid');
      /* Bitta o'quvchi uchun bir vaqtda bitta update: tez ikki marta bosilsa
         ikkinchi so'rov tashlanadi, update'lar tartibi buzilmaydi. */
      if (!state.webSpeakingBusy) state.webSpeakingBusy = {};
      if (state.webSpeakingBusy[sid]) return;
      state.webSpeakingBusy[sid] = true;
      try {
        const list = getStudents();
        const st = list.filter(x => x.id === sid)[0];
        if (!st) return;
        const next = !(st.webSpeakingAllowed === true);
        /* Optimistik UI: darhol ON/OFF, keyin faqat shu ustun Supabase'ga yoziladi */
        st.webSpeakingAllowed = next;
        store.set(K.students, list);
        render();
        let res;
        try {
          res = await CloudSync.setWebSpeakingAllowed(sid, next);
        } catch (e) {
          res = { ok: false, error: (e && e.message) || String(e) };
        }
        if (!res || !res.ok) {
          /* Yozuv muvaffaqiyatsiz bo'lsa, UI'ni ham haqiqiy holatga qaytaramiz */
          const back = getStudents();
          const cur = back.filter(x => x.id === sid)[0];
          if (cur) { cur.webSpeakingAllowed = !next; store.set(K.students, back); }
          render();
          console.warn('[cloud] web_speaking_allowed save:', (res && res.error) || 'unknown error');
          toast(t('Ruxsatni saqlashda xatolik'), 'error');
          return;
        }
        toast(next ? t('Saytda speaking topshirishga ruxsat berildi') : t('Saytda speaking topshirish cheklandi'));
      } finally {
        delete state.webSpeakingBusy[sid];
      }
    },

    /* --- Uyga vazifalar --- */
    'open-hw': function () { openHwModal(null, btn.getAttribute('data-gid')); },
    'save-hw': function () { saveHomework(); },
    'hw-edit': function () { openHwModal(btn.getAttribute('data-hid')); },
    'hw-remove-media': function () { removeHwAttachment('existing', 0); },
    'hw-remove-att': function () {
      removeHwAttachment(btn.getAttribute('data-kind'), btn.getAttribute('data-idx'));
    },
    'hw-clear-file': clearHwFilePick,
    'pay-student': function () { openPayModal(btn.getAttribute('data-sid'), btn.getAttribute('data-period')); },
    'fee-schedule': function () { openFeeSchedule(btn.getAttribute('data-gid')); },
    'fee-add': function () { addMonthlyFee(btn.getAttribute('data-gid')); },
    'fee-del': function () { removeMonthlyFee(btn.getAttribute('data-gid'), btn.getAttribute('data-period')); },
    'debt-add': function () { openAddDebtModal(btn.getAttribute('data-sid')); },
    'save-add-debt': function () { saveAddedDebt(btn.getAttribute('data-sid')); },
    'remind-student': function () { remindStudent(btn.getAttribute('data-sid')); },
    'save-pay': function () { savePayment(btn.getAttribute('data-sid')); },
    'save-card-settings': function () {
      if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
      const num = ($('#teacher-card-num') ? $('#teacher-card-num').value : '').trim();
      const holder = ($('#teacher-card-holder') ? $('#teacher-card-holder').value : '').trim();
      CloudSync.saveCardSettings(num, holder);
      toast("Karta sozlamalari saqlandi ✓");
    },
    'open-pay-receipt': function () {
      openPayReceiptModal(btn.getAttribute('data-amount'), btn.getAttribute('data-period'));
    },
    'copy-card': function () {
      const card = btn.getAttribute('data-card') || '';
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(card).then(function () {
          toast("Karta raqami nusxalandi! ✓");
        }).catch(function () {
          toast("Karta: " + card);
        });
      } else {
        toast("Karta: " + card);
      }
    },
    'do-submit-receipt': doSubmitPaymentReceipt,
    'att-toggle': function () { state.attOpen = !state.attOpen; render(); },
    'student-view': function () {
      const prevView = state.studentView;
      state.studentView = btn.getAttribute('data-view') || '';
      state.attOpen = false;
      state.chatEditId = null;
      state.chatDelId = null;
      if (prevView !== state.studentView) {
        mockTimerStop();
        state.mockRun = null;
        state.mockResultId = '';
        state.mockCatView = '';
        state.mockOpen = {};
      }
      if (state.studentView === 'chat') {
        const stu = linkedStudent();
        if (stu) markChatSeen(stu.id);
      }
      render();
      if (state.studentView === 'chat') refreshChat();
      if (state.studentView === 'mock') {
        const stu = linkedStudent();
        if (stu) MockSync.pullMine(stu.id).then(function (changed) { if (changed) render(); }).catch(function () {});
      }
    },
    'student-back': function () {
      if (state.studentView === 'mock' && state.mockRun) { mockTimerStop(); state.mockRun = null; render(); return; }
      if (state.studentView === 'mock' && state.mockResultId) { state.mockResultId = ''; render(); return; }
      if (state.studentView === 'mock' && state.mockCatView) { state.mockCatView = ''; render(); return; }
      state.studentView = '';
      mockTimerStop();
      state.mockRun = null;
      state.mockResultId = '';
      state.mockCatView = '';
      render();
    },
    /* --- Mock testlar (o'quvchi) --- */
    'mock-start': function () { mockStart(btn.getAttribute('data-id')); },
    'mock-exit': function () { mockTimerStop(); state.mockRun = null; render(); },
    'mock-home': function () { mockTimerStop(); state.mockRun = null; state.mockResultId = ''; render(); },
    'mock-pick': function () { mockPick(btn.getAttribute('data-mq'), btn.getAttribute('data-mopt')); },
    'mock-submit': function () { mockSubmitRun(); },
    'mock-play': function () { mockPlayListening(btn.getAttribute('data-aid')); },
    'mock-script': function () {
      const el = document.getElementById('mock-script');
      if (el) el.hidden = !el.hidden;
    },
    'mock-speak-record': function () { mockStartSpeaking(btn.getAttribute('data-qid')); },
    'mock-speak-finish': function () {
      const run = state.mockRun;
      state.mockRun = null;
      state.mockResultId = run && run.attemptId ? run.attemptId : '';
      render();
      toast(t('Speaking javobi yuborildi'));
    },
    'mock-open-result': function () { state.mockResultId = btn.getAttribute('data-id') || ''; render(); },
    'mock-review': function () {
      const id = btn.getAttribute('data-id') || '';
      const map = btn.getAttribute('data-scope') === 'teacher'
        ? (state.mockTOpen = state.mockTOpen || {})
        : state.mockOpen;
      map[id] = !map[id];
      render();
    },
    'mock-cat-open': function () {
      state.mockCatView = btn.getAttribute('data-cat') || 'reading';
      state.mockTab = state.mockCatView;
      state.mockAssignId = '';
      state.mockDelId = '';
      render();
    },
    'mock-cat-back': function () {
      state.mockCatView = '';
      state.mockAssignId = '';
      state.mockDelId = '';
      render();
    },
    'mock-save-grade': function () { mockSaveTeacherGrade(btn.getAttribute('data-id')); },
    'mock-result-del': function () {
      state.mockDelResultId = btn.getAttribute('data-id') || '';
      render();
    },
    'mock-result-del-yes': function () { mockDeleteResult(btn.getAttribute('data-id')); },
    'mock-result-del-cancel': function () { state.mockDelResultId = ''; render(); },

    /* --- Mock builder (ustoz) --- */
    'mock-add': function () { mockOpenBuilder(null); },
    'mock-edit': function () { mockOpenBuilder(mockDefById(btn.getAttribute('data-id'))); },
    'mock-save': mockBuilderSave,
    'mock-b-cancel': function () { state.mockBuilder = null; render(); },
    'mock-b-step': function () { state.mockBStep = btn.getAttribute('data-step') || 'text'; render(); },
    'mock-b-add-part': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.parts = state.mockBuilder.draft.parts || [];
      list.push(mockNewPart(list.length));
      render();
    },
    'mock-b-del-part': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.parts || [];
      if (list.length > 1) list.splice(Number(btn.getAttribute('data-path')), 1);
      else toast(t('Kamida bitta qism kerak'), 'error');
      render();
    },
    'mock-b-add-task': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.tasks = state.mockBuilder.draft.tasks || [];
      list.push(mockNewTask(list.length));
      render();
    },
    'mock-b-del-task': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.tasks || [];
      if (list.length > 1) list.splice(Number(btn.getAttribute('data-path')), 1);
      else toast(t('Kamida bitta topshiriq kerak'), 'error');
      render();
    },
    'mock-b-add-q': function () { mockBAddQuestion(btn.getAttribute('data-path')); },
    'mock-b-qtype': function () { mockBSetQType(btn.getAttribute('data-path'), btn.getAttribute('data-qtype')); },
    'mock-b-add-opt': function () { mockBAddOption(btn.getAttribute('data-path')); },
    'mock-b-del-opt': function () { mockBDelOption(btn.getAttribute('data-path'), btn.getAttribute('data-idx')); },
    'mock-b-del-q': function () {
      const arr = mockBArray(btn.getAttribute('data-path'));
      if (arr.length > 1) arr.splice(Number(btn.getAttribute('data-idx')), 1);
      else toast(t('Kamida bitta savol kerak'), 'error');
      render();
    },
    'mock-b-add-speak': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.questions = state.mockBuilder.draft.questions || [];
      list.push({ id: mockNewId('sp'), text: '', imageUrl: '', imageName: '' });
      render();
    },
    'mock-b-del-speak': function () {
      if (!state.mockBuilder) return;
      const list = state.mockBuilder.draft.questions || [];
      if (list.length > 1) list.splice(Number(btn.getAttribute('data-path')), 1);
      else toast(t('Kamida bitta savol kerak'), 'error');
      render();
    },
    'mock-b-file-clear': function () {
      mockBSet(btn.getAttribute('data-path'), '');
      render();
    },

    /* --- Mock guruhlarga biriktirish / o'chirish --- */
    'mock-assign': function () {
      const def = mockDefById(btn.getAttribute('data-id'));
      if (!def) return;
      state.mockAssignId = def.id;
      state.mockAssignDraft = mockGroupIds(def);
      state.mockDelId = '';
      render();
    },
    'mock-assign-toggle': function () {
      const gid = String(btn.getAttribute('data-gid') || '');
      const list = (state.mockAssignDraft || []).map(String);
      const i = list.indexOf(gid);
      if (i >= 0) list.splice(i, 1); else list.push(gid);
      state.mockAssignDraft = list;
      render();
    },
    'mock-assign-save': function () {
      const def = mockDefById(btn.getAttribute('data-id'));
      if (!def) return;
      def.groupIds = (state.mockAssignDraft || []).slice();
      mockSaveDef(def);
      state.mockAssignId = '';
      state.mockAssignDraft = [];
      render();
      toast(t('Guruhlar saqlandi'));
    },
    'mock-assign-cancel': function () { state.mockAssignId = ''; state.mockAssignDraft = []; render(); },
    'mock-del': function () { state.mockDelId = btn.getAttribute('data-id') || ''; state.mockAssignId = ''; render(); },
    'mock-del-yes': function () {
      const id = btn.getAttribute('data-id');
      mockDeleteDef(id);
      state.mockDelId = '';
      render();
      toast(t('Mock test o\'chirildi'));
    },
    'mock-del-cancel': function () { state.mockDelId = ''; render(); },
    'remind-debtors': openRemindDebtors,
    'do-remind-debtors': sendDebtorsReminder,
    'del-hw': function () { openDeleteHw(btn.getAttribute('data-hid')); },
    'do-del-hw': function () { doDeleteHw(btn.getAttribute('data-hid')); },
    'toggle-hw': function () { toggleHwDone(btn.getAttribute('data-hid')); },

    /* --- Tozalash (avval zaxira) --- */
    'cleanup-pick': function () {
      if (!isTeacher()) { toast("Ruxsat yo'q", 'error'); return; }
      state.cleanupTable = btn.getAttribute('data-table');
      render();
    },
    'cleanup-go': function () { startCleanup(); },
    'do-cleanup': function () { doCleanup(); },

    /* --- Davomat --- */
    'open-attendance': function () {
      state.attGroup = btn.getAttribute('data-group') || state.attGroup;
      state.attDate = todayKey();
      state.attDraftFor = '';
      go('attendance');
    },
    'att-group': function () {
      state.attGroup = btn.getAttribute('data-group');
      render();
    },
    'att-set': function () {
      if (!state.attDraft) state.attDraft = {};
      const sid = btn.getAttribute('data-sid');
      const status = btn.getAttribute('data-status');
      if (state.attDraft[sid] === status) delete state.attDraft[sid];
      else state.attDraft[sid] = status;
      render();
    },
    'att-save': function () {
      if (!canStaff('attendance')) { toast("Ruxsat yo'q", 'error'); return; }
      const all = getAttendance();
      const beforeIds = Object.keys(all[state.attDate] || {});
      all[state.attDate] = Object.assign({}, state.attDraft || {});
      store.set(K.attendance, all);
      CloudSync.pushAttendance(state.attDate, beforeIds.concat(Object.keys(state.attDraft || {})));
      state.attDraftFor = state.attDate;
      const n = Object.keys(all[state.attDate]).length;
      toast(n ? "Davomat saqlandi ✓ (" + n + " ta)" : "Davomat saqlandi (bo'sh)");
    },

    /* --- Speaking --- */
    'open-slot': function () { openSlotModal('create', ''); },
    'slot-assign': function () { openSlotModal('assign', btn.getAttribute('data-id')); },
    'slot-score': function () { openScoreSlot(btn.getAttribute('data-id')); },
    'slot-del': function () {
      if (!canStaff('speaking')) { toast("Ruxsat yo'q", 'error'); return; }
      const id = btn.getAttribute('data-id');
      const cur = getSpeaking().filter(x => x.id === id)[0];
      store.set(K.speaking, getSpeaking().filter(x => x.id !== id));
      if (cur && cur.dbId != null) CloudSync.deleteSlot(cur.dbId);
      render();
      toast("Slot o'chirildi");
    },
    'toggle-theme': toggleTheme,
    'toggle-lang': toggleLang,
    'session-logout': function () { Sessions.remove(btn.getAttribute('data-sess')); },
    'session-logout-all': function () { Sessions.removeAllOthers(); },
    'save-slot': saveSlot,
    'save-score': function () {
      saveSlotScore(btn.getAttribute('data-id'), Number(btn.getAttribute('data-score')));
    }
  };

  if (actions[act]) {
    e.preventDefault();
    actions[act]();
  }
});

document.addEventListener('input', function (e) {
  const t = e.target;
  if (!t) return;
  if (t.id === 's-search') {
    state.search = t.value;
    refreshStudentList();
  } else if (t.id === 'fp-contact') {
    state.resetContact = t.value;
  } else if (t.id === 'grade-note') {
    if (state.editor) {
      state.editor.note = t.value;
      if (state.editor.score != null) persistEditor(true);
    }
  } else if (t.hasAttribute && t.hasAttribute('data-mock-ans')) {
    mockWrittenInput(t);
  }
});

document.addEventListener('change', function (e) {
  const t = e.target;
  if (!t) return;
  /* Mock builder: matn/select/checkbox maydonlari */
  const mb = t.getAttribute ? t.getAttribute('data-mb') : '';
  if (mb && state.mockBuilder) {
    if (mb === 'group') {
      const gid = String(t.getAttribute('data-gid') || '');
      const cur = state.mockBuilder.draft.groupIds;
      const list = (Array.isArray(cur) ? cur : []).map(String);
      const i = list.indexOf(gid);
      if (i >= 0) list.splice(i, 1); else list.push(gid);
      state.mockBuilder.draft.groupIds = list;
    } else {
      mockBSet(mb, String(t.value == null ? '' : t.value));
    }
    return;
  }
  const mbFile = t.getAttribute ? t.getAttribute('data-mb-file') : '';
  if (mbFile && state.mockBuilder) {
    mockBBuilderUpload(t, mbFile);
    return;
  }
  /* Tiklash ekrani: tanlov o'zgardi → forma qayta chiziladi (kiritilgan matn saqlanadi) */
  if (t.name === 'fr-mode') {
    state.resetContact = String((($('#fp-contact') || {}).value || ''));
    state.resetMode = t.value === 'login' || t.value === 'both' ? t.value : 'password';
    state.resetDone = '';
    state.recoverCaptcha = makeRecoverCaptcha();
    render();
    return;
  }
  if (t.id === 'att-date' && t.value) { state.attDate = t.value; render(); }
  if (t.id === 'pay-month' && t.value) { state.payMonth = t.value; render(); }
  if (t.id === 'sp-date' && t.value) { state.speakDate = t.value; render(); }
  /* Guruh modali: yangi kun belgilandi → o'sha kun uchun vaqt picker chiqadi */
  if (t.closest && t.closest('#f-days')) { renderDayTimes(); }
  /* Guruh turi o'zgardi → maktab guruhida oylik to'lov maydoni yashiriladi */
  if (t.name === 'f-gtype') { syncGroupFeeField(); }
  if (t.id === 'backup-file' && t.files && t.files[0]) {
    readBackupFile(t.files[0]);
    t.value = '';
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && (e.target.id === 'login-input' || e.target.id === 'password-input')) {
    const btn = $('[data-act="do-login"]');
    if (btn) btn.click();
  }
  if (e.key === 'Enter' && e.target.id === 'chat-input') {
    e.preventDefault();
    sendChat();
  }
});

$('#modal-overlay').addEventListener('click', function (e) {
  if (e.target && e.target.id === 'modal-overlay') { closeModal(); render(); }
});

/* ==================== Ishga tushirish ==================== */
(function init() {
  /* XAVFSIZLIK: Eski parollar va hisoblar keshini tozalash */
  store.del('et_accounts');
  store.del('et_users');
  const s = getSession();
  if (!s || !accounts[s.login]) store.del(K.session);
  state.screen = currentUser() ? 'home' : 'login';
  applyTheme();
  startI18nObserver();
  /* Aniq qurilma modeli (SM-A546B / Redmi Note 12 ...) — bir marta, erta aniqlanadi */
  resolveDeviceModel();
  render();
  /* Faol qurilmalar nazorati: sahifa ochilganda + har 30 soniyada tekshiriladi */
  Sessions.check();
  if (!window.__etSessionGuard) {
    window.__etSessionGuard = setInterval(function () {
      if (currentUser()) Sessions.check();
    }, 30000);
  }
  /* Harakat -> oxirgi faoliyat (kamida 60 soniyada bir marta yangilanadi) */
  let lastPresenceTouch = 0;
  const activityPresence = function () {
    if (!currentUser()) return;
    const now = Date.now();
    if (now - lastPresenceTouch < 60000) return;
    lastPresenceTouch = now;
    Sessions.touch();
  };
  document.addEventListener('click', activityPresence, true);
  document.addEventListener('keydown', activityPresence, true);
  /* Avval bulutdan ma'lumotni tiklaymiz (multi-device sync), keyin qayta chizamiz */
  if (CloudSync.ready()) {
    const cu0 = currentUser();
    CloudSync.pullAll(cu0 && cu0.role === 'student' ? cu0.login : null).then(function (ok) {
      if (ok && currentUser()) render();
      CloudSync.subscribe();
      refreshChat();
    });
  }
})();


/* Week navigation is now rendered directly in gradesScreen() template. */

/* ==================== PLYR: video/audio pleyer (fullscreen, tezlik, ±10s) ==================== */
/* Speed menyusi: barmoq bilan surilganda sahifa emas, menyu ichi skroll bo'ladi.
   Menyu chegarasiga yetganda touchmove bekor qilinadi (scroll chaining to'xtaydi). */
function touchGuardPlyrMenus() {
  const menus = $$('.hw-media .plyr__menu__container, .hw-media .plyrmenucontainer, .plyrmenucontainer');
  menus.forEach(function (menu) {
    if (!menu || menu.getAttribute('data-touch-guard')) return;
    menu.setAttribute('data-touch-guard', '1');
    menu.addEventListener('touchmove', function (e) {
      if (!e.touches || !e.touches.length) return;
      const y = e.touches[0].clientY;
      const prev = menu.__touchY;
      menu.__touchY = y;
      const dy = (prev == null) ? 0 : (y - prev);
      const canScroll = menu.scrollHeight > menu.clientHeight + 1;
      if (!canScroll) { e.preventDefault(); return; }
      const atTop = menu.scrollTop <= 0;
      const atBottom = menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
    }, { passive: false });
    menu.addEventListener('touchend', function () { menu.__touchY = null; }, { passive: true });
    menu.addEventListener('touchcancel', function () { menu.__touchY = null; }, { passive: true });
  });
}
function initPlyr() {
  if (!window.Plyr) return;
  $$('.hw-media video, .hw-media audio').forEach(function (el) {
    if (el.getAttribute('data-plyr-ready')) return;
    if (el.closest && el.closest('.plyr')) return;
    el.setAttribute('data-plyr-ready', '1');
    const isAudio = el.tagName === 'AUDIO';
    try {
      new window.Plyr(el, {
        controls: isAudio
          ? ['restart', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings']
          : ['play-large', 'restart', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'pip', 'fullscreen'],
        settings: ['speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        seekTime: 10,
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true }
      });
    } catch (e) { console.warn('[plyr]', (e && e.message) || e); }
  });
  touchGuardPlyrMenus();
}
function watchHwMedia() {
  initPlyr();
  if (!window.MutationObserver || !document.body) return;
  let timer = null;
  new window.MutationObserver(function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(initPlyr, 80);
  }).observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchHwMedia);
else watchHwMedia();

/* Rasmni to'liq ekranda ko'rish */
document.addEventListener('click', function (ev) {
  const img = ev.target && ev.target.closest ? ev.target.closest('.hw-media-img') : null;
  if (!img) return;
  const url = img.getAttribute('src');
  if (!url) return;
  const box = document.createElement('div');
  box.className = 'hw-media-zoom';
  const big = document.createElement('img');
  big.src = url;
  big.alt = img.getAttribute('alt') || '';
  box.appendChild(big);
  box.addEventListener('click', function () { box.remove(); });
  document.body.appendChild(box);
});
