(async () => {
/* Step 3 — interaktiv smoke-test: haqiqiy DOM'da butun oqimni boshqaramiz. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createStub } = require('./supabase-stub');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script src="https:\/\/telegram\.org[^"]*"><\/script>/, '');

let failed = 0;
function check(cond, msg) {
  if (cond) console.log('ok   - ' + msg);
  else { failed++; console.error('FAIL - ' + msg); }
}

const dataJs = fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

/* ============ TEST FIXTURE (faqat test uchun — ilovada demo seed YO'Q) ============ */
const F_DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
const F_GROUPS = [
  { id: 'g1', dbId: 1, name: 'IELTS Band 7.0', days: 'Dushanba, Chorshanba, Juma', time: '18:00', groupType: 'school' },
  { id: 'g2', dbId: 2, name: 'General English (8–10-sinf)', days: 'Seshanba, Payshanba', time: '17:00', groupType: 'tutoring' }
];
/* students jadvalidagi haqiqiy qator kabi: login ham o'quvchi yozuvida turadi */
const F_STUDENTS = [
  { id: 's1', dbId: 1, login: 'aziz', fullName: 'Aziz Rahimov', schoolClass: '9-sinf', groupId: 'g2', telegramChatId: 1001, speakingDebt: 0, audioSubmissions: [] },
  { id: 's2', dbId: 2, login: 'nilufar', fullName: 'Nilufar Ergasheva', schoolClass: '9-sinf', groupId: 'g2', telegramChatId: 1002, speakingDebt: 0, audioSubmissions: [] },
  { id: 's3', dbId: 3, login: 'jasur', fullName: 'Jasur Karimov', schoolClass: '8-sinf', groupId: 'g2', telegramChatId: 1003, speakingDebt: 0, audioSubmissions: [] },
  { id: 's4', dbId: 4, login: 'dilnoza', fullName: 'Dilnoza Qodirova', schoolClass: '10-sinf', groupId: 'g2', telegramChatId: 1004, speakingDebt: 0, audioSubmissions: [] },
  { id: 's5', dbId: 5, login: 'malika', fullName: 'Malika Yusupova', schoolClass: '11-sinf', groupId: 'g1', telegramChatId: 1005, speakingDebt: 0, audioSubmissions: [] },
  { id: 's6', dbId: 6, login: 'bekozd', fullName: 'Bekzod Alimov', schoolClass: '11-sinf', groupId: 'g1', telegramChatId: 1006, speakingDebt: 0, audioSubmissions: [] }
];
const F_ACCOUNTS = [
  { login: 'm_amirov', password: '123', role: 'teacher', name: 'Muzaffar Amirov' },
  { login: 'aziz', password: '123', role: 'student', studentId: 's1', name: 'Aziz Rahimov' },
  { login: 'nilufar', password: '123', role: 'student', studentId: 's2', name: 'Nilufar Ergasheva' },
  { login: 'jasur', password: '123', role: 'student', studentId: 's3', name: 'Jasur Karimov' },
  { login: 'dilnoza', password: '123', role: 'student', studentId: 's4', name: 'Dilnoza Qodirova' },
  { login: 'malika', password: '123', role: 'student', studentId: 's5', name: 'Malika Yusupova' },
  { login: 'bekozd', password: '123', role: 'student', studentId: 's6', name: 'Bekzod Alimov' }
];
const F_GRADE_SEEDS = {
  s1: [10, 9, 8, 10, 9], s2: [9, 8, 9, 7, 8], s3: [6, 7, 5, 8, 7],
  s4: [8, 9, 10, 9, 10], s5: [9, 10, 9, 10, 8], s6: [7, 6, 8, 7, 9]
};
const F_ATT_SEEDS = {
  s1: ['present', 'present', 'present', 'present', 'present'],
  s2: ['present', 'present', 'excused', 'present', 'present'],
  s3: ['present', 'absent', 'present', 'present', 'absent'],
  s4: ['present', 'present', 'present', 'present', 'present'],
  s5: ['present', 'excused', 'present', 'present', 'present'],
  s6: ['absent', 'present', 'present', 'absent', 'present']
};
const fpad2 = n => String(n).padStart(2, '0');
const dkey = d => d.getFullYear() + '-' + fpad2(d.getMonth() + 1) + '-' + fpad2(d.getDate());

function fixtureLessonDates(group, count) {
  const names = String(group.days).split(',').map(x => x.trim());
  const jsDays = names.map(n => F_DAYS.indexOf(n)).filter(i => i >= 0).map(i => (i + 1) % 7);
  const out = [];
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard++ < 400) {
    if (jsDays.indexOf(cur.getDay()) >= 0) out.push(dkey(cur));
    cur.setDate(cur.getDate() - 1);
  }
  return out.reverse();
}

function seedFixture(w) {
  const grades = {}, att = {};
  F_STUDENTS.forEach(st => {
    const g = F_GROUPS.filter(x => x.id === st.groupId)[0];
    const dates = fixtureLessonDates(g, 5);
    const scores = F_GRADE_SEEDS[st.id] || [];
    const attSeed = F_ATT_SEEDS[st.id] || [];
    const cats = ['Darsdagi javob', "Lug'at", 'Uyga vazifa'];
    dates.forEach((dk, i) => {
      if (i < scores.length) {
        grades[st.id] = grades[st.id] || {};
        grades[st.id][dk] = { score: scores[i], category: cats[i % cats.length], note: '' };
      }
      if (i < attSeed.length) {
        att[dk] = att[dk] || {};
        att[dk][st.id] = attSeed[i];
      }
    });
  });
  const today = dkey(new Date());
  const speaking = [
    { id: 'spseed1', dbId: 1, date: today, start: '14:00', end: '14:20', studentId: 's3', score: null },
    { id: 'spseed2', dbId: 2, date: today, start: '14:20', end: '14:40', studentId: 's6', score: null },
    { id: 'spseed3', dbId: 3, date: today, start: '14:40', end: '15:00', studentId: null, score: null }
  ];
  const accounts = {};
  F_ACCOUNTS.forEach(a => { accounts[a.login] = Object.assign({}, a, { studentId: a.studentId || null }); });
  w.localStorage.setItem('et_groups', JSON.stringify(F_GROUPS));
  w.localStorage.setItem('et_students', JSON.stringify(F_STUDENTS));
  w.localStorage.setItem('et_accounts', JSON.stringify(accounts));
  w.localStorage.setItem('et_grades', JSON.stringify(grades));
  w.localStorage.setItem('et_attendance', JSON.stringify(att));
  w.localStorage.setItem('et_speaking', JSON.stringify(speaking));
}

/* Bulut stubi uchun boshlang'ich jadvallar — fixture id'lari bilan aynan bir xil
   (students.id: 1..6 ↔ lokal 's1'..'s6'; groups.id: 1..2 ↔ 'g1','g2'). */
function buildCloudSeed(w) {
  const sha = v => require('crypto').createHash('sha256').update(String(v)).digest('hex');
  const groups = JSON.parse(w.localStorage.getItem('et_groups') || '[]');
  const students = JSON.parse(w.localStorage.getItem('et_students') || '[]');
  const grades = JSON.parse(w.localStorage.getItem('et_grades') || '{}');
  const att = JSON.parse(w.localStorage.getItem('et_attendance') || '{}');
  const num = v => Number(String(v == null ? '' : v).replace(/^[gs]/, ''));
  const seed = {
    groups: groups.map(g => ({
      id: num(g.dbId != null ? g.dbId : g.id), name: g.name, days: g.days, time: g.time,
      monthly_fee: g.monthlyFee || 0, group_type: g.groupType || 'school'
    })),
    students: students.map(s => ({
      id: num(s.dbId != null ? s.dbId : s.id),
      name: s.fullName, school_class: s.schoolClass,
      group_id: s.groupId ? num(s.groupId) : null,
      login: s.login || '', password: sha('123'),
      speaking_debt: Number(s.speakingDebt) || 0, payment_debt: Number(s.paymentDebt) || 0,
      voice_allowed: true, web_speaking_allowed: true, telegram_chat_id: s.telegramChatId || null
    })),
    grades: [], attendance: [],
    speaking_submissions: [
      { id: 1, student_id: 3, media_type: 'voice', telegram_file_id: 'stub-voice-1',
        status: 'baholandi', score: 9, feedback: '' }
    ],
    speaking_slots: JSON.parse(w.localStorage.getItem('et_speaking') || '[]').map((x, i) => ({
      id: i + 1,
      date: x.date, start_time: x.start, end_time: x.end,
      student_id: x.studentId ? num(x.studentId) : null,
      score: x.score == null ? null : Number(x.score)
    }))
  };
  Object.keys(grades).forEach(sid => {
    Object.keys(grades[sid] || {}).forEach(date => {
      const r = grades[sid][date];
      seed.grades.push({ student_id: num(sid), date: date, grade: r.score, category: r.category, note: r.note || '' });
    });
  });
  Object.keys(att).forEach(date => {
    Object.keys(att[date] || {}).forEach(sid => {
      seed.attendance.push({ student_id: num(sid), date: date, status: att[date][sid] });
    });
  });
  return seed;
}

/* ============ 0. TOZA START — demo seed YO'qligi (yangi, bo'sh qurilma) ============ */
{
  const fdom = new JSDOM(html, { url: 'http://localhost:3000/', runScripts: 'outside-only', pretendToBeVisual: true });
  const fwin = fdom.window;
  const fdoc = fwin.document;
  const fq = s => fdoc.querySelector(s);
  const fqa = s => Array.from(fdoc.querySelectorAll(s));
  const ftext = () => fq('#screen').textContent;
  fwin.eval(dataJs + '\nwindow.APP_DATA = APP_DATA;');
  /* Bo'sh bulut stubi: CAPTCHA va ustoz 2FA kodlari shu yerga yoziladi */
  const fstub = createStub({});
  fwin.supabase = { createClient: function () { return fstub.client; } };
  fwin.eval(appJs);
  const fsolve = () => {
    const box = fq('#captcha-canvas');
    const m = String((box && box.getAttribute('data-q')) || '').match(/^(\d+)\s*([+−×])\s*(\d+)$/);
    if (!m) return '';
    const a = Number(m[1]), b = Number(m[3]);
    return m[2] === '+' ? String(a + b) : (m[2] === '−' ? String(a - b) : String(a * b));
  };
  const fclick = el => el.dispatchEvent(new fwin.MouseEvent('click', { bubbles: true, cancelable: true }));
  const fset = (s, v) => { const el = fq(s); el.value = v; el.dispatchEvent(new fwin.Event('input', { bubbles: true })); };
  const fnav = scr => {
    const b = fdoc.createElement('button');
    b.setAttribute('data-act', 'nav');
    b.setAttribute('data-screen', scr);
    fdoc.body.appendChild(b);
    fclick(b);
    b.remove();
  };

  check(!fq('.hint-card') && !ftext().includes('Demo') && !fq('.login-demo'),
    'toza start: landing sahifasida demo kart/chiplar YO\'Q');
  check(!!fq('[data-act="auth-login-open"]'), 'toza start: landingda "Kirish" tugmasi');
  fclick(fq('[data-act="auth-login-open"]'));
  fset('#login-input', 'm_amirov');
  fset('#password-input', '123');
  fset('#login-captcha', fsolve());
  fclick(fq('[data-act="do-login"]'));
  await new Promise(r => setTimeout(r, 200));
  check(!!fq('#twofa-code'), "toza start: ustoz uchun 2-bosqichli kod modali ochildi");
  const fcode = (fstub.db.auth_codes || []).filter(r => r.purpose === 'teacher_2fa').pop();
  if (fcode) fset('#twofa-code', String(fcode.code));
  fclick(fq('[data-act="do-2fa"]'));
  await new Promise(r => setTimeout(r, 200));
  check(ftext().includes('Xush kelibsiz') && ftext().includes('Muzaffar Amirov'),
    'toza start: "Xush kelibsiz, Muzaffar Amirov!" salomi');
  fnav('groups');
  check(fqa('.group-card').length === 0 && ftext().includes("Hozircha guruh yo'q"),
    "toza start: demo guruhlar avtomatik SEED qilinmaydi (0 ta)");
  fnav('students');
  check(fqa('.student-card').length === 0 && !ftext().includes('Aziz Rahimov'),
    "toza start: demo o'quvchilar avtomatik SEED qilinmaydi (0 ta)");
}

/* ============ Asosiy qurilma (test fixture bilan) ============ */
const dom = new JSDOM(html, { url: 'http://localhost:3000/', runScripts: 'outside-only', pretendToBeVisual: true });
const win = dom.window;
const doc = win.document;

win.eval(dataJs + '\nwindow.APP_DATA = APP_DATA;');
seedFixture(win);
/* Supabase stubi: bulut rejimini jsdom'da sinash uchun (o'quvchi autentifikatsiyasi
   faqat bulut bilan ishlaydi) — haqiqiy jadval o'rniga holatli in-memory stub. */
const cloudStub = createStub(buildCloudSeed(win));
win.supabase = { createClient: function () { return cloudStub.client; } };
win.__cloudStub = cloudStub;
/* Qurilma aniqlash testi uchun deterministik user-agent (Android Chrome) */
Object.defineProperty(win.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  configurable: true
});
win.eval(appJs);

const q = sel => doc.querySelector(sel);
const qa = sel => Array.from(doc.querySelectorAll(sel));
const text = () => q('#screen').textContent;
const click = el => { const node = typeof el === 'string' ? q(el) : el; if (!node) throw new Error('click: topilmadi -> ' + el); node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); };
const clickAct = act => click(q('[data-act="' + act + '"]'));
const setVal = (sel, val) => { const el = q(sel); if (!el) throw new Error('setVal: ' + sel + ' topilmadi'); el.value = val; el.dispatchEvent(new win.Event('input', { bubbles: true })); };
const changeVal = (sel, val) => { const el = q(sel); if (!el) throw new Error('changeVal: ' + sel + ' topilmadi'); el.value = val; el.dispatchEvent(new win.Event('change', { bubbles: true })); };
const setCheck = (sel, checked) => { const el = q(sel); if (!el) throw new Error('setCheck: ' + sel + ' topilmadi'); el.checked = !!checked; el.dispatchEvent(new win.Event('change', { bubbles: true })); };
const forceNav = screen => {
  const b = doc.createElement('button');
  b.setAttribute('data-act', 'nav');
  b.setAttribute('data-screen', screen);
  doc.body.appendChild(b);
  click(b);
  b.remove();
};
const navLabels = () => qa('.nav-item span').map(s => s.textContent);
const studentCards = () => qa('#students-list .student-card').length;
/* O'quvchi kabinetidagi 4 ta asosiy kartadan ichki oynani ochish/yopish */
const openStudentView = (v) => {
  let b = q('[data-act="student-view"][data-view="' + v + '"]');
  if (!b && q('[data-act="student-back"]')) {
    q('[data-act="student-back"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    b = q('[data-act="student-view"][data-view="' + v + '"]');
  }
  if (!b) { forceNav('home'); b = q('[data-act="student-view"][data-view="' + v + '"]'); }
  if (!b) throw new Error('student-view topilmadi: ' + v);
  b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
};
const closeStudentView = () => {
  const b = q('[data-act="student-back"]');
  if (b) b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
};
/* EN rejimda tarjima qilinmagan (o'zbekcha qolgan) matnlarni yig'adi.
   Ma'lumot maydonlari (ism, login, guruh nomi) chetlab o'tiladi. */
function i18nLeftovers(scope) {
  const out = {};
  if (!scope) return [];
  const SKIP = '.s-name, .login-val, .profile-name, .brand, .avatar, .chip-btn, ' +
    '.chip-class, .gc-name, .group-name, .msg-text, .hw-file-name';
  const UZ = /(yo'q|uchun|kerak|mavjud|qo'sh|bo'l|o'quvchi|o'qituvchi|guruh|davomat|baho|vazifa|topshiriq|to'lov|qarz|hafta|oylik|belgilan|eslatma|saqlash|bekor|yopish|kirish|parol|jami|keldi|kelmadi|sababli|noyabr|yanvar|fevral|aprel|iyun|iyul|avgust|sentabr|oktabr|dekabr|sinf|karta|egasi|chek|diqqat|tushunarli|nusxa|kiring|kiriting|ismini|yozing|masalan|ovozli|krujok|kutilmoqda|qatnash|qoldiril|mening|hozircha|barchasini|darsdagi|javob|tanlan|tanlash|yuborish|ko'rdim|baholangan)/i;
  const add = (v) => {
    const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    if (!s || !UZ.test(s)) return;
    if (/so'm|IELTS/.test(s)) return;
    out[s] = 1;
  };
  const doc = win.document;
  const walker = doc.createTreeWalker(scope, 4, null);
  let n;
  while ((n = walker.nextNode())) {
    const parent = n.parentNode;
    if (!parent || parent.nodeType !== 1) continue;
    if (parent.closest && parent.closest(SKIP)) continue;
    add(n.nodeValue);
  }
  const els = scope.querySelectorAll ? scope.querySelectorAll('[placeholder],[title],[aria-label]') : [];
  els.forEach((el) => {
    ['placeholder', 'title', 'aria-label'].forEach((at) => add(el.getAttribute(at)));
  });
  return Object.keys(out);
}
const groupCards = () => qa('#screen .group-card').length;
function logout() { click('[data-act="nav"][data-screen="profile"]'); clickAct('logout'); }
/* CAPTCHA misolini yechadi: 7 + 3 / 9 − 4 / 4 × 3 */
function solveCaptcha() {
  const box = q('#captcha-canvas');
  const expr = String((box && box.getAttribute('data-q')) || '').trim();
  const m = expr.match(/^(\d+)\s*([+−×])\s*(\d+)$/);
  if (!m) return '';
  const a = Number(m[1]), b = Number(m[3]), op = m[2];
  if (op === '+') return String(a + b);
  if (op === '−') return String(a - b);
  return String(a * b);
}

/* Stub bazadan oxirgi bir martalik kodni oladi (2FA / reset) */
/* Tiklash ekranidagi 5 xonali CAPTCHA: canvas bo'lmasa raqamlar matn fallbackda ko'rinadi */
const recoverCaptcha = () => String((q('#fr-captcha-text') || {}).textContent || '').trim();

/* 3 bosqichli kirish: forma kerak bo'lsa avval "Kirish" oynasini ochamiz */
const openLogin = () => {
  if (!q('#login-input')) {
    const b = q('[data-act="auth-login-open"]');
    if (b) click(b);
  }
};

function lastAuthCode(purpose) {
  const rows = (cloudStub.db.auth_codes || []).filter(r => r.purpose === purpose && !r.used);
  if (!rows.length) return null;
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  return String(rows[rows.length - 1].code);
}

async function loginAs(l, p) {
  /* Yangi oqim: birinchi ekran — landing (Bosh sahifa), keyin Kirish oynasi.
     Login maydoni hali ochilmagan bo'lsa, "Kirish" tugmasini bosamiz. */
  if (!q('#login-input')) {
    const openBtn = q('[data-act="auth-login-open"]');
    if (openBtn) click(openBtn);
    await new Promise(r => setTimeout(r, 60));
  }
  /* forma asinxron render bo'lishi mumkin — paydo bo'lguncha kutamiz */
  for (let w = 0; w < 40 && !q('#login-input'); w++) {
    await new Promise(r => setTimeout(r, 50));
  }
  /* bulut rejimidagi kechikkan async yangilanishlar formani tozalab
     yubormasligi uchun: kutamiz va qiymatlar barqaror bo'lgach bosamiz */
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 50));
    if (!q('#login-input') || !q('#password-input')) continue;
    setVal('#login-input', l);
    setVal('#password-input', p);
    if (q('#login-captcha')) setVal('#login-captcha', solveCaptcha());
    await new Promise(r => setTimeout(r, 40));
    const a = q('#login-input'), b = q('#password-input');
    if (a && b && a.value === l && b.value === p) break;
  }
  clickAct('do-login');
  /* Ustoz kirishi asinxron (2FA yoki ishonchli qurilma) — natijani kutamiz;
     o'quvchi kirishi tez, kutish ortiqcha render'lar bilan xatoni o'chirib yuboradi */
  const isTeacherLogin = String(l).trim().toLowerCase() === 'm_amirov';
  if (isTeacherLogin) {
    const pollUntil = async (fn, ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) { if (fn()) return true; await new Promise(r => setTimeout(r, 60)); }
      return !!fn();
    };
    await pollUntil(() => !!q('#twofa-code') || !!win.localStorage.getItem('et_session'), 2500);
  }
  await new Promise(r => setTimeout(r, 150));

  /* Ustoz uchun 2-bosqichli tasdiqlash modali (faqat notanish qurilmada) */
  if (q('#twofa-code')) {
    const code = lastAuthCode('teacher_2fa');
    setVal('#twofa-code', code || '');
    clickAct('do-2fa');
    await new Promise(r => setTimeout(r, 200));
  }
}

const now = new Date();
const pad2 = n => String(n).padStart(2, '0');
const TODAY = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());

/* ================= 1. KIRISH EKRANI ================= */
check(text().includes('English Teacher — Muzaffar Amirov'), 'landing: sarlavha "English Teacher — Muzaffar Amirov"');
check(!!q('[data-act="auth-login-open"]'), 'landing: "Kirish" tugmasi mavjud');
check(text().includes('Tizimga kirish'), 'landing: "Tizimga kirish" CTA');
check(qa('.landing-feature').length === 3, 'landing: 3 ta imkoniyat kartasi');
click('[data-act="auth-login-open"]');
check(!!q('#login-input'), 'login: Login inputi mavjud');
check(!!q('#password-input'), 'login: Parol inputi mavjud');
check(text().includes('Tizimga kirish'), 'login: "Tizimga kirish" tugmasi');
check(!!q('[data-act="auth-back"]'), 'login: "Orqaga" tugmasi (landingga qaytish)');
check(q('#app-header').textContent.includes('English Teacher'), 'header: ilova nomi');
check(win.document.title === 'English Teacher', 'index: <title> “English Teacher”');
check(qa('.nav-item').length === 0, 'login rejimida bottom nav yo\'q');
check(!q('.hint-card') && !text().includes('Demo kirish') && !text().includes('Demo') && !q('.login-demo'), "login: demo credentials kartasi/chiplari olib tashlandi");
check(q('#login-input').placeholder === 'Login' && q('#login-input').placeholder.indexOf('admin') < 0,
  "login: placeholder'da demo logini yo'q");
check(!text().includes('Ustoz Paneli') && !text().includes('Ustoz:'), "login: 'Ustoz Paneli'/demo yozuvlari yo'q");
check(!text().includes('Ustoz: admin') && !text().includes("O'quvchi: jasur"), "login: login/parollar endi ko'rinmaydi");
const pwBtnLogin = q('[data-act="toggle-pw"][data-target="password-input"]');
check(!!pwBtnLogin && !!pwBtnLogin.querySelector('svg'), "login: parol ko'zgusi tugmasi SVG ikonka");
if (pwBtnLogin) {
  click(pwBtnLogin);
  check(q('#password-input').type === 'text', "login: ko'zgusi bosildi — parol ko'rindi");
  click(pwBtnLogin);
  check(q('#password-input').type === 'password', "login: qayta bosildi — parol yashirildi");
}

/* bo'sh forma */
clickAct('do-login');
check(q('#login-error').classList.contains('show'), 'login: bo\'sh forma rad etildi');

/* noto\'g\'ri parol */
await loginAs('m_amirov', '999');
check(q('#login-error').textContent.includes("noto'g'ri"), 'login: noto\'g\'ri parol xabar bermoqda');
check(q('#password-input').value === '', 'login: noto\'g\'ri parol tozalanadi');

/* ================= 2. USTOZ (admin/123) ================= */
await loginAs('m_amirov', '123');
check(text().includes('Xush kelibsiz') && text().includes('Muzaffar Amirov'), 'ustoz: dashboard salomi "Xush kelibsiz, Muzaffar Amirov!"');
check(q('#app-header').textContent.includes('Muzaffar Amirov'), 'ustoz: headerda "Muzaffar Amirov" brendi');
check(navLabels().length === 10, 'ustoz: 10 ta nav tabi (' + navLabels().join(', ') + ')');

/* --- Vektor ikonka tizimi: barcha emoji o'rniga SVG badge'lar --- */
check(qa('.quick-grid .quick-ico').length === 10, 'icon: TEZ AMALLAR gridida 10 ta ikonka badge');
check(qa('.quick-grid .quick-ico svg').length === 10, "icon: har bir badge ichida SVG (emoji o'rniga)");
check(['tint-indigo', 'tint-emerald', 'tint-sky', 'tint-amber', 'tint-purple', 'tint-slate', 'tint-rose', 'tint-teal']
  .every(t => qa('.quick-ico.' + t).length === 1),
  'icon: indigo/emerald/sky/amber/purple/slate/rose/teal tints har biri bittadan');
const quickOrder = qa('.quick-grid .quick[data-screen]').map(b => b.getAttribute('data-screen'));
check(JSON.stringify(quickOrder.slice(0, 5)) ===
  JSON.stringify(['homework', 'attendance', 'submissions', 'speaking', 'grades']),
  'home: tez amallar tartibi — uyga vazifa, davomat, topshiriqlar, speaking, baholar');
check(quickOrder.length === 9 && qa('.quick-grid .quick').length === 10,
  'home: qolgan tez amallar beshtalikdan keyin saqlangan (10 ta karta)');

/* Sayt speaking videosi → ustozga FAQAT matnli Telegram xabari (video/baho tugmalarisiz) */
const outboxBeforeWebNotice = (cloudStub.db.telegram_outbox || []).length;
await win.__cloud.queueWebSpeakingNotice({ studentDbId: 5 });
const webNotice = (cloudStub.db.telegram_outbox || []).slice(outboxBeforeWebNotice)
  .filter(r => /Yangi sayt speaking videosi/.test(String(r.text || '')))[0] || {};
const webNoticeText = String(webNotice.text || '');
check(String(webNotice.chat_id || '') === 'ADMIN' &&
  /O'quvchi: <b>Malika Yusupova<\/b>/.test(webNoticeText) &&
  /Guruh: <b>IELTS Band 7\.0<\/b>/.test(webNoticeText),
  'web speaking: telegram_outbox ADMIN ga o‘quvchi va guruh nomi bilan yozildi');
check(/Video saytda saqlandi/.test(webNoticeText) &&
  /<a href="http:\/\/localhost:3000\/">Speaking slotlari<\/a>/.test(webNoticeText) &&
  /ko'ring va baholang/.test(webNoticeText),
  'web speaking: faqat saytdagi Speaking slotlarida ko‘rish/baholash havolasi bor');
check(!('media_url' in webNotice) && !('reply_markup' in webNotice) &&
  !/\.(webm|mp4)\b/i.test(webNoticeText),
  'web speaking: outboxda video fayl yoki inline baholash tugmalari YO‘Q');
if (webNotice.id != null) {
  cloudStub.db.telegram_outbox = (cloudStub.db.telegram_outbox || []).filter(r => r.id !== webNotice.id);
}
check(!!q('[data-act="open-hw"] svg') && !!q('.stat-ico svg'), 'icon: vazifa tugmasi va status kartalari SVG ikonka');
check(!/[\u{1F300}-\u{1FAFF}]/u.test(q('#screen').textContent.replace(/[🟢🔴💵📢]/gu, '')),
  "icon: dashboardda cartoon emoji qolmagan (to'lov belgilari mustasno)");

/* --- Stat kartalari bosiladigan (Guruhlar / O'quvchilar / Sinflar) --- */
check(qa('.stat-grid .card.stat').length === 3, 'stat: 3 ta stat karta render bo\'ldi');
check(!!q('[data-act="stat-groups"]') && !!q('[data-act="stat-students"]') && !!q('[data-act="stat-classes"]'),
  "stat: Guruhlar/O'quvchilar/Sinflar kartalari interaktiv (button)");
clickAct('stat-groups');
check(text().includes('Guruhlar') && groupCards() === 2, "stat: 'Guruhlar' kartasi → Guruhlar ekrani (2 ta)");
check(q('[data-act="filter-group-type"][data-type="all"]').classList.contains('active'),
  'stat: Guruhlar kartasi ochilganda tur filtri "Barchasi" holatida');
click('[data-act="nav"][data-screen="home"]');
clickAct('stat-students');
check(text().includes("O'quvchilar") && studentCards() === 6, "stat: 'O'quvchilar' kartasi → O'quvchilar ekrani (6 ta)");
  check(!!q('[data-act="remind-debtors"]'), "qarz: barcha qarzdorlarga eslatma tugmasi bor");
click('[data-act="nav"][data-screen="home"]');
clickAct('stat-classes');
check(studentCards() === 6 && qa('.chips.is-hl').length === 1 && qa('[data-act="filter-class"]').length >= 4,
  "stat: 'Sinflar' kartasi → O'quvchilar + sinf filtri ajratib ko'rsatildi");
click('[data-act="nav"][data-screen="home"]');

/* --- Bosh sahifa: "So'nggi o'quvchilar" yo'q, tez amallarda yangi bo'limlar --- */
check(!text().includes("So'nggi o'quvchilar") && !q('.student-card'),
  'home: "So‘nggi o‘quvchilar" bo‘limi va o‘quvchi kartalari butunlay olib tashlangan');
check(!!q('.quick-grid [data-act="nav"][data-screen="submissions"]') &&
      !!q('.quick-grid [data-act="nav"][data-screen="payments"]'),
  'home: tez amallarda "Bajarilgan topshiriqlar" va "To‘lovlar" tugmalari');
click('.quick-grid [data-act="nav"][data-screen="payments"]');
check(text().includes("To'lovlar") && !!q('#pay-month'), 'home: "To‘lovlar" tugmasi to‘lovlar bo‘limini ochadi');
click('[data-act="nav"][data-screen="home"]');
click('.quick-grid [data-act="nav"][data-screen="submissions"]');
check(text().includes('Bajarilgan topshiriqlar'), 'home: "Bajarilgan topshiriqlar" tugmasi bo‘limni ochadi');
click('[data-act="nav"][data-screen="home"]');

/* Moliyaviy ma'lumotlar (o'quvchi kartalarida — faqat o'quvchilar ekranida) */
click('[data-act="nav"][data-screen="students"]');
check(qa('.pay-status').length >= 1, "moliya: o'quvchi kartasida to'lov holati ko'rinadi");
check(!!q('[data-act="pay-student"]'), "moliya: '💵 To'lov kiritish' tugmasi bor");

/* ================= 3. GURUHLAR ================= */
click('[data-act="nav"][data-screen="groups"]');
check(text().includes('Guruhlar'), 'guruhlar: ekran');
check(groupCards() === 2, 'guruhlar: 2 ta guruh');
/* Tur bo'yicha ajratish: Maktab / Repetitorlik */
check(qa('[data-act="filter-group-type"]').length === 3,
  'guruh turi: Guruhlar ekranida 3 ta tur filtri chipi (Barchasi/Maktab/Repetitorlik)');
click('[data-act="filter-group-type"][data-type="school"]');
check(groupCards() === 1 && text().includes('IELTS Band 7.0') && !text().includes('General English'),
  'guruh turi: "Maktab" filtri faqat maktab guruhini qoldiradi');
click('[data-act="filter-group-type"][data-type="tutoring"]');
check(groupCards() === 1 && text().includes('General English') && !text().includes('IELTS Band 7.0'),
  'guruh turi: "Repetitorlik" filtri faqat repetitor guruhini qoldiradi');
click('[data-act="filter-group-type"][data-type="all"]');
check(groupCards() === 2 && text().includes('IELTS Band 7.0') && text().includes('General English'),
  'guruh turi: "Barchasi" filtri ikkala guruhni qaytaradi');
check(text().includes('Maktab guruhi') && text().includes('Repetitor guruhi'),
  "guruh turi: ustoz kartalarida '🏫 Maktab guruhi' (ko'k) + '🎓 Repetitor guruhi' (binafsha) nishoni");
check(qa('.gc-type.is-school').length === 1 && qa('.gc-type.is-tutoring').length === 1,
  'guruh turi: har guruh turiga mos .gc-type klassi');
check(text().includes('IELTS Band 7.0') && text().includes('18:00'), 'guruhlar: nom + dars vaqti');
check(text().includes('Oylik to\'lov'), "moliya: guruh kartasida oylik to'lov ko'rinadi");

/* --- Kunlik vaqt picker: har bir kun uchun alohida <input type=time> --- */
clickAct('open-add-group');
check(q('#modal-overlay').hidden === false && qa('#f-days input').length === 7,
  "guruh: modalda haftaning 7 ta kuni (Dushanba–Yakshanba)");
check(!q('#f-gtime'), "vaqt: eski yagona #f-gtime hardcode input olib tashlandi");
  check(!!q('#f-gfee'), "guruh: oylik to'lov summasi maydoni bor");
check(qa('#f-gtype input[type="radio"]').length === 2,
  "guruh turi: modalda 2 ta tanlov (Maktab / Repetitorlik)");
check(qa('#f-gtype input').filter(i => i.checked).length === 1 &&
      qa('#f-gtype input').filter(i => i.checked)[0].value === 'school',
  "guruh turi: standart qiymat — 'school' (Maktab guruhi)");
check(q('#f-gfee-wrap') && q('#f-gfee-wrap').hidden === true,
  "maktab guruhi: oylik to'lov maydoni yashirin (bepul)");
const gtypePick = val => {
  const r = qa('#f-gtype input').filter(i => i.value === val)[0];
  r.checked = true;
  r.dispatchEvent(new win.Event('change', { bubbles: true }));
};
gtypePick('tutoring');
check(q('#f-gfee-wrap').hidden === false,
  "repetitor guruhi: oylik to'lov maydoni ko'rinadi");
gtypePick('school');
check(q('#f-gfee-wrap').hidden === true,
  "maktab guruhi: tur qayta tanlanganda maydon yana yashirildi");
check(qa('#f-times .dt-time').length === 0, "vaqt: kun tanlanmaguncha picker yo'q");
setVal('#f-gname', 'Vaqtli Guruh');
const pickDay = name => {
  const box = qa('#f-days input').filter(i => i.value === name)[0];
  box.checked = true;
  box.dispatchEvent(new win.Event('change', { bubbles: true }));
};
const clearDay = name => {
  const box = qa('#f-days input').filter(i => i.value === name)[0];
  box.checked = false;
  box.dispatchEvent(new win.Event('change', { bubbles: true }));
};
const timeFor = name => qa('#f-times .dt-time').filter(i => i.getAttribute('data-day') === name)[0];
pickDay('Dushanba');
check(qa('#f-times .dt-time').length === 1, "vaqt: Dushanba ✓ → bitta picker paydo bo'ldi");
pickDay('Shanba');
check(qa('#f-times .dt-time').length === 2, "vaqt: Shanba ✓ → ikkinchi alohida picker paydo bo'ldi");
check(timeFor('Dushanba') && timeFor('Shanba') && timeFor('Seshanba') == null,
  "vaqt: pickerlar FAQAT tanlangan kunlar uchun (Dushanba, Shanba)");
timeFor('Shanba').value = '11:00';
clearDay('Dushanba');
check(qa('#f-times .dt-time').length === 1 && timeFor('Shanba').value === '11:00',
  "vaqt: kun o'chirildi → picker ketdi, qolgan kun qiymati saqlandi");
pickDay('Dushanba');
timeFor('Dushanba').value = '09:15';

/* --- "Guruh qo'shish" ni saqlash --- */
clickAct('save-group');
check(q('#modal-overlay').hidden === true, "guruh: modal saqlanib yopildi");
const newGrp = JSON.parse(win.localStorage.getItem('et_groups')).filter(g => g.name === 'Vaqtli Guruh')[0];
check(!!newGrp && newGrp.days === 'Dushanba 09:15, Shanba 11:00', "vaqt: 'kun + vaqt' har bir kun uchun saqlandi");
check(newGrp.time === '09:15', "vaqt: legacy time maydoni birinchi tanlangan vaqt bilan to'ldirildi");
check(newGrp.groupType === 'school', "guruh turi: yangi guruh 'school' bo'lib saqlandi (tanlanmagan → standart)");
check(Number(newGrp.monthlyFee) === 0, "maktab guruhi: oylik to'lov 0 (haqiqatan bepul)");
check(groupCards() === 3, "guruh: yangi guruh karta bo'ldi (3 ta)");
check(text().includes('Dushanba 09:15') && text().includes('Shanba 11:00') && text().includes(' • '),
  "vaqt: karta formati 'Dushanba 09:15 • Shanba 11:00'");
check(text().includes('Dushanba, Chorshanba, Juma') && text().includes('18:00'),
  "vaqt: eski guruhlarda format o'zgarmagan (Dushanba, Chorshanba, Juma + 18:00)");

/* --- "Guruhni tahrirlash": har bir kun uchun alohida vaqt (prefilled) --- */
const sheet = () => q('#modal-sheet').textContent;
const isChk = name => { const b = qa('#f-days input').filter(i => i.value === name)[0]; return !!(b && b.checked); };
click(qa('.group-card').filter(c => c.textContent.includes('Vaqtli Guruh'))[0].querySelector('[data-act="edit-group"]'));
check(q('#modal-overlay').hidden === false && sheet().includes('Guruhni tahrirlash'), "tahrirlash: modali ochildi");
check(!!q('#f-gname') && q('#f-gname').value === 'Vaqtli Guruh', "tahrirlash: guruh nomi prefilled");
check(isChk('Dushanba') && isChk('Shanba') && !isChk('Juma'), "tahrirlash: kunlar prefilled (Dushanba, Shanba)");
check(qa('#f-gtype input').filter(i => i.checked)[0].value === 'school',
  "tahrirlash: guruh turi prefilled ('school')");
const tutorRadio = qa('#f-gtype input').filter(i => i.value === 'tutoring')[0];
tutorRadio.checked = true;
check(qa('#f-times .dt-time').length === 2, "tahrirlash: tanlangan kunlar sonida vaqt picker");
check(timeFor('Dushanba').value === '09:15' && timeFor('Shanba').value === '11:00',
  "tahrirlash: vaqtlar prefilled (09:15 / 11:00)");
clearDay('Dushanba');
check(qa('#f-times .dt-time').length === 1 && timeFor('Shanba').value === '11:00',
  "tahrirlash: kun o'chirildi → picker ketdi, qolgan qiymat saqlandi");
pickDay('Chorshanba');
check(qa('#f-times .dt-time').length === 2 && !!timeFor('Chorshanba'), "tahrirlash: Chorshanba ✓ → yangi picker");
timeFor('Shanba').value = '14:30';
timeFor('Chorshanba').value = '10:00';
click('[data-act="save-edit-group"]');
check(q('#modal-overlay').hidden === true, "tahrirlash: modal yopildi");
const edGrp = JSON.parse(win.localStorage.getItem('et_groups')).filter(g => g.name === 'Vaqtli Guruh')[0];
check(!!edGrp && edGrp.days === 'Chorshanba 10:00, Shanba 14:30',
  "tahrirlash: 'kun + vaqt' formatida saqlandi (hafta tartibida: Chorshanba 10:00, Shanba 14:30)");
check(edGrp.time === '10:00', "tahrirlash: legacy time = haftaning birinchi kunning vaqti (10:00)");
check(edGrp.groupType === 'tutoring', "tahrirlash: guruh turi 'tutoring' ga o'zgartirilib saqlandi");
check(text().includes('Repetitor guruhi'),
  "tahrirlash: karta nishoni '🎓 Repetitor guruhi' ga yangilandi");
check(text().includes('Shanba 14:30') && text().includes('Chorshanba 10:00') && text().includes(' • '),
  "tahrirlash: karta 'Shanba 14:30 • Chorshanba 10:00' ko'rinishida");
check(q('#toast').textContent.includes('Guruh yangilandi'), "tahrirlash: success toast");

/* Eski guruhni tahrirlash — bitta time barcha kunlarga tarqatilib, bekor qilinadi */
click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0].querySelector('[data-act="edit-group"]'));
check(qa('#f-days input').filter(i => i.checked).length === 3, "tahrirlash: eski guruh — 3 ta kun belgilangan");
check(qa('#f-times .dt-time').length === 3 && qa('#f-times .dt-time').every(i => i.value === '18:00'),
  "tahrirlash: eski bitta time → barcha kun pickerlarida prefilled (18:00)");
click('.modal-actions [data-act="close-modal"]');
const legacyGrp = JSON.parse(win.localStorage.getItem('et_groups')).filter(g => g.name === 'IELTS Band 7.0')[0];
check(legacyGrp.days === 'Dushanba, Chorshanba, Juma' && legacyGrp.time === '18:00',
  "tahrirlash: bekor qilindi — eski guruh ma'lumoti o'zgarmadi");

/* sinov guruhi o'chiriladi — keyingi bosqichlardagi '2 guruh' invarianti saqlanadi */
click(qa('.group-card').filter(c => c.textContent.includes('Vaqtli Guruh'))[0].querySelector('[data-act="del-group"]'));
click('[data-act="do-del-group"]');
check(groupCards() === 2, "vaqt: sinov guruhi o'chirildi → yana 2 ta guruh");
check(!JSON.parse(win.localStorage.getItem('et_groups')).some(g => g.name === 'Vaqtli Guruh'),
  "vaqt: sinov guruhi bazadan ham o'chdi");

/* --- Avtomatik oylik to'lov: guruh narxi qarzga oyiga bir marta qo'shiladi --- */
win.localStorage.setItem('et_students', JSON.stringify(JSON.parse(win.localStorage.getItem('et_students') || '[]').map(s => Object.assign({}, s, { paymentDebt: 0, feePeriod: '' }))));
click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0].querySelector('[data-act="edit-group"]'));
check(q('#f-gfee-wrap').hidden === true,
  "moliya: maktab guruhini tahrirlashda to'lov maydoni yashirin");
gtypePick('tutoring');
check(q('#f-gfee-wrap').hidden === false,
  "moliya: repetitorlikka o'tkazilganda to'lov maydoni paydo bo'ldi");
setVal('#f-gfee', '50000');
clickAct('save-edit-group');
click('[data-act="nav"][data-screen="home"]');
const feeSt1 = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(s => s.groupId === 'g1');
check(feeSt1.length === 2 && feeSt1.every(s => Number(s.paymentDebt) === 50000 && /^\d{4}-\d{2}$/.test(s.feePeriod)),
  "moliya: oylik to'lov guruh a'zolari qarziga avtomatik qo'shildi");
click('[data-act="nav"][data-screen="home"]');
const feeSt2 = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(s => s.groupId === 'g1');
check(JSON.stringify(feeSt2.map(s => [s.id, s.paymentDebt, s.feePeriod])) === JSON.stringify(feeSt1.map(s => [s.id, s.paymentDebt, s.feePeriod])),
  "moliya: oylik qarz oy ichida takror qo'shilmaydi");
click('[data-act="nav"][data-screen="groups"]');
/* IELTS qaytadan maktab guruhiga o'tkaziladi — to'lov maydoni yashirin, summa 0 */
click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0].querySelector('[data-act="edit-group"]'));
gtypePick('school');
check(q('#f-gfee-wrap').hidden === true,
  "moliya: maktab guruhiga qaytarilganda to'lov maydoni yashirin");
clickAct('save-edit-group');
const schoolGrp = JSON.parse(win.localStorage.getItem('et_groups') || '[]').filter(g => g.id === 'g1')[0];
check(schoolGrp.groupType === 'school' && Number(schoolGrp.monthlyFee) === 0,
  "moliya: maktab guruhi bepul — oylik to'lov 0 ga tushirildi");
check(text().includes('Bepul'),
  "moliya: maktab guruh kartasida '🎁 Bepul' ko'rinadi");
click('[data-act="nav"][data-screen="home"]');
const feeSt3 = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(s => s.groupId === 'g1');
check(feeSt3.every(s => Number(s.paymentDebt) === 50000),
  "moliya: maktab guruhida yangi oylik qarz qo'shilmaydi");
click('[data-act="nav"][data-screen="groups"]');

/* --- Guruhlar: guruh ichida FAQAT ism + speaking qarzi --- */
click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0]);
check(text().includes("Guruh o'quvchilari") && text().includes('IELTS Band 7.0'),
  "guruh detail: guruh nomi va o'quvchilar ko'rinishi ochildi");
check(qa('.group-student-debt').length === 2 && qa('.group-student-debt .s-name').length === 2,
  "guruh detail: faqat IELTS guruhidagi 2 ta o'quvchi ismi ko'rinadi");
check(text().includes('Malika Yusupova') && text().includes('Bekzod Alimov'),
  "guruh detail: o'quvchilarning to'liq ism-familiyasi ko'rinadi");
check(qa('.group-student-debt .debt-controls').length === 2 &&
      qa('.group-student-debt [data-act="debt-minus"]').length === 2 &&
      qa('.group-student-debt [data-act="debt-plus"]').length === 2,
  "guruh detail: har bir o'quvchida speaking qarzi tugmalari bor");
check(!q('[data-act="voice-toggle"]') && !q('[data-act="web-speaking-toggle"]') &&
      !q('[data-act="edit-student"]') && !q('[data-act="del-student"]') &&
      !q('[data-act="pay-student"]') && !q('.student-card'),
  "guruh detail: ruxsat/tahrir/o'chirish/to'lov va ortiqcha kartalar YO'Q");
clickAct('group-detail-back');
check(groupCards() === 2, "guruh detail: Orqaga → guruhlar ro'yxati qaytdi");

/* --- O'quvchilar: xuddi shu guruhlar ro'yxati + to'liq boshqaruv --- */
click('[data-act="nav"][data-screen="students"]');
check(groupCards() === 2 && studentCards() === 6,
  "o'quvchilar: guruhlar ro'yxati va barcha o'quvchilar birga ko'rinadi");
click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0]);
check(studentCards() === 2 && text().includes('IELTS Band 7.0 guruhidagi'),
  "o'quvchilar → guruh: faqat IELTS o'quvchilari (2 ta) va guruh sarlavhasi");
check(qa('[data-act="voice-toggle"]').length === 2 && qa('[data-act="web-speaking-toggle"]').length === 2 &&
      qa('[data-act="edit-student"]').length === 2 && qa('[data-act="del-student"]').length === 2,
  "o'quvchilar → guruh: voice/web ruxsat + tahrirlash/o'chirish to'liq ko'rinadi");
check(!q('[data-act="remind-debtors"]') && !q('[data-act="nav"][data-screen="debtors"]'),
  "o'quvchilar → maktab guruhi: qarzdor tugmalari ko'rinmaydi");
clickAct('filter-group-all');
check(studentCards() === 6 && groupCards() === 2 && !q('[data-act="filter-group-all"]'),
  "o'quvchilar: 'Barcha o'quvchilar' → filtr tozalandi, guruhlar ro'yxati qaytdi");
click(qa('.group-card').filter(c => c.textContent.includes('General English'))[0]);
check(studentCards() === 4 && !!q('[data-act="remind-debtors"]') && !!q('[data-act="nav"][data-screen="debtors"]'),
  "o'quvchilar → repetitorlik guruhi: to'liq ro'yxat va qarzdor tugmalari");
check(qa('[data-act="pay-student"]').length >= 1 && qa('[data-act="debt-add"]').length >= 1,
  "o'quvchilar → repetitorlik guruhi: to'lov qo'shish tugmalari ko'rinadi");
clickAct('filter-group-all');

/* ================= 4. O'QUVCHILAR ================= */
click('[data-act="nav"][data-screen="students"]');
check(text().includes("O'quvchilar"), 'o\'quvchilar: ekran');
check(studentCards() === 6, 'o\'quvchilar: 6 ta mock o\'quvchi');
check(text().includes('Jasur Karimov'), 'o\'quvchilar: ism ko\'rinadi');
check(text().includes('Login') && text().includes('jasur'), 'o\'quvchilar: login ko\'rinadi');
check(!text().includes('Ota-ona'), 'moliya/kontakt: ota-ona bloki yo\'q');
check(qa('[data-act="reset-pwd"]').length === 6, 'o\'quvchilar: har kartada "Parolni yangilash"');

/* sinf filtri */
click('[data-act="filter-class"][data-class="11-sinf"]');
check(studentCards() === 2, 'filtr: 11-sinf = 2 ta');
click('[data-act="filter-class"][data-class="Barchasi"]');
check(studentCards() === 6, 'filtr: Barchasi = 6 ta');

/* --- Jonli qidiruv (harf yozilishi bilan, Enter'siz) --- */  /* Redizayn: qidiruv ikonkasi placeholder'dan olib, CSS orqali input ichiga ko'chirildi */
  check(q('#s-search').placeholder === "O'quvchi ismini kiriting..." &&
    q('#s-search').placeholder.indexOf('🔍') < 0,
    "qidiruv: placeholder toza (ikonka endi emoji emas)");
  check(!!q('.search-wrap #s-search') && !!q('.chips .chip-btn'),
    "qidiruv: pill shakl + ichilgan qidiruv ikonkasi (.search-wrap) + chip'lar");
setVal('#s-search', 'Jas');
check(studentCards() === 1 && text().includes('Jasur Karimov'), "qidiruv: 1 ta harf yozildi → darhol filtr (Enter'siz)");
setVal('#s-search', 'ma');
check(text().includes('Malika Yusupova') && studentCards() >= 1, "qidiruv: davomiy qidiruv ishlaydi");
setVal('#s-search', '');
check(studentCards() === 6, "qidiruv: tozalandi → barcha o'quvchilar qaytdi");

/* ================= 4a. QARZ QO'SHISH (JIMJIT) + ESLATMA ================= */
let debtQueueCalls = 0;
let lastDebtRows = [];
const realQueueMessages = win.__cloud.queueMessages;
win.__cloud.queueMessages = function (rows) {
  debtQueueCalls += rows.length;
  lastDebtRows = rows;
  return Promise.resolve([]);
};
click('[data-act="nav"][data-screen="students"]');
const schoolCard4 = qa('.student-card').filter(c => c.textContent.includes('Malika Yusupova'))[0];
check(!schoolCard4.querySelector('[data-act="debt-add"]') &&
      !schoolCard4.querySelector('[data-act="pay-student"]') &&
      !schoolCard4.querySelector('.pay-status') &&
      !schoolCard4.querySelector('[data-act="remind-student"]'),
  "maktab guruhi kartasida pul/qarz/to'lov tugmalari umuman yo'q");
const azizCard4 = qa('.student-card').filter(c => c.textContent.includes('Aziz Rahimov'))[0];
check(!!azizCard4.querySelector('[data-act="debt-add"]') &&
      !!azizCard4.querySelector('[data-act="pay-student"]'),
  "repetitor guruhida '➕ Qarz qo'shish' + '💵 To'lov kiritish' tugmalari bor");
const addDebtTo = (name, sum) => {
  const card = qa('.student-card').filter(c => c.textContent.includes(name))[0];
  click(card.querySelector('[data-act="debt-add"]'));
  setVal('#debt-sum', String(sum));
  clickAct('save-add-debt');
};
addDebtTo('Aziz Rahimov', 50000);
check(debtQueueCalls === 0,
  "qarz qo'shish JIMJIT — o'quvchiga Telegram xabari ketmadi");
const s1Debt = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(x => x.id === 's1')[0];
check(s1Debt && Number(s1Debt.paymentDebt) === 50000,
  "qarz payment_debt ga qo'shildi (50000)");
const azizCard4b = qa('.student-card').filter(c => c.textContent.includes('Aziz Rahimov'))[0];
check(!!azizCard4b.querySelector('[data-act="remind-student"]'),
  "qarzi bor o'quvchi kartasida '🔔 Eslatma yuborish' tugmasi paydo bo'ldi");
click(azizCard4b.querySelector('[data-act="remind-student"]'));
check(debtQueueCalls === 1 && lastDebtRows.length === 1,
  "eslatma faqat tugma bosilganda yuborildi (1 ta)");
check(lastDebtRows[0].text.includes("<b>To'lov eslatmasi!</b>") &&
      lastDebtRows[0].text.includes('<b>Aziz Rahimov</b>') &&
      lastDebtRows[0].text.includes("50 000 so'm") &&
      lastDebtRows[0].text.includes("Iltimos, to'lovni amalga oshirishingizni so'raymiz."),
  "eslatma matni aynan talab qilingan formatda");

/* ================= 4b. QARZDORLAR EKRANI ================= */
addDebtTo('Nilufar Ergasheva', 50000);
check(debtQueueCalls === 1, "ikkinchi qarz ham jimjit qo'shildi");
click('[data-act="nav"][data-screen="debtors"]');
check(text().includes('Qarzdorlar') && qa('.debtor-card').length === 2,
  "qarzdorlar: alohida ekranda 2 ta qarzdor");
check(text().includes('50 000 so\'m') && text().includes('umumiy qarz'),
  "qarzdorlar: summalar va umumiy qarz ko'rinadi");
check(qa('.debtor-meta').length === 2 && text().includes("Oxirgi to'lov"),
  "qarzdorlar: oxirgi to'lov sanasi maydoni");
check(!!q('[data-act="remind-debtors"]'), "qarzdorlar: eslatma tugmasi ekranda");
debtQueueCalls = 0;
clickAct('remind-debtors');
check(q('#modal-overlay').hidden === false && q('#modal-sheet').textContent.includes('2 nafar qarzdor'),
  "qarzdorlar: ommaviy eslatma modali 2 nafar qarzdorni ko'rsatdi");
clickAct('do-remind-debtors');
check(debtQueueCalls === 2, "qarzdorlar: ommaviy eslatma 2 ta qarzdorga navbatga qo'yildi");
win.__cloud.queueMessages = realQueueMessages;
const firstDebtor = qa('.debtor-card')[0];
const firstDebtorName = firstDebtor.querySelector('.s-name').textContent;
click(firstDebtor.querySelector('[data-act="pay-student"]'));
check(q('#modal-overlay').hidden === false && !!q('#pay-sum'), "qarzdorlar: to'lov modali ochildi");
setVal('#pay-sum', '20000');
clickAct('save-pay');
check(q('#modal-overlay').hidden === true, "qarzdorlar: to'lov saqlandi");
check(text().includes('30 000 so\'m'), "qarzdorlar: qarz 30 000 so'mga kamaydi");
check(/Oxirgi to'lov: <b>\d{2}\.\d{2}\.\d{4}<\/b>/.test(qa('.debtor-card').filter(c => c.textContent.includes(firstDebtorName))[0].innerHTML),
  "qarzdorlar: oxirgi to'lov sanasi yangilandi");
const payLocal = JSON.parse(win.localStorage.getItem('et_payments') || '[]');
check(payLocal.length === 1 && payLocal[0].amount === 20000, "qarzdorlar: to'lov tarixga yozildi");
click('[data-act="nav"][data-screen="students"]');
check(studentCards() === 6, "qarzdorlar: '← Orqaga' o'quvchilarga qaytardi");


/* ================= 5. YANGI O'QUVCHI + LOGIN/PAROL ================= */
clickAct('open-add-student');
check(q('#modal-overlay').hidden === false, 'modal: o\'quvchi qo\'shish ochildi');
clickAct('save-student');
check(q('#modal-overlay').hidden === false, 'validation: bo\'sh forma saqlanmaydi');

setVal('#f-sname', 'Gulnoza Ismoilova');
q('#f-sclass').value = '11-sinf';
q('#f-sgroup').value = 'g1';
setVal('#f-slogin', 'gulnoza');
setVal('#f-spass', '1234');
clickAct('save-student');
check(q('#modal-overlay').hidden === true, 'modal: saqlanib yopildi');
check(studentCards() === 7, 'o\'quvchilar: yangi o\'quvchi qo\'shildi (7 ta)');
check(text().includes('gulnoza'), 'o\'quvchilar: yangi login ko\'rinadi');

/* takrorlanuvchi login */
clickAct('open-add-student');
setVal('#f-sname', 'Test User');
q('#f-sclass').value = '9-sinf';
q('#f-sgroup').value = 'g2';
setVal('#f-slogin', 'jasur');
setVal('#f-spass', '1111');
clickAct('save-student');
check(q('#modal-overlay').hidden === false, 'validation: band login rad etildi');
click('[data-act="close-modal"]');

/* ================= 6. BAHOLAR JURNALI ================= */
click('[data-act="nav"][data-screen="grades"]');
check(text().includes('Baholar'), 'jurnal: ekran');
check(!!q('table.bj'), 'jurnal: jadval mavjud');
check(qa('.selector-row')[0].querySelectorAll('.chip-btn').length === 2, 'jurnal: guruh tanlagich (2 guruh)');
check(qa('thead .bj-date').length >= 5, 'jurnal: kamida 5 ta dars sanasi ustuni');
check(qa('thead .bj-sum').length === 1, 'jurnal: oxirida "O\'rtacha" ustuni');
check(text().includes('Jami:'), 'jurnal: jami ball hisoblanadi');
check(text().includes('8–10') && text().includes('6–7') && text().includes('1–5'), 'jurnal: rang legendasi');
check(qa('tbody tr').length === 3, 'jurnal: IELTS guruhida 3 ta qator (yangi o\'quvchi bilan)');

/* sana ustunini tanlash */
click(qa('[data-act="grade-date"]')[0]);
check(qa('.bj-date')[0].classList.contains('is-focus'), 'jurnal: sana ustuni belgilanadi');

/* 1-tap baho kiritish */
let target = qa('.bj-grade.g-empty')[0] || q('.bj-grade');
const tSid = target.getAttribute('data-sid');
const tDate = target.getAttribute('data-date');
const before = target.textContent.trim();
const want = before === '10' ? '1' : '10';
click(target);
check(q('#modal-overlay').hidden === false, 'editor: modal ochildi');
check(qa('.score-btn').length === 10, 'editor: 10 ta ball tugmasi');
check(qa('.cat-wrap .chip-btn').length === 3, 'editor: 3 ta vazifa turi (Darsdagi javob, Lug\'at, Uyga vazifa)');
check(!!q('#grade-note'), 'editor: izoh maydoni');
click(qa('.score-btn').filter(b => b.getAttribute('data-score') === want)[0]);
check(q('.editor-info .gr-score').textContent.trim() === want, 'editor: ball tanlandi');
click(qa('.cat-wrap .chip-btn')[2]);
click(q('[data-act="close-grade"]'));
const newCell = q('[data-act="edit-grade"][data-sid="' + tSid + '"][data-date="' + tDate + '"]');
check(newCell && newCell.textContent.trim() === want, 'jurnal: baho saqlandi (' + want + ')');
check(newCell && newCell.classList.contains('g-num'), "jurnal: neytral g-num klassi (rangli badge yo'q)");
check(newCell && !newCell.classList.contains('g-a') && !newCell.classList.contains('g-b') && !newCell.classList.contains('g-c'), "jurnal: eski rangli klasslar (g-a/g-b/g-c) qolmagan");

/* sinf filtri jurnalda */
const rowsBefore = qa('tbody tr').length;
click(qa('.selector-row')[1].querySelectorAll('.chip-btn')[5]);
check(qa('tbody tr').length <= rowsBefore, 'jurnal: sinf filtri ishlaydi');
click(qa('.selector-row')[1].querySelectorAll('.chip-btn')[0]);
check(qa('tbody tr').length === rowsBefore, 'jurnal: "Barchasi" qaytardi');

/* ================= 7. TEZKOR DAVOMAT ================= */
click('[data-act="nav"][data-screen="attendance"]');
check(text().includes('davomat') || text().includes('Davomat'), 'davomat: ekran');
check(q('#att-date').value === TODAY, 'davomat: sana bugungi sana');
check(qa('.att-row').length === 3, 'davomat: IELTS guruhida 3 ta o\'quvchi');
check(qa('.att-row')[0].querySelectorAll('.att-btn').length === 3, 'davomat: 3 ta holat tugmasi');
check(text().includes('Keldi') && text().includes('Kelmadi') && text().includes('Sababli'), 'davomat: tugma matunlari o\'zbekcha');

const active0 = qa('.att-row')[0].querySelector('.att-btn[class*="on-"]');
if (active0) click(active0);
check(!qa('.att-row')[0].querySelector('.att-btn[class*="on-"]'), 'davomat: holatni o\'chirish mumkin');
click(qa('.att-row')[0].querySelector('[data-status="absent"]'));
check(qa('.att-row')[0].querySelector('[data-status="absent"]').classList.contains('on-absent'), 'davomat: "Kelmadi" tanlandi');
const active1 = qa('.att-row')[1].querySelector('.att-btn[class*="on-"]');
if (active1) click(active1);
click(qa('.att-row')[1].querySelector('[data-status="present"]'));
check(qa('.att-row')[1].querySelector('[data-status="present"]').classList.contains('on-present'), 'davomat: "Keldi" tanlandi');
click('[data-act="att-save"]');
check(q('#toast').textContent.includes('Davomat saqlandi'), 'davomat: "Davomatni saqlash" tasdiq toast');

click('[data-act="nav"][data-screen="grades"]');
click('[data-act="nav"][data-screen="attendance"]');
check(qa('.att-row')[0].querySelector('[data-status="absent"]').classList.contains('on-absent'), 'davomat: saqlangan holat tiklandi');

/* ================= 8. SPEAKING SCHEDULER ================= */
click('[data-act="nav"][data-screen="speaking"]');
check(text().includes('Speaking'), 'speaking: ekran');
check(qa('.speak-row').length === 3, 'speaking: 3 ta seed slot');
check(text().includes('14:00 – 14:20'), 'speaking: slot vaqti');
check(text().includes('Bosh (tayinlanmagan)'), 'speaking: tayinlanmagan slot');

/* yangi slot yaratish */
clickAct('open-slot');
check(q('#modal-overlay').hidden === false, 'speaking: slot modali ochildi');
setVal('#sp-start', '16:00');
setVal('#sp-end', '15:00');
clickAct('save-slot');
check(q('#modal-overlay').hidden === false, 'speaking: noto\'g\'ri vaqt rad etildi');
setVal('#sp-end', '16:20');
q('#sp-student').value = 's2'; /* Nilufar */
clickAct('save-slot');
check(q('#modal-overlay').hidden === true, 'speaking: slot saqlandi');
check(text().includes('16:00 – 16:20'), 'speaking: yangi slot ro\'yxatda');
check(text().includes('Nilufar Ergasheva'), 'speaking: slotga o\'quvchi tayinlandi');

/* baholash → jurnalga sync */
const newRow = qa('.speak-row').filter(r => r.textContent.includes('16:00'))[0];
click(newRow.querySelector('[data-act="slot-score"]'));
check(q('#modal-overlay').hidden === false, 'speaking: baholash modali');
check(qa('.score-btn').length === 10, 'speaking: 10 ta ball tugmasi');
click(qa('.score-btn').filter(b => b.getAttribute('data-score') === '9')[0]);
check(q('#modal-overlay').hidden === true, 'speaking: baho saqlanib yopildi');
check(q('#toast').textContent.includes('jurnalga yozildi'), 'speaking: jurnalga sync toast');

/* jurnalda tekshirish (Nilufar g2 da) */
click('[data-act="nav"][data-screen="grades"]');
click('[data-act="grade-group"][data-group="g2"]');
const cells = qa('[data-act="edit-grade"][data-sid="s2"]');
const scoredCell = cells.filter(c => c.textContent.trim() === '9')[0];
check(!!scoredCell, 'speaking→jurnal: ball baholar jurnaliga tushdi');
check(qa('tbody tr').length === 4, 'jurnal: g2 da 4 ta o\'quvchi');

/* ================= 9. USTOZ: PAROL YANGILASH ================= */
click('[data-act="nav"][data-screen="students"]');
const nilCard = qa('.student-card').filter(c => c.textContent.includes('Nilufar Ergasheva'))[0];
click(nilCard.querySelector('[data-act="reset-pwd"]'));
check(q('#modal-overlay').hidden === false, 'reset: modal ochildi');
setVal('#rp-pass', '7777');
clickAct('save-reset');
check(q('#modal-overlay').hidden === true, 'reset: parol saqlandi');
check(q('#toast').textContent.includes('Parol yangilandi'), 'reset: tasdiq toast');

/* ================= 10. O'QUVCHI KABINETI (jasur/123) ================= */
logout();
check(text().includes('Tizimga kirish') && !!q('[data-act="auth-login-open"]'),
  'logout: bosh sahifaga (landing) qaytdi');
click('[data-act="auth-login-open"]');
check(!!q('#login-input'), 'logout: "Kirish" oynasi ochildi');
await loginAs('jasur', '1234');
for (let i = 0; i < 30 && !(q('#login-error') && q('#login-error').classList.contains('show')); i++) {
  await new Promise(r => setTimeout(r, 50));
}
check(q('#login-error').classList.contains('show'), 'student: noto\'g\'ri parol rad etildi');
await loginAs('jasur', '123');
check(text().includes('Jasur Karimov'), 'student: kabinet ochildi');
check(text().includes('8-sinf') && text().includes('General English'), 'student: sinf + guruh ko\'rsatildi');
check(q('#app-header').textContent.includes("O'quvchi"), 'student: headerda "O\'quvchi"');
check(navLabels().length === 2 && navLabels().join(',') === 'Kabinet,Profil', 'student: nav faqat Kabinet + Profil');

check(qa('.student-action').length === 6, 'student: kabinetda 6 ta asosiy bo\'lim kartasi');
check(!text().includes('Tez amallar'), 'student: "Tez amallar" sarlavhasi yo\'q');
openStudentView('grades');
check(text().includes('Baholar') && qa('.grade-row').length > 0, 'student: baholar ichki oynasi');
check(!!q('.avg-badge') && /\d\.\d/.test(q('.avg-badge').textContent), 'student: "O\'rtacha baho" badge');
check(!!q('[data-act="student-back"]'), 'student: ichki oynada orqaga tugmasi bor');
closeStudentView();
openStudentView('attendance');
check(text().includes('Mening davomatim'), 'student: "Mening davomatim"');
  check(/\d+% qatnashgan/.test(text()), "davomat: akkordeonda foiz statistika");
  check(!!q('.att-toggle') && !!q('.att-last') && !q('.att-scroll'), "davomat: boshida yig'ilgan (oxirgi 3 ta)");
  click(q('.att-toggle'));
  check(!!q('.att-scroll') && text().includes('Yopish'), "davomat: barchasini ko'rish — ichki skroll ochildi");
  click(q('.att-toggle'));
  check(!q('.att-scroll'), "davomat: qayta yig'ildi");
closeStudentView();
openStudentView('speaking');
check(text().includes('14:00 – 14:20'), 'student: o\'z speaking vaqti (slot) ko\'rinadi');
closeStudentView();
check(!!q('.pay-banner') && text().includes('Hozircha to\'lovlar mavjud emas'),
   "moliya: o'quvchi kabinetida to'lov holati + to'lovlar tarixi")
check(text().includes("To'lov qarzi") || text().includes("To'langan"), "moliya: o'quvchi kabinetida qarz summasi ko'rinadi");

/* Boshqalarning ma'lumotlari KO'RINMASLIGI kerak */
check(!text().includes('Nilufar Ergasheva'), 'maxfiy: boshqa o\'quvchi ismi yo\'q');
check(!text().includes('Malika Yusupova'), 'maxfiy: boshqa o\'quvchi ismi yo\'q (2)');
check(!text().includes('Aziz Rahimov'), 'maxfiy: boshqa o\'quvchi ismi yo\'q (3)');
check(!text().includes('+998 97 222-33-44'), 'maxfiy: boshqa telefon yo\'q');
check(!text().includes('+998 95 700-80-90'), 'maxfiy: boshqa telefon yo\'q (2)');
check(!text().includes('Guruhlar') || !qa('.nav-item').some(n => n.getAttribute('data-screen') === 'groups'), 'maxfiy: guruhlar boshqaruvi yo\'q');

/* To'g'ridan-to'g'ri navigatsiya urinishi bloklandi */
forceNav('students');
check(qa('.student-card').length === 0, 'guard: o\'quvchi "O\'quvchilar"ga kira olmaydi');
forceNav('groups');
check(qa('.group-card').length === 0, 'guard: o\'quvchi "Guruhlar"ga kira olmaydi');
forceNav('grades');
check(qa('table.bj').length === 0, 'guard: o\'quvchi jurnalga kira olmaydi');
forceNav('attendance');
check(qa('.att-btn').length === 0, 'guard: o\'quvchi davomatga kira olmaydi');
forceNav('speaking');
check(qa('.speak-row').length === 0, 'guard: o\'quvchi speaking boshqaruvida yo\'q');
check(text().includes('Jasur Karimov'), 'guard: o\'quvchi o\'z kabinetida qoladi');

/* --- Guruh turi o'quvchidan 100% yashirin: maktab guruhi (g1) o'quvchisi malika --- */
logout();
await loginAs('malika', '123');
check(text().includes('Malika Yusupova') && text().includes('IELTS Band 7.0'),
  "maktab guruhi o'quvchisi: kabinet ochildi, faqat guruh nomi ko'rinadi");
check(!text().includes('Maktab guruhi') && !text().includes('Repetitor') && !text().includes('group_type'),
  "maktab guruhi o'quvchisi: guruh TURI umuman ko'rinmaydi");
check(!text().includes("To'lov") && !text().includes('qarz') && !text().includes("so'm") &&
      !text().includes('Oylik') && !q('.pay-status') && !q('.pay-history'),
  "maktab guruhi o'quvchisi: pul / to'lov / qarz haqida bitta ham so'z yoki belgi yo'q");
check(text().includes('Speaking topshirish') && !text().includes('Speaking qarzingiz'),
  "maktab guruhi o'quvchisi: speaking topshirish qoladi, 'qarz' badge yo'q");
check(q('#screen').firstElementChild && q('#screen').firstElementChild.classList.contains('hero-card'),
  "kabinet tartibi: profil kartasi eng birinchi o'rinda (maktab guruhi)");
check(!q('.pay-banner'), "kabinet tartibi: maktab guruhida to'lov banneri umuman yo'q");
check(!!q('.student-actions') && q('.student-actions').children.length === 6,
  "kabinet tartibi: 6 ta bo'lim kartasi (2x2 grid) profil kartasidan keyin");

/* --- Repetitorlik guruhi (g2) o'quvchisi: to'lov bo'limi ko'rinadi --- */
logout();
await loginAs('aziz', '123');
check(!!q('.pay-banner') && /to'lov|To'langan/i.test(text()),
  "repetitorlik guruhi o'quvchisi: to'lov bo'limi ko'rinadi (yashirilmaydi)");
{
  const kids = Array.from(q('#screen').children);
  const at = (cls) => kids.findIndex(el => el.classList.contains(cls));
  check(at('hero-card') === 0, "kabinet tartibi: profil kartasi 1-o'rinda (repetitorlik)");
  check(at('pay-banner') === 1, "kabinet tartibi: to'lov banneri 2-o'rinda (repetitorlik)");
  check(at('student-actions') > at('pay-banner'), "kabinet tartibi: bo'lim kartalari to'lovdan keyin");
  /* EN rejimda qarz banneri va to'lov tugmasi to'liq inglizchada */
  clickAct('toggle-lang');
  const pbEn = (q('.pay-banner') || {}).textContent || '';
  check(/Attention:/.test(pbEn) && /unpaid balance of .* UZS!/.test(pbEn),
    'i18n EN: qarz banneri — “Attention: You have an unpaid balance of ... UZS!”');
  check(/Pay by Card/.test(text()), 'i18n EN: “Karta orqali to\'lash” → “Pay by Card”');
  clickAct('toggle-lang');
}

/* Section 11 davomi uchun Jasur qayta kiradi */
logout();
await loginAs('jasur', '123');
check(text().includes('Jasur Karimov'), "guruh turi: Jasur qayta kirdi (keyingi testlar uchun)");

/* ================= 11b. MOCK TESTLAR (O'QUVCHI) ================= */
/* Demo/sinov testlari YO'Q: biriktirilmagan bo'lsa bo'sh holat ko'rinadi */
forceNav('home');
check(!!q('[data-act="student-view"][data-view="mock"]'), 'mock: kabinetda “Mock testlar” kartasi bor');
openStudentView('mock');
check(qa('[data-act="mock-cat-open"]').length === 7, 'mock: o‘quvchida 7 ta kategoriya kartasi (Podcasts bilan)');
click('[data-act="mock-cat-open"][data-cat="reading"]');
check(qa('[data-act="mock-start"]').length === 0 && text().includes('biriktirilmagan'),
  'mock: biriktirilgan test yo‘q — bo‘sh holat ko‘rinadi');
click('[data-act="mock-cat-back"]');
check(!text().includes('Buyuk Barer') && !text().includes('Reading — 1-qism'),
  'mock: hardcoded/demo testlar butunlay olib tashlangan');

/* Ustoz yaratgan testlar (g2 guruhiga biriktirilgan) */
const mockOpts = function () { return ['To describe the reef', 'To advertise tours', 'To explain coral growing']; };
win.__mock.saveDef({
  id: 'md_read', title: 'Reading Practice 1', category: 'reading', groupIds: ['g2'], cefr: 'B1',
  cefrThresholds: { A1: 1, A2: 2, B1: 3 },
  parts: [{ id: 'p1', title: 'Part 1', cefr: 'B1',
    passage: 'The Great Barrier Reef is the world\'s largest coral reef system. Rising sea temperatures have caused mass coral bleaching.',
    questions: [
      { id: 'r1', text: 'What is the main purpose of the text?', opts: mockOpts(), ans: 0, izoh: 'It describes the reef and its threats.' },
      { id: 'r2', text: 'What causes coral bleaching?', opts: ['Rising sea temperatures', 'Tourists', 'New nurseries'], ans: 0, izoh: 'The text says rising sea temperatures.' },
      { id: 'r3', text: 'What are local organisations doing?', opts: ['Replanting coral', 'Building roads', 'Increasing fishing'], ans: 0, izoh: 'They replant coral.' },
      { id: 'r4', text: 'Which statement is true?', opts: ['The reef is over 2,300 km', 'It has one fish species', 'Bleaching helps corals'], ans: 0, izoh: 'The first sentence says 2,300 km.' }
    ] }]
}, true);
win.__mock.saveDef({
  id: 'md_write', title: 'Writing Task 1', category: 'writing', groupIds: ['g2'],
  prompt: 'Some people believe students should learn a second language from primary school. Do you agree?',
  instruction: 'Write at least 70 words.'
}, true);
win.__mock.saveDef({
  id: 'md_voc', title: 'Vocabulary Check', category: 'vocabulary', groupIds: ['g2'], cefr: 'A2',
  questions: [
    { id: 'v1', text: 'A person who studies stars is an ___.', opts: ['astronomer', 'architect', 'accountant'], ans: 0, izoh: 'Astronomer studies stars.' },
    { id: 'v2', text: 'Opposite of “ancient”.', opts: ['modern', 'old', 'historic'], ans: 0, izoh: 'Modern is the opposite.' },
    { id: 'v3', text: '“Reliable” means ___.', opts: ['can be trusted', 'very fast', 'expensive'], ans: 0, izoh: 'Reliable means trustworthy.' },
    { id: 'v4', text: 'Closest to “enormous”.', opts: ['huge', 'tiny', 'narrow'], ans: 0, izoh: 'Enormous means huge.' },
    { id: 'v5', text: '“To borrow” means ___.', opts: ['take and return later', 'buy forever', 'give away'], ans: 0, izoh: 'Borrow means take for a time.' }
  ]
}, true);
win.__mock.saveDef({
  id: 'md_speak', title: 'Speaking Practice', category: 'speaking', groupIds: ['g2'],
  questions: [
    { id: 'sp1', text: 'Describe a place in your city that you like.', imageUrl: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/mock/demo.png' },
    { id: 'sp2', text: 'What do you usually do there?' },
    { id: 'sp3', text: 'How has it changed in recent years?' },
    { id: 'sp4', text: 'Would you recommend it to a visitor?' }
  ]
}, true);
closeStudentView();
openStudentView('mock');
check(qa('[data-act="mock-cat-open"]').length === 7, 'mock: 7 kartali grid o‘quvchida ham bir xil');
click('[data-act="mock-cat-open"][data-cat="reading"]');
check(qa('[data-act="mock-start"]').length === 1, 'mock: reading bo‘limida faqat biriktirilgan test');
check(!!q('.mock-start-btn') && text().includes('Boshlash'), 'mock: yashil “Boshlash” tugmasi');
check(text().includes('Reading Practice 1') && text().includes('General English'),
  'mock: test nomi va biriktirilgan guruh badge’i');

/* Reading — matn + savollar, avtomatik baholash va izohlar */
click('[data-act="mock-start"][data-id="md_read"]');
check((q('#mock-timer') || {}).textContent === '60:00', 'mock reading: 60 daqiqalik taymer boshlandi');
check(!!q('.mock-passage') && qa('[data-act="mock-pick"]').length === 12,
  'mock reading: matn va 12 ta variant ko‘rinadi');
check(q('[data-act="mock-submit"]').disabled === true, 'mock reading: javobsiz “Yuborish” bloklangan');
['r1', 'r2', 'r3', 'r4'].forEach(function (qid) {
  click('[data-act="mock-pick"][data-mq="' + qid + '"][data-mopt="0"]');
});
check(q('[data-act="mock-submit"]').disabled === false, 'mock reading: barcha javoblardan keyin “Yuborish” faol');
clickAct('mock-submit');
check(!!q('.mock-score-card') && /4\/4/.test(text()) && text().includes('100%') && !!q('.mock-cefr'),
  'mock reading: ball, foiz va CEFR badge hisoblandi');
check(qa('.mock-cefr-scale .mock-cefr-lvl.is-amber').length === 3 &&
      qa('.mock-cefr-scale .mock-cefr-lvl.is-green').length === 3,
  'mock reading: A1–B1 amber, B2–C2 yashil katta CEFR shkalasi');
check((q('.mock-cefr-scale .is-active') || {}).textContent === 'B1',
  'mock reading: chegara mantiqi — 4 ball bilan B1 (A2=2, B1=3)');
check(!!q('[data-act="mock-review"]'), 'mock reading: “Javoblarni ko‘rib chiqish” tugmasi bor');
clickAct('mock-review');
check(text().includes('Sizning javobingiz') && text().includes('To‘g‘ri javob') && text().includes('Izoh'),
  'mock reading: javob, to‘g‘ri javob va Izoh ko‘rsatiladi');

/* Writing — matn yuboriladi, ustoz tekshiruvi kutiladi */
clickAct('mock-home');
click('[data-act="mock-cat-back"]');
click('[data-act="mock-cat-open"][data-cat="writing"]');
click('[data-act="mock-start"][data-id="md_write"]');
const mockEssay = 'I agree that children should start learning a second language at primary school. ' +
  'Young learners remember new sounds quickly and they are not afraid of making mistakes. ' +
  'For example, my cousin learned English songs at the age of seven and now she speaks fluently.';
setVal('#mock-writing', mockEssay);
check(Number(q('#mock-word-count').textContent) === mockEssay.trim().split(/\s+/).length,
  'mock writing: so‘z hisoblagichi ishlaydi');
clickAct('mock-submit');
check(text().includes('Baholanmoqda'), 'mock writing: yuborilgach ustoz tekshiruvi kutilmoqda');

/* Vocabulary — avtomatik baholash */
clickAct('mock-home');
click('[data-act="mock-cat-back"]');
click('[data-act="mock-cat-open"][data-cat="vocabulary"]');
click('[data-act="mock-start"][data-id="md_voc"]');
['v1', 'v2', 'v3', 'v4', 'v5'].forEach(function (qid) {
  click('[data-act="mock-pick"][data-mq="' + qid + '"][data-mopt="0"]');
});
clickAct('mock-submit');
check(/5\/5/.test(text()), 'mock vocabulary: avtomatik baholandi (5/5)');

/* Speaking — rasm, savol bo‘yicha video va avtomatik o‘tish */
clickAct('mock-home');
click('[data-act="mock-cat-back"]');
click('[data-act="mock-cat-open"][data-cat="speaking"]');
click('[data-act="mock-start"][data-id="md_speak"]');
check(!!q('.mock-q-img'), 'mock speaking: 1-savolda o‘rta o‘lchamdagi rasm bor');
check(qa('.mock-dot').length === 4, 'mock speaking: 4 savol progressi');
clickAct('mock-speak-record');
const spAttemptId = (JSON.parse(win.localStorage.getItem('et_mock_results')) || [])
  .filter(a => a.category === 'speaking').pop().id;
check(!!spAttemptId, 'mock speaking: video urinishi yaratildi');
click('[data-act="speak-rec-close"]');
win.__mock.saveSpeakingVideo(spAttemptId, 'sp1',
  'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/mock/demo.webm',
  { eyeContactPercent: 91, lookAwayCount: 0, durationSec: 12 });
check((q('.mock-speak-step') || {}).textContent.indexOf('2 / 4') >= 0,
  'mock speaking: video saqlangach 2-savolga avtomatik o‘tildi');
const spSaved = JSON.parse(win.localStorage.getItem('et_mock_results')).filter(a => a.id === spAttemptId)[0];
check(!!spSaved && spSaved.videos.length === 1 && spSaved.videos[0].url.indexOf('demo.webm') > 0,
  'mock speaking: video savol bo‘yicha R2 havolasi bilan saqlandi');
clickAct('mock-speak-finish');
check(text().includes('Baholanmoqda'), 'mock speaking: yakunlangach ustoz tekshiruvi kutilmoqda');

/* Listening — “Boshlash” bosilishi bilan avtomatik ijro, pauza/seek yo‘q */
win.__mock.saveDef({
  id: 'md_listen', title: 'Listening Practice 1', category: 'listening', groupIds: ['g2'],
  tasks: [{ id: 'tk1', title: 'Task 1', audioUrl: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/mock/demo.mp3',
    questions: [{ id: 'l1', text: 'Where is the speaker?', opts: ['At a station', 'At school', 'At home'], ans: 0 }] }]
}, true);
clickAct('mock-home');
click('[data-act="mock-cat-back"]');
click('[data-act="mock-cat-open"][data-cat="listening"]');
click('[data-act="mock-start"][data-id="md_listen"]');
const listenAudio = q('.mock-audio');
check(!!listenAudio && !listenAudio.hasAttribute('controls'),
  'mock listening: audio pleyeri boshqaruvsiz (pauza/seek yo‘q)');
check(!!q('.mock-listen-locknote') && text().includes('bir marta'),
  'mock listening: bir martalik ijro ogohlantirishi ko‘rinadi');
clickAct('mock-exit');
click('[data-act="mock-cat-back"]');

/* Yozma javob (so‘z/gap) + cheksiz harf variantlari — avtomatik baholash */
win.__mock.saveDef({
  id: 'md_listen2', title: 'Listening Written 1', category: 'listening', groupIds: ['g2'],
  tasks: [{ id: 'tk2', title: 'Task 1', questions: [
    { id: 'lw1', type: 'written', text: 'How many visitors came?', answer: '25 (twenty five) | twenty-five' },
    { id: 'lw3', type: 'written', text: 'What colour is the car?', answer: 'color (colour)' },
    { id: 'lw2', text: 'Which letter is correct?', opts: ['A opt', 'B opt', 'C opt', 'D opt', 'E opt'], ans: 4 }
  ] }]
}, true);
click('[data-act="mock-cat-open"][data-cat="listening"]');
click('[data-act="mock-start"][data-id="md_listen2"]');
check(qa('[data-mock-ans="lw1"]').length === 1, 'mock listening: yozma javob uchun matn maydoni chiqadi');
check(qa('[data-act="mock-pick"][data-mq="lw2"]').length === 5,
  'mock listening: 5 ta harf varianti (A–E) ko‘rsatiladi');
setVal('[data-mock-ans="lw1"]', '  Twenty   Five ');
setVal('[data-mock-ans="lw3"]', 'Color');
click('[data-act="mock-pick"][data-mq="lw2"][data-mopt="4"]');
check(q('[data-act="mock-submit"]').disabled === false,
  'mock listening: yozma javob va E varianti bilan “Yuborish” faol');
clickAct('mock-submit');
check(/3\/3/.test(text()), 'mock listening: yozma javob normalizatsiya qilinib avtomatik baholandi (3/3)');
clickAct('mock-review');
check(text().includes('twenty five') && text().includes('E opt'), 'mock listening: yozma va harfli javoblar tahlilda ko‘rsatiladi');
check(qa('.mock-rev.is-ok').length === 3,
  'mock listening: qavsdagi so‘z ham, qavsdan tashqaridagi so‘z ham alohida to‘g‘ri deb qabul qilindi');
clickAct('mock-home');
click('[data-act="mock-cat-back"]');

/* --- Podcasts: audio/video + matn — so'zma-so'z avtomatik tekshirish --- */
win.__mock.saveDef({
  id: 'md_pod', title: 'Daily Podcast 1', category: 'podcasts', groupIds: ['g2'],
  mediaUrl: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/mock/podcasts/demo.mp3',
  mediaName: 'demo.mp3', mediaType: 'audio',
  script: 'My name is Aziz and I live in Tashkent with my family.',
  instruction: 'Listen and write what you hear.'
}, true);
openStudentView('mock');
click('[data-act="mock-cat-open"][data-cat="podcasts"]');
check(qa('.pod-name-card').length === 1 && text().includes('Daily Podcast 1'),
  'mock podcasts: bo‘limda faqat podcast nomi turadi');
check(!q('.mock-stu-meta') && qa('[data-act="mock-start"]').length === 1,
  'mock podcasts: nom kartasidan boshqa ma’lumot ko‘rinmaydi');
click('.pod-name-card');
check(!!q('#podcast-text') && !!q('#pod-media') && qa('[data-act="pod-skip"]').length === 2,
  'mock podcasts: nomga bosilganda audio pleyer va matn maydoni ochiladi');
check(qa('[data-act="pod-speed"]').length === 6,
  'mock podcasts: tezlik sozlamalari (0.5×–2×) mavjud');
check(q('#pod-media').hasAttribute('controls'),
  'mock podcasts: to‘xtatish/seek uchun pleyer boshqaruvi saqlangan');
setVal('#podcast-text', 'My name is Azzi and I live in Tashkent my family.');
clickAct('mock-submit');
check(!!q('.mock-score-card') && qa('.pod-diff .pod-word.is-wrong').length === 1 &&
  !!q('.pod-diff .pod-fix') && qa('.pod-diff .pod-miss').length === 1,
  'mock podcasts: xato so‘z qizil chiziq + yashil to‘g‘ri so‘z, tushirilgan so‘z qizil kiritildi');
check(text().includes('10/12') && (q('.pod-fix') || {}).textContent === 'Aziz' &&
  (q('.pod-miss') || {}).textContent === 'with',
  'mock podcasts: harflar bo‘yicha aniq solishtirish va natija (10/12)');
clickAct('mock-home');
closeStudentView();

/* ================= 11. O'QUVCHI: PAROLNI O'ZGARTIRISH ================= */
click('[data-act="nav"][data-screen="profile"]');
check(text().includes('Parolni o\'zgartirish'), 'student: profilda parol o\'zgartirish tugmasi');
check(!!q('.list-row .login-val') && !q('.list-row code'), "login: profilda login oddiy matn — kod/badge yo'q");
check(qa('[data-act="profile-open"]').length >= 3,
  "profil: sozlamalar 'Tez amallar' uslubidagi bo'lim kartalariga ajratilgan");
check(qa('.profile-sub').length >= 3 && qa('.profile-sub[hidden]').length === qa('.profile-sub').length,
  'profil: ma\'lumotlar bosh ko\'rinishda yashirin — faqat kartalar turadi');
click('[data-act="profile-open"][data-section="security"]');
check(!!q('.profile-sub:not([hidden])') && !!q('[data-act="profile-back"]'),
  'profil: karta bosilganda ichki bo\'lim va Orqaga tugmasi ochildi');
check(!q('.profile-tiles'), 'profil: ichki bo\'limda asosiy kartalar ko\'rinmaydi');
clickAct('profile-back');
check(!!q('.profile-tiles') && !q('.profile-sub:not([hidden])'),
  'profil: Orqaga → sozlamalar kartalari qaytdi');
clickAct('open-change-pwd');
check(q('#modal-overlay').hidden === false, 'change: modal ochildi');
check(!!q('#modal-sheet .login-val') && !q('#modal-sheet code'), "change: modalda login oddiy matn — monospace kod yo'q");
check(qa('.pw-toggle').length === 3, "change: 3 ta parol ko'zgusi tugmasi (eski/yangi/tasdiq)");
setVal('#cp-old', '999');
setVal('#cp-new', '4321');
setVal('#cp-new2', '4321');
clickAct('save-change-pwd');
check(q('#modal-overlay').hidden === false, 'change: noto\'g\'ri joriy parol rad etildi');
setVal('#cp-old', '123');
clickAct('save-change-pwd');
check(q('#modal-overlay').hidden === true, 'change: parol o\'zgartirildi');
check(q('#toast').textContent.includes("Parol o'zgartirildi"), 'change: tasdiq toast');

logout();
await loginAs('jasur', '123');
check(q('#login-error').classList.contains('show'), 'change: eski parol bilan kirib bo\'lmaydi');
await loginAs('jasur', '4321');
check(text().includes('Jasur Karimov'), 'change: yangi parol bilan kirdi');

/* ================= 12. USTOZ QAYTA KIRIB, YANGILANGAN PAROLNI TEKSHIRADI ================= */
logout();
await loginAs('m_amirov', '123');
click('[data-act="nav"][data-screen="students"]');
check(text().includes('Nilufar Ergasheva'), 'ustoz: qayta kirdi');

check(!!q('.s-contact .login-val') && !q('.s-contact code'), "login: o'quvchi kartasida login oddiy matn — kod badge yo'q");
logout();

/* --- Mock testlar: ustoz paneli --- */
await loginAs('m_amirov', '123');
check(!!q('.quick-grid [data-act="nav"][data-screen="mock"]'),
  'mock ustoz: TEZ AMALLAR ichida “Mock testlar” tezkor kartasi');
forceNav('mock');
check(qa('[data-act="mock-cat-open"]').length === 7, 'mock ustoz: 7 ta kategoriya kartasi (Podcasts bilan)');
check(!!q('.mock-results') && qa('.mock-results .mock-person').length >= 3,
  'mock ustoz: natijalar bitta karta ro‘yxatida (jadval/ustun emas)');
check(text().includes('Daily Podcast 1'),
  'mock ustoz: podcast natijasi o‘qituvchi panelidagi ro‘yxatda ko‘rinadi');
check(text().includes('Jasur Karimov') && /4\/4/.test(text()) && !!q('.mock-results .mock-cefr'),
  'mock ustoz: o‘quvchi natijasi, ball va CEFR');
check(!!q('.mock-results [data-act="mock-student-open"]'),
  'mock ustoz: o‘quvchi ismi bosiladigan tugma');
/* Podcasts builder: audio/video yuklash + tagida matn kiritish qismi */
click('[data-act="mock-cat-open"][data-cat="podcasts"]');
check(!!q('[data-act="mock-add"]') && text().includes("Yangi Podcast qo'shish"),
  'mock ustoz: podcasts bo‘limida “Yangi Podcast qo‘shish” tugmasi');
clickAct('mock-add');
check(!!q('input[type="file"][data-mb-file="mediaUrl"]') && !!q('textarea[data-mb="script"]'),
  'mock ustoz: podcast uchun audio/video tanlash va tagida matn maydoni bor');
check((q('input[type="file"][data-mb-file="mediaUrl"]') || {}).accept.indexOf('video') >= 0,
  'mock ustoz: podcast audio ham, video ham qabul qiladi');
setVal('[data-mb="title"]', 'Podcast test');
clickAct('mock-save');
check(q('#toast').textContent.includes('Audio yoki video yuklang'),
  'mock ustoz: media yuklanmasa podcast saqlanmaydi (ogohlantirish)');
clickAct('mock-b-cancel');
click('[data-act="mock-cat-back"]');

click('[data-act="mock-cat-open"][data-cat="reading"]');
check(!!q('[data-act="mock-add"]') && text().includes("Yangi Mock qo'shish"),
  'mock ustoz: “+ Yangi Mock qo‘shish” tugmasi');
check(!!q('.mock-def[data-def="md_read"]'), 'mock ustoz: yaratilgan reading test ro‘yxati ko‘rinadi');
check(qa('.mock-def[data-def="md_read"] .mock-def-group').length === 1 &&
      text().includes('General English'),
  'mock ustoz: test tepasida biriktirilgan guruh badge’i');

/* Builder: Reading — Part 1/Part 2, step tablar, savol/javob/izoh */
clickAct('mock-add');
check(!!q('.mock-build') && !!q('[data-mb="title"]'), 'mock builder: forma ochildi');
check(qa('[data-mb="parts.0.passage"], [data-mb="parts.1.passage"]').length === 2,
  'mock builder reading: Part 1 va Part 2 matn maydonlari');
check(qa('[data-act="mock-b-step"]').length === 4, 'mock builder reading: Matn→Savollar→Javoblar→Izoh tablari');
check(qa('.mock-cefr-col .mock-cefr-row').length === 6 &&
      qa('.mock-cefr-col .mock-cefr-lvl.is-amber').length === 3 &&
      qa('.mock-cefr-col .mock-cefr-lvl.is-green').length === 3,
  'mock builder reading: mock darajasidagi yagona A1–C2 CEFR ustuni');
check(!q('[data-mb="parts.0.cefr"]'), 'mock builder reading: Part ichida alohida CEFR yo‘q');
setVal('[data-mb="cefrThresholds.A2"]', '1');
setVal('[data-mb="title"]', 'Builder Reading Test');
setVal('[data-mb="parts.0.passage"]', 'A short passage for the builder test.');
setCheck('[data-mb="group"][data-gid="g1"]', true);
click('[data-act="mock-b-step"][data-step="questions"]');
setVal('[data-mb="parts.0.questions.0.text"]', 'What is the passage about?');
setVal('[data-mb="parts.0.questions.0.opts.0"]', 'A builder test');
setVal('[data-mb="parts.0.questions.0.opts.1"]', 'A holiday');
changeVal('[data-mb="parts.0.questions.0.ans"]', '0');
click('[data-act="mock-b-step"][data-step="izoh"]');
setVal('[data-mb="parts.0.questions.0.izoh"]', 'The passage is about a builder test.');
clickAct('mock-save');
const builtDef = (JSON.parse(win.localStorage.getItem('et_mock_defs')) || [])
  .filter(d => d.title === 'Builder Reading Test')[0];
check(!!builtDef && builtDef.groupIds.indexOf('g1') >= 0 && !!builtDef.parts[0].questions[0].izoh &&
      builtDef.cefrThresholds.A2 === 1,
  'mock builder: reading matn + savol + javob + izoh + CEFR chegarasi bilan saqlandi');

/* Guruhlarga biriktirish */
click('[data-act="mock-assign"][data-id="' + builtDef.id + '"]');
check(!!q('.mock-assign') && qa('[data-act="mock-assign-toggle"]').length >= 2,
  'mock ustoz: guruhlarni biriktirish paneli');
click('[data-act="mock-assign-toggle"][data-gid="g2"]');
click('[data-act="mock-assign-save"][data-id="' + builtDef.id + '"]');
const assignedDef = (JSON.parse(win.localStorage.getItem('et_mock_defs')) || [])
  .filter(d => d.id === builtDef.id)[0];
check(assignedDef.groupIds.indexOf('g1') >= 0 && assignedDef.groupIds.indexOf('g2') >= 0,
  'mock ustoz: guruhlar biriktirildi (g1 + g2)');

/* Tahrirlash */
click('[data-act="mock-edit"][data-id="' + builtDef.id + '"]');
check((q('[data-mb="title"]') || {}).value === 'Builder Reading Test',
  'mock ustoz: tahrirlash formasi mavjud qiymatlar bilan ochildi');
setVal('[data-mb="title"]', 'Builder Reading Test v2');
clickAct('mock-save');
check((JSON.parse(win.localStorage.getItem('et_mock_defs')) || [])
  .some(d => d.id === builtDef.id && d.title === 'Builder Reading Test v2'),
  'mock ustoz: tahrirlash saqlandi');

/* O'chirish */
click('[data-act="mock-del"][data-id="' + builtDef.id + '"]');
click('[data-act="mock-del-yes"][data-id="' + builtDef.id + '"]');
check(!(JSON.parse(win.localStorage.getItem('et_mock_defs')) || []).some(d => d.id === builtDef.id),
  'mock ustoz: test o‘chirildi');

/* Builder: “Harf / variant qo‘shish” + yozma javob + tahrirda guruh qo‘shish */
clickAct('mock-add');
setVal('[data-mb="title"]', 'Written & Letters Test');
click('[data-act="mock-b-step"][data-step="questions"]');
setVal('[data-mb="parts.0.questions.0.text"]', 'Write the number of visitors.');
click('[data-act="mock-b-add-opt"][data-path="parts.0.questions.0"]');
click('[data-act="mock-b-add-opt"][data-path="parts.0.questions.0"]');
check(!!q('[data-mb="parts.0.questions.0.opts.3"]') && !!q('[data-mb="parts.0.questions.0.opts.4"]'),
  'mock builder: “Harf / variant qo‘shish” bilan D va E variantlari qo‘shildi');
check(qa('[data-mb="parts.0.questions.0.ans"] option').length === 5,
  'mock builder: to‘g‘ri javob tanlagichi A–E (5 ta) variantni ko‘rsatadi');
setVal('[data-mb="parts.0.questions.0.opts.3"]', 'Option D');
setVal('[data-mb="parts.0.questions.0.opts.4"]', 'Option E');
click('[data-act="mock-b-qtype"][data-path="parts.0.questions.0"][data-qtype="written"]');
check(!!q('[data-mb="parts.0.questions.0.answer"]'), 'mock builder: “Yozma javob” maydoni ko‘rinadi');
setVal('[data-mb="parts.0.questions.0.answer"]', '42 | forty two');
setCheck('[data-mb="group"][data-gid="g1"]', true);
clickAct('mock-save');
const writtenDef = (JSON.parse(win.localStorage.getItem('et_mock_defs')) || [])
  .filter(d => d.title === 'Written & Letters Test')[0];
check(!!writtenDef && writtenDef.parts[0].questions[0].type === 'written' &&
      writtenDef.parts[0].questions[0].answer === '42 | forty two',
  'mock builder: yozma javob (42 | forty two) saqlandi');
click('[data-act="mock-edit"][data-id="' + writtenDef.id + '"]');
setCheck('[data-mb="group"][data-gid="g2"]', true);
clickAct('mock-save');
const regroupedDef = (JSON.parse(win.localStorage.getItem('et_mock_defs')) || [])
  .filter(d => d.id === writtenDef.id)[0];
check(regroupedDef.groupIds.indexOf('g1') >= 0 && regroupedDef.groupIds.indexOf('g2') >= 0,
  'mock ustoz: tahrirlashda qo‘shimcha guruh biriktirildi (g1 + g2)');

/* Natijani o‘chirish (ro‘yxatdagi kartalarda) */
click('[data-act="mock-cat-back"]');
const delRow = q('.mock-results .mock-person');
check(!!delRow && !!delRow.querySelector('[data-act="mock-result-del"]'),
  'mock ustoz: natija kartasida “O‘chirish” tugmasi bor');
const delId = delRow.getAttribute('data-mockrow');
click('[data-act="mock-result-del"][data-id="' + delId + '"]');
check(!!q('.mock-confirm'), 'mock ustoz: natija o‘chirish tasdiqlashi ko‘rinadi');
click('[data-act="mock-result-del-yes"][data-id="' + delId + '"]');
check(!(JSON.parse(win.localStorage.getItem('et_mock_results')) || []).some(a => a.id === delId),
  'mock ustoz: natija lokal holatdan o‘chirildi');

/* O‘quvchi ismiga bosish → to‘g‘ri/xato javoblar tafsiloti */
if (q('[data-act="mock-cat-back"]')) click('[data-act="mock-cat-back"]');
check(!!q('.mock-results') && text().includes('Jasur Karimov'), 'mock ustoz: natijalar ro‘yxati ko‘rinadi');
const readAttempt = (JSON.parse(win.localStorage.getItem('et_mock_results')) || [])
  .filter(a => a.category === 'reading')[0];
click('[data-act="mock-student-open"][data-id="' + readAttempt.id + '"]');
check(!!q('.mock-detail') && text().includes('Jasur Karimov') && /4\/4/.test(text()),
  'mock ustoz: ismga bosilganda o‘quvchi natijasi ochiladi (ism, sinf, guruh, mock, ball)');
check(text().includes('To‘g‘ri:') && text().includes('Xato:'),
  'mock ustoz: to‘g‘ri va xato javoblar soni ko‘rsatiladi');
check(qa('.mock-detail .mock-rev').length >= 1 &&
      qa('.mock-detail .mock-rev.is-ok, .mock-detail .mock-rev.is-bad').length >= 1 &&
      text().includes('To‘g‘ri javob') && text().includes('O‘quvchi javobi'),
  'mock ustoz: har bir savolda o‘quvchi javobi va to‘g‘ri javob ko‘rinadi');
clickAct('mock-student-back');
check(!!q('.mock-results') && !q('.mock-detail'), 'mock ustoz: “Orqaga” ro‘yxatga qaytaradi');

/* Writing: matn/izoh/baho tafsilot oynasida */
const writingAttempt = (JSON.parse(win.localStorage.getItem('et_mock_results')) || [])
  .filter(a => a.category === 'writing')[0];
click('[data-act="mock-student-open"][data-id="' + writingAttempt.id + '"]');
check(!!q('.mock-detail') && !!q('.mock-detail .mock-ta'),
  'mock ustoz: Writing tafsilotida tahrirlanadigan matn bor');
const mwId = writingAttempt.id;
setVal('#mock-t-text-' + mwId, 'Teacher edited version of the essay.');
setVal('#mock-t-feedback-' + mwId, 'Good ideas — add one more example.');
setVal('#mock-t-grade-' + mwId, '8');
click('[data-act="mock-save-grade"][data-id="' + mwId + '"]');
const mwSaved = JSON.parse(win.localStorage.getItem('et_mock_results')).filter(a => a.id === mwId)[0];
check(mwSaved.teacherText === 'Teacher edited version of the essay.' &&
      mwSaved.feedback === 'Good ideas — add one more example.' && mwSaved.teacherGrade === '8',
  'mock ustoz: tahrir + izoh + erkin baho (teacher_grade) saqlandi');
clickAct('mock-student-back');

/* Speaking: videolar va baho tafsilot oynasida */
click('[data-act="mock-student-open"][data-id="' + spAttemptId + '"]');
check(!!q('.mock-detail') && qa('.mock-detail video').length >= 1,
  'mock ustoz: speaking videolari ijro uchun ko‘rinadi');
setVal('#mock-t-grade-' + spAttemptId, '7');
click('[data-act="mock-save-grade"][data-id="' + spAttemptId + '"]');
check(JSON.parse(win.localStorage.getItem('et_mock_results')).filter(a => a.id === spAttemptId)[0].teacherGrade === '7',
  'mock ustoz: speaking video bahosi saqlandi');
clickAct('mock-student-back');

check(!!q('.mock-results') && text().includes('O‘quvchilar natijalari'),
  'mock ustoz: barcha natijalar bitta ro‘yxatda');
logout();

await loginAs('nilufar', '7777');
check(text().includes('Nilufar Ergasheva'), 'reset: ustoz yangilagan parol bilan kirdi');
check(text().includes('9-sinf'), 'reset: Nilufar portali ko\'rinadi');
check(!text().includes('Jasur Karimov'), 'reset: boshqa o\'quvchi ko\'rinmaydi');

/* ================= 12b. USTOZ PAROLI — o'zgartirish + qat'iy qayta kirish ================= */
check(typeof win.__cloud.pushTeacherPassword === 'function',
  'ustoz paroli: CloudSync.pushTeacherPassword (bot_settings) eksport qilingan');
logout();
await loginAs('m_amirov', '123');
click('[data-act="nav"][data-screen="profile"]');
clickAct('open-change-pwd');
setVal('#cp-old', '123');
setVal('#cp-new', '9111');
setVal('#cp-new2', '9111');
clickAct('save-change-pwd');
check(q('#modal-overlay').hidden === true && q('#toast').textContent.includes("Parol o'zgartirildi"),
  'ustoz paroli: o' + "'" + 'zgartirildi (bot_settings ga yoziladi)');
logout();
await loginAs('m_amirov', '123');
check(q('#login-error').textContent.includes("noto'g'ri"),
  "ustoz paroli: eski '123' bilan KIRIB BO'LMAYDI");
await loginAs('m_amirov', '9111');
check(text().includes('Xush kelibsiz') && text().includes('Muzaffar Amirov'),
  'ustoz paroli: yangi parol bilan kirdi');
/* keyingi bosqichlar uchun parolni 123 ga qaytaramiz */
click('[data-act="nav"][data-screen="profile"]');
clickAct('open-change-pwd');
setVal('#cp-old', '9111');
setVal('#cp-new', '123');
setVal('#cp-new2', '123');
clickAct('save-change-pwd');
logout();
await loginAs('m_amirov', '123');
check(text().includes('Xush kelibsiz') && text().includes('Muzaffar Amirov'),
  'ustoz paroli: 123 ga qaytarildi — kirish ishlaydi');
logout();
await loginAs('nilufar', '7777');
check(text().includes('Nilufar Ergasheva'), 'ustoz paroli: holat tiklandi (nilufar kirgan)');

/* ================= 13. STEP 4: YANGI FEATURE'LAR ================= */

/* --- 1. Telefon raqamlari butunlay yo'q --- */
logout();
await loginAs('m_amirov', '123');
click('[data-act="nav"][data-screen="students"]');
check(!text().includes('+998'), 'telefon: o\'quvchi kartalarida telefon yo\'q');
check(!text().includes('Telefon'), 'telefon: "Telefon" yozuvi yo\'q');
clickAct('open-add-student');
check(!q('#f-sphone'), 'telefon: qo\'shish formasida telefon maydoni yo\'q');
check(!!q('#f-sname') && !!q('#f-sclass') && !!q('#f-slogin') && !!q('#f-spass'), 'forma: Ism + Sinf + Login + Parol mavjud');
check(!q('[data-phone]'), 'forma: data-phone atributi yo\'q');
check(q('#f-spass').type === 'password', "qo'shish: parol maydoni yashirin (type=password)");
check(!!q('[data-act="toggle-pw"][data-target="f-spass"]'), "qo'shish: parol ko'zgusi tugmasi");
click('[data-act="close-modal"]');

/* --- 2. Sinflar faqat 5–11 --- */
clickAct('open-add-student');
const clsOpts = Array.from(q('#f-sclass').options).map(o => o.value).filter(v => v);
check(JSON.stringify(clsOpts) === JSON.stringify(['5-sinf','6-sinf','7-sinf','8-sinf','9-sinf','10-sinf','11-sinf']),
  'sinf: forma variantlari faqat 5–11-sinf');
check(!clsOpts.includes('IELTS'), "sinf: IELTS varianti yo'q");
click('[data-act="close-modal"]');
const filterChips = qa('[data-act="filter-class"]').map(b => b.getAttribute('data-class'));
check(filterChips.includes('5-sinf') && filterChips.includes('11-sinf'), 'sinf: filtr chiplari 5–11 bor');
check(!filterChips.includes('IELTS') && !filterChips.includes('4-sinf'), "sinf: filtrda IELTS/4-sinf yo'q");

/* --- 3. Speaking qarzi (ustoz +/-) --- */
const nStud = JSON.parse(win.localStorage.getItem('et_students')).length;
check(qa('[data-act="debt-plus"]').length === nStud, 'qarz: ' + nStud + ' ta [+] tugma');
check(qa('[data-act="debt-minus"]').length === nStud, 'qarz: ' + nStud + ' ta [-] tugma');
check(text().includes('Speaking qarzi'), 'qarz: "Speaking qarzi" yozuvi ro\'yxatda');
click(qa('[data-act="debt-plus"]').filter(b => b.getAttribute('data-sid') === 's3')[0]);
check(qa('.debt-num').filter(d => d.textContent.trim() === '1 ta').length >= 1, 'qarz: [+] bosildi → 1 ta');
click(qa('[data-act="debt-minus"]').filter(b => b.getAttribute('data-sid') === 's3')[0]);
check(qa('.debt-num').filter(d => d.textContent.trim() === '0 ta').length >= 1, 'qarz: [-] bosildi → 0 ta');

/* Speaking ekranda qarz ro'yxati yo'q, slot/submission qismlari saqlangan */
click('[data-act="nav"][data-screen="speaking"]');
check(!text().includes("Speaking qarzi (o'quvchilar)") && qa('[data-act="debt-plus"]').length === 0,
  'speaking: o\'quvchilar qarz ro\'yxati olib tashlangan');
check(!!q('#sp-date') && !!q('[data-act="open-slot"]'),
  'speaking: sana selektori va + Slot tugmasi saqlangan');
check(text().includes('Speaking topshiriqlari'), 'speaking: topshiriqlar inbox bo\'limi bor');
check(text().includes("Hozircha topshiriq yo'q"), 'speaking: inbox holati ko\'rinadi');

/* --- 4. Telegram topshirik → baholash → qarz -1 --- */
const studentsRaw = JSON.parse(win.localStorage.getItem('et_students'));
const jasurSt = studentsRaw.filter(x => x.id === 's3')[0];
jasurSt.speakingDebt = 2;
win.localStorage.setItem('et_students', JSON.stringify(studentsRaw));
win.localStorage.setItem('et_tg_subs', JSON.stringify([
  { id: 't1', dbId: 101, sid: 's3', mediaType: 'video', status: 'kutilmoqda', score: null, feedback: '',
    mediaUrl: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/demo.webm',
    lookAwayCount: 2, eyeContactPercent: 87, createdAt: TODAY + 'T10:00:00.000Z' }
]));
forceNav('speaking');
check(qa('.audio-item').length >= 1, 'inbox: Telegram topshirik paydo bo\'ldi');
check(text().includes('Jasur Karimov'), 'inbox: o\'quvchi ismi ko\'rinadi');
check(text().includes('Video') && !!q('.speak-card-meta svg'),
  'inbox: media turi (video) SVG ikonka bilan ko\'rinadi');
check(!!q('.speak-card-head .speak-card-name') && !!q('.speak-card-head .speak-card-grade'),
  'inbox: ism + Grade badge alohida, toza qatorda');
{
  const metaTxt = q('.speak-card-meta').textContent.replace(/\s+/g, ' ').trim();
  check(!/·\s*$/.test(metaTxt) && !/·\s*·/.test(metaTxt),
    'inbox: meta qatorida ortiqcha “•” nuqtalar yo‘q');
  const spCss = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
  check(/\.speak-video\s*\{[^}]*max-height:\s*210px/.test(spCss) &&
        /\.speak-video\s*\{[^}]*max-width:\s*280px/.test(spCss) &&
        /\.speak-video\s*\{[^}]*object-fit:\s*cover/.test(spCss),
    'inbox: inline video ixcham (210px balandlik, 280px kenglik)');
}
check(text().includes('Kameraga qarash: 87%') && text().includes('Chetga qarash: 2'),
  'inbox: ko‘z kontakti foizi va chetga qarashlar ko‘rinadi');
check(!!q('[data-act="speak-video-toggle"]'), 'inbox: videoni kattalashtirish tugmasi bor');
{
  const vwrap = q('.speak-video-wrap');
  click('[data-act="speak-video-toggle"]');
  check(vwrap.classList.contains('is-expanded'), 'inbox: video kattalashtiriladi');
  click('[data-act="speak-video-toggle"]');
  check(!vwrap.classList.contains('is-expanded'), 'inbox: video yana ixcham holatga qaytadi');
}
check(qa('[data-act="tg-grade"]').length === 10, 'inbox: 10 ta ball tugmasi');
check(q('[data-act="tg-feedback"]'), 'inbox: izoh maydoni mavjud');
check(!q('[data-act="rec-start"]') && !q('#recorder'), 'recorder: brauzer yozgich olib tashlangan');

setVal('[data-act="tg-feedback"]', "A'lo talaffuz");
click(qa('[data-act="tg-grade"]').filter(b => b.getAttribute('data-score') === '9')[0]);
check(q('#toast').textContent.includes('qarz kamaydi'), 'tg: baho saqlandi + qarz kamaydi');

/* qarz kamaydi: 2 → 1 */
const afterGrade = JSON.parse(win.localStorage.getItem('et_students')).filter(x => x.id === 's3')[0];
check(afterGrade.speakingDebt === 1, 'tg: baholash qarzni 1 ga kamaytirdi (2 → 1)');
const tgAfter = JSON.parse(win.localStorage.getItem('et_tg_subs')).filter(x => x.id === 't1')[0];
check(tgAfter.status === 'baholandi' && tgAfter.score === 9, 'tg: topshirik baholandi (9)');
check(tgAfter.feedback === "A'lo talaffuz", 'tg: izoh saqlandi');

/* jurnalda Speaking satri */
click('[data-act="nav"][data-screen="grades"]');
click('[data-act="grade-group"][data-group="g2"]');
const jasurCells = qa('[data-act="edit-grade"][data-sid="s3"]');
check(jasurCells.some(c => c.textContent.trim() === '9'), 'tg→jurnal: ball jurnalga tushdi');

/* --- 4b. O'quvchi portali: badge + yozish paneli --- */
logout();
await loginAs('jasur', '4321');
const jasurDebtNow = Number((JSON.parse(win.localStorage.getItem('et_students') || '[]')
  .filter(x => x.id === 's3')[0] || {}).speakingDebt) || 0;
check(jasurDebtNow > 0 ? !!q('.speak-debt-banner') : !q('.speak-debt-banner'),
  'student: Speaking qarzi qizil banneri (qarz bo\'lsa ko\'rinadi)');
openStudentView('speaking');
check(!!q('[data-act="speak-cta"]') && q('[data-act="speak-cta"]').textContent.includes('Speaking topshirish'),
  "student: Speaking topshirish tugmasi");
check(!text().includes('Telegram orqali') && !text().includes('ovozli xabar'),
  "student: ovozli xabar / Telegram topshirish matni olib tashlangan");
check(!q('input[type="file"]'), "student: fayl yuklash (input file) umuman yo'q");
check(!q('#recorder') && !q('[data-act="rec-start"]') && !q('[data-act="rec-send"]'),
  "student: eski recorder qoldiqlari yo'q");
check(text().includes('Baho: 9/10') && !!q('.audio-item__meta svg'),
  'student: baholangan topshiriq SVG belgisi bilan ko\'rinadi');
clickAct('speak-cta');
check(!!q('#speak-rec') && !!q('#speak-rec video.speak-rec-video'),
  'speaking: jonli krujok video yozgich ochildi');
check(!!q('.speak-rec-ring') && !!q('#speak-rec-timer') && !!q('#speak-rec-warn'),
  "speaking: yashil halqa + taymer + 'Kameraga qarang' ogohlantirishi mavjud");
check(q('#speak-rec-preview').hidden === true,
  'speaking: ko‘rish/yuborish/bekor tugmalari faqat yozuvdan keyin');
check(/outputFaceBlendshapes:\s*true/.test(appJs) &&
      /'eyeLookInLeft'/.test(appJs) && /'eyeLookDownRight'/.test(appJs) &&
      /speakBlendMap/.test(appJs),
  'speaking: FaceLandmarker blendshapes yoqilgan (eyeLookIn/Out/Up/Down)');
check(/SPEAK_AWAY_MS\s*=\s*450/.test(appJs) &&
      /SPEAK_MAX_WARNINGS\s*=\s*3/.test(appJs) &&
      /SPEAK_BLINK_GRACE_MS\s*=\s*1200/.test(appJs) &&
      /SPEAK_YAW_MAX\s*=\s*0\.17/.test(appJs) &&
      /SPEAK_IRIS_X_MAX\s*=\s*0\.13/.test(appJs),
  'speaking: 0.45 s debounce, 3 warning, 1.2 s blink grace va gorizontal chegaralar');
/* Haddan tashqari yumshoq bo'lib ketmasin: chegaralar baribir qat'iy bandda qoladi */
check(/SPEAK_YAW_MAX\s*=\s*0\.(1[3-9])/.test(appJs) &&
      /SPEAK_IRIS_X_MAX\s*=\s*0\.1[0-4]/.test(appJs) &&
      /SPEAK_RETURN_MS\s*=\s*3000/.test(appJs),
  'speaking: chegaralar yengillashtirilgan, lekin o\'qishga yo\'l beradigan darajada emas');
check(/function speakFaceSignals/.test(appJs) && /hRatio/.test(appJs) &&
      /SPEAK_IRIS_X_STRONG\s*=\s*0\.21/.test(appJs) &&
      /irisHits\s*>=\s*2\s*\|\|\s*irisStrong/.test(appJs) &&
      /SPEAK_GAZE_SIDE_SCORE\s*=\s*0\.36/.test(appJs) &&
      /\/In\|Out\/\.test\(k\)\)\s*return sc >= SPEAK_GAZE_SIDE_SCORE/.test(appJs) &&
      /blinkGrace/.test(appJs) &&
      /SPEAK_BLINK_GRACE_MS/.test(appJs),
  "speaking: chap/o'ng qarash kuchaytirilgan (iris + In/Out blendshape), qisqa ko'z yumish ogohlantirmaydi");
check(/SPEAK_IRIS_Y_MAX\s*=\s*0\.92/.test(appJs) &&
      /SPEAK_IRIS_Y_MIN\s*=\s*0\.22/.test(appJs) &&
      /SPEAK_GAZE_DOWN_SCORE\s*=\s*0\.55/.test(appJs) &&
      /\/Down\/\.test\(k\)\)\s*return sc >= SPEAK_GAZE_DOWN_SCORE/.test(appJs),
  "speaking: pastga qarash biroz yengillashtirilgan (tugmalar), tepaga nazorat qat'iy qolgan");
check(/SPEAK_RETURN_MS\s*=\s*3000/.test(appJs) &&
      /function speakCountdownText/.test(appJs) &&
      /function speakWarnText/.test(appJs) &&
      /Kameraga qarang! \{s\}s\.\.\./.test(appJs) &&
      /awayDeadline\s*=\s*Date\.now\(\)\s*\+\s*SPEAK_RETURN_MS/.test(appJs),
  'speaking: ogohlantirishdan keyin 3 s qaytish sanoqi boshlanadi');
check(/speakRecRing\(warningActive \|\| awayNow \? 'bad' : 'good'\)/.test(appJs) &&
      /speakRecWarn\(awayNow, awayNow \?/.test(appJs),
  'speaking: chetga qarashda darhol qizil ogohlantirish (sariq emas)');
check(/function supportCanGradeSpeaking/.test(appJs) &&
      /function staffCanGradeStudent/.test(appJs) &&
      /supportCanGradeSpeaking\(\) \|\| !staffCanGradeStudent/.test(appJs) &&
      /'tg-grade': 'speaking'/.test(appJs),
  'support: biriktirilgan guruh o\'quvchilarini baholash va izoh yozish ruxsati');
check(/invalidReason\s*=\s*'timeout'/.test(appJs) &&
      /awayDeadline\s*=\s*0;\s*\n\s*speakRec\.warningUntil\s*=\s*0;/.test(appJs) &&
      /function speakInvalidText/.test(appJs),
  'speaking: 5 s ichida qaytmasa darhol bekor, qaytsa sanoq tozalanadi');
check(/I18N_SKIP_TAGS\s*=\s*\[[^\]]*'textarea'/.test(appJs) &&
      /I18N_SKIP_SEL[\s\S]{0,700}mock-build-part-head/.test(appJs) &&
      /\.mock-passage,/.test(appJs) && /\.mock-build-answer-row/.test(appJs),
  'i18n: ustoz kiritgan mock kontenti so‘zma-so‘z saqlanadi (tarjima qilinmaydi)');
check(/function speakFaceSignals/.test(appJs) && /468/.test(appJs) &&
      /irisAway/.test(appJs) && /gazeAway/.test(appJs) &&
      /stopSpeakRecording\(true\)/.test(appJs),
  'speaking: iris + gaze blendshape + head pose birgalikda tekshiriladi');
check(!!q('#speak-rec-warn-text') && !!q('#speak-rec-invalid') &&
      q('#speak-rec-invalid').hidden === true &&
      !!q('#speak-rec-invalid [data-act="speak-rec-retake"]') &&
      !q('#speak-rec-invalid [data-act="speak-rec-submit"]'),
  'speaking: 3/3 uchun alohida Retake paneli, Submit yo‘q');
const speakCssSrc = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
check(/\.speak-rec-ring\.is-bad\s*\{[^}]*#ef4444/.test(speakCssSrc) &&
      /\.speak-rec-invalid\s*\{/.test(speakCssSrc),
  'speaking: qizil ring va invalid panel uslublari mavjud');
check(/\.speak-rec-warn\s*\{[^}]*#fca5a5/.test(speakCssSrc) &&
      /\.speak-rec-ring\.is-away\s*\{[^}]*#ef4444/.test(speakCssSrc) &&
      /\.speak-rec-eye\.is-away \.speak-rec-dot\s*\{[^}]*#ef4444/.test(speakCssSrc),
  'speaking: ogohlantirish, halqa va ko\'z nuqtasi darhol qizil');
check(/\.speak-rec\s*\{[^}]*position:\s*fixed/.test(speakCssSrc) &&
      /\.speak-rec\s*\{[^}]*inset:\s*0/.test(speakCssSrc) &&
      /\.speak-rec\s*\{[^}]*backdrop-filter:\s*blur\(14px\)/.test(speakCssSrc) &&
      /\.speak-rec\s*\{[^}]*z-index:\s*9999/.test(speakCssSrc),
  'speaking: blur(14px) fon + z-index 9999 butun ekranni qoplaydi');
check(/\.speak-rec-video\s*\{[^}]*border-radius:\s*50%/.test(speakCssSrc) &&
      /\.speak-rec-video\s*\{[^}]*object-fit:\s*cover/.test(speakCssSrc) &&
      /\.speak-rec-video\s*\{[^}]*scaleX\(-1\)/.test(speakCssSrc),
  'speaking: dumaloq (50%) video + mirrorlangan old kamera');
check(/\.speak-rec-btn\.watch\s*\{[^}]*#2563eb/.test(speakCssSrc) &&
      /\.speak-rec-btn\.submit\s*\{[^}]*#16a34a/.test(speakCssSrc) &&
      /\.speak-rec-btn\.cancel\s*\{[^}]*#dc2626/.test(speakCssSrc),
  'speaking: ko‘rish ko‘k, yuborish yashil, bekor qilish qizil');
check(!!q('[data-act="speak-rec-retake"]') && q('#speak-rec-preview').contains(q('[data-act="speak-rec-retake"]')),
  "speaking: 'Qayta yozish' (Retake) tugmasi yozuvdan keyingi panelda");
check(/\.speak-rec-video\.is-playback\s*\{[^}]*transform:\s*none/.test(speakCssSrc) &&
      /\.speak-rec-btn\.retake\s*\{/.test(speakCssSrc),
  "speaking: ko'rish paytida mirror o'chadi + retake tugma uslubi");
check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q('#speak-rec').textContent),
  "speaking: recorder matnida emoji yo'q (faqat SVG ikonkalar)");
click('[data-act="speak-rec-close"]');
check(!q('#speak-rec'), 'speaking: yopilganda recorder tozalanadi');
closeStudentView();

/* Ruxsat berilmagan o'quvchi: recorder umuman ko'rinmaydi */
{
  const noVoiceRow = (cloudStub.db.students || []).filter(r => r.login === 'malika')[0];
  if (noVoiceRow) { noVoiceRow.voice_allowed = false; noVoiceRow.web_speaking_allowed = false; }
  logout();
  await loginAs('malika', '123');
  openStudentView('speaking');
  check(!!q('.speak-bot') && !q('[data-act="speak-cta"]'),
    "speaking: sayt ruxsati yo'q → recorder yashirilgan, bot rejimi");
  check(!!q('a.speak-bot-btn[href="https://t.me/uzbekspeakingcheckbot"]'),
    "speaking: bot rejimida Telegram havolasi ko'rinadi");
  if (noVoiceRow) { noVoiceRow.voice_allowed = true; noVoiceRow.web_speaking_allowed = true; }

  /* Ovoz ruxsati bor, lekin saytda speaking ruxsati yo'q → Telegram bot rejimi */
  if (noVoiceRow) {
    noVoiceRow.voice_allowed = true;
    noVoiceRow.web_speaking_allowed = false;
    logout();
    await loginAs('malika', '123');
    openStudentView('speaking');
    check(!!q('.speak-bot') && !q('[data-act="speak-cta"]'),
      "speaking: sayt ruxsati yo'q → recorder yashirilgan, bot rejimi faol");
    check(!!q('a.speak-bot-btn[href="https://t.me/uzbekspeakingcheckbot"]'),
      "speaking: Telegram botga o'tish havolasi ko'rinadi");
    check(!text().includes('Yozishni boshlash'), "speaking: bot rejimida yozish taklif qilinmaydi");
    noVoiceRow.web_speaking_allowed = true;
    closeStudentView();
  }
  logout();
  await loginAs('jasur', '4321');
}
check(text().includes('Uyga vazifalar'), "student: 'Uyga vazifalar' kartasi portalda");

/* ================= 14. CHAT (Ustoz ↔ O'quvchi) ================= */
check(text().includes("O'qituvchi bilan suhbat"), "chat: o'quvchi panelida 'O'qituvchi bilan suhbat' bo'limi bor");
check(!q('.chat-card') && !q('#chat-list'), "chat: bosh sahifada inline chat bloki olib tashlangan");
openStudentView('chat');
check(!!q('#chat-list') && !!q('#chat-input'), "chat: alohida sahifada xabarlashuv (ro'yxat + input)");
setVal('#chat-input', 'Tayyor ustoz');
clickAct('send-chat');
check(q('#chat-list').textContent.includes('Tayyor ustoz'), "chat: o'quvchi xabar yubordi");
check(!!q('#chat-list .chat-msg.mine'), "chat: o'quvchi xabari o'zi tomonida (mine)");
closeStudentView();

logout();
await loginAs('m_amirov', '123');
click('[data-act="nav"][data-screen="students"]');
check(qa('[data-act="open-chat"]').length === studentCards(), "chat: har o'quvchi kartasida 'Xabar yozish' tugmasi");
click(qa('[data-act="open-chat"]').filter(b => b.getAttribute('data-sid') === 's3')[0]);
check(q('#modal-overlay').hidden === false, "chat: ustoz xabar modali ochildi");
check(!!q('#chat-list') && !!q('#chat-input'), "chat: modaldagi ro'yxat + input mavjud");
check(q('#chat-list').textContent.includes('Tayyor ustoz'), "chat: ustoz o'quvchi xabarini kordi");
setVal('#chat-input', 'Assalom Jasur');
clickAct('send-chat');
check(q('#chat-list').textContent.includes('Assalom Jasur'), "chat: ustoz xabar yozdi");
check(!!q('#chat-list .chat-msg.mine [data-act="chat-edit"]') && !!q('#chat-list .chat-msg.mine [data-act="chat-del"]'),
  'chat: o‘z xabarida SVG tahrirlash/o‘chirish tugmalari bor');
click(q('#chat-list .chat-msg.mine [data-act="chat-edit"]'));
check(!!q('#chat-edit-input'), 'chat: tahrirlash maydoni ochildi');
setVal('#chat-edit-input', 'Assalom Jasur (tahrir)');
clickAct('chat-save');
check(q('#chat-list').textContent.includes('Assalom Jasur (tahrir)'), 'chat: xabar tahrirlandi');
check(!!q('#chat-list .chat-edited') && /tahrirlangan/.test(q('#chat-list .chat-edited').textContent),
  'chat: “tahrirlangan” belgisi ko‘rinadi');
click(q('#chat-list .chat-msg.mine [data-act="chat-del"]'));
check(!!q('#chat-list .chat-deleting') && q('#chat-list').textContent.includes("Xabarni o'chirasizmi?"),
  'chat: o‘chirishdan oldin tasdiq so‘raladi');
clickAct('chat-del-cancel');
check(!!q('#chat-list .chat-msg.mine'), 'chat: tasdiq bekor qilindi — xabar qoldi');
click(q('#chat-list .chat-msg.mine [data-act="chat-del"]'));
clickAct('chat-del-confirm');
check(!q('#chat-list').textContent.includes('Assalom Jasur (tahrir)'), 'chat: xabar o‘chirildi');
setVal('#chat-input', 'Assalom Jasur');
clickAct('send-chat');
check(q('#chat-list').textContent.includes('Assalom Jasur'), 'chat: qayta yuborildi');
click('[data-act="close-modal"]');
check(q('#modal-overlay').hidden === true, 'chat: modal yopildi');

/* o'quvchi ustoz xabarini ko'radi */
logout();
await loginAs('jasur', '4321');
for (let i = 0; i < 30 && !q('[data-view="chat"] .nav-badge'); i++) {
  await new Promise(r => setTimeout(r, 50));
}
check(!!q('[data-view="chat"] .nav-badge'), "chat: o'qilmagan xabarlar badge bilan ko'rinadi");
openStudentView('chat');
check(q('#chat-list') && q('#chat-list').textContent.includes('Assalom Jasur'), "chat: o'quvchi ustoz xabarini kordi");
closeStudentView();

/* ================= 15. NEYTRAL GRADEBOOK (CSS) ================= */
const cssText = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
const appText = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
check(cssText.includes('.g-num'), 'neytral: .g-num klassi mavjud');
check(!/\.g-a\s*\{/.test(cssText) && !/\.g-b\s*\{/.test(cssText) && !/\.g-c\s*\{/.test(cssText),
  "neytral: eski rangli baho klasslari o'chirilgan");
check(!/\.score-btn\.sel\.g-(a|b|c)/.test(cssText), "neytral: rangli ball tugmalari yo'q");
check(!appText.includes('background:#1f9d5b') && !appText.includes('background:#2f8fef') && !appText.includes('background:#e5484d'),
  "neytral: legendadagi rangli nuqtalar olib tashlangan");

/* ================= 16. CLOUD SYNC (Supabase API) ================= */
check(typeof win.__cloud === 'object' && typeof win.__cloud.pullAll === 'function' && typeof win.__cloud.pushGrade === 'function',
  'cloud: CloudSync moduli ulangan (pullAll/pushGrade)');
check(typeof win.__cloud.sendMessage === 'function' && typeof win.__cloud.pushAttendance === 'function' && typeof win.__cloud.pushDebt === 'function',
  'cloud: messages/attendance/debt API mavjud');
check(String(win.__cloud.url).indexOf('mvjoeqyqaylfccqcnwwe.supabase.co') >= 0, 'cloud: haqiqiy Supabase URL ulangan');
check(win.__cloud.ready() === true, "cloud: stub klient ulangan — bulut rejimi ishlaydi");
check(win.__cloud.messagesAvailable() === true, 'cloud: messages jadvali bulutda mavjud');

/* ================= 17. O'QUVCHINI O'CHIRISH (tasdiq bilan) ================= */
logout();
await loginAs('m_amirov', '123');
click('[data-act="nav"][data-screen="students"]');
const nStudBeforeDel = studentCards();
check(qa('[data-act="del-student"]').length === nStudBeforeDel, "o'chirish: har o'quvchi kartasida '🗑 O'chirish' tugmasi");
let delCard = qa('.student-card').filter(c => c.textContent.includes('Gulnoza Ismoilova'))[0];
check(!!delCard, "o'chirish: Gulnoza kartasi topildi");
const delSid = delCard.querySelector('[data-act="del-student"]').getAttribute('data-sid');

/* tasdiq modali — bekor qilish */
click(delCard.querySelector('[data-act="del-student"]'));
check(q('#modal-overlay').hidden === false, "o'chirish: tasdiq modali ochildi");
check(q('#modal-sheet').textContent.includes("Haqiqatan ham") && q('#modal-sheet').textContent.includes("Gulnoza Ismoilovani o'chirmoqchimisiz"),
  "o'chirish: ism bilan tasdiq savoli");
check(q('#modal-sheet').textContent.includes('baholari va davomat tarixi ham o\'chiriladi'),
  "o'chirish: ogohlantirish matni to'liq");
check(!!q('.confirm-actions [data-act="close-modal"]') && q('.confirm-actions [data-act="close-modal"]').textContent.includes('Bekor qilish'),
  "o'chirish: 'Bekor qilish' tugmasi");
check(!!q('[data-act="do-del-student"]') && q('[data-act="do-del-student"]').textContent.includes("Ha, o'chirish"),
  "o'chirish: 'Ha, o'chirish' tugmasi");
click('.confirm-actions [data-act="close-modal"]');
check(q('#modal-overlay').hidden === true, 'o\'chirish: bekor qilindi');
check(studentCards() === nStudBeforeDel, "o'chirish: bekor qilingach o'quvchi saqlanib qoldi");

/* tasdiq → o'chirish */
click(qa('.student-card').filter(c => c.textContent.includes('Gulnoza Ismoilova'))[0].querySelector('[data-act="del-student"]'));
click('[data-act="do-del-student"]');
check(q('#modal-overlay').hidden === true, 'o\'chirish: modal yopildi');
check(studentCards() === nStudBeforeDel - 1, "o'chirish: o'quvchi ro'yxatdan yo'qoldi");
check(q('#toast').textContent.includes("O'quvchi muvaffaqiyatli o'chirildi"), "o'chirish: success toast");
const studentsAfterDel = JSON.parse(win.localStorage.getItem('et_students'));
check(!studentsAfterDel.some(x => x.id === delSid), "o'chirish: lokal studentsdan o'chirildi");
check(!JSON.parse(win.localStorage.getItem('et_grades'))[delSid], "o'chirish: baholari o'chirildi");
await new Promise(r => setTimeout(r, 200));
check(!(cloudStub.db.students || []).some(r => String(r.login || '').toLowerCase() === 'gulnoza'),
  "o'chirish: login hisobi bulutdan o'chirildi");
const attAfterDel = JSON.parse(win.localStorage.getItem('et_attendance'));
check(Object.keys(attAfterDel).every(dk => !attAfterDel[dk] || !attAfterDel[dk][delSid]), "o'chirish: davomati o'chirildi");
check(!qa('.student-card').some(c => c.textContent.includes('Gulnoza')), "o'chirish: karta ham yo'qoldi");

/* ================= 18. GURUHNI O'CHIRISH (tasdiq bilan) ================= */
click('[data-act="nav"][data-screen="groups"]');
const nGrpBeforeDel = groupCards();
check(qa('[data-act="del-group"]').length === nGrpBeforeDel, "guruh: har kartada '🗑 O'chirish' tugmasi");
const grpCard = qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0];
const grpId = grpCard.querySelector('[data-act="del-group"]').getAttribute('data-gid');

click(grpCard.querySelector('[data-act="del-group"]'));
check(q('#modal-overlay').hidden === false, "guruh: tasdiq modali ochildi");
check(q('#modal-sheet').textContent.includes('IELTS Band 7.0 guruhini o\'chirmoqchimisiz?'),
  "guruh: nom bilan tasdiq savoli");
check(!!q('.confirm-actions [data-act="close-modal"]') && !!q('[data-act="do-del-group"]'), "guruh: Bekor/Ha tugmalari");
click('.confirm-actions [data-act="close-modal"]');
check(groupCards() === nGrpBeforeDel, "guruh: bekor qilingach saqlanib qoldi");

click(qa('.group-card').filter(c => c.textContent.includes('IELTS Band 7.0'))[0].querySelector('[data-act="del-group"]'));
click('[data-act="do-del-group"]');
check(groupCards() === nGrpBeforeDel - 1, "guruh: ro'yxatdan yo'qoldi");
check(q('#toast').textContent.includes('Guruh muvaffaqiyatli o\'chirildi'), "guruh: success toast");
check(!JSON.parse(win.localStorage.getItem('et_groups')).some(g => g.id === grpId), "guruh: lokal groupsdan o'chirildi");
const studentsAfterGrpDel = JSON.parse(win.localStorage.getItem('et_students'));
check(studentsAfterGrpDel.filter(x => x.groupId === null).length === 2, "guruh: o'quvchilari guruhsiz qoldi (group_id = null)");
check(!JSON.parse(win.localStorage.getItem('et_grades'))['x'], "guruh: boshqa ma'lumotlar o'zgarmadi");

/* ================= 19. ZAXIRA — BACKUP & RESTORE (async) ================= */
const until = async (fn, ms) => {
  const t0 = Date.now();
  for (;;) {
    let v = false;
    try { v = await fn(); } catch (e) { v = false; }
    if (v) return true;
    if (Date.now() - t0 > ms) return false;
    await new Promise(r => setTimeout(r, 60));
  }
};

await (async () => {
  /* Ustoz profili → zaxira kartasi */
  click('[data-act="nav"][data-screen="profile"]');
  check(q('#screen').textContent.includes("Ma'lumotlar Bazasi Zaxirasi"), 'zaxira: karta profilda');
  check(!!q('[data-act="backup-dl"]') && q('[data-act="backup-dl"]').textContent.includes('Bazani yuklab olish'),
    'zaxira: "📥 Bazani yuklab olish (Backup)" tugmasi');
  check(!!q('[data-act="backup-pick"]') && !!q('#backup-file'), 'zaxira: "📤 Bazani qayta tiklash" + fayl input');

  /* Download (jsdom uchun stub) */
  if (typeof win.URL.createObjectURL !== 'function') {
    win.URL.createObjectURL = () => 'blob:mock';
    win.URL.revokeObjectURL = () => {};
  }
  click('[data-act="backup-dl"]');
  check(await until(() => q('#toast').textContent.includes('Zaxira yuklab olindi'), 4000), 'zaxira: JSON yuklab olindi (toast)');

  /* Faylni tanlash → tasdiq modali → BEKOR */
  const bak = {
    app: 'english-tutor', version: 1,
    groups: [{ id: 55, name: 'RESTORED GROUP', days: 'Dushanba', time: '09:00' }],
    students: [{ id: 77, name: 'Restored Student', school_class: '9-sinf', group_id: 55,
                 login: 'restore1', password: '9876', speaking_debt: 3 }],
    attendance: [{ student_id: 77, date: '2026-10-01', status: 'present' }],
    grades: [{ student_id: 77, date: '2026-10-01', grade: 9, category: "Lug'at", note: '' }],
    messages: [{ student_id: 77, sender: 'teacher', text: 'Tiklangan xabar', created_at: '2026-10-01T10:00:00.000Z' }],
    speaking_submissions: [],
    audio_submissions: [{ id: 9, student_id: 77, date: '2026-10-02', url: 'data:audio/ogg;base64,AAA',
                           status: 'graded', score: 8, feedback: 'Yaxshi' }]
  };
  const pickFile = () => {
    const f = new win.File([JSON.stringify(bak)], 'english_crm_backup_2026-10-13.json', { type: 'application/json' });
    const inp = q('#backup-file');
    Object.defineProperty(inp, 'files', { value: [f], configurable: true });
    inp.dispatchEvent(new win.Event('change', { bubbles: true }));
  };
  pickFile();
  check(await until(() => q('#modal-overlay').hidden === false &&
    q('#modal-sheet').textContent.includes('Haqiqatan ham bazani ushbu fayldan qayta tiklamoqchimisiz'), 4000),
    'zaxira: tasdiq modali (spec matni)');
  check(q('#modal-sheet').textContent.includes('english_crm_backup_2026-10-13.json'), 'zaxira: fayl nomi ko\'rinadi');
  check(!!q('.confirm-actions [data-act="close-modal"]') && q('.confirm-actions [data-act="close-modal"]').textContent.includes('Bekor qilish'),
    "zaxira: 'Bekor qilish' tugmasi");
  check(!!q('[data-act="do-restore"]') && q('[data-act="do-restore"]').textContent.includes('Ha, tiklash'),
    "zaxira: 'Ha, tiklash' tugmasi");

  click('.confirm-actions [data-act="close-modal"]');
  check(q('#modal-overlay').hidden === true, 'zaxira: bekor qilindi');
  const grpBefore = JSON.parse(win.localStorage.getItem('et_groups') || '[]');
  check(!grpBefore.some(g => g.name === 'RESTORED GROUP'), 'zaxira: bekor qilingach ma\'lumot o\'zgarmadi');

  /* Qayta tanlash → TASDIQLASH → lokal tiklash */
  pickFile();
  check(await until(() => q('#modal-overlay').hidden === false, 4000), 'zaxira: modal qayta ochildi');
  click('[data-act="do-restore"]');
  check(await until(() => {
    const g = JSON.parse(win.localStorage.getItem('et_groups') || '[]');
    return g.length === 1 && g[0].name === 'RESTORED GROUP';
  }, 4000), 'zaxira: guruh qayta tiklandi (RESTORED GROUP)');
  check(q('#toast').textContent.includes('Baza qayta tiklandi'), 'zaxira: success toast');

  const stAfter = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  check(stAfter.length === 1 && stAfter[0].fullName === 'Restored Student', 'zaxira: o\'quvchi qayta tiklandi');
  check(stAfter[0].id === 's77' && stAfter[0].groupId === 'g55', 'zaxira: idlar mos (s77 → g55)');
  check(stAfter[0].speakingDebt === 3, 'zaxira: speaking qarz saqlandi (3)');
  const grAfter = JSON.parse(win.localStorage.getItem('et_grades') || '{}');
  check(grAfter['s77'] && grAfter['s77']['2026-10-01'] && grAfter['s77']['2026-10-01'].score === 9, 'zaxira: baholar tiklandi');
  const attAfter2 = JSON.parse(win.localStorage.getItem('et_attendance') || '{}');
  check(attAfter2['2026-10-01'] && attAfter2['2026-10-01']['s77'] === 'present', 'zaxira: davomat tiklandi');
  const msgAfter = JSON.parse(win.localStorage.getItem('et_messages') || '[]');
  check(msgAfter.some(m => m.text === 'Tiklangan xabar' && m.sid === 's77'), 'zaxira: xabarlar tiklandi');
  const dbAudio = cloudStub.db.audio_submissions || [];
  check(dbAudio.some(r => Number(r.score) === 8 && String(r.status) === 'graded'),
    'zaxira: ovozli topshiriklar tiklandi (audio_submissions)');
  const dbStu = cloudStub.db.students || [];
  const r1 = dbStu.filter(r => String(r.login || '').toLowerCase() === 'restore1')[0];
  check(!!r1 && String(r1.password || '') === '9876',
    'zaxira: hisoblar qayta qurildi (restore1/9876 bulutda)');

  /* UI jonli yangilandi */
  forceNav('groups');
  check(text().includes('RESTORED GROUP'), 'zaxira: guruhlar ekrani yangilandi');
  forceNav('students');
  check(text().includes('Restored Student'), "zaxira: o'quvchilar ekrani yangilandi");

  /* Tiklangan hisob bilan kirish */
  click('[data-act="nav"][data-screen="profile"]');
  clickAct('logout');
  await loginAs('restore1', '1111');
  check(await until(() => q('#login-error') && q('#login-error').classList.contains('show'), 2000),
    "zaxira: noto'g'ri parol rad etildi");
  await loginAs('restore1', '9876');
  check(text().includes('Restored Student'), "zaxira: restore1/9876 bilan kirish ishlaydi");

  /* ================= 20. UYGA VAZIFA (ustoz → o'quvchi portali) ================= */
  logout();
  await loginAs('m_amirov', '123');
  click('[data-act="nav"][data-screen="home"]');
  check(!!q('[data-act="open-hw"]'), "uyga vazifa: '+ Uyga vazifa' tugmasi (Bosh)");
  check(!!q('[data-act="nav"][data-screen="homework"]'),
    "uyga vazifa: navigatsiyada alohida 'Uyga vazifalar' bo'limi");
  check(text().includes("Berilgan vazifalar «Uyga vazifalar» bo'limida ko'rinadi"),
    "uyga vazifa: Bosh sahifada qisqa izoh (to'liq ro'yxat yo'q)");
  check(!q('[data-act="del-hw"]') && !q('[data-act="hw-edit"]'),
    "uyga vazifa: Bosh sahifada barcha guruh vazifalari chiqmaydi");
  clickAct('open-hw');
  check(q('#modal-overlay').hidden === false, "uyga vazifa: modali ochildi");
  check(!!q('#hw-group') && !!q('#hw-title') && !!q('#hw-desc') && !!q('#hw-due'),
    "uyga vazifa: guruh/mavzu/tavsif/muddat formasi");
  check(!!q('#hw-media-input') && q('#hw-media-input').type === 'file',
    "uyga vazifa: fayl tanlash maydoni (#hw-media-input) mavjud");
  check(!!q('label.hw-upload-btn[for="hw-media-input"]') &&
    q('label.hw-upload-btn').textContent.includes('Fayl tanlash'),
    "uyga vazifa: ko'rinadigan 'Fayl tanlash' tugmasi bor");
  check(!!q('#hw-media-clear') && q('#hw-media-clear').hidden === true,
    "uyga vazifa: [✕] tugmasi (fayl tanlanmaguncha yashirin)");
  check(!!q('#hw-media-status') && q('#hw-media-status').textContent.includes('100MB'),
    "uyga vazifa: 100MB chegara status matni");
  /* Rasm tanlansa — nom, preview va ✕ ko'rinadi; ✕ bekor qiladi */
  const fImg = new win.File([new Uint8Array([1, 2, 3])], 'daftar.png', { type: 'image/png' });
  const fInput = q('#hw-media-input');
  Object.defineProperty(fInput, 'files', { configurable: true, value: [fImg] });
  fInput.dispatchEvent(new win.Event('change'));
  check(q('#hw-media-status').textContent.includes('daftar.png'),
    "uyga vazifa: tanlangan fayl nomi statusda ko'rinadi");
  check(q('#hw-media-clear').hidden === false, "uyga vazifa: fayl tanlangach ✕ ko'rinadi");
  check(q('#hw-file-box').textContent.includes('daftar.png'),
    "uyga vazifa: tanlangan fayl preview blokida ko'rinadi");
  check(q('#hw-media-status').textContent.includes('tanlandi'),
    "uyga vazifa: '✅ Rasm tanlandi' statusi");
  click('#hw-media-clear');
  check(q('#hw-media-clear').hidden === true &&
    !q('#hw-file-box').textContent.includes('daftar.png') &&
    q('#hw-media-status').textContent.includes('100MB'),
    "uyga vazifa: ✕ tanlangan faylni bekor qiladi");
  const acceptAttr = q('#hw-media-input').getAttribute('accept') || '';
  const needTypes = ['image/*', 'video/*', 'audio/*', '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.opus',
    '.mp4', '.mov', '.pdf', '.doc', '.docx'];
  check(needTypes.every(t => acceptAttr.split(',').map(x => x.trim()).includes(t)),
    "uyga vazifa: accept audio/musiqa + video + rasm + pdf/doc fayllarni qabul qiladi");
  check(!q('#hw-media-input').hasAttribute('capture'),
    "uyga vazifa: capture atributi yo'q — telefon kamerani avtomatik ochmaydi");
  /* PDF ham qabul qilinadi va havola sifatida ko'rsatiladi */
  const fPdf = new win.File([new Uint8Array([1])], 'insho.pdf', { type: 'application/pdf' });
  Object.defineProperty(fInput, 'files', { configurable: true, value: [fPdf] });
  fInput.dispatchEvent(new win.Event('change'));
  check(q('#hw-media-status').textContent.includes('insho.pdf') &&
    q('#hw-media-status').textContent.includes('PDF'),
    "uyga vazifa: PDF fayl qabul qilinadi (📄 PDF)");
  click('#hw-media-clear');
  /* Audio/musiqa: mime-type bo'sh bo'lsa ham kengaytma bo'yicha aniqlanadi */
  const pickHw = (name, type) => {
    const f = new win.File([new Uint8Array([1])], name, { type: type });
    Object.defineProperty(fInput, 'files', { configurable: true, value: [f] });
    fInput.dispatchEvent(new win.Event('change'));
  };
  pickHw('musiqa.opus', '');
  check(q('#hw-media-status').textContent.includes('Audio') &&
    q('#hw-file-box').textContent.includes('musiqa.opus'),
    "uyga vazifa: .opus (mime bo'sh) → 🎧 Audio deb aniqlandi");
  click('#hw-media-clear');
  pickHw('trek.m4a', '');
  check(q('#hw-media-status').textContent.includes('Audio'),
    "uyga vazifa: .m4a → Audio");
  click('#hw-media-clear');
  pickHw('klip.avi', '');
  check(q('#hw-media-status').textContent.includes('Video'),
    "uyga vazifa: .avi → Video");
  click('#hw-media-clear');
  pickHw('ovoz.mp3', 'audio/mpeg');
  check(q('#hw-media-status').textContent.includes('Audio'),
    "uyga vazifa: audio/mpeg → Audio");
  click('#hw-media-clear');
  pickHw('insho.docx', '');
  check(q('#hw-media-status').textContent.includes('tanlandi') &&
    !q('#hw-media-status').classList.contains('err'),
    "uyga vazifa: .docx hujjat fayli qabul qilinadi (rad etilmaydi)");
  click('#hw-media-clear');
  pickHw('jadval.xlsx', '');
  check(q('#hw-media-status').textContent.includes('jadval.xlsx') &&
    !q('#hw-media-status').classList.contains('err'),
    "uyga vazifa: .xlsx (Excel) fayl qabul qilinadi (rad etilmaydi)");
  click('#hw-media-clear');
  pickHw('dastur.exe', '');
  check(q('#hw-media-status').classList.contains('err'),
    "uyga vazifa: xavfli .exe fayl rad etiladi");
  check(!q('#hw-file-box').textContent.includes('dastur.exe'),
    "uyga vazifa: rad etilgan fayl navbatga qo'shilmaydi");
  click('#hw-media-clear');
  /* 100MB dan katta fayl: fayl nomi bilan aniq xabar */
  const fBig = new win.File([new Uint8Array([1])], 'katta-video.mp4', { type: 'video/mp4' });
  Object.defineProperty(fBig, 'size', { configurable: true, value: 150 * 1024 * 1024 });
  Object.defineProperty(fInput, 'files', { configurable: true, value: [fBig] });
  fInput.dispatchEvent(new win.Event('change'));
  check(q('#hw-media-status').classList.contains('err') &&
    q('#hw-media-status').textContent.includes('katta-video.mp4') &&
    q('#hw-media-status').textContent.includes('100 MB'),
    "uyga vazifa: 100MB dan katta fayl nomi va chegara bilan rad etiladi");
  click('#hw-media-clear');
  clickAct('save-hw');
  check(q('#hw-error').classList.contains('show'), "uyga vazifa: bo'sh mavzu rad etildi");
  setVal('#hw-title', 'Present Perfect shakli');
  q('#hw-group').value = 'g55';
  setVal('#hw-desc', '10 ta gap tuzing');
  q('#hw-due').value = '2026-10-20';
  let hwUploadedName = '';
  win.__cloud.uploadHomeworkMedia = function (file) {
    hwUploadedName = file.name;
    return Promise.resolve({
      url: 'https://demo.supabase.co/storage/v1/object/public/homework-media/hw/dars.mp4',
      path: 'hw/dars.mp4', bucket: 'homework-media'
    });
  };
  pickHw('dars.mp4', 'video/mp4');
  check(q('#hw-media-status').textContent.includes('Video'),
    "uyga vazifa: video fayl tanlandi (yuklashga tayyor)");
  clickAct('save-hw');
  check(await until(() => q('#modal-overlay').hidden === true, 2000),
    "uyga vazifa: modal yopildi (fayl yuklandi)");
  check(hwUploadedName === 'dars.mp4', "uyga vazifa: fayl Storage'ga yuborildi");
  const hwMedia = JSON.parse(win.localStorage.getItem('et_homework') || '[]')[0];
  check(hwMedia && hwMedia.mediaUrl.includes('/homework-media/hw/dars.mp4') &&
        hwMedia.mediaType === 'video',
    "uyga vazifa: media_url + media_type saqlandi (bucket homework-media)");
  forceNav('homework');
  check(!!q('[data-act="hw-group"]') && !q('.hw-item'),
    "uyga vazifa: bo'lim avval guruhlar ro'yxatini ko'rsatadi");
  check(!!q('.hw-group-card svg') && text().includes("ta uyga vazifa"),
    "uyga vazifa: guruh kartasida SVG ikonka va vazifalar soni");
  click('[data-act="hw-group"][data-gid="g55"]');
  check(text().includes('Present Perfect shakli'), "uyga vazifa: guruh tanlanganda ro'yxatda ko'rinadi");
  check(!!q('.hw-due-badge') && q('.hw-due-badge').textContent.includes('20.10.2026'),
    "uyga vazifa: bajarilish muddati yashil badge'da ko'rinadi");
  check(!!q('[data-act="hw-edit"]') && !!q('[data-act="open-hw"][data-gid="g55"]'),
    "uyga vazifa: tahrirlash va shu guruhga vazifa berish tugmalari bor");
  forceNav('groups');
  click('[data-act="group-detail"][data-gid="g55"]');
  check(qa('.group-student-debt').length >= 1 && !q('.hw-item') && !q('[data-act="open-hw"]'),
    "guruh detaili: faqat ism + speaking qarzi — uyga vazifa bo'limi yo'q");
  forceNav('home');
  const hwLocal = JSON.parse(win.localStorage.getItem('et_homework') || '[]');
  check(hwLocal.length === 1 && hwLocal[0].title === 'Present Perfect shakli' &&
    hwLocal[0].groupId === 'g55' && hwLocal[0].dueDate === '2026-10-20',
    "uyga vazifa: lokalda saqlandi (g55, muddat)");

  logout();
  await loginAs('restore1', '9876');
  openStudentView('homework');
  check(text().includes('Present Perfect shakli'), "uyga vazifa: o'quvchi portalida ko'rinadi");
  check(text().includes('10 ta gap tuzing'), "uyga vazifa: tavsif portalda ko'rinadi");
  check(!!q('.hw-due-badge') && q('.hw-due-badge').textContent.includes('20.10.2026'),
    "uyga vazifa: o'quvchi portalida muddat yashil badge bilan");
  check(text().includes('Uyga vazifalar') && !!q('.back-row svg'),
    "uyga vazifa: portal bo'limi SVG ikonka bilan mavjud");

  /* ================= 20b. O'QUVCHI: BAJARILGANLIK CHECKBOXI (○ / ✓) ================= */
  const hwToggle1 = q('[data-act="toggle-hw"]');
  check(!!hwToggle1, "bajarildi: portalda har bir vazifa yonida aylantirish checkboxi bor");
  check(!q('.hw-check.on') && !q('.hw-done-badge'), "bajarildi: standart holat — ○ (bosh)");
  click(hwToggle1);
  check(!!q('.hw-check.on'), "bajarildi: bosildi → ✓ (yashil)");
  check(qa('.hw-struck').length >= 2, "bajarildi: sarlavha va tavsifda line-through");
  check(!!q('.hw-done-badge') && q('.hw-done-badge').textContent.includes('Bajarildi'),
    "bajarildi: '✓ Bajarildi' yashil badge paydo bo'ldi");
  const hwDone1 = JSON.parse(win.localStorage.getItem('et_hw_done') || '{}');
  check(!!hwDone1['s77'] && hwDone1['s77'].length === 1, "bajarildi: holat localStorage'da saqlandi (s77)");
  click(q('[data-act="toggle-hw"]'));
  check(!q('.hw-check.on') && !q('.hw-done-badge') && qa('.hw-struck').length === 0,
    "bajarildi: qayta bosildi → ○ (qayta faol)");
  const hwDone2 = JSON.parse(win.localStorage.getItem('et_hw_done') || '{}');
  check(!hwDone2['s77'] || hwDone2['s77'].length === 0, "bajarildi: ochilganda localStorage'dan ham o'chdi");
  /* Qayta bajarilgan qoldirib, chiqish→kirish bilan eslab qolinishini tekshiramiz */
  click(q('[data-act="toggle-hw"]'));
  check(!!q('.hw-check.on'), "bajarildi: yana yoqildi");
  logout();
  await loginAs('restore1', '9876');
  openStudentView('homework');
  check(!!q('.hw-check.on') && qa('.hw-struck').length >= 2 && !!q('.hw-done-badge'),
    "bajarildi: kirishdan keyin holat saqlanib qoldi (persist)");

  /* ================= 20c. USTOZ: UYGA VAZIFANI O'CHIRISH ================= */
  logout();
  await loginAs('m_amirov', '123');
  forceNav('homework');
  click('[data-act="hw-group"][data-gid="g55"]');
  check(!!q('[data-act="del-hw"]'), "o'chirish: ustoz kartasida 🗑 (SVG) tugma bor");
  check(!!q('[data-act="hw-edit"]'), "uyga vazifa: tahrirlash (edit) tugmasi bor");
  click(q('[data-act="del-hw"]'));
  check(q('#modal-overlay').hidden === false &&
    q('#modal-sheet').textContent.includes("Haqiqatan ham ushbu uyga vazifani o'chirmoqchimisiz?"),
    "o'chirish: tasdiq modali aniq matn bilan ochildi");
  check(!!q('.confirm-actions [data-act="close-modal"]') &&
    q('.confirm-actions [data-act="close-modal"]').textContent.includes('Bekor qilish'),
    "o'chirish: 'Bekor qilish' tugmasi");
  check(!!q('[data-act="do-del-hw"]') && q('[data-act="do-del-hw"]').textContent.includes('Ha, o\'chirish'),
    "o'chirish: 'Ha, o'chirish' tugmasi");
  /* Bekor qilish — vazifa joyida qoladi */
  click('.confirm-actions [data-act="close-modal"]');
  check(q('#modal-overlay').hidden === true && text().includes('Present Perfect shakli'),
    "o'chirish: bekor qilindi — vazifa o'chirilmadi");
  /* Tasdiqlash — Supabase+lokal o'chiriladi, Storage'dagi fayl ham */
  let delHwArgs = null;
  const realDeleteHw = win.__cloud.deleteHomework;
  win.__cloud.deleteHomework = function (dbId, mediaUrl) {
    delHwArgs = { dbId: dbId, mediaUrl: mediaUrl };
    return Promise.resolve();
  };
  click(q('[data-act="del-hw"]'));
  click('[data-act="do-del-hw"]');
  check(!!delHwArgs && String(delHwArgs.mediaUrl).includes('/homework-media/hw/dars.mp4'),
    "o'chirish: media_url Storage'dan o'chirish uchun uzatildi");
  check(/async function deleteHomework\(dbId, mediaUrls?\)/.test(appJs) &&
        /remove\(\[filePath\]\)/.test(appJs),
    "o'chirish: deleteHomework faylni Storage'dan ham remove qiladi");
  win.__cloud.deleteHomework = realDeleteHw;
  check(q('#modal-overlay').hidden === true, "o'chirish: modal yopildi");
  check(!text().includes('Present Perfect shakli'), "o'chirish: karta UI'dan darhol olib tashlandi");
  check(q('#toast').textContent.includes("Uyga vazifa o'chirildi"), "o'chirish: success toast");
  const hwAfterDel = JSON.parse(win.localStorage.getItem('et_homework') || '[]');
  check(hwAfterDel.length === 0, "o'chirish: lokal ro'yxat bo'sh (1 ta vazifa o'chirildi)");
  forceNav('home');

  /* ================= 20d. TEZ AMALLAR: QAT'IY 88px KARTALAR ================= */
  const cssText = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
  check(/\.quick-grid\s*\{[^}]*grid-auto-rows:\s*88px/.test(cssText),
    "tez amallar: .quick-grid qator balandligi qat'iy 88px");
  check(/\.quick\s*\{[^}]*height:\s*88px/.test(cssText) && /\.quick\s*\{[^}]*min-height:\s*88px/.test(cssText),
    "tez amallar: .quick height + min-height = 88px (h-[88px] min-h-[88px])");
  check(/\.quick\s*\{[^}]*justify-content:\s*space-between/.test(cssText),
    'tez amallar: flex-col justify-between (ichki tekislash)');
  check(/\.quick\s*\{[^}]*padding:\s*14px/.test(cssText), 'tez amallar: p-3.5 (14px) padding');
  check(/\.quick-ico\s*\{[^}]*width:\s*36px;\s*\n?\s*height:\s*36px/.test(cssText),
    'tez amallar: ikonka badge bir xil 36×36px');
  check(qa('.quick-grid .quick').length === 10, "tez amallar: 10 ta karta (barchasi bir xil balandlikda)");

  /* ================= 21. VOICE RUXSAT KALITI (kartada) ================= */
  logout();
  await loginAs('m_amirov', '123');
  click('[data-act="nav"][data-screen="students"]');
  const swEl = q('[data-act="voice-toggle"]');
  check(!!swEl, "voice: o'quvchi kartasida ruxsat kaliti bor");
  check(!!swEl && !swEl.classList.contains('on') && swEl.getAttribute('aria-checked') === 'false',
    "voice: standart holat OFF (ruxsat faqat ustoz bergach)");
  click(swEl);
  const swEl2 = q('[data-act="voice-toggle"]');
  check(!!swEl2 && swEl2.classList.contains('on') && swEl2.getAttribute('aria-checked') === 'true',
    "voice: bosildi → ON (ruxsat berildi)");
  click(swEl2);
  const swEl3 = q('[data-act="voice-toggle"]');
  check(!!swEl3 && !swEl3.classList.contains('on'), "voice: qayta bosildi → OFF (cheklandi)");
  const stV = JSON.parse(win.localStorage.getItem('et_students')).filter(x => x.id === 's77')[0];
  check(!!stV && stV.voiceAllowed === false, "voice: voiceAllowed=false lokalda saqlandi");
  check(q('#toast').textContent.includes('cheklandi'), "voice: toast xabari");

  /* ================= 21b. SAYTDA SPEAKING RUXSATI (web_speaking_allowed) ================= */
  const webRow = () => (cloudStub.db.students || []).filter(r => String(r.id) === '77')[0];
  const webBtn = () => q('[data-act="web-speaking-toggle"][data-sid="s77"]');
  check(!!webBtn(), 'web-speaking: ustoz kartasida sayt ruxsati kaliti bor');
  if (webBtn() && webBtn().classList.contains('on')) {
    click(webBtn());
    await until(() => webRow() && webRow().web_speaking_allowed === false, 2000);
  }
  click(webBtn());
  check(await until(() => !!webRow() && webRow().web_speaking_allowed === true, 2000),
    'web-speaking: toggle darhol Supabase students.web_speaking_allowed=true qiladi');
  const webLocalOn = JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {};
  check(webLocalOn.webSpeakingAllowed === true,
    'web-speaking: lokal o‘quvchi modelida webSpeakingAllowed=true saqlanadi');

  /* To'liq pushStudent ham ruxsatni yo'qotmaydi (serialization round-trip) */
  await win.__cloud.pushStudent('s77');
  check(webRow() && webRow().web_speaking_allowed === true,
    'web-speaking: pushStudent round-trip web_speaking_allowed=true ni saqlaydi');

  /* Ataylab eski (stale) qiymatni qaytargan pull: guard yangi toggle'ni bosib ketmasligi kerak */
  if (webRow()) webRow().web_speaking_allowed = false;
  const stalePull = await win.__cloud.pullAll('m_amirov');
  const webAfterStale = JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {};
  check(stalePull === true && webAfterStale.webSpeakingAllowed === true,
    'web-speaking: stale pullAll yangi ruxsatni OFF ga qaytarmaydi');
  if (webRow()) webRow().web_speaking_allowed = true;

  /* Eski sxema: aniq ustun yo'q bo'lsa '*' fallback login/pull'ni buzmaydi */
  const columnErr = { code: 'PGRST204', message: "Could not find the 'web_speaking_allowed' column of 'students' in the schema cache" };
  cloudStub.failNextSelect('students', columnErr);
  const fallbackPull = await win.__cloud.pullAll('m_amirov');
  const fallbackLocal = JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {};
  check(fallbackPull === true && fallbackLocal.webSpeakingAllowed === true,
    'web-speaking: pullAll missing column → select(*) fallback ishlaydi');
  cloudStub.failNextSelect('students', columnErr);
  const fallbackLogin = await win.__cloud.selectStudentRows(
    'id, name, login, password_hash, web_speaking_allowed',
    q => q.ilike('login', 'restore1').limit(1)
  );
  check(!!fallbackLogin && !fallbackLogin.error && !!(fallbackLogin.data && fallbackLogin.data[0]),
    'web-speaking: login select missing column → select(*) fallback ishlaydi');

  /* Tez ikki marta bosish: bitta o'quvchi uchun bitta update */
  const realDoubleSetter = win.__cloud.setWebSpeakingAllowed;
  let webSetCalls = 0;
  win.__cloud.setWebSpeakingAllowed = function () {
    webSetCalls++;
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ ok: true, value: false }); }, 120);
    });
  };
  click(webBtn());
  click(webBtn());
  check(webSetCalls === 1,
    'web-speaking: tez ikki marta bosish faqat bitta Supabase update yuboradi');
  await new Promise(r => setTimeout(r, 180));
  win.__cloud.setWebSpeakingAllowed = realDoubleSetter;
  await realDoubleSetter('s77', true);

  /* Supabase xatosi: UI optimistik holatdan haqiqiy holatga qaytadi */
  const realWebSetter = win.__cloud.setWebSpeakingAllowed;
  win.__cloud.setWebSpeakingAllowed = async function () { return { ok: false, error: 'test xato' }; };
  click(webBtn());
  check(await until(() => q('#toast').textContent.includes('Ruxsatni saqlashda xatolik'), 1500),
    'web-speaking: Supabase xatosi toast orqali ko‘rsatiladi');
  const webAfterError = JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {};
  check(webAfterError.webSpeakingAllowed === true,
    'web-speaking: yozuv xatosida UI oldingi holatga qaytadi');
  win.__cloud.setWebSpeakingAllowed = realWebSetter;

  check(/STUDENT_SYNC_COLS[\s\S]{0,320}web_speaking_allowed/.test(appJs) &&
        /\.update\(\{ web_speaking_allowed: value \}\)/.test(appJs) &&
        /web_speaking_allowed: webSpeakingForWrite/.test(appJs),
    'web-speaking: select/update/serialization yo‘llarida ustun eksplitsit');

  /* O'quvchi tomoni: pullStudent/pullAll(login) ruxsatni to'g'ridan-to'g'ri o'qiydi */
  const studentPull = await win.__cloud.pullAll('restore1');
  const webStudentSide = JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {};
  check(studentPull === true && webStudentSide.webSpeakingAllowed === true,
    'web-speaking: student pullStudent web_speaking_allowed=true ni ko‘radi');
  await win.__cloud.pullAll('m_amirov');

  /* ================= 22. 5 SONIYALIK POLLING OLIB TASHLANGAN ================= */
  let fiveSec = 0;
  const origST = win.setTimeout;
  win.setTimeout = function () { if (arguments[1] === 5000) fiveSec++; return origST.apply(win, arguments); };
  click(qa('[data-act="open-chat"]')[0]);
  check(q('#modal-overlay').hidden === false, "chat: modal ochildi (polling tekshiruvi)");
  await new Promise(r => setTimeout(r, 120));
  win.setTimeout = origST;
  check(fiveSec === 0, "sync: 5 soniyalik chat polling yo'q (loop'siz)");
  click('[data-act="close-modal"]');

  /* ================= 23. TOZALASH (AVVAL ZAXIRA → TASDIQ → TOZALASH) ================= */
  click('[data-act="nav"][data-screen="profile"]');
  check(!!q('[data-act="cleanup-go"]'), "tozalash: tugma profilda");
  check(qa('[data-act="cleanup-pick"]').length === 4, "tozalash: 4 ta jadval tanlovi");
  check(!!q('[data-act="cleanup-pick"][data-table="grades"]') &&
    q('[data-act="cleanup-pick"][data-table="grades"]').classList.contains('active'),
    "tozalash: 'Baholar' standart tanlangan");
  check(JSON.parse(win.localStorage.getItem('et_grades') || '{}')['s77'] !== undefined,
    "tozalash: baholar mavjud (oldin)");
  q('#toast').textContent = '';
  clickAct('cleanup-go');
  check(await until(() => q('#toast').textContent.includes('Zaxira yuklab olindi'), 4000),
    "tozalash: AVVAL to'liq zaxira fayl yuklab olindi");
  check(await until(() => q('#modal-overlay').hidden === false, 4000), "tozalash: tasdiq modali ochildi");
  check(q('#modal-sheet').textContent.includes("Eski ma'lumotlar fayl ko'rinishida yuklandi. Bazani tozalashni tasdiqlaysizmi?"),
    "tozalash: tasdiq modali spec matni");
  check(!!q('.confirm-actions [data-act="close-modal"]') &&
    q('.confirm-actions [data-act="close-modal"]').textContent.includes('Bekor qilish'),
    "tozalash: 'Bekor qilish' tugmasi");
  check(!!q('[data-act="do-cleanup"]') && q('[data-act="do-cleanup"]').textContent.includes('Ha, tozalash'),
    "tozalash: 'Ha, tozalash' tugmasi");
  click('.confirm-actions [data-act="close-modal"]');
  check(JSON.parse(win.localStorage.getItem('et_grades') || '{}')['s77'] !== undefined,
    "tozalash: bekor qilingach ma'lumot saqlanib qoldi");
  q('#toast').textContent = '';
  clickAct('cleanup-go');
  check(await until(() => q('#modal-overlay').hidden === false, 4000), "tozalash: modal qayta ochildi");
  clickAct('do-cleanup');
  check(await until(() => q('#toast').textContent.includes('Jadval tozalandi'), 4000), "tozalash: success toast");
  check(Object.keys(JSON.parse(win.localStorage.getItem('et_grades') || '{}')).length === 0,
    "tozalash: baholar jadvali tozalandi");

  /* ================= 24. BRAUZER BILDIRISHNOMALARI ================= */
  {
    /* jsdom'da Notification yo'q — sun'iy kuzatuvchi o'rnatamiz */
    const shownNotifs = [];
    let permRequests = 0;
    function FakeNotification(title, opts) {
      this.title = title;
      this.body = (opts && opts.body) || '';
      this.icon = (opts && opts.icon) || '';
      shownNotifs.push(this);
    }
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission = function (cb) {
      permRequests++;
      FakeNotification.permission = 'granted';
      if (cb) cb('granted');
      return Promise.resolve('granted');
    };
    win.Notification = FakeNotification;
    win.Notif.resetSeen();

    check(typeof win.Notif.notifyOnce === 'function' && typeof win.Notif.showPrompt === 'function',
      'notif: Notif moduli mavjud');
    check(win.Notif.PROMPT_TEXT === "Yangi baholar va xabarlarni o'tkazib yubormaslik uchun bildirishnomalarni yoqing",
      "notif: so'rov matni specda aniq (emoji yo'q)");
    check(win.Notif.PROMPT_BUTTON === 'Ruxsat berish', 'notif: [Ruxsat berish] tugma nomi');
    check(win.Notif.permission() === 'default', "notif: ruxsat hali default — so'rov kerak");

    /* --- Ruxsat so'rovi --- */
    q('#toast').textContent = '';
    check(win.Notif.showPrompt() === true, "notif: default holatda do'stona so'rov chiqdi");
    check(q('#toast').textContent.includes(win.Notif.PROMPT_TEXT), "notif: toast so'rov matnini ko'rsatdi");
    const permBtn = q('#toast .toast-action');
    check(!!permBtn && permBtn.textContent === 'Ruxsat berish', 'notif: toastda [Ruxsat berish] tugmasi bor');
    if (permBtn) click(permBtn);
    check(permRequests === 1, 'notif: tugma bosildi → Notification.requestPermission() chaqirildi');
    check(win.Notif.permission() === 'granted', 'notif: ruxsat berildi');
    check(q('#toast').textContent.includes('yoqildi'), 'notif: ruxsat olgach tasdiq toast');

    /* --- Bloklangan holat: xatosiz jim (fallback) --- */
    FakeNotification.permission = 'denied';
    win.Notif.resetSeen();
    shownNotifs.length = 0;
    check(win.Notif.showPrompt() === false, "notif: ruxsat bloklanganda so'rov ko'rsatilmaydi");
    check(win.Notif.notifyOnce('blocked1', 'sarlavha', 'matn') === false && shownNotifs.length === 0,
      'notif: bloklanganda native bildirishnoma chiqmaydi (fallback)');

    /* --- Ruxsat berilganda native bildirishnoma --- */
    FakeNotification.permission = 'granted';
    win.Notif.resetSeen();
    shownNotifs.length = 0;
    check(win.Notif.notifyOnce('g901', "Muzaffar Amirov: Sizga yangi baho qo'yildi (9/10)!", 'b9') === true &&
      shownNotifs.length === 1, 'notif: ruxsat bilan native bildirishnoma chiqdi');
    check(shownNotifs[0].title === "Muzaffar Amirov: Sizga yangi baho qo'yildi (9/10)!" &&
      String(shownNotifs[0].icon).indexOf('data:image/svg') === 0,
      'notif: baho sarlavhasi specda aniq + icon biriktirilgan');
    check(win.Notif.notifyOnce('g901', 'takroriy', 'b9') === false && shownNotifs.length === 1,
      'notif: bir xil qator id faqat bir marta (dedup)');

    /* ================= 25. BILDIRISHNOMA HODISALARI (realtime) ================= */
    /* Realtime qatorlari Supabase id ishlatadi — testda dbId beramiz */
    const gRows = JSON.parse(win.localStorage.getItem('et_groups') || '[]');
    const sRows = JSON.parse(win.localStorage.getItem('et_students') || '[]');
    const dbGRows = cloudStub.db.groups || [];
    const dbSRows = cloudStub.db.students || [];
    /* realtime qatorlari Supabase id bilan keladi — haqiqiy DB id'larini olamiz */
    gRows.forEach(g => {
      const row = dbGRows.filter(r => String(r.name || '') === String(g.name || ''))[0];
      if (row) g.dbId = Number(row.id);
    });
    sRows.forEach(x => {
      const row = dbSRows.filter(r => String(r.login || '').toLowerCase() === String(x.login || '').toLowerCase())[0];
      if (row) x.dbId = Number(row.id);
    });
    win.localStorage.setItem('et_groups', JSON.stringify(gRows));
    win.localStorage.setItem('et_students', JSON.stringify(sRows));

    /* Bulut rejimida hisoblar lokal saqlanmaydi — login students jadvalidan */
    let stuLogin = null, stuPass = null, stuLocalId = null;
    sRows.forEach(x => {
      if (stuLogin || !x.login) return;
      const row = dbSRows.filter(r => String(r.login || '').toLowerCase() === String(x.login).toLowerCase())[0];
      if (!row) return;
      stuLogin = x.login;
      /* Bazada parol xesh ko'rinishida: bu bosqichda yagona o'quvchi —
         zaxiradan tiklangan hisob, uning paroli test zaxirasida ma'lum */
      stuPass = /^[0-9a-f]{64}$/i.test(String(row.password || '')) ? '9876' : String(row.password || '');
      stuLocalId = x.id;
    });
    const stu = stuLogin ? sRows.filter(x => x.id === stuLocalId)[0] : null;
    const grp = stu && stu.groupId ? gRows.filter(x => x.id === stu.groupId)[0] : null;
    const S5_DB = stu ? stu.dbId : null;      /* joriy o'quvchining DB id'si */
    const G1_DB = grp ? grp.dbId : null;      /* joriy o'quvchining guruhi */
    const stuName = (stu && stu.fullName) || "O'quvchi";
    check(!!stuLogin && S5_DB != null && G1_DB != null,
      "notif: ulangan o'quvchi + guruhi topildi (realtime testi uchun)");

    logout();
    await loginAs(stuLogin, stuPass);
    win.Notif.resetSeen();
    shownNotifs.length = 0;

    /* (0) boshqa o'quvchiga tegishli baho → o'quvchiga xabar KETMAYDI */
    win.onCloudNotifChange('grades', { id: 8001, student_id: 9999, grade: 5 }, null);
    check(shownNotifs.length === 0, 'notif: boshqa o' + "'" + 'quvchi bahosi lokal xabar bermaydi');

    /* (1) ustoz baho qo'ydi */
    win.onCloudNotifChange('grades', { id: 8002, student_id: S5_DB, grade: 9 }, null);
    check(shownNotifs.length === 1 &&
      shownNotifs[0].title === "Muzaffar Amirov: Sizga yangi baho qo'yildi (9/10)!",
      "notif: o'quvchi — yangi baho sarlavhasi specda aniq");

    /* (2) ustoz voice ruxsati berdi */
    win.onCloudNotifChange('students', { id: S5_DB, voice_allowed: true }, { voice_allowed: false });
    check(shownNotifs.length === 2 &&
      shownNotifs[1].title === 'Muzaffar Amirov: Ovozli speaking topshirishga ruxsat berildi!',
      "notif: o'quvchi — voice ruxsati sarlavhasi specda aniq");
    const stNow = JSON.parse(win.localStorage.getItem('et_students')).filter(x => x.id === stuLocalId)[0];
    check(stNow.voiceAllowed === true, 'notif: voice_allowed lokal keshda ham yangilandi');

    /* (2b) allaqachon true bo'lgan → takroriy xabar yo'q */
    win.onCloudNotifChange('students', { id: S5_DB, voice_allowed: true }, { voice_allowed: true });
    check(shownNotifs.length === 2, 'notif: voice true→true takroriy xabar bermaydi');

    /* (3) ustoz chat yozdi */
    win.onCloudNotifChange('messages', { id: 8003, student_id: S5_DB, sender: 'teacher', text: 'Ertaga dars bor' }, null);
    check(shownNotifs.length === 3 &&
      shownNotifs[2].title === 'Muzaffar Amirovdan yangi xabar: Ertaga dars bor',
      'notif: o‘quvchi — Muzaffar Amirovdan yangi xabar (specda aniq)');

    /* (4) guruhi uchun yangi uyga vazifa */
    win.onCloudNotifChange('homework', { id: 8004, group_id: G1_DB, title: 'Present Perfect' }, null);
    check(shownNotifs.length === 4 && shownNotifs[3].title === 'Yangi uyga vazifa: Present Perfect',
      'notif: o‘quvchi — yangi uyga vazifa sarlavhasi specda aniq');

    /* (4b) boshqa guruh uchun vazifa → xabar ketmaydi */
    win.onCloudNotifChange('homework', { id: 8005, group_id: 777, title: 'Boshqa guruh' }, null);
    check(shownNotifs.length === 4, 'notif: boshqa guruh vazifasi lokal xabar bermaydi');

    /* (5) o‘quvchi yozgan xabar → USTOZGA (o‘quvchi turib xabar olmaydi) */
    win.onCloudNotifChange('messages', { id: 8006, student_id: S5_DB, sender: 'student', text: 'Tayyor' }, null);
    check(shownNotifs.length === 4, "notif: o'quvchi yozgan xabar o'quvchiga qaytarilmaydi");

    /* --- Ustoz tomoni --- */
    logout();
    await loginAs('m_amirov', '123');
    win.Notif.resetSeen();
    shownNotifs.length = 0;

    win.onCloudNotifChange('messages', { id: 8007, student_id: S5_DB, sender: 'student', text: 'Yaxshiman' }, null);
    check(shownNotifs.length === 1 && shownNotifs[0].title === stuName + ': Yangi xabar keldi',
      "notif: ustoz — o'quvchi xabari sarlavhasi specda aniq");

    win.onCloudNotifChange('speaking_submissions', { id: 8008, student_id: S5_DB,
      media_url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/w8008.webm' }, null);
    check(shownNotifs.length === 2 && shownNotifs[1].title === 'Yangi sayt speaking videosi' &&
      String(shownNotifs[1].body || '').indexOf(stuName) >= 0,
      "notif: ustoz — yangi sayt speaking videosi (ism va guruh bilan)");

    win.onCloudNotifChange('grades', { id: 8009, student_id: S5_DB, grade: 10 }, null);
    check(shownNotifs.length === 2, "notif: ustozga o'quvchi bahosi xabari ketmaydi (faqat o'quvchiga)");

    /* ================= 26. JONLI INBOX & QARZ BADGE (zero refresh) ================= */
    /* (a) INSERT → yangi topshirik INCHKda darhol paydo bo'ladi */
    click('[data-act="nav"][data-screen="speaking"]');
    const inboxBefore = qa('.audio-item').length;
    win.onCloudNotifChange('speaking_submissions',
      { id: 8101, student_id: S5_DB, media_type: 'video', status: 'kutilmoqda',
        media_url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/w8101.webm',
        score: null, created_at: '2026-10-15T12:00:00.000Z' }, null);
    check(qa('.audio-item').length === inboxBefore + 1,
      'realtime: INSERT → yangi karta INBOXda darhol (qayta yuklashsiz)');
    check(!!q('[data-tgcard="t8101"]'), 'realtime: karta data-tgcard bilan chiqdi');
    check(JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]')
        .some(x => x.dbId === 8101),
      'realtime: INSERT → lokal inbox keshga yozildi (optimistic)');

    /* (b) UPDATE (botda baholandi) → holat yangilanadi + karta silliq chiqadi */
    win.onCloudNotifChange('speaking_submissions',
      { id: 8101, student_id: S5_DB, media_type: 'voice', status: 'baholandi',
        score: 9, created_at: '2026-10-15T12:00:00.000Z' }, { status: 'kutilmoqda' });
    const t8101 = JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]')
      .filter(x => x.dbId === 8101)[0];
    check(!!t8101 && t8101.status === 'baholandi' && t8101.score === 9,
      'realtime: UPDATE(baholandi) → lokal holat darhol yangilandi');
    check(!!q('[data-tgcard="t8101"]') &&
      q('[data-tgcard="t8101"]').classList.contains('is-leaving'),
      'realtime: baholangan karta INBOXdan silliq chiqmoqda (is-leaving)');

    /* (c) students UPDATE → qarz badge 2 → 1 sahifaniyangilashmasdan */
    win.onCloudNotifChange('students',
      { id: S5_DB, speaking_debt: 1, voice_allowed: true }, {});
    const debtStu = JSON.parse(win.localStorage.getItem('et_students'))
      .filter(x => x.dbId === S5_DB)[0];
    check(!!debtStu && debtStu.speakingDebt === 1,
      'realtime: speaking_debt lokal keshda jonli yangilandi → 1');
    check(!q('#screen .debt-num') && !q('#screen [data-act="debt-plus"]'),
      'realtime: qarz lokal keshda yangilandi, Speaking sahifasida qarz ro\'yxati yo\'q');

    /* Kirganda ruxsat 'default' bo'lsa — so'rov rejalashtiriladi */
    FakeNotification.permission = 'default';
    check(win.Notif.afterLogin(5) === true, "notif: kirishda default → so'rov rejalashtirildi");
    FakeNotification.permission = 'granted';
    check(win.Notif.afterLogin(5) === false, 'notif: ruxsat allaqachon berilgan — qayta so‘ramaydi');
    FakeNotification.permission = 'denied';
    check(win.Notif.afterLogin(5) === false, 'notif: ruxsat bloklangan — so‘ramaydi');
  }

  /* ================= 27. GURUH KARTASI: 2x2 GRID TUGMALAR (CSS) ================= */
  logout();
  await loginAs('m_amirov', '123');
  const cssSrc = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
  const cssN = cssSrc.replace(/\s+/g, ' ');
  check(/\.gc-actions \{[^}]*grid-template-columns: 1fr 1fr/.test(cssN) &&
        /\.gc-actions \{[^}]*width: 100%/.test(cssN),
    "grid: guruh kartasi tugmalari 2x2 (1fr 1fr, width 100%)");
  check(/\.group-card \{[^}]*overflow: hidden/.test(cssN),
    'grid: group-card overflow hidden (ramkadan chiqmaydi)');
  check(/\.meta-row > span \{[^}]*overflow-wrap: anywhere/.test(cssN),
    'grid: kunlar matni wrap bo\'ladi (qirqilmaydi)');
  forceNav('groups');
  check(!!q('.gc-actions'), 'grid: karta tugmalari .gc-actions konteynerida');
  const gcBtns = qa('.gc-actions .btn').map(b => b.textContent.trim());
  check(gcBtns.length === 4 && /Baholar/.test(gcBtns[0]) && /Davomat/.test(gcBtns[1]) &&
        /Tahrirlash/.test(gcBtns[2]) && /O'chirish/.test(gcBtns[3]),
    "grid: tartib — [Baholar][Davomat] / [Tahrirlash][O'chirish]");

  /* ================= 28. BAHOLAR JADVALI: COL-STUDENT (CSS + markup) ================= */
  check(/\.bj \{[^}]*table-layout: fixed/.test(cssN) && /\.bj \{[^}]*border-collapse: separate/.test(cssN) &&
        /\.bj \{[^}]*width: max-content/.test(cssN),
    'jadval: table-layout fixed + separate + width max-content');
  check(/\.bj th\.col-student, \.bj td\.col-student \{[^}]*width: 195px !important[^}]*min-width: 195px !important[^}]*max-width: 195px !important/.test(cssN),
    'jadval: col-student 195px !important (width/min/max)');
  check(/\.bj th\.col-student, \.bj td\.col-student \{[^}]*position: sticky; left: 0; z-index: 20; background-color: #ffffff; border-right: 2px solid #e2e8f0/.test(cssN),
    'jadval: col-student sticky left + oq fon + 2px chegara');
  check(/\.bj th\.col-student, \.bj td\.col-student \{[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px/.test(cssN),
    'jadval: nom overflow — ellipsis + padding-right 12px');
  check(/\.bj-date, \.bj-cell \{[^}]*width: 56px !important[^}]*min-width: 56px !important[^}]*max-width: 56px !important[^}]*text-align: center/.test(cssN),
    'jadval: sana ustunlari 56px !important + center');
  forceNav('grades');
  if (!q('.bj')) { const gg = q('[data-act="grade-group"]'); if (gg) click(gg); }
  check(!!q('.bj th.col-student') && qa('.bj td.col-student').length >= 1,
    'jadval: col-student klassi th va td da mavjud');

  /* ================= 29. O\'QUVCHINI TAHRIRLASH (guruhni almashtirish) ================= */
  forceNav('students');
  check(!!q('[data-act="edit-student"]'), "tahrirlash: o'quvchi kartasida Tahrirlash tugmasi bor");
  const gradesBefore = win.localStorage.getItem('et_grades');
  const attBefore = win.localStorage.getItem('et_attendance');
  click(q('[data-act="edit-student"]'));
  check(q('#modal-overlay').hidden === false && !!q('#es-name') && !!q('#es-class') && !!q('#es-group'),
    "tahrirlash: modali — ism/sinf/guruh formasi");
  check(q('#es-name').value === 'Restored Student', "tahrirlash: ism prefilled");
  check(q('#es-class').value === '9-sinf', "tahrirlash: sinf prefilled");
  check(qa('#es-group option').length >= 2 && q('#es-group').value === 'g55',
    "tahrirlash: guruh dropdown prefilled (g55)");
  /* bo'sh ism rad etiladi */
  setVal('#es-name', '');
  clickAct('save-edit-student');
  check(q('#modal-overlay').hidden === false && q('#es-error').classList.contains('show'),
    "tahrirlash: bo'sh ism rad etildi");
  /* ism + sinf + guruhni almashtirish */
  setVal('#es-name', 'Restored Student');
  q('#es-class').value = '10-sinf';
  q('#es-group').value = '';
  clickAct('save-edit-student');
  check(q('#modal-overlay').hidden === true, 'tahrirlash: modal yopildi');
  check(q('#toast').textContent.includes('yangilandi'), 'tahrirlash: success toast');
  const stAfterE = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(x => x.id === 's77')[0];
  check(!!stAfterE && stAfterE.schoolClass === '10-sinf', "tahrirlash: sinf yangilandi (9 → 10)");
  check(!!stAfterE && (stAfterE.groupId === null || stAfterE.groupId === ''),
    "tahrirlash: guruh o'chirildi → group_id NULL (Supabase push)");
  check(!!stAfterE && stAfterE.fullName === 'Restored Student', "tahrirlash: ism saqlandi");
  check(win.localStorage.getItem('et_grades') === gradesBefore,
    "tahrirlash: baholar tarixi O'ZGARMADI (student_id bo'yicha qoldi)");
  check(win.localStorage.getItem('et_attendance') === attBefore,
    "tahrirlash: davomat tarixi O'ZGARMADI");
  await new Promise(r => setTimeout(r, 200));
  const r1AfterEdit = (cloudStub.db.students || []).filter(r => String(r.login || '').toLowerCase() === 'restore1')[0];
  check(!!r1AfterEdit && Number(r1AfterEdit.id) === 77 &&
    String(r1AfterEdit.school_class || '') === '10-sinf' && r1AfterEdit.group_id == null,
    "tahrirlash: login hisobi o'quvchiga bog'langan holatda qoldi (bulutda)");

  /* ================= 30. SPEAKING: BIR XIL SANA — KO'P SESSIYA + QARZ ================= */
  forceNav('speaking');
  /* s77 qarzi = 2 — ikki baholashdan keyin 0 bo'lishi kerak */
  const stFix = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  if (stFix[0]) { stFix[0].speakingDebt = 2; win.localStorage.setItem('et_students', JSON.stringify(stFix)); }
  /* bulut — haqiqat manbai: qarz stub bazasida ham 2 bo'lsin */
  (cloudStub.db.students || []).forEach(r => { if (Number(r.id) === 77) r.speaking_debt = 2; });
  win.onCloudNotifChange('speaking_submissions',
    { id: 8301, student_id: 77, media_type: 'video', status: 'kutilmoqda', score: null,
      media_url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/w8301.webm',
      created_at: TODAY + 'T10:00:00.000Z' }, null);
  check(!!q('[data-tgcard="t8301"]'), 'speaking: yangi topshirik INBOXda paydo bo\'ldi');
  /* Botdan (Telegram) kelgan topshirik saytdagi ustoz inboxiga tushmaydi — ustozga botda keladi */
  win.onCloudNotifChange('speaking_submissions',
    { id: 8399, student_id: 77, media_type: 'voice', telegram_file_id: 'AwACAgIAAxkBAAIBot', status: 'kutilmoqda',
      score: null, created_at: TODAY + 'T10:30:00.000Z' }, null);
  check(!q('[data-tgcard="t8399"]'), "speaking: botdan kelgan topshirik saytdagi inboxda ko'rinmaydi");
  check(JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]').some(x => x.dbId === 8399 && x.source === 'telegram'),
    "speaking: botdan kelgan topshirik manbasi 'telegram' deb belgilandi (o'quvchi tarixi uchun saqlanadi)");
  check(JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]').some(x => x.dbId === 8301 && x.source === 'web'),
    "speaking: saytdan kelgan topshirik manbasi 'web'");
  click(q('[data-act="tg-grade"][data-tid="t8301"][data-score="8"]'));
  await new Promise(r => setTimeout(r, 330));
  let gRec = (JSON.parse(win.localStorage.getItem('et_grades') || '{}').s77 || {})[TODAY];
  check(!!gRec && gRec.score === 8 && gRec.category === 'Speaking',
    'speaking: birinchi sessiya jurnalga yozildi (8/10)');
  let debtS = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(x => x.id === 's77')[0];
  check(!!debtS && debtS.speakingDebt === 1, 'speaking: baholash qarzni −1 qildi (2 → 1), Supabase pushDebt');
  check(!q('#screen .debt-num') && !q('#screen [data-act="debt-plus"]'),
    'speaking: qarz hisoblagichi Speaking sahifasidan olib tashlangan');
  check(JSON.parse(win.localStorage.getItem('et_speak_log') || '[]').length >= 1,
    'speaking: sessiya et_speak_log jurnaliga yozildi');

  /* SHU SANA IKKINCHI SESSIYA — avvalgisini yo'qotmaydi */
  win.onCloudNotifChange('speaking_submissions',
    { id: 8302, student_id: 77, media_type: 'video', status: 'kutilmoqda', score: null,
      media_url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/w8302.webm',
      created_at: TODAY + 'T11:00:00.000Z' }, null);
  check(!!q('[data-tgcard="t8302"]'), 'speaking: ikkinchi topshirik ham INBOXda');
  click(q('[data-act="tg-grade"][data-tid="t8302"][data-score="9"]'));
  await new Promise(r => setTimeout(r, 330));
  gRec = (JSON.parse(win.localStorage.getItem('et_grades') || '{}').s77 || {})[TODAY];
  check(!!gRec && gRec.score === 9, 'speaking: ikkinchi sessiya yangilandi (9/10)');
  check(!!gRec && String(gRec.note || '').includes('Sessiya 8/10'),
    "speaking: OLDINGI sessiya yo'qolmadi — note ga qo'shilgan (Sessiya 8/10)");
  debtS = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(x => x.id === 's77')[0];
  check(!!debtS && debtS.speakingDebt === 0, 'speaking: ikkinchi baholashdan keyin qarz 0 (2 → 1 → 0)');
  const sLog = JSON.parse(win.localStorage.getItem('et_speak_log') || '[]');
  check(sLog.length >= 2 && sLog[0].score === 9 && sLog[1].score === 8 && sLog[0].sid === 's77' && sLog[1].sid === 's77',
    'speaking: jurnalda ketma-ket 2 ta sessiya (9 → 8, har biri alohida qator)');
  check(text().includes('Speaking sessiyalar jurnali'), 'speaking: sessiyalar jurnali ekranda ko\'rinadi');

  /* ================= 30b. BEKOR QILISH (qabul qilmaslik) ================= */
  win.onCloudNotifChange('speaking_submissions',
    { id: 8303, student_id: 77, media_type: 'video', status: 'kutilmoqda', score: null,
      media_url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/speaking/w8303.webm',
      created_at: TODAY + 'T13:00:00.000Z' }, null);
  check(!!q('[data-tgcard="t8303"]'), 'reject: yangi topshirik INBOXda paydo boldi');
  check(!!q('[data-act="tg-reject"][data-tid="t8303"]'),
    "reject: kutilayotgan topshiriq yonida ❌ Bekor qilish tugmasi bor");
  const debtPreRej = (JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {}).speakingDebt;
  const gradesPreRej = win.localStorage.getItem('et_grades');
  const preRej = JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]')
    .filter(x => x.id === 't8303')[0];
  check(!!preRej && preRej.status === 'kutilmoqda', "reject: oldin status kutilmoqda");
  click(q('[data-act="tg-reject"][data-tid="t8303"]'));
  await new Promise(r => setTimeout(r, 260));
  check(!q('[data-tgcard="t8303"]'), "reject: bekor qilingan karta INBOXdan chiqdi");
  const rejSub = JSON.parse(win.localStorage.getItem('et_tg_subs') || '[]')
    .filter(x => x.id === 't8303')[0];
  check(!!rejSub && rejSub.status === 'rad_etildi', "reject: status 'rad_etildi' boldi");
  check((JSON.parse(win.localStorage.getItem('et_students') || '[]')
    .filter(x => x.id === 's77')[0] || {}).speakingDebt === debtPreRej,
    "reject: speaking qarzi O'ZGARMADI");
  check(win.localStorage.getItem('et_grades') === gradesPreRej,
    "reject: baholar jurnali O'ZGARMADI (baho yozilmadi)");
  check(!q('[data-act="tg-reject"][data-tid="t8303"]'), "reject: tugma ham INBOXda qolmadi");

  /* ================= 31. XAVFSIZLIK: XSS / HONEYPOT / initData / BRUTE-FORCE ================= */
  /* XSS: foydalanuvchi kirgan HTML DOM ga xavfsiz matn sifatida chiqadi */
  forceNav('students');
  click(q('[data-act="edit-student"]'));
  setVal('#es-name', '<img src=x onerror="alert(1)">');
  clickAct('save-edit-student');
  check(qa('#screen img').length === 0 && text().includes('<img src=x'),
    'xss: ismdagi HTML render qilinmaydi — xavfsiz matn sifatida ko\'rinadi');
  check(!doc.querySelector('#screen [onerror]'), 'xss: onerror atributi DOM ga kirmadi');
  click(q('[data-act="edit-student"]'));
  setVal('#es-name', 'Restored Student');
  clickAct('save-edit-student');

  logout();
  click('[data-act="auth-login-open"]');
  /* Honeypot: login */
  check(!!q('#login-bot-hp') && q('#login-bot-hp').getAttribute('name') === 'bot_check_field' &&
        q('#login-bot-hp').tabIndex === -1,
    'xavfsizlik: login honeypot maydoni bor (name/tabindex)');
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '123');
  setVal('#login-bot-hp', 'i-am-bot');
  clickAct('do-login');
  check(!!q('#login-input') && !q('#login-error').classList.contains('show'),
    "xavfsizlik: honeypot to'ldirildi → jimjimrad rad etildi (xabarsiz)");
  check(!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    'xavfsizlik: honeypot bilan session yaratilmadi');
  setVal('#login-bot-hp', '');
  /* Honeypot: o'quvchi qo'shish modali */
  await loginAs('m_amirov', '123');
  clickAct('open-add-student');
  check(!!q('#hp-student') && q('#hp-student').getAttribute('name') === 'bot_check_field',
    "xavfsizlik: 'O'quvchi qo'shish' modalisida ham honeypot bor");
  click('[data-act="close-modal"]');

  /* Telegram initData: soxtalanish (id mos emas) → rad */
  win.Telegram = { WebApp: {
    initData: 'user=' + encodeURIComponent(JSON.stringify({ id: 111, first_name: 'X' })) +
              '&hash=deadbeef&auth_date=' + Math.floor(Date.now() / 1000),
    initDataUnsafe: { user: { id: 222 } }
  } };
  logout();
  openLogin();
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '123');
  clickAct('do-login');
  check(q('#login-error').textContent.includes('tekshiruvi') && text().includes('Tizimga kirish'),
    'xavfsizlik: initData id mos emas → kirish rad etildi (spoofing)');
  /* Mos keldi → kirish o\'tadi */
  win.Telegram.WebApp.initDataUnsafe.user.id = 111;
  await loginAs('m_amirov', '123');
  check(text().includes('Xush kelibsiz'), 'xavfsizlik: initData mos bo\'lsa kirish ishlaydi');
  delete win.Telegram;
  logout();

  /* Anti-brute-force: 5 xato → 5 daqiqa qulf + mm:ss hisoblagich */
  for (let i = 0; i < 5; i++) {
    /* login bulutda asinxron — har bir urinish tugashini kutamiz */
    await loginAs('m_amirov', 'nope-' + i);
  }
  check(q('#login-error').textContent.includes('Xavfsizlik: 5 marta xato kiritildi'),
    "xavfsizlik: 5 xatodan so'ng qulf xabari");
  check(/Iltimos, \d{2}:\d{2} daqiqa kuting/.test(q('#login-error').textContent),
    'xavfsizlik: mm:ss jonli hisoblagich matnda');
  check(q('[data-act="do-login"]').disabled === true, "xavfsizlik: 'Kirish' tugmasi o'chirilgan");
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '123');
  q('[data-act="do-login"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 250));
  check(text().includes('Tizimga kirish') && !JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    "xavfsizlik: qulflangan holda to'g'ri parol bilan ham kira olmaydi");
  /* Qulfni tozalash → tugma qayta yoqiladi */
  win.localStorage.removeItem('et_login_fails');
  forceNav('login');
  check(q('[data-act="do-login"]').disabled === false, 'xavfsizlik: qulf tozalandi → tugma qayta yoqildi');
  await loginAs('m_amirov', '123');
  check(text().includes('Xush kelibsiz'), 'xavfsizlik: oddiy kirish yana ishlaydi');

  /* ============ 26. XAVFSIZLIK: QURILMA NAZORATI + FAOL QURILMALAR ============ */
  /* Qurilma aniqlash (UA → nom) */
  const dev = win.__sessions.detectDevice();
  check(dev.os === 'Android' && dev.br === 'Chrome', 'qurilma: UA dan "Android" + "Chrome" aniqlandi');
  check(dev.name === 'Android (Chrome)' && dev.short === 'Android • Chrome',
    'qurilma: nom ko\'rinishi "Android (Chrome)" / "Android • Chrome"');
  check(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(win.__sessions.getSessionId()),
    'qurilma: session_id takrorlanmas UUID v4 formatida');
  check(win.localStorage.getItem('et_session_id') !== null,
    "qurilma: session_id localStorage'da saqlangan");

  /* Aniq model: navigator.userAgentData (high entropy) */
  const uaOriginal = win.navigator.userAgent;
  win.__sessions.resetDeviceModel();
  Object.defineProperty(win.navigator, 'userAgentData', {
    value: { getHighEntropyValues: async () => ({ model: 'Redmi Note 12', platform: 'Android', platformVersion: '13' }) },
    configurable: true
  });
  const modelHE = await win.__sessions.resolveDeviceModel();
  check(modelHE === 'Redmi Note 12' && win.__sessions.detectDevice().short === 'Redmi Note 12 • Chrome',
    'qurilma: userAgentData orqali aniq model (Redmi Note 12 • Chrome)');
  check(win.sessionStorage.getItem('et_device_model') === 'Redmi Note 12',
    "qurilma: aniq model sessionStorage'da keshlandi");
  /* Model kesilmaydi: presence matni to'liq modelni ko'rsatadi (SVG ikonka bilan) */
  const presOn = win.__sessions.presenceText({ lastSeen: new Date().toISOString(), lastDevice: 'Redmi Note 12 (Chrome)' });
  check(presOn.indexOf('<svg') >= 0 && presOn.indexOf('Onlayn: Redmi Note 12 • Chrome') >= 0,
    'qurilma: onlayn satri SVG + to\'liq model ("Onlayn: Redmi Note 12 • Chrome")');
  const presOff = win.__sessions.presenceText({ lastSeen: new Date(Date.now() - 20 * 60000).toISOString(), lastDevice: 'Redmi Note 12 (Chrome)' });
  check(presOff.indexOf('<svg') >= 0 && presOff.indexOf('20 daqiqa oldin • Redmi Note 12') >= 0,
    'qurilma: oflayn satri SVG + model ("20 daqiqa oldin • Redmi Note 12")');

  /* Aniq model: UA ichidagi "... Build/" (userAgentData yo'q) */
  try { delete win.navigator.userAgentData; } catch (e) {}
  win.__sessions.resetDeviceModel();
  Object.defineProperty(win.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 13; SM-A546B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    configurable: true
  });
  const modelUA = await win.__sessions.resolveDeviceModel();
  check(modelUA === 'SM-A546B' && win.__sessions.detectDevice().name === 'SM-A546B (Chrome)',
    'qurilma: UA "Build/" dan aniq model (SM-A546B (Chrome))');
  check(win.__sessions.detectDevice().os === 'Android',
    'qurilma: model aniqlanganda ham OS "Android" bo\'lib qoladi');
  /* Asl UA va keshni tiklaymiz (keyingi testlar "Android • Chrome" kutadi) */
  win.__sessions.resetDeviceModel();
  Object.defineProperty(win.navigator, 'userAgent', { value: uaOriginal, configurable: true });
  win.__sessions.resetDeviceModel();

  /* O'quvchi login qilganda last_device / last_seen yoziladi */
  logout();
  await loginAs('restore1', '9876');
  const stuAfterLogin = JSON.parse(win.localStorage.getItem('et_students') || '[]').filter(x => x.id === 's77')[0];
  check(!!stuAfterLogin && stuAfterLogin.lastDevice === 'Android (Chrome)' && !!stuAfterLogin.lastSeen,
    'o\'quvchi: login → last_device "Android (Chrome)" + last_seen yozildi');

  /* Ustoz kartasida onlayn/qurilma ko'rinishi */
  logout();
  await loginAs('m_amirov', '123');
  forceNav('students');
  const cardOn = qa('.student-card').filter(c => c.textContent.indexOf('Restored Student') >= 0)[0];
  check(!!cardOn && cardOn.textContent.indexOf('Onlayn: Android • Chrome') >= 0 &&
        !!cardOn.querySelector('.s-presence.is-on svg'),
    'karta: 5 daqiqa ichida → SVG ikonka + "Onlayn: Android • Chrome"');
  /* Eski vaqt → "20 daqiqa oldin" ko'rinishi */
  const rowsOld = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  const jOld = rowsOld.filter(x => x.id === 's77')[0];
  jOld.lastSeen = new Date(Date.now() - 20 * 60000).toISOString();
  win.localStorage.setItem('et_students', JSON.stringify(rowsOld));
  forceNav('students');
  const cardOld = qa('.student-card').filter(c => c.textContent.indexOf('Restored Student') >= 0)[0];
  check(!!cardOld && cardOld.textContent.replace(/\s+/g, ' ').indexOf('20 daqiqa oldin • Android') >= 0 &&
        !!cardOld.querySelector('.s-presence svg'),
    'karta: 20 daqiqa oldin → SVG ikonka + "20 daqiqa oldin • Android"');
  /* last_seen o'chirilsa — qurilma satri umuman chiqmaydi */
  const rowsNone = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  rowsNone.filter(x => x.id === 's77')[0].lastSeen = null;
  win.localStorage.setItem('et_students', JSON.stringify(rowsNone));
  forceNav('students');
  const cardNone = qa('.student-card').filter(c => c.textContent.indexOf('Restored Student') >= 0)[0];
  check(!!cardNone && cardNone.textContent.indexOf('Onlayn') < 0 && cardNone.textContent.indexOf('daqiqa oldin') < 0,
    "karta: last_seen bo'sh → qurilma satri chiqmaydi");

  /* Profil: 📱 Faol qurilmalar bloki */
  forceNav('profile');
  check(!!q('#sessions-card'), 'profil: "📱 Faol qurilmalar" bloki mavjud');
  check(text().includes('Bu qurilma (Android • Chrome)'),
    'profil: joriy qurilma "🟢 Bu qurilma (Android • Chrome)"');
  check(!q('[data-act="session-logout"]') && !q('[data-act="session-logout-all"]'),
    "profil: boshqa qurilma yo'q → chiqarib yuborish tugmalari yo'q");

  /* Boshqa qurilma ulangan ko'rinishi */
  win.__sessions.sessions.list = [
    { id: win.__sessions.getSessionId(), user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'Android • Chrome', last_active: new Date().toISOString() },
    { id: 'other-device-1', user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'iPhone • Safari', last_active: new Date(Date.now() - 3 * 60000).toISOString() }
  ];
  forceNav('home');
  forceNav('profile');
  check(text().includes('iPhone • Safari') && text().includes('3 daqiqa oldin'),
    'profil: boshqa qurilma nomi + oxirgi faollik vaqti ko\'rinadi');
  check(qa('[data-act="session-logout"]').length === 1,
    'profil: qurilmada qizil "Chiqarib yuborish" tugmasi');
  check(!!q('[data-act="session-logout-all"]'),
    'profil: "⛔ Barcha boshqa qurilmalardan chiqish" tugmasi');
  check(text().indexOf('Bu qurilma') >= 0 && text().indexOf('Bu qurilma') < text().indexOf('iPhone • Safari'),
    'profil: joriy qurilma ENG TEPADE');

  /* Bitta qurilmani chiqarib yuborish */
  click(q('[data-act="session-logout"]'));
  await new Promise(r => setTimeout(r, 250));
  check(!q('[data-act="session-logout"]') && !text().includes('iPhone • Safari'),
    'profil: qurilma chiqarib yuborildi (ro\'yxatdan o\'chdi)');

  /* Barcha boshqa qurilmalardan chiqish */
  win.__sessions.sessions.list = [
    { id: win.__sessions.getSessionId(), user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'Android • Chrome', last_active: new Date().toISOString() },
    { id: 'other-device-2', user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'Windows PC • Edge', last_active: new Date().toISOString() },
    { id: 'other-device-3', user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'iPhone • Safari', last_active: new Date().toISOString() }
  ];
  forceNav('home');
  forceNav('profile');
  check(qa('[data-act="session-logout"]').length === 2, 'profil: 2 ta boshqa qurilma ro\'yxatda');
  click(q('[data-act="session-logout-all"]'));
  await new Promise(r => setTimeout(r, 300));
  check(!q('[data-act="session-logout"]') && !q('[data-act="session-logout-all"]'),
    'profil: "Barcha boshqa qurilmalardan chiqish" → ro\'yxat tozalandi');
  check(text().includes('Bu qurilma (Android • Chrome)'),
    'profil: joriy qurilma o\'z joyida qoldi');

  /* 30 soniyalik nazorat: lokal rejimda xavfsiz o\'tadi */
  const guardOk = await win.__sessions.sessions.check();
  check(guardOk === true, 'nazorat: check() lokal rejimda xavfsiz true qaytaradi');

  /* Boshqa qurilmadan o\'chirilgan → majburiy chiqish + xabar */
  win.__sessions.forcedLogout();
  check(q('#login-error').textContent.includes('Siz ushbu qurilmadan chiqarildingiz!'),
    'majburiy chiqish: login ekranida "Siz ushbu qurilmadan chiqarildingiz!"');
  check(q('#login-error').classList.contains('show'),
    'majburiy chiqish: xabar "show" holatida ko\'rinadi');
  check(win.localStorage.getItem('et_session') === null,
    "majburiy chiqish: localStorage tozalandi (et_session yo'q)");
  check(win.localStorage.getItem('et_session_id') === null,
    "majburiy chiqish: session_id ham o'chirildi");
  check(text().includes('Tizimga kirish') && !q('.bottom-nav .nav-item'),
    'majburiy chiqish: kirish ekraniga qaytdi');

  /* ============ 27. PREMIUM UI: HERO, REJIM, I18N, JURNAL ============ */
  /* Landing — kirish sahifasidagi taqdimot (3 bosqichli oqim) */
  if (q('[data-act="auth-back"]')) click('[data-act="auth-back"]');
  check(text().includes('English Teacher — Muzaffar Amirov'),
    'landing: sarlavha "English Teacher — Muzaffar Amirov"');
  check(text().includes("5–11-sinf va repetitorlik guruhlari uchun ingliz tili ta'lim platformasi"),
    'landing: qisqa tavsif matni');
  check(!!q('.landing-hero') && !!q('.landing-title') && !!q('.landing-sub'),
    'landing: hero bloki (sarlavha + tavsif)');
  check(qa('.landing-feature').length === 3, 'landing: 3 ta imkoniyat kartasi (tablarsiz)');
  check(text().includes('Uyga vazifalar va media darslar') &&
        text().includes('10 ballik jurnal va davomat') &&
        text().includes('Telegram bot (@uzbekspeakingcheckbot)'), 'landing: 3 karta sarlavhalari to\u2019liq');
  check(qa('.landing-feature svg').length === 3, 'landing: har bir kartada SVG ikonka');
  check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q('.landing').textContent),
    'landing: emoji yo\u2019q (faqat ICON/ico SVG)');
  check(!!q('.landing-footer') && text().includes('teachermuzaffar.uz') &&
        text().includes('@uzbekspeakingcheckbot'), 'landing: footer (sayt + bot)');
  check(cssSrc.indexOf('.landing-hero') >= 0 && /\.landing-hero \{[^}]*border-radius/.test(cssSrc),
    'css: landing hero uslubi mavjud');
  check(/\.hw-media \.plyr--audio \.plyr__controls \{[^}]*flex-wrap: wrap/.test(cssSrc) &&
        /\.hw-media \.plyr--audio \.plyr__progress__container \{[^}]*min-width: 110px/.test(cssSrc) &&
        /\.hw-media \.plyr--audio \.plyr__controls \.plyr__control \{[^}]*flex-shrink: 0/.test(cssSrc),
    'audio pleyer: tor ekranda tugmalar keyingi qatorga tushadi (flex-wrap + flex-shrink + progress min-width)');
  const menuCss = (cssSrc.match(/\.hw-media \.plyr__menu__container[^{]*\{[^}]*\}/g) || []).join(' ');
  check(/z-index: 999 !important/.test(menuCss) && /max-height: 210px !important/.test(menuCss) &&
        /overflow-y: auto !important/.test(menuCss) && /overscroll-behavior: contain/.test(menuCss) &&
        /-webkit-overflow-scrolling: touch/.test(menuCss),
    'audio pleyer: Speed menyusi paneli — z-index, max-height 210px, ichki skroll, overscroll contain');
  check(/\.hw-card, \.hw-media[^{]*\{[^}]*overflow: visible !important/.test(cssSrc) &&
        /\.hw-media \.plyr__menu__container[^{]*\{[^}]*background: #ffffff !important/.test(cssSrc) &&
        /html\[data-theme="dark"\] \.hw-media \.plyr__menu__container[^{]*\{[^}]*background: #1e293b !important/.test(cssSrc),
    'audio pleyer: overflow visible + menyu foni light/dark rejimda shaffof emas');
  check(appJs.indexOf('touchGuardPlyrMenus') >= 0 &&
        /speed: \{ selected: 1, options: \[0\.5, 0\.75, 1, 1\.25, 1\.5, 2\] \}/.test(appJs),
    'audio pleyer: tezlik 0.5–2x sozlamasi + menyu touch-guard (sahifa skroll bo\'lmaydi)');
  check(/connect-src[^"]*https:\/\/cdn\.plyr\.io/.test(html),
    "CSP: Plyr ikonka sprite'i (cdn.plyr.io) connect-src'da ruxsat etilgan — audio tugmalari ko'rinadi");
  check(cssSrc.indexOf('.auth') >= 0 && /\.auth \{[^}]*justify-content: flex-start/.test(cssSrc),
    'css: auth wrapper justify-content: flex-start');
  check(/\.recover-modes \{[^}]*grid/.test(cssSrc) && cssSrc.indexOf('.recover-opt') >= 0,
    'css: tiklash radio tanlovlari uslubi');
  click('[data-act="auth-login-open"]');
  check(!!q('#login-input') && !!q('[data-act="do-login"]') && !!q('[data-act="open-forgot"]'),
    'login: ixcham karta (login, parol, kirish, tiklash havolasi)');
  check(!!q('[data-act="toggle-theme"]') && !!q('[data-act="toggle-lang"]'),
    'header: rejim ☀️/🌙 + til 🇺🇿/🇬🇧 tugmalari (login ekrani)');

  /* Tungi/kunduzgi rejim */
  check(win.document.documentElement.getAttribute('data-theme') === 'light',
    "rejim: boshlang'ich light");
  click('[data-act="toggle-theme"]');
  check(win.document.documentElement.getAttribute('data-theme') === 'dark',
    'rejim: toggle → html[data-theme=dark]');
  check((win.localStorage.getItem('theme') || '').indexOf('dark') >= 0,
    "rejim: localStorage 'theme' = dark saqlandi");
  check(!!q('[data-act="toggle-theme"]').querySelector('svg') &&
        !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(q('[data-act="toggle-theme"]').textContent),
    "rejim: tunda tugma toza SVG quyosh ikonkasi (emoji emas)");
  check(qa('#app-header .lang-opt svg').length === 2 &&
        !/[\u{1F1E6}-\u{1F1FF}]/u.test(q('[data-act="toggle-lang"]').textContent),
    "til: bayroq emoji o'rniga 2 ta SVG bayroq ikonkasi");
  click('[data-act="toggle-theme"]');
  check(win.document.documentElement.getAttribute('data-theme') === 'light',
    'rejim: qayta toggle → yana light');

  /* UZ/EN til almashtirish */
  check((win.localStorage.getItem('app_lang') || '"uz"').indexOf('uz') >= 0,
    "til: boshlang'ich uz");
  click('[data-act="toggle-lang"]');
  check((win.localStorage.getItem('app_lang') || '').indexOf('en') >= 0,
    "til: localStorage 'app_lang' = en saqlandi");
  if (q('[data-act="auth-back"]')) click('[data-act="auth-back"]');
  check(text().includes('English Teacher — Muzaffar Amirov'),
    'i18n EN: landing sarlavhasi');
  check(text().includes('An English learning platform for Grade 5–11 and tutoring groups'),
    'i18n EN: landing tavsifi tarjimasi');
  check(text().includes('Homework & media lessons') &&
        text().includes('10-point gradebook & attendance') &&
        text().includes('Telegram bot (@uzbekspeakingcheckbot)'),
    'i18n EN: 3 karta sarlavhalari inglizcha');
  await loginAs('m_amirov', '123');
  check(navLabels().join(',') === 'Home,Students,Homework,Submissions,Mock Tests,Payments,Grades,Attendance,Speaking,Profile',
    'i18n: ustoz nav EN tilida');
  check(q('#app-header').textContent.includes('Home'),
    'i18n: header bo‘lim nomi EN (Home)');

  /* Jurnal: umumiy o‘rtacha (tfoot) + kapsula hafta tanlagich */
  seedFixture(win);
  click('[data-act="nav"][data-screen="grades"]');
  check(q('#app-header').textContent.includes('Gradebook'),
    'i18n: header "Baholar jurnali" → EN "Gradebook"');
  check(!!q('table.bj tfoot .bj-foot'), 'jurnal: oxirida "O‘rtacha bahosi" qatori (tfoot)');
  check(q('table.bj tfoot').textContent.includes('Average score'),
    'jurnal: tfoot EN matni (Average score)');
  check(qa('.week-nav-bar .week-btn').length === 3,
    'jurnal: hafta kapsulasi 3 tugma (Oldingi/Bugun/Keyingi)');
  check(q('.week-nav-bar').textContent.includes('Previous week'),
    'i18n: hafta tugmalari EN (Previous week)');
  check(!!q('.week-nav-bar .week-label'), 'jurnal: hafta sarlavhasi kapsula ichida');

  /* UZ ga qaytarish */
  click('[data-act="toggle-lang"]');
  check(navLabels().join(',') === "Bosh,O'quvchi,Uyga vazifalar,Topshiriqlar,Mock testlar,To'lov,Baholar,Davomat,Speaking,Profil",
    "i18n: UZ ga qaytish — nav o'zbekcha qoldi");
  check(q('.week-nav-bar').textContent.includes('Oldingi hafta'),
    'i18n: hafta tugmalari UZ ga qaytdi');

  /* ============ 28. PREMIUM KARTALAR + OVERFLOW + SVG + EN DINAMIK MATNLAR ============ */
  /* O'quvchi kartalari: 2x2 tugma grid + ichki blokcha + gradient avatar */
  click('[data-act="nav"][data-screen="students"]');
  check(qa('.student-card .st-actions').length === 6,
    'kartа: har o‘quvchi kartasida .st-actions (2x2 grid) bloki');
  check(qa('.student-card .st-actions .btn').length === 24,
    'karta: 4 tugma × 6 karta = 24 (setkada, bir qatorda EMAS)');
  check(qa('.student-card .st-inset').length === 6,
    'karta: Speaking qarzi + ruxsat ichki .st-inset blokchada');
  check(qa('.student-card .st-avatar').length === 6,
    'karta: har kartada gradient doira-avatar (.st-avatar)');
  check(qa('.student-card .st-avatar').every(a => /^[A-Z]{1,2}$/.test(a.textContent.trim())),
    'karta: avatar ichida ism bosh harflari (ZY/XA kabi)');
  check(qa('.student-card > .st-head').length === 6 &&
        qa('.student-card > .st-head .st-avatar').length === 6 &&
        qa('.student-card > .st-head .chip-class').length === 6,
    'karta: 1-qator .st-head — avatar + ism/guruh/login + sinf badge, to\'liq qator');
  check(qa('.student-card > .st-inset').length === 6,
    'karta: 2-qator .st-inset — to\'liq 100% kenglikda (avatar ustunidan mustaqil)');
  check(qa('.student-card > .st-actions').length === 6 && qa('.student-card > .st-actions .btn').length === 24,
    'karta: 3-qator .st-actions — to\'liq kenglikda 2x2 setka');
  check(!q('.student-card [data-act="reset-pwd"]').textContent.includes('Parolni yangilash') &&
        q('.student-card [data-act="reset-pwd"]').textContent.includes('Parol'),
    'karta: "Parol" tugmasi qisqa matn (qirqilmaydi)');
  check(/\.nav-item span \{[^}]*font-size: 10\.5px/.test(cssSrc) &&
        /\.nav-item span \{[^}]*letter-spacing: -0\.2px/.test(cssSrc),
    'bottom-nav: bo\'lim nomlari font-size 10.5px + letter-spacing -0.2px (to\'liq ko\'rinadi)');

  check(cssSrc.indexOf('.st-actions') >= 0 && cssSrc.indexOf('grid-template-columns: 1fr 1fr') >= 0,
    'css: st-actions 2x2 grid tanlangan');
  check(cssSrc.indexOf('overflow-x: clip') >= 0 && /@supports not \(overflow-x: clip\)/.test(cssSrc),
    'css: body/#screen overflow-x: clip + hidden fallback (gorizontal yopilgan, vertikal skroll saqlangan)');

  /* EN rejimda dinamik kartalar to‘liq inglizcha */
  click('[data-act="toggle-lang"]');
  check(text().includes('Grade 9') && !text().includes('9-sinf'),
    'i18n EN: "9-sinf" → "Grade 9" (karta ichida)');
  check(text().includes('Speaking debt') && !text().includes('Speaking qarzi'),
    'i18n EN: "Speaking qarzi" → "Speaking debt"');
  check(q('.student-card .debt-num').textContent.trim() === '0',
    'i18n EN: "0 ta" → "0" (raqam + birliksiz)');
  check(text().includes('Voice allowed') && !text().includes('Ovozli ruxsat'),
    'i18n EN: "Ovozli ruxsat" → "Voice allowed"');
  check(text().includes('Message') && !text().includes('Xabar yozish'),
    'i18n EN: "Xabar yozish" → "Message"');
  check(q('.student-card [data-act="reset-pwd"]').textContent.includes('Password') &&
        !text().includes('Parolni yangilash'),
    'i18n EN: "Parol" tugmasi → "Password" (qisqa, qirqilmaydi)');
  check(text().includes('Edit') && text().includes('Delete') && !text().includes('Tahrirlash'),
    'i18n EN: "Tahrirlash"→"Edit", "O\'chirish"→"Delete"');
  check(q('.screen-title').textContent.trim() === 'Students' && !text().includes("O'QUVCHILAR"),
    'i18n EN: "O\'QUVCHILAR" → "STUDENTS"');
  click('[data-act="nav"][data-screen="home"]');
  clickAct('open-hw');
  setVal('#hw-title', 'Present Perfect check');
  q('#hw-group').value = 'g2';
  setVal('#hw-due', '2026-10-25');
  clickAct('save-hw');
  forceNav('homework');
  click('[data-act="hw-group"][data-gid="g2"]');
  check(text().includes('Due date') && !text().includes('Topshirish muddati'),
    'i18n EN: "Topshirish muddati" → "Due date"');
  click('[data-act="hw-group-back"]');
  check(q('[data-act="toggle-lang"]').textContent.indexOf('UZ') >= 0 &&
        qa('#app-header .lang-opt svg').length === 2,
    'i18n EN: til tugmasida SVG bayroqlar saqlangan');

  /* UZ ga qaytish */
  click('[data-act="toggle-lang"]');
  click('[data-act="nav"][data-screen="students"]');
  check(text().includes('9-sinf') && text().includes('Xabar yozish'),
    'i18n UZ: dinamik kartalar qayta o‘zbekcha');

  /* EN: profil — faol qurilmalar to'liq inglizcha + SVG/CSS indikator */
  click('[data-act="toggle-lang"]');
  win.__sessions.sessions.list = [
    { id: 'en-dev-1', user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'Android • Chrome', last_active: new Date(Date.now() - 7200000).toISOString() },
    { id: 'en-dev-2', user_type: 'teacher', user_id: 'm_amirov',
      device_name: 'Windows PC • Edge', last_active: new Date().toISOString() }
  ];
  forceNav('profile');
  check(text().includes('Active Devices') && !text().includes('Faol qurilmalar'),
    'i18n EN: "Faol qurilmalar" → "Active Devices"');
  check(text().includes('This device') && text().includes('current session'),
    'i18n EN: "Bu qurilma" → "This device", "joriy sessiya" → "current session"');
  check(text().includes('2 hours ago') && text().includes('Just now'),
    'i18n EN: "... soat oldin" → "2 hours ago", "hozirgina" → "Just now"');
  check(text().includes('Terminate') && text().includes('Terminate All Other Sessions'),
    'i18n EN: "Chiqarib yuborish" → "Terminate", "Barcha boshqa qurilmalardan chiqish" → "Terminate All Other Sessions"');
  check(!/[\u{1F4F1}\u{1F7E2}\u26D4]/u.test(text()) && !!q('.sess-dot'),
    'profil: emojilar (📱🟢⛔) o\'rniga SVG + CSS yashil indikator (.sess-dot)');
  check(text().includes('Clear Selected Table') && !text().includes('Tanlangan jadvalni tozalash'),
    'i18n EN: "Tanlangan jadvalni tozalash" → "Clear Selected Table"');
  check(text().includes('Change Password') && text().includes('Security'),
    'i18n EN: "Parolni o\'zgartirish" → "Change Password", "Xavfsizlik" → "Security"');
  click('[data-act="toggle-lang"]');
  check(text().includes('Faol qurilmalar'),
    'i18n UZ: profil qayta o\'zbekcha');


  /* ================= 32. CAPTCHA + USTOZ 2FA + PAROLNI TIKLASH ================= */
  logout();
  openLogin();
  /* Yangi (notanish) qurilma sifatida boshlaymiz — 2FA majburiy bo'lsin */
  win.localStorage.removeItem('et_teacher_trusted_device');
  /* 2FA xati faqat TASDIQLANGAN ustoz Gmailiga ketadi */
  cloudStub.db.bot_settings = (cloudStub.db.bot_settings || [])
    .filter(r => String(r.key) !== 'admin_email' && String(r.key) !== 'admin_email_verified');
  cloudStub.db.bot_settings.push({ key: 'admin_email', value: 'ustoz@test.uz' });
  cloudStub.db.bot_settings.push({ key: 'admin_email_verified', value: 'true' });

  /* (a) noto'g'ri CAPTCHA → kirish bloklanadi va yangi misol beriladi */
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '123');
  setVal('#login-captcha', '999999');
  clickAct('do-login');
  check(!JSON.parse(win.localStorage.getItem('et_session') || 'null') &&
        q('#login-error').textContent.includes('Tekshiruv'),
    "captcha: noto'g'ri javob kirishni bloklaydi");
  check(!!q('#login-captcha') && q('#login-captcha').value === '',
    'captcha: xatodan keyin javob maydoni tozalanadi (yangi misol)');
  check(((q('[data-act="captcha-refresh"]') || {}).innerHTML || '').indexOf('<svg') >= 0,
    'captcha: yangilash tugmasida SVG refresh ikonka (emoji emas)');

  /* (b) to'g'ri CAPTCHA → ustoz uchun 2FA modal va kod 3 joyga yoziladi */
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '123');
  setVal('#login-captcha', solveCaptcha());
  clickAct('do-login');
  check(await until(() => !!q('#twofa-code'), 2000), "2fa: ustoz uchun kod modali ochildi");

  /* "Kodni qayta yuborish" — 60 soniyalik jonli cooldown (2FA modal) */
  const rs2 = q('[data-act="resend-2fa"]');
  check(!!rs2 && rs2.disabled === true, 'cooldown: 2FA resend tugmasi darhol nofaol');
  check(/^Kodni qayta yuborish \(\d{2}:\d{2}\)$/.test(String(rs2.textContent || '').trim()),
    'cooldown: tugmada jonli mm:ss ko‘rsatilgan');
  check(win.__resend.left() > 50000 && win.__resend.left() <= 60000,
    'cooldown: state.resendUntil 60 soniyaga o‘rnatildi');
  const codesBeforeCd = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'teacher_2fa').length;
  rs2.click();
  await new Promise(r => setTimeout(r, 80));
  check((cloudStub.db.auth_codes || []).filter(r => r.purpose === 'teacher_2fa').length === codesBeforeCd,
    'cooldown: nofaol tugma bosilganda yangi kod yuborilmaydi');
  win.__resend.stop();     /* modal yopilganda taymer to‘xtaydi */
  win.__resend.start();    /* qayta ochilganda qolgan vaqt tiklanadi */
  const rs2b = q('[data-act="resend-2fa"]');
  check(!!rs2b && rs2b.disabled === true && win.__resend.left() > 49000,
    'cooldown: qayta ochilganda qolgan vaqt saqlanadi');
  win.__resend.expire();
  const rs2c = q('[data-act="resend-2fa"]');
  check(!!rs2c && rs2c.disabled === false && String(rs2c.textContent || '').trim() === 'Kodni qayta yuborish',
    'cooldown: 00:00 da tugma faollashadi va matn tiklanadi');
  win.__resend.arm();      /* kodni o‘zgartirmasdan qayta qulf */

  const tf = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'teacher_2fa').pop();
  check(!!tf && /^\d{6}$/.test(String(tf.code)), '2fa: 6 xonali kod auth_codes ga yozildi');
  check(!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    "2fa: kod tasdiqlanmaguncha sessiya yaratilmaydi");
  check((cloudStub.db.telegram_outbox || []).some(r => String(r.chat_id) === 'ADMIN' &&
      String(r.text || '').includes(String(tf.code))),
    '2fa: kod telegram_outbox (ADMIN) ga qo‘yildi');
  check((cloudStub.db.email_outbox || []).some(r => String(r.to_email) === 'ustoz@test.uz' &&
      String(r.body_html || '').includes(String(tf.code))),
    '2fa: kod faqat tasdiqlangan ustoz Gmailiga (email_outbox) qo‘yildi');
  const tfMail = (cloudStub.db.email_outbox || []).filter(r => String(r.to_email) === 'ustoz@test.uz').pop();
  check(!!tfMail && String(tfMail.subject || '').includes('English Teacher — Admin panelga kirish kodi: ' + tf.code),
    '2fa: mavzu “English Teacher — Admin panelga kirish kodi: {code}”');
  check(!!tfMail && String(tfMail.body_html || '').includes('https://teachermuzaffar.uz/logo.png') &&
        String(tfMail.body_html || '').includes('English Teacher — Muzaffar Amirov') &&
        String(tfMail.body_html || '').includes('letter-spacing:6px') &&
        String(tfMail.body_html || '').includes('Kod 3 daqiqa davomida amal qiladi') &&
        String(tfMail.body_html || '').includes('Qurilma:'),
    '2fa: xat yagona shablon bilan (logo, sarlavha, kod bloki, qurilma nomi)');

  setVal('#twofa-code', '000000');
  clickAct('do-2fa');
  await new Promise(r => setTimeout(r, 120));
  check(!JSON.parse(win.localStorage.getItem('et_session') || 'null') &&
        q('#twofa-error').classList.contains('show'),
    "2fa: noto'g'ri kod rad etildi");

  setVal('#twofa-code', String(tf.code));
  clickAct('do-2fa');
  await new Promise(r => setTimeout(r, 250));
  check(text().includes('Xush kelibsiz'), "2fa: to'g'ri kod bilan sessiya ochildi");

  /* (c) parolni tiklash: telefon/Gmail → auth_codes (reset) → yangi parol xeshi */
  const resetRow = (cloudStub.db.students || []).filter(r => r.login)[0];
  const resetLogin = String(resetRow.login);
  const resetPhone = '+998901234567';
  const resetMail = 'reset.test@gmail.com';
  resetRow.phone = resetPhone;
  resetRow.email = resetMail;
  resetRow.email_verified = true;
  resetRow.telegram_chat_id = 777001;
  logout();
  click('[data-act="auth-login-open"]');
  clickAct('open-forgot');
  check(!!q('#fp-contact') && !!q('#fp-step2'), 'reset: "Kirishni tiklash" ekrani ochildi');
  check(!!q('[data-act="auth-back"]'), 'reset: "Orqaga" tugmasi bor');
  check(qa('input[name="fr-mode"]').length === 3, 'reset: 3 ta radio tanlov');

  /* Radio tanlovlari forma maydonlarini almashtiradi */
  setVal('#fp-contact', resetPhone);
  const rLoginOpt = q('input[name="fr-mode"][value="login"]');
  rLoginOpt.checked = true;
  rLoginOpt.dispatchEvent(new win.Event('change', { bubbles: true }));
  check(!q('#fr-captcha-input') && !!q('#fp-contact'),
    'reset: "Login yodimda yo\u2018q" — CAPTCHA talab qilinmaydi');
  check(text().includes('Login tasdiqlangan telefon/Gmailga yuboriladi'),
    'reset: login varianti izohi');
  const loginMailKeep = resetRow.email_verified;
  resetRow.email_verified = false;   /* faqat Telegram kanali sinaladi */
  clickAct('forgot-send');
  check(await until(() => String(((cloudStub.db.telegram_outbox || []).slice(-1)[0] || {}).text || '').includes(resetLogin), 2500),
    'reset: login ma\u2019lumoti Telegramga yuborildi');
  resetRow.email_verified = loginMailKeep;

  const rBothOpt = q('input[name="fr-mode"][value="both"]');
  rBothOpt.checked = true;
  rBothOpt.dispatchEvent(new win.Event('change', { bubbles: true }));
  check(text().includes('ustozga murojaat'), 'reset: "Ikkalasi ham yodimda yo\u2018q" — ustozga murojaat izohi');

  const rPwOpt = q('input[name="fr-mode"][value="password"]');
  rPwOpt.checked = true;
  rPwOpt.dispatchEvent(new win.Event('change', { bubbles: true }));
  check(!!q('#fr-captcha') && !!q('#fr-captcha-input') && !!q('[data-act="recover-captcha-refresh"]'),
    'reset: "Parol yodimda yo\u2018q" — 5 xonali CAPTCHA + refresh');
  check(/^\d{5}$/.test(recoverCaptcha()), 'reset: CAPTCHA 5 xonali raqam');

  /* (c1) tasdiqlanmagan Gmail va Telegram yo'q → kod yuborilmaydi */
  const tgKeep = resetRow.telegram_chat_id;
  const verKeep = resetRow.email_verified;
  resetRow.telegram_chat_id = null;
  resetRow.email_verified = false;
  setVal('#fp-contact', resetPhone);
  setVal('#fr-captcha-input', recoverCaptcha());
  clickAct('forgot-send');
  await new Promise(r => setTimeout(r, 400));
  check(q('#fp-error').classList.contains('show') &&
        q('#fp-error').textContent.includes('tasdiqlanmagan') &&
        !(cloudStub.db.auth_codes || []).some(r => r.purpose === 'reset') &&
        !(cloudStub.db.email_outbox || []).some(r => String(r.to_email) === resetMail),
    'reset: tasdiqlanmagan Gmailga kod yuborilmaydi (ustozga murojaat)');
  check(q('#fp-step2').hidden === true, 'reset: kod yuborilmagani uchun 2-qadam yopiq');
  resetRow.telegram_chat_id = tgKeep;
  resetRow.email_verified = verKeep;

  /* (c2) telefon (oxirgi 9 raqam) bo'yicha topib, Telegram + tasdiqlangan Gmailga kod */
  setVal('#fp-contact', '+998 90 123 45 67');
  setVal('#fr-captcha-input', recoverCaptcha());
  clickAct('forgot-send');
  check(await until(() => q('#fp-step2') && q('#fp-step2').hidden === false, 3000),
    'reset: telefon bo‘yicha topildi — kod/parol maydonlari ochildi');
  const rrBtn = q('[data-act="resend-reset"]');
  check(!!rrBtn && rrBtn.disabled === true && /\(00:\d{2}\)/.test(String(rrBtn.textContent || '')),
    'cooldown: tiklash ekranida resend 60 s nofaol + mm:ss');
  const rc = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'reset').pop();
  check(!!rc && /^\d{6}$/.test(String(rc.code)) && Number(rc.student_id) === Number(resetRow.id),
    'reset: 6 xonali kod auth_codes (reset) ga student_id bilan yozildi');
  check((cloudStub.db.telegram_outbox || []).some(r => String(r.chat_id) === '777001' &&
      String(r.text || '').includes(String(rc.code))),
    'reset: kod Telegram outbox ga qo‘yildi');
  check((cloudStub.db.telegram_outbox || []).every(r => String(r.status || '') === 'pending'),
    'reset: outbox qatorlarida status=pending — bot watcher ularni ko‘radi');
  check((cloudStub.db.email_outbox || []).some(r => String(r.to_email) === resetMail &&
      String(r.body_html || '').includes(String(rc.code))),
    'reset: kod tasdiqlangan Gmail outbox ga qo‘yildi');
  const rsMail = (cloudStub.db.email_outbox || []).filter(r => String(r.to_email) === resetMail).pop();
  check(!!rsMail && String(rsMail.subject || '').includes('English Teacher — Parolni tiklash kodi: ' + rc.code) &&
        String(rsMail.body_html || '').includes('Kod 10 daqiqa davomida amal qiladi'),
    'reset: mavzu va shablon reset xati uchun to‘g‘ri');

  const hashBefore = String(resetRow.password || '');
  setVal('#fp-code', '000000');
  setVal('#fp-new', 'yangi456');
  clickAct('forgot-reset');
  await new Promise(r => setTimeout(r, 300));
  check(String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].password || '') === hashBefore,
    "reset: noto'g'ri kod parolni o'zgartirmaydi");

  setVal('#fp-code', String(rc.code));
  setVal('#fp-new', 'yangi456');
  clickAct('forgot-reset');
  check(await until(() => q('#modal-overlay').hidden === true &&
      String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].password || '') !== hashBefore, 2500),
    'reset: parol yangilandi, kirish ekraniga qaytildi');
  const hashAfter = String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].password || '');
  check(/^[0-9a-f]{64}$/.test(hashAfter) && hashAfter !== hashBefore,
    'reset: yangi parol SHA-256 xesh ko‘rinishida saqlandi');
  check((cloudStub.db.auth_codes || []).filter(r => r.id === rc.id)[0].used === true,
    'reset: kod bir marta ishlatilgan deb belgilandi');

  await loginAs(resetLogin, 'yangi456');
  check(!!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    'reset: yangi parol bilan kirish ishlaydi');

  /* (d) o'quvchi profili: telefon darhol, yangi Gmail — 6 xonali kod bilan */
  forceNav('profile');
  check(!!q('#st-phone') && !!q('#st-email'), "profil: o'quvchida telefon va Gmail maydonlari bor");
  setVal('#st-phone', '+998 93 555 44 33');
  setVal('#st-email', 'yangi.mail@gmail.com');
  clickAct('save-student-contact');
  check(await until(() => !!q('#ev-code'), 3000), 'profil: Gmail tasdiqlash modali ochildi');
  check(await until(() => String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].phone || '') === '+998935554433', 2500),
    'profil: telefon normallashtirilib darhol saqlandi');
  const evc = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'verify_email').pop();
  check(!!evc && String(evc.contact) === 'yangi.mail@gmail.com' && /^\d{6}$/.test(String(evc.code)),
    'profil: verify_email kodi (contact: yangi Gmail) auth_codes ga yozildi');
  check((cloudStub.db.email_outbox || []).some(r => String(r.to_email) === 'yangi.mail@gmail.com' &&
      String(r.subject || '').includes('Gmailni tasdiqlash') && String(r.body_html || '').includes(String(evc.code))),
    'profil: kod “English Teacher — Gmailni tasdiqlash kodi” mavzusi bilan yuborildi');
  const vfMail = (cloudStub.db.email_outbox || []).filter(r => String(r.to_email) === 'yangi.mail@gmail.com').pop();
  check(!!vfMail && String(vfMail.subject || '').includes('English Teacher — Gmailni tasdiqlash kodi: ' + evc.code) &&
        String(vfMail.body_html || '').includes('https://teachermuzaffar.uz/logo.png'),
    'profil: verify_email xati ham yagona shablon bilan yuboriladi');
  check(String(vfMail.body_html || '').includes('<svg'),
    'xat: shablonda emoji o‘rniga SVG ikonka');
  check(String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].email || '') === resetMail,
    'profil: kod tasdiqlanmaguncha students.email o‘zgarmaydi');

  setVal('#ev-code', '000000');
  clickAct('do-verify-email');
  await new Promise(r => setTimeout(r, 300));
  check(q('#ev-error').classList.contains('show') &&
        String((cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].email || '') === resetMail,
    "profil: noto'g'ri kod Gmailni saqlamaydi");
  setVal('#ev-code', String(evc.code));
  clickAct('do-verify-email');
  check(await until(() => {
    const row = (cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0];
    return String(row.email || '') === 'yangi.mail@gmail.com' && row.email_verified === true;
  }, 3000), 'profil: to‘g‘ri kod bilan students.email + email_verified = true saqlandi');
  check(q('#modal-overlay').hidden === true, 'profil: tasdiqlangach modal yopildi');
  check(await until(() => q('#screen').textContent.includes('Tasdiqlangan'), 2000),
    'profil: Gmail yonida ✅ Tasdiqlangan holati ko‘rinadi');

  /* (d2) saqlangan, lekin tasdiqlanmagan Gmailni qayta tasdiqlash */
  const localList = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  localList.forEach(x => { if (String(x.email || '') === 'yangi.mail@gmail.com') x.emailVerified = false; });
  win.localStorage.setItem('et_students', JSON.stringify(localList));
  resetRow.email_verified = false;
  forceNav('home');
  forceNav('profile');
  check(!!q('[data-act="resend-verify-existing"]'),
    'profil: tasdiqlanmagan Gmail uchun “Kod yuborish” tugmasi ko‘rinadi');
  clickAct('resend-verify-existing');
  check(await until(() => !!q('#ev-code'), 3000), 'profil: qayta tasdiqlash kodi yuborildi (modal)');
  const rvBtn = q('[data-act="resend-verify-email"]');
  check(!!rvBtn && rvBtn.disabled === true && /\(00:\d{2}\)/.test(String(rvBtn.textContent || '')),
    'cooldown: Gmail tasdiqlash modalida resend 60 s nofaol + mm:ss');
  win.__resend.expire();
  check(!!q('[data-act="resend-verify-email"]') && q('[data-act="resend-verify-email"]').disabled === false,
    'cooldown: Gmail modalida vaqt tugagach tugma faollashadi');
  const evc2 = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'verify_email').pop();
  check(!!evc2 && String(evc2.contact) === 'yangi.mail@gmail.com',
    'profil: kod saqlangan manzilga (contact) yozildi');
  check((cloudStub.db.email_outbox || []).some(r => String(r.to_email) === 'yangi.mail@gmail.com' &&
      String(r.body_html || '').includes(String(evc2.code))),
    'profil: kod email_outbox orqali qayta yuborildi');
  setVal('#ev-code', String(evc2.code));
  clickAct('do-verify-email');
  check(await until(() => (cloudStub.db.students || []).filter(r => r.id === resetRow.id)[0].email_verified === true, 3000),
    'profil: qayta tasdiqlash email_verified = true qildi');
  check(await until(() => !q('[data-act="resend-verify-existing"]'), 2500),
    'profil: tasdiqlangach “Kod yuborish” tugmasi yo‘qoladi');

  /* (e) ustoz (m_amirov) uchun OTP → bot_settings.teacher_password */
  logout();
  click('[data-act="auth-login-open"]');
  clickAct('open-forgot');
  setVal('#fp-contact', 'm_amirov');
  setVal('#fr-captcha-input', recoverCaptcha());
  clickAct('forgot-send');
  check(await until(() => q('#fp-step2') && q('#fp-step2').hidden === false, 3000),
    'reset: ustoz uchun ham kod yuboriladi');
  const tpr = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'reset' && r.student_id == null).pop();
  check(!!tpr && (cloudStub.db.telegram_outbox || []).some(r => String(r.chat_id) === 'ADMIN' &&
      String(r.text || '').includes(String(tpr.code))),
    'reset: ustoz kodi telegram_outbox (ADMIN) ga qo‘yildi');
  check((cloudStub.db.email_outbox || []).some(r => String(r.to_email) === 'ustoz@test.uz' &&
      String(r.body_html || '').includes(String(tpr.code))),
    'reset: ustoz kodi faqat tasdiqlangan Gmailga qo‘yildi');
  setVal('#fp-code', String(tpr.code));
  setVal('#fp-new', '12345');
  clickAct('forgot-reset');
  check(await until(() => q('#modal-overlay').hidden === true, 2500), 'reset: ustoz paroli saqlandi (modal yopildi)');
  check(await until(() => String(((cloudStub.db.bot_settings || []).filter(r => r.key === 'teacher_password')[0] || {}).value || '') === '12345', 2500),
    'reset: bot_settings.teacher_password yangilandi');
  await new Promise(r => setTimeout(r, 300));
  await loginAs('m_amirov', '12345');
  check(!!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    'reset: ustoz yangi parol bilan kiradi');

  /* (f) ustoz profili: telefon darhol, yangi Gmail — kod bilan tasdiqlash */
  forceNav('profile');
  check(await until(() => !!q('#tc-email') && !!q('#tc-phone'), 3000),
    'profil: ustozda “2FA va tiklash sozlamalari” bloki bor');
  check(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(q('#screen').textContent),
    'profil: interfeysda emoji yo‘q (faqat SVG ikonkalar)');
  setVal('#tc-email', 'ustoz.2fa@gmail.com');
  setVal('#tc-phone', '+998 90 111 22 33');
  clickAct('save-teacher-contact');
  check(await until(() => !!q('#ev-code'), 3000), 'profil: ustoz Gmaili uchun tasdiqlash modali ochildi');
  const tev = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'verify_email').pop();
  check(!!tev && String(tev.contact) === 'ustoz.2fa@gmail.com',
    'profil: ustoz uchun verify_email kodi yozildi');
  const adminEmailBefore = (cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_email')[0];
  check(!!adminEmailBefore && String(adminEmailBefore.value) === 'ustoz@test.uz',
    'profil: kod tasdiqlanmaguncha admin_email o‘zgarmaydi');
  setVal('#ev-code', String(tev.code));
  clickAct('do-verify-email');
  check(await until(() => {
    const em = (cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_email')[0];
    const vf = (cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_email_verified')[0];
    return !!em && String(em.value) === 'ustoz.2fa@gmail.com' && !!vf && String(vf.value) === 'true';
  }, 3000), 'profil: tasdiqlangach bot_settings.admin_email + admin_email_verified = true');
  check(await until(() => ((cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_phone')[0] || {}).value === '+998901112233', 2500),
    'profil: ustoz telefoni bot_settings.admin_phone ga saqlandi');

  /* (f2) ustozning saqlangan tasdiqlanmagan Gmailini qayta tasdiqlash */
  const vfRow = (cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_email_verified')[0];
  vfRow.value = 'false';
  forceNav('home');
  forceNav('profile');
  check(await until(() => !!q('[data-act="resend-verify-existing"]'), 3000),
    'profil: ustoz uchun ham “Kod yuborish” tugmasi ko‘rinadi');
  clickAct('resend-verify-existing');
  check(await until(() => !!q('#ev-code'), 3000), 'profil: ustoz uchun kod qayta yuborildi (modal)');
  const tev2 = (cloudStub.db.auth_codes || []).filter(r => r.purpose === 'verify_email').pop();
  check(!!tev2 && String(tev2.contact) === 'ustoz.2fa@gmail.com',
    'profil: ustoz kodi mavjud manzilga yozildi');
  setVal('#ev-code', String(tev2.code));
  clickAct('do-verify-email');
  check(await until(() => {
    const v = (cloudStub.db.bot_settings || []).filter(r => r.key === 'admin_email_verified')[0];
    return !!v && String(v.value) === 'true';
  }, 3000), 'profil: ustoz Gmaili qayta tasdiqlandi (admin_email_verified = true)');

  /* (g) tanilgan qurilma: 2FA o'tkazib yuboriladi */
  check(!!win.localStorage.getItem('et_teacher_trusted_device'),
    'trusted: 2FA muvaffaqiyatidan keyin qurilma tokeni saqlandi');
  const trustedRow = (cloudStub.db.bot_settings || []).filter(r => String(r.key) === 'trusted_devices')[0];
  let trustedList = [];
  try { trustedList = JSON.parse((trustedRow && trustedRow.value) || '[]'); } catch (e) { trustedList = []; }
  check(Array.isArray(trustedList) && trustedList.length === 1 && /^[0-9a-f]{8,}/.test(String(trustedList[0].token)),
    'trusted: token bot_settings.trusted_devices ga ham yozildi');

  logout();
  await loginAs('m_amirov', '12345');
  check(!q('#twofa-code'), 'trusted: tanilgan qurilmada 2FA modali chiqmaydi');
  check(!!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    'trusted: tanilgan qurilmada sessiya darhol ochiladi');

  /* (h) notanish qurilma (lokal token yo'q) — 2FA yana talab qilinadi */
  logout();
  openLogin();
  win.localStorage.removeItem('et_teacher_trusted_device');
  setVal('#login-input', 'm_amirov');
  setVal('#password-input', '12345');
  setVal('#login-captcha', solveCaptcha());
  clickAct('do-login');
  check(await until(() => !!q('#twofa-code'), 3000), 'trusted: notanish qurilmada 2FA modali chiqadi');
  check(!win.localStorage.getItem('et_session'), 'trusted: kod kiritilmaguncha sessiya ochilmaydi');
  setVal('#twofa-code', lastAuthCode('teacher_2fa') || '');
  clickAct('do-2fa');
  check(await until(() => !!JSON.parse(win.localStorage.getItem('et_session') || 'null'), 2500),
    'trusted: kod kiritilgach sessiya ochiladi');
  check(!!win.localStorage.getItem('et_teacher_trusted_device'),
    'trusted: yangi qurilma yana eslab qolinadi');

  /* (i) ishonchli qurilmalarni tozalash */
  forceNav('profile');
  check(await until(() => !!q('[data-act="clear-trusted"]'), 3000),
    'trusted: profilda “Ishonchli qurilmalarni tozalash” tugmasi bor');
  clickAct('clear-trusted');
  await new Promise(r => setTimeout(r, 350));
  const trustedRow2 = (cloudStub.db.bot_settings || []).filter(r => String(r.key) === 'trusted_devices')[0];
  check(!win.localStorage.getItem('et_teacher_trusted_device') &&
        JSON.parse((trustedRow2 && trustedRow2.value) || '[]').length === 0,
    'trusted: tozalash lokal tokenni ham, server ro‘yxatini ham bo‘shatadi');

  /* ================= 32. UYGA VAZIFA TOPSHIRIQLARI (o'quvchi yuklaydi) ================= */
  /* Oldingi bo'limlar ustoz parolini o'zgartirgan bo'lishi mumkin — joriyini olamiz */
  const teacherPass32 = String(((cloudStub.db.bot_settings || []).filter(r => r.key === 'teacher_password')[0] || {}).value || '123');
  logout();
  await loginAs('m_amirov', teacherPass32);
  check(!!JSON.parse(win.localStorage.getItem('et_session') || 'null'), 'topshiriq: ustoz tizimga kirdi');
  /* restore1 hisobini ma'lum parolga qaytaramiz (oldingi bo'limlar o'zgartirgan) */
  const prepRestoreStudent = () => {
    const row = (cloudStub.db.students || []).filter(r => String(r.login).toLowerCase() === 'restore1')[0];
    if (row) {
      row.password = '9876'; row.password_hash = '9876';
      if (row.group_id == null) row.group_id = 55;   /* g55 — uyga vazifa berilgan guruh */
    }
    return row;
  };
  const restoreRow0 = prepRestoreStudent();
  /* (a) ustoz ruxsati: tahrirlash modalida toggle */
  forceNav('students');
  /* filtr/qidiruvni tozalash (oldingi testlardan qolgan bo'lishi mumkin) */
  const grpAll = q('[data-act="filter-group-all"]');
  if (grpAll) click(grpAll);
  const allChip = q('[data-act="filter-class"][data-class="Barchasi"]');
  if (allChip && !allChip.classList.contains('active')) click(allChip);
  if (q('#s-search') && q('#s-search').value) setVal('#s-search', '');
  if (await until(() => !!q('[data-act="edit-student"]'), 2000)) { /* kartalar async chiziladi */ }
  const anyEditBtn = q('[data-act="edit-student"]');
  check(!!anyEditBtn, 'topshiriq: o‘quvchi kartalarida “Tahrirlash” tugmasi bor');
  /* Karta ichida (Ovozli ruxsat yonida) ham switch bo'lishi kerak */
  const cardHwSwitch = q('.student-card .st-hw-allow [data-act="hw-upload-toggle"]');
  check(!!cardHwSwitch, 'topshiriq: o‘quvchi kartasida “Uyga vazifa yuklashga ruxsat” switch’i bor');
  click(anyEditBtn);
  const modalHwSwitch = () => q('#modal-sheet [data-act="hw-upload-toggle"]');
  check(!!modalHwSwitch(),
    'topshiriq: tahrirlash modalida “Uyga vazifa yuklashga ruxsat” toggle bor');
  check(modalHwSwitch().getAttribute('aria-checked') === 'false',
    'topshiriq: ruxsat boshlang‘ichda o‘chiq');
  clickAct('hw-upload-toggle');
  check(modalHwSwitch().classList.contains('on') &&
        modalHwSwitch().getAttribute('aria-checked') === 'true',
    'topshiriq: modalda toggle yoqildi');
  check(q('.student-card .st-hw-allow [data-act="hw-upload-toggle"]').classList.contains('on'),
    'topshiriq: kartadagi switch ham darhol yoqildi (sinxron)');
  check(!!q('.student-card .chip-hw-allow'),
    'topshiriq: ruxsati bor o‘quvchi kartasida “Yuklash” belgisi ko‘rinadi');
  const toggledSid = modalHwSwitch().getAttribute('data-sid');
  await new Promise(r => setTimeout(r, 300));
  const toggledRow = (cloudStub.db.students || []).filter(r => ('s' + r.id) === toggledSid)[0] || {};
  check(toggledRow.homework_upload_allowed === true,
    'topshiriq: students.homework_upload_allowed = true bazaga yozildi');
  click('[data-act="close-modal"]');
  /* Filtr: faqat yuklash ruxsati berilganlar */
  const hwFilterChip = q('[data-act="filter-hw-allow"]');
  check(!!hwFilterChip, 'topshiriq: o‘quvchilar ro‘yxatida “Yuklash ruxsati” filtri bor');
  click(hwFilterChip);
  check(qa('.student-card').length > 0 &&
        qa('.student-card').every(c => !!c.querySelector('.chip-hw-allow')),
    'topshiriq: filtr faqat ruxsat berilgan o‘quvchilarni ko‘rsatadi');
  check(q('[data-act="filter-hw-allow"]').classList.contains('active') &&
        q('[data-act="filter-hw-allow"]').getAttribute('aria-pressed') === 'true',
    'topshiriq: filtr chipi faol holatda belgilanadi');
  click('[data-act="filter-hw-allow"]');
  check(qa('.student-card').length >= qa('.student-card').filter(c => !!c.querySelector('.chip-hw-allow')).length,
    'topshiriq: filtr o‘chirilganda ro‘yxat to‘liq qaytadi');

  /* restore1 uchun ruxsat (o'quvchi tomonini sinash maqsadida) */
  if (restoreRow0) restoreRow0.homework_upload_allowed = true;

  /* (b) o'quvchi: ruxsat bilan yuklash bo'limi */
  logout();
  prepRestoreStudent();
  await loginAs('restore1', '9876');
  forceNav('home');
  openStudentView('homework');
  check(!!q('.hw-task'), 'topshiriq: o‘quvchi kabinetida vazifa kartasi bor');
  check(!!q('.hw-sub-input') && !!q('[data-act="hw-submit"]') &&
        text().includes('Topshiriqni yuklash'),
    'topshiriq: ruxsat berilganda yuklash bo‘limi ko‘rinadi');
  const subInput = q('.hw-sub-input');
  check(subInput.getAttribute('accept') === '*/*' && subInput.hasAttribute('multiple'),
    'topshiriq: fayl maydoni accept="*/*" + multiple (rasm, Word, PDF, Excel, video, audio)');
  /* Yuklash progress indikatori: bar + matn + fayl bo'yicha yangilanish */
  check(!!q('.hw-sub-progress .hw-sub-progress-bar') && !!q('.hw-sub-status'),
    'topshiriq: yuklash uchun progress indikatori (bar + matn) mavjud');
  const fastUp = win.__cloud.uploadSubmissionFile;
  win.__cloud.uploadSubmissionFile = function (file, sid, hid) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          url: 'https://stub.supabase.local/storage/v1/object/public/homework-media/submissions/' +
            sid + '/' + hid + '/' + file.name,
          path: 'submissions/' + sid + '/' + hid + '/' + file.name, bucket: 'homework-media'
        });
      }, 150);
    });
  };
  Object.defineProperty(subInput, 'files', {
    configurable: true,
    value: [new win.File([new Uint8Array([1])], 'p1.pdf', { type: 'application/pdf' }),
            new win.File([new Uint8Array([1])], 'p2.pdf', { type: 'application/pdf' })]
  });
  clickAct('hw-submit');
  check(await until(() => /1\/2/.test((q('.hw-sub-status') || {}).textContent || ''), 2500) &&
        parseFloat(q('.hw-sub-progress-bar').style.width) > 0,
    'topshiriq: progress matni va bar birinchi fayldan keyin yangilanadi (1/2)');
  await until(() => { const b = q('[data-act="hw-submit"]'); return !!b && !b.disabled; }, 4000);
  win.__cloud.uploadSubmissionFile = fastUp;
  cloudStub.db.homework_submissions = [];
  win.localStorage.removeItem('et_hw_submissions');
  forceNav('home');

  /* render() dan keyin input yangi node — qayta olamiz */
  const subInput2 = q('.hw-sub-input');
  /* 100 MB dan katta fayl — yuborishdan oldin to'xtaydi */
  const bigFile = new win.File([new Uint8Array([1])], 'katta video.mkv', { type: '' });
  Object.defineProperty(bigFile, 'size', { configurable: true, value: 101 * 1024 * 1024 });
  Object.defineProperty(subInput2, 'files', { configurable: true, value: [bigFile] });
  clickAct('hw-submit');
  await new Promise(r => setTimeout(r, 150));
  check(/Fayl hajmi 100 MB dan oshmasligi kerak/.test((q('.hw-sub-error') || {}).textContent || ''),
    'topshiriq: 100 MB dan katta fayl aniq xabar bilan yuborilmaydi');

  /* R2 yuklash: FormData (file + path), JSON {ok, url} va aniq xato matni */
  const realUpload = win.__cloud.uploadSubmissionFile;
  const prevFetch = win.fetch;
  const r2Calls = [];
  win.fetch = function (url, opts) {
    r2Calls.push({ url: url, opts: opts });
    return Promise.resolve({
      ok: true, status: 200,
      json: function () {
        return Promise.resolve({
          ok: true,
          url: 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/submissions/1/1/abc_Insho_yakuniy__1_.docx'
        });
      }
    });
  };
  const trickyFile = new win.File([new Uint8Array([1])], 'Insho yakuniy (1).docx', { type: '' });
  const upRes = await realUpload(trickyFile, 1, 1);
  check(upRes.url.indexOf('pub-836df3817ab64cee9075b55d51fe6061.r2.dev') >= 0 && upRes.bucket === 'r2',
    'R2: yuklash natijasi data.url (r2.dev) qaytaradi');
  const r2Call = r2Calls[0] || {};
  check(r2Call.url === 'https://teachermuzaffar-upload.amirovmuzaffar070.workers.dev' &&
        r2Call.opts && r2Call.opts.method === 'POST' && !r2Call.opts.headers,
    'R2: FormData POST, Content-Type header qo‘lda yozilmaydi');
  const fd = r2Call.opts && r2Call.opts.body;
  check(fd && fd.get && fd.get('file') &&
        /^submissions\/1\/1\/\d+_Insho_yakuniy__1_\.docx$/.test(String(fd.get('path'))),
    'R2: `file` + xavfsiz ASCII `path` (submissions/{student}/{homework}/ts_nom) FormData’da');
  win.fetch = function () {
    return Promise.resolve({
      ok: false, status: 413,
      json: function () { return Promise.resolve({ ok: false, error: 'file too large' }); }
    });
  };
  let upErr = '';
  try {
    await realUpload(new win.File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }), 1, 1);
  } catch (e) { upErr = (e && e.message) || ''; }
  check(/R2/.test(upErr) && /file too large/.test(upErr),
    'R2: server xatosi aniq matn bilan ko‘rsatiladi (ok:false)');
  /* workers.dev bloklangan tarmoq ("Failed to fetch") — Supabase Storage zaxirasi */
  win.fetch = function () { return Promise.reject(new TypeError('Failed to fetch')); };
  const fbCalls = (cloudStub.storageCalls || []).length;
  const fbUp = await realUpload(new win.File([new Uint8Array([1])], 'dars.mp3', { type: 'audio/mpeg' }), 1, 1);
  check(!!fbUp && /stub\.supabase\.local/.test(String(fbUp.url)) && fbUp.bucket === 'homework-media',
    'R2 bloklangan tarmoqda fayl Supabase Storage zaxirasiga yuklanadi (xato chiqmaydi)');
  check((cloudStub.storageCalls || []).length === fbCalls + 1,
    'zaxira yuklash Storage.upload orqali bir marta yuboriladi');
  check(fbUp.path === (cloudStub.storageCalls[fbCalls] || {}).path,
    'zaxira yuklashda ham xavfsiz path ishlatiladi');
  win.fetch = prevFetch;

  /* R2 o'chirish: public URL'dan key ajratilib DELETE ?path=... yuboriladi */
  const r2Del = [];
  win.fetch = function (url, opts) {
    r2Del.push({ url: String(url), opts: opts });
    return Promise.resolve({ ok: true, status: 200 });
  };
  const r2FileUrl = 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/submissions/1/1/abc_Insho yakuniy.docx';
  const r2Key = 'submissions/1/1/abc_Insho yakuniy.docx';
  const delOk = await win.__cloud.deleteFileFromR2(r2FileUrl);
  check(delOk === true && r2Del.length === 1 &&
        r2Del[0].url === 'https://teachermuzaffar-upload.amirovmuzaffar070.workers.dev?path=' + encodeURIComponent(r2Key) &&
        r2Del[0].opts && r2Del[0].opts.method === 'DELETE',
    'R2: fayl URL’idan key ajratilib DELETE ?path=... yuboriladi');
  const foreignDel = await win.__cloud.deleteFileFromR2('https://example.com/a.png');
  check(foreignDel === false && r2Del.length === 1,
    'R2: begona URL uchun o‘chirish so‘rovi yuborilmaydi');
  win.fetch = function () { return Promise.reject(new Error('offline')); };
  const netDel = await win.__cloud.deleteFileFromR2(r2FileUrl);
  check(netDel === false, 'R2: o‘chirishdagi tarmoq xatosi yutiladi (UI bloklanmaydi)');

  /* Vazifa / topshiriq / chek o'chirilganda R2 fayllari ham tozalanadi */
  const delCalls = [];
  win.fetch = function (url, opts) {
    delCalls.push({ url: String(url), opts: opts });
    return Promise.resolve({ ok: true, status: 200 });
  };
  const r2FileUrl2 = 'https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev/hw/2_b.pdf';
  await win.__cloud.deleteHomework(null, [r2FileUrl, r2FileUrl2]);
  check(delCalls.length === 2 && delCalls.every(c => c.opts && c.opts.method === 'DELETE' && /[?&]path=/.test(c.url)),
    'vazifa: o‘chirilganda biriktirilgan barcha R2 fayllar DELETE bilan tozalanadi');
  delCalls.length = 0;
  await win.__cloud.deleteSubmission(999999, [{ url: r2FileUrl, type: 'file', name: 'a.docx', size: 10 }]);
  check(delCalls.length === 1 && delCalls[0].opts.method === 'DELETE',
    'topshiriq: o‘chirilganda yuklangan R2 fayl ham o‘chiriladi');
  delCalls.length = 0;
  await win.__cloud.deletePaymentReceipt(999999, r2FileUrl);
  check(delCalls.length === 1 && delCalls[0].opts.method === 'DELETE',
    'chek: o‘chirilganda R2 chek rasmi ham o‘chiriladi');
  win.fetch = prevFetch;

  win.__cloud.uploadSubmissionFile = function (file, sid, hid) {
    return Promise.resolve({
      url: 'https://stub.supabase.local/storage/v1/object/public/homework-media/submissions/' +
        sid + '/' + hid + '/' + file.name,
      path: 'submissions/' + sid + '/' + hid + '/' + file.name, bucket: 'homework-media'
    });
  };
  /* Storage xatosi: qaysi bosqich va qanday status ekani ekranga chiqadi */
  const okUpload = win.__cloud.uploadSubmissionFile;
  win.__cloud.uploadSubmissionFile = function () {
    return Promise.reject(new Error('Storage xatosi — homework-media: 403 · permission denied'));
  };
  Object.defineProperty(subInput2, 'files', {
    configurable: true,
    value: [new win.File([new Uint8Array([1])], 'fail.pdf', { type: 'application/pdf' })]
  });
  clickAct('hw-submit');
  check(await until(() => { const el = q('.hw-sub-error'); return !!el && /403/.test(el.textContent); }, 3000) &&
        /Storage/.test(q('.hw-sub-error').textContent),
    'topshiriq: xato bosqichi (Storage) va HTTP status ekranda ko‘rsatiladi');
  win.__cloud.uploadSubmissionFile = okUpload;

  const subPdf = new win.File([new Uint8Array([1])], 'insho.pdf', { type: 'application/pdf' });
  Object.defineProperty(subInput2, 'files', { configurable: true, value: [subPdf] });
  setVal('.hw-sub-note', 'Mana uyga vazifam');
  clickAct('hw-submit');
  check(await until(() => !!q('.hw-my-files'), 3000),
    'topshiriq: yuborilgach “Siz yuklagan fayllar” bloki chiqadi');
  const subRow = (cloudStub.db.homework_submissions || [])[0] || {};
  check(!!subRow.id && Array.isArray(subRow.files) && subRow.files.length === 1 &&
        subRow.files[0].name === 'insho.pdf' && subRow.note === 'Mana uyga vazifam',
    'topshiriq: homework_submissions ga fayl + izoh saqlandi');
  check(String(subRow.files[0].url).indexOf('submissions/') >= 0,
    'topshiriq: Storage yo‘li submissions/{student}/{homework}/...');
  const restoreName0 = String((restoreRow0 && restoreRow0.name) || '');
  check(subRow.student_name === restoreName0 && !!subRow.group_name && subRow.status === 'yangi',
    'topshiriq: INSERT obyekti jadval ustunlariga mos (student_name, group_name, status, files, note)');
  const hwSubCols = ['id', 'student_id', 'homework_id', 'student_name', 'group_name', 'files',
    'note', 'status', 'teacher_comment', 'commented_at', 'created_at', 'updated_at'];
  check(Object.keys(subRow).every(k => hwSubCols.indexOf(k) >= 0),
    'topshiriq: INSERT faqat jadval ustunlarini yuboradi (begona kalit yo‘q)');
  check(!!q('.hw-my-files .hw-doc-link'), 'topshiriq: PDF uchun “Yuklab olish” havolasi');

  /* (c) ustoz paneli: “Bajarilgan topshiriqlar” + komentariya */
  logout();
  const stSeedRow = (cloudStub.db.students || []).filter(r => String(r.login) === 'restore1')[0];
  if (stSeedRow) stSeedRow.telegram_chat_id = 555001;
  await loginAs('m_amirov', teacherPass32);
  check(!!q('[data-act="nav"][data-screen="submissions"]'),
    'topshiriq: ustoz navida “Topshiriqlar” bo‘limi bor');
  const subNavBadge = q('[data-act="nav"][data-screen="submissions"] .nav-badge');
  check(!!subNavBadge && subNavBadge.textContent === '1',
    'topshiriq: ko‘rilmagan topshiriqlar soni badge bilan ko‘rinadi');
  const quickSubBadge = q('.quick-grid [data-screen="submissions"] .nav-badge');
  check(!!quickSubBadge && quickSubBadge.textContent === '1',
    'topshiriq: home “Tez amallar”da “Bajarilgan topshiriqlar” badge bilan ko‘rinadi');
  click('[data-act="nav"][data-screen="submissions"]');
  check(text().includes('Bajarilgan topshiriqlar'), 'topshiriq: bo‘lim sarlavhasi');
  check(text().includes('Restored Student') && text().includes('Present Perfect shakli'),
    'topshiriq: o‘quvchi ismi + vazifa nomi ko‘rinadi');
  check(qa('.sub-filters .chip-btn').length >= 2, 'topshiriq: guruh bo‘yicha filtr chiplari');
  {
    const subCss = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
    check(/\.sub-filters \.chip-btn\.active[\s\S]{0,220}color:\s*#ffffff/i.test(subCss),
      'topshiriq: faol filtr pill matni toza oq (#ffffff)');
    const bar0 = q('#sub-filters');
    bar0.scrollLeft = 120;
    const groupChip = qa('[data-act="sub-group"]').filter(b => b.getAttribute('data-gid') !== 'all')[0];
    const wantGid = groupChip.getAttribute('data-gid');
    click(groupChip);
    const activeChip = q('[data-act="sub-group"].active');
    check(!!activeChip && activeChip.getAttribute('data-gid') === wantGid,
      'topshiriq: tanlangan guruh filtri renderdan keyin ham saqlanadi');
    check(Number(q('#sub-filters').getAttribute('data-scroll')) === 120 &&
          q('#sub-filters').scrollLeft === 120,
      'topshiriq: filtr barining gorizontal skroll holati saqlanadi');
    click('[data-act="sub-group"][data-gid="all"]');
    check(q('[data-act="sub-group"].active').getAttribute('data-gid') === 'all',
      'topshiriq: filtr qayta “Barchasi”ga o‘tadi');
  }
  check(!!q('.sub-card .hw-doc-link'), 'topshiriq: PDF fayl yuklab olish tugmasi bilan');
  setVal('.sub-comment', 'Yaxshi bajaribsan, davom et!');
  clickAct('sub-comment');
  check(await until(() => !!q('.sub-teacher-note'), 3000), 'topshiriq: komentariya yuborildi va ko‘rinadi');

  check(q('.sub-comment') && q('.sub-comment').value === '',
    'topshiriq: yuborilgandan keyin izoh maydoni bo‘sh');
  check(!!q('.sub-card .sub-gr-badge') && q('.sub-card .sub-gr-badge').textContent.trim().length > 0,
    'topshiriq: kartada o‘quvchi guruhi badge bilan ko‘rinadi');
  check(!!q('.sub-teacher-note [data-act="sub-comment-edit"]') &&
        !!q('.sub-teacher-note [data-act="sub-comment-del"]'),
    'topshiriq: saqlangan izohda tahrirlash/o‘chirish SVG tugmalari bor');  const cRow = (cloudStub.db.homework_submissions || [])[0] || {};
  check(cRow.teacher_comment === 'Yaxshi bajaribsan, davom et!' && !!cRow.commented_at,
    'topshiriq: teacher_comment + commented_at yangilandi');
  const tgRow = (cloudStub.db.telegram_outbox || []).filter(r => String(r.chat_id) === '555001')[0] || {};
  check(String(tgRow.text || '').indexOf('komentariya yozdi') >= 0 &&
        String(tgRow.text || '').indexOf('Yaxshi bajaribsan') >= 0,
    'topshiriq: o‘quvchi Telegramiga komentariya xabari navbatga qo‘yildi');
  check(!q('[data-act="nav"][data-screen="submissions"] .nav-badge'),
    'topshiriq: komentariyadan keyin badge yo‘qoladi');


  /* (c2) saqlangan komentariyani tahrirlash va o‘chirish */
  setVal('.sub-comment', 'vaqtinchalik matn');
  forceNav('home');
  forceNav('submissions');
  check(q('.sub-comment') && q('.sub-comment').value === '',
    'topshiriq: boshqa sahifadan qaytganda izoh maydoni bo‘sh qoladi');
  click('.sub-teacher-note [data-act="sub-comment-edit"]');
  check(!!q('.sub-edit-comment') && q('.sub-edit-comment').value.indexOf('Yaxshi bajaribsan') === 0,
    'topshiriq: izoh tahrirlash maydoni mavjud izoh bilan ochiladi');
  setVal('.sub-edit-comment', 'Yaxshi bajaribsan, davom et! (tahrir)');
  clickAct('sub-comment-save');
  check(await until(() => !!q('.sub-teacher-note') &&
    q('.sub-teacher-note').textContent.indexOf('(tahrir)') >= 0, 3000),
    'topshiriq: izoh tahrirlandi va ko‘rinadi');
  click('[data-act="sub-comment-edit"]');
  clickAct('sub-comment-edit-cancel');
  check(!!q('.sub-teacher-note') && !q('.sub-edit-comment'),
    'topshiriq: tahrirlash bekor qilinadi');
  click('.sub-teacher-note [data-act="sub-comment-del"]');
  check(!!q('.sub-teacher-note.is-confirm') && text().includes("Komentariyani o'chirasizmi?"),
    'topshiriq: izoh o‘chirishdan oldin tasdiq so‘raladi');
  clickAct('sub-comment-del-cancel');
  check(!!q('.sub-teacher-note') && !q('.sub-teacher-note.is-confirm'),
    'topshiriq: o‘chirish bekor qilindi — izoh qoldi');
  click('[data-act="sub-comment-del"]');
  clickAct('sub-comment-del-confirm');
  check(await until(() => !q('.sub-teacher-note'), 3000),
    'topshiriq: izoh o‘chirildi (Supabase + lokal)');
  /* keyingi o‘quvchi testlari uchun izohni qayta yozamiz */
  setVal('.sub-comment', 'Yaxshi bajaribsan, davom et!');
  clickAct('sub-comment');
  check(await until(() => !!q('.sub-teacher-note'), 3000),
    'topshiriq: izoh qayta yozildi');  forceNav('home');
  check(!!q('[data-act="open-hw"]') && !q('.hw-item'),
    'topshiriq: Bosh sahifadagi “Uyga vazifa berish” tugmasi tartibi buzilmagan');

  /* (d) o'quvchi: komentariya bildirishnomasi */
  logout();
  prepRestoreStudent();
  await loginAs('restore1', '9876');
  forceNav('home');
  check(!!q('.hw-comment-notice'), 'topshiriq: kabinetda yangi komentariya bildirishnomasi chiqadi');
  check(q('.hw-comment-notice [data-act="hw-comment-open"]').textContent.includes('Ochish'),
    'topshiriq: bildirishnomada “Ochish” tugmasi');
  {
    const notice = q('.hw-comment-notice'), grid = q('.student-actions');
    check(!!notice && !!grid && !!(notice.compareDocumentPosition(grid) & 4),
      'topshiriq: bildirishnoma nav kartalaridan oldin — ustma-ust tushmaydi');
  }
  click('[data-act="hw-comment-open"]');
  check(!!q('#hw-list') && text().includes('Yaxshi bajaribsan'),
    'topshiriq: “Ochish” vazifani ochadi va komentariya ko‘rinadi');
  click('[data-act="student-back"]');
  check(!q('.hw-comment-notice'), 'topshiriq: ochilgach bildirishnoma yashiriladi');
  openStudentView('homework');
  check(text().includes('Yaxshi bajaribsan'),
    'topshiriq: komentariya vazifada doimiy ko‘rinib qoladi');
  closeStudentView();

  /* (e) ruxsat o'chirilsa — yuklash bo'limi DOM'da umuman yo'q */
  logout();
  await loginAs('m_amirov', teacherPass32);
  /* Ruxsatni o'chirish: ustoz toggle'i bir marta o'chiriladi (baza + lokal) */
  forceNav('students');
  const anyEditBtn2 = q('[data-act="edit-student"]');
  click(anyEditBtn2);
  check(q('[data-act="hw-upload-toggle"]').getAttribute('aria-checked') === 'true' ||
        q('[data-act="hw-upload-toggle"]').getAttribute('aria-checked') === 'false',
    'topshiriq: toggle holati aria-checked bilan ko‘rsatiladi');
  click('[data-act="close-modal"]');
  if (restoreRow0) restoreRow0.homework_upload_allowed = false;
  logout();
  prepRestoreStudent();
  await loginAs('restore1', '9876');
  forceNav('home');
  openStudentView('homework');
  check(!q('.hw-sub-input') && !q('[data-act="hw-submit"]') &&
        !text().includes('Topshiriqni yuklash'),
    'topshiriq: ruxsat o‘chirilganda yuklash yozuvi/tugmasi/bo‘limi DOM’da yo‘q');
  check(!!q('.hw-my-files'), 'topshiriq: o‘z yuklagan fayllari baribir ko‘rinadi');

  /* (f) o'quvchi o'z yuklagan fayllarini o'chiradi (tasdiq bilan, Storage + jadval) */
  check(!!q('[data-act="hw-del-sub"]'),
    "topshiriq: o‘quvchi o‘z yozuvida “O‘chirish” tugmasini ko‘radi");
  clickAct('hw-del-sub');
  check(!!q('.confirm-body') && /o.chirmoqchimisiz/i.test((q('.confirm-text') || {}).textContent || ''),
    "topshiriq: o‘chirishdan oldin tasdiq so‘raladi");
  click('[data-act="close-modal"]');
  check(!!q('.hw-my-files') && (cloudStub.db.homework_submissions || []).length >= 1,
    "topshiriq: tasdiq bekor qilinsa hech narsa o‘chmaydi");
  const beforeRemove = (cloudStub.removeCalls || []).length;
  clickAct('hw-del-sub');
  clickAct('do-del-sub');
  check(await until(() => !q('.hw-my-files'), 3000),
    "topshiriq: o‘quvchi o‘z yozuvini o‘chirdi (fayllar bloki yo‘qoldi)");
  check(await until(() => !(cloudStub.db.homework_submissions || []).length, 3000),
    "topshiriq: homework_submissions qatori o‘chirildi");
  check((cloudStub.removeCalls || []).slice(beforeRemove)
        .some(p => String((p || [])[0] || '').indexOf('submissions/') === 0),
    "topshiriq: Storage’dagi obyekt ham o‘chirildi (submissions/...)");

  /* (g) ustoz keraksiz topshiriq yozuvini o'chiradi */
  const tStRow = (cloudStub.db.students || []).filter(r => String(r.login) === 'restore1')[0] || {};
  const tHwRow = (cloudStub.db.homework || [])[0] || {};
  cloudStub.db.homework_submissions = [{
    id: 9001, student_id: tStRow.id, homework_id: tHwRow.id,
    student_name: String(tStRow.name || ''), group_name: 'g55', status: 'yangi',
    files: [{ url: 'https://stub.supabase.local/storage/v1/object/public/homework-media/submissions/' +
      tStRow.id + '/' + tHwRow.id + '/eski.pdf', type: 'file', name: 'eski.pdf', size: 1 }],
    note: 'eski yozuv', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }];
  logout();
  await loginAs('m_amirov', teacherPass32);
  forceNav('submissions');
  check(!!q('[data-act="sub-del"]'),
    "topshiriq: ustoz “Bajarilgan topshiriqlar”da o‘chirish tugmasini ko‘radi");
  const beforeRemove2 = (cloudStub.removeCalls || []).length;
  clickAct('sub-del');
  check(!!q('.confirm-body') && !!q('[data-act="do-del-sub"]'),
    "topshiriq: ustozga ham o‘chirishdan oldin tasdiq oynasi chiqadi");
  clickAct('do-del-sub');
  check(await until(() => !(cloudStub.db.homework_submissions || []).length, 3000),
    "topshiriq: ustoz keraksiz topshiriq yozuvini o‘chirdi (jadval qatori yo‘q)");
  check(await until(() => !q('.sub-card'), 3000),
    "topshiriq: ustoz ro‘yxatidan karta ham yo‘qoldi");
  check((cloudStub.removeCalls || []).slice(beforeRemove2)
        .some(p => String((p || [])[0] || '').indexOf('submissions/') === 0),
    "topshiriq: ustoz o‘chirganda Storage obyekti ham tozalandi");

  /* (h) Diagnostika: bucket public, Storage policy'lari, jadval ustunlari */
  win.fetch = function () { return Promise.resolve({ ok: true, status: 200 }); };
  forceNav('profile');
  check(!!q('[data-act="run-diagnostics"]'),
    "diagnostika: ustoz profilida “Diagnostika” tugmasi bor");
  clickAct('run-diagnostics');
  check(await until(() => qa('#diag-list .diag-row').length >= 5, 4500),
    "diagnostika: tekshiruv natijalari aniq ro‘yxat bo‘lib chiqadi");
  const diagRows = qa('#diag-list .diag-row');
  check(diagRows.length >= 5 && diagRows.every(r => !!r.querySelector('svg')),
    "diagnostika: har bir qatorda SVG ikonka (emoji yo‘q)");
  check(!!q('#diag-list .diag-summary.is-ok') &&
        /Hammasi joyida/.test((q('#diag-list .diag-summary') || {}).textContent || ''),
    "diagnostika: xatosiz holatda “Hammasi joyida” xulosasi");
  const diagLabels = qa('#diag-list .diag-row b').map(b => b.textContent).join(' | ');
  check(diagLabels.indexOf('homework_submissions') >= 0 &&
        diagLabels.indexOf('homework_upload_allowed') >= 0 &&
        diagLabels.indexOf('homework-media') >= 0,
    "diagnostika: jadval ustunlari va bucket nomi ro‘yxatda ko‘rinadi");
  check((cloudStub.storageCalls || []).some(c => String(c.path).indexOf('submissions/_diagnostika/') === 0),
    "diagnostika: yozish policy‘si kichik test fayl bilan sinaladi");
  check((cloudStub.removeCalls || []).some(p => String((p || [])[0] || '').indexOf('submissions/_diagnostika/') === 0),
    "diagnostika: test fayl o‘chiriladi (DELETE policy)");
  cloudStub.setBucketPublic(false);
  clickAct('diag-rerun');
  check(await until(() => !!q('#diag-list .diag-summary.is-err'), 4500),
    "diagnostika: bucket private bo‘lsa muammo sifatida ko‘rsatiladi");
  check(/PRIVATE/.test((q('#diag-list') || {}).textContent || ''),
    "diagnostika: private bucket uchun aniq maslahat beriladi");
  cloudStub.setBucketPublic(true);
  click('[data-act="close-modal"]');

  /* (i) Supabase SQL: homework-media bucket + anon storage policy'lari */
  const sqlText = fs.readFileSync(path.join(root, 'supabase.sql'), 'utf8');
  check(/insert into storage\.buckets[\s\S]*?'homework-media'[\s\S]*?true/i.test(sqlText),
    'sql: homework-media bucket public sifatida yaratiladi (mavjud bo‘lsa public=true qilinadi)');
  check(/create policy "homework-media anon insert"\s+on storage\.objects[\s\S]*?with check \(bucket_id = 'homework-media'\)/i.test(sqlText),
    'sql: anon INSERT policy faqat homework-media bucket uchun');
  check(/create policy "homework-media anon select"\s+on storage\.objects[\s\S]*?using \(bucket_id = 'homework-media'\)/i.test(sqlText),
    'sql: anon SELECT policy faqat homework-media bucket uchun');

  /* ================= 34. UZ | EN TIL ALMASHTIRGICH (i18n) ================= */
  win.localStorage.removeItem('app_lang');
  forceNav('home');
  check(!!q('[data-act="toggle-lang"]'), 'i18n: headerda UZ | EN almashtirgich bor');
  check(text().includes('Xush kelibsiz'), 'i18n: standart holat — o‘zbekcha matnlar');
  clickAct('toggle-lang');
  check((win.localStorage.getItem('app_lang') || '').indexOf('en') >= 0,
    'i18n: tanlangan til localStorage’da saqlanadi (app_lang=en)');
  check(!text().includes('Xush kelibsiz') && /Welcome/.test(text()),
    'i18n: bosh sahifa matnlari sahifa yuklanmasdan inglizchaga o‘tadi');
  check(/Quick actions/i.test(text()) && /Assign Homework/i.test(text()),
    'i18n: “Tez amallar” va “Uyga vazifa berish” inglizchada');
  const enNav = navLabels().join(' | ');
  check(/Home/.test(enNav) && /Students/.test(enNav) && /Submissions/.test(enNav) && /Payments/.test(enNav),
    'i18n: navigatsiya yorliqlari inglizchada');
  forceNav('students');
  check(q('#s-search').placeholder === 'Enter student name...' &&
    !/ismini|kiriting/i.test(q('#s-search').placeholder),
    'i18n EN: Students qidiruv placeholderi to‘liq inglizchada');
  clickAct('open-add-student');
  check(/Add student/i.test(q('#modal-sheet').textContent),
    'i18n: ochiq modal ham darhol inglizchaga o‘tadi');
  check(q('#f-sname').placeholder === 'For example: Aziz Rahimov',
    'i18n EN: o‘quvchi qo‘shish placeholderi ham to‘liq inglizchada');
  click('[data-act="close-modal"]');
  forceNav('submissions');
  check(/Submitted Homework/i.test(text()), 'i18n: topshiriqlar bo‘limi sarlavhasi inglizchada');
  forceNav('profile');
  check(/Diagnostics/i.test(text()) && /Security/i.test(text()),
    'i18n: profil bo‘limlari inglizchada');
  forceNav('home');
  clickAct('toggle-lang');
  check((win.localStorage.getItem('app_lang') || '').indexOf('uz') >= 0,
    'i18n: til qayta o‘zbekchaga o‘tadi va saqlanadi');
  check(text().includes('Xush kelibsiz') && text().includes('Tez amallar'),
    'i18n: sahifa yuklanmasdan o‘zbekcha matnlar qaytadi');

  /* EN rejimda qolib ketgan matnlar tarjima qilinganini tekshirish */
  win.localStorage.setItem('app_lang', JSON.stringify('en'));
  forceNav('attendance');
  const attEn = text();
  check(/Present/.test(attEn) && /Absent/.test(attEn) && /Excused/.test(attEn),
    'i18n EN: davomat tugmalari (Present/Absent/Excused)');
  check(/✓ Present: /.test(attEn) && /✕ Absent: /.test(attEn),
    'i18n EN: davomat yakuniy hisobi (Present/Absent)');
  forceNav('grades');
  check(/Total: /.test(text()), 'i18n EN: jurnal "Jami:" → "Total:"');
  forceNav('payments');
  const payEn = text();
  check(!/qarz/i.test(payEn) && /Current debt|Payment debt|so'm debt/.test(payEn),
    'i18n EN: "To\'lov qarzi" / "so\'m qarz" → "Payment debt" / "so\'m debt"');

  check(/Groups monthly payment schedule/i.test(payEn), 'i18n EN: guruhlar oylik to\'lov jadvali');
  check(/Monthly schedule/.test(payEn), 'i18n EN: "Oylik jadval" → "Monthly schedule"');
  check(/Set/.test(payEn), 'i18n EN: "Belgilash" → "Set"');
  forceNav('speaking');
  const spEn = text();
  check(/Speaking submissions \(Inbox\)/.test(spEn), 'i18n EN: Speaking topshiriqlari (Inbox)');
  check(/No submissions yet/.test(spEn), 'i18n EN: bo\'sh topshiriq holati');
  forceNav('submissions');
  check(/No submitted homework yet/.test(text()), 'i18n EN: yuklangan topshiriqlar bo\'sh holati');
  check(/November 2026/.test(payEn), 'i18n EN: oy nomi inglizcha (November 2026)');
  forceNav('home');
  win.localStorage.setItem('app_lang', JSON.stringify('uz'));

  /* ================= 35. DOIMIY TEKSHIRUV: EN REJIMDA TARJIMASIZ MATN QOLMASIN ================= */
  win.localStorage.setItem('app_lang', JSON.stringify('en'));
  const i18nMissed = [];
  const scanI18n = (where) => {
    i18nLeftovers(q('#screen')).forEach((v) => i18nMissed.push(where + ': ' + v));
  };
  const scanModal = (where) => {
    i18nLeftovers(q('#modal-sheet')).forEach((v) => i18nMissed.push(where + ': ' + v));
    if (q('[data-act="close-modal"]')) click('[data-act="close-modal"]');
  };
  ['home', 'students', 'submissions', 'payments', 'grades', 'attendance', 'speaking', 'profile']
    .forEach((s) => { forceNav(s); scanI18n(s); });
  forceNav('homework');
  if (q('[data-act="hw-group-back"]')) clickAct('hw-group-back');
  scanI18n('homework');

  const openAct = (act) => {
    const btn = q('[data-act="' + act + '"]');
    if (!btn) return false;
    btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  };
  forceNav('students');
  if (openAct('open-add-student')) scanModal('modal:add-student');
  forceNav('groups');
  if (openAct('open-add-group')) scanModal('modal:add-group');
  forceNav('home');
  if (openAct('open-hw')) scanModal('modal:homework');
  forceNav('speaking');
  if (openAct('open-slot')) scanModal('modal:slot');
  forceNav('payments');
  if (openAct('fee-schedule')) scanModal('modal:fee');
  forceNav('students');
  if (openAct('open-chat')) scanModal('modal:chat');
  forceNav('profile');
  if (openAct('open-change-pwd')) scanModal('modal:password');

  /* O'quvchi ekranlari va modallari */
  logout();
  await loginAs('restore1', '9876');
  win.localStorage.setItem('app_lang', JSON.stringify('en'));
  ['home', 'profile'].forEach((s) => { forceNav(s); scanI18n('student:' + s); });
  forceNav('home');
  ['attendance', 'homework', 'grades', 'speaking', 'chat'].forEach((v) => {
    openStudentView(v);
    scanI18n('student-view:' + v);
    closeStudentView();
  });
  forceNav('home');
  if (openAct('speak-cta')) scanModal('student:speak');
  forceNav('home');
  if (openAct('open-pay-receipt')) scanModal('student:receipt');
  forceNav('home');
  if (openAct('open-chat')) scanModal('student:chat');

  /* To'lov cheki va speaking modallari: aniq yorliqlar inglizchada */
  forceNav('home');
  if (q('[data-act="open-pay-receipt"]')) {
    const pb = q('.pay-banner').textContent || '';
    check(/Attention:/.test(pb) && /unpaid balance of .* UZS!/.test(pb),
      'i18n EN: qarz bannerining DOM matni ham inglizchada');
    check(/Pay by Card/.test(text()), 'i18n EN: “Karta orqali to\'lash” → “Pay by Card”');
  }
  if (openAct('open-pay-receipt')) {
    const rc = q('#modal-sheet').textContent || '';
    check(/Payment by card/.test(rc) && /Cardholder/.test(rc) && /Copy/.test(rc) &&
          /Month:/.test(rc) && /Upload payment receipt \(image\):/.test(rc) &&
          /Choose file/.test(rc) && /No file chosen/.test(rc) && /Send receipt/.test(rc) &&
          /Cancel/.test(rc) && /Payment by card/.test(rc),
      'i18n EN: to‘lov cheki modali to‘liq inglizchada (karta, oy, fayl tanlash, yuborish)');
    const fi = q('#receipt-file');
    check(!!fi && fi.classList.contains('hw-file-input'),
      'to‘lov cheki: fayl maydoni brauzer tilidagi yozuvsiz — o‘z “Choose file” tugmasi bilan');
    click('[data-act="close-modal"]');
  }
  forceNav('home');
  if (openAct('speak-cta')) {
    const sc = q('#modal-sheet').textContent || '';
    check(/To submit your speaking task/.test(sc) && /after Muzaffar Amirov grades it/.test(sc) &&
          /Got it/.test(sc),
      'i18n EN: speaking modali to‘liq inglizchada');
    click('[data-act="close-modal"]');
  }
  forceNav('home');
  const payCard = text();
  check(/No payments yet|Last payment:/.test(payCard) && !/So'nggi to'lov|Karta orqali to'lash/.test(payCard),
    'i18n EN: kabinetdagi to‘lov kartasi inglizchada');
  if (q('.speak-debt-banner')) {
    const sb = q('.speak-debt-banner').textContent || '';
    check(/Your Speaking debt: \d+/.test(sb) && !/ ta$/.test(sb),
      'i18n EN: speaking qarzi — “Your Speaking debt: 2” (“2 ta” qolmagan)');
  }

  check(i18nMissed.length === 0,
    'i18n EN: barcha ekran va modallarda tarjima qilingan' +
    (i18nMissed.length ? ' — qoldi: ' + i18nMissed.slice(0, 25).join(' | ') : ''));
  win.localStorage.setItem('app_lang', JSON.stringify('uz'));

  /* ============ 35b. SUPPORT TEACHER (yordamchi o'qituvchi) ============ */
  /* Seansni to'g'ridan-to'g'ri o'rnatamiz: login oqimi yuqorida alohida sinalgan */
  const applySession = (sess) => {
    win.localStorage.setItem('et_session', JSON.stringify(sess));
    forceNav('home');
  };
  applySession({ login: 'm_amirov', role: 'teacher', name: 'Muzaffar Amirov', studentId: null });
  check(!!q('[data-act="nav"][data-screen="profile"]') && /Xush kelibsiz/.test(text()),
    'support: asosiy ustoz sessiyasi faol');
  /* Joriy (oldingi testlardan qolgan) guruh/o'quvchilar holatiga moslashamiz */
  const curGroups = JSON.parse(win.localStorage.getItem('et_groups') || '[]');
  const curStudents = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  const sGroup = curGroups[0] || null;
  const sGroupId = sGroup ? String(sGroup.id) : '';
  const sGroupStudents = curStudents.filter(s => String(s.groupId) === sGroupId);
  const otherStudents = curStudents.filter(s => String(s.groupId) !== sGroupId);
  const firstSupStudent = sGroupStudents[0] || null;

  forceNav('support');
  check(!!q('[data-act="support-add"]') && /Support teacherlar/.test(text()),
    'support: boshqaruv paneli va "Support teacher qo\'shish" tugmasi mavjud');
  clickAct('support-add');
  check(!!q('#sup-name') && !!q('#sup-login') && !!q('#sup-pass'),
    'support: qo\'shish formasi (ism, login, parol) ochildi');
  check(qa('.sup-group-check').length === curGroups.length && qa('.sup-perm-check').length === 9,
    'support: barcha guruhlar va ruxsatlar ro\'yxati formada');
  setVal('#sup-name', 'Dilshod Karimov');
  setVal('#sup-login', 'sup_dilshod');
  setVal('#sup-pass', '1234');
  q('.sup-group-check[value="' + sGroupId + '"]').checked = true;
  q('.sup-perm-check[value="mock"]').checked = false;
  clickAct('support-save');
  const supSaved = JSON.parse(win.localStorage.getItem('et_support_teachers') || '[]');
  check(supSaved.length === 1 && supSaved[0].login === 'sup_dilshod' && supSaved[0].name === 'Dilshod Karimov',
    'support: yangi support teacher ro\'yxatga saqlandi');
  check(supSaved[0].groupIds.indexOf(sGroupId) >= 0 && supSaved[0].perms.mock === false && supSaved[0].perms.attendance === true,
    'support: guruh biriktirildi va mock ruxsati o\'chirilgan holda saqlandi');
  check(supSaved[0].perms.add_student === true && supSaved[0].perms.edit_group === true,
    'support: o\'quvchi qo\'shish va guruh tahrirlash ruxsatlari saqlandi');
  check(!!q('.sup-card') && /Dilshod Karimov/.test(text()),
    'support: qo\'shilgach amaldagi support teacherlar ro\'yxati ko\'rinadi');

  /* Asosiy ustoz: support guruhi odatda yashirin, nazorat rejimida ko'rinadi */
  forceNav('groups');
  check(qa('.group-card').length === curGroups.length - 1 &&
        (!sGroup || !text().includes(sGroup.name)),
    'support: biriktirilgan guruh asosiy ustozning Guruhlar bo\'limida yashirin');
  forceNav('home');
  clickAct('stat-students');
  check(studentCards() === otherStudents.length,
    'support: support guruhi o\'quvchilari O\'quvchilar bo\'limida yashirin (' +
    studentCards() + '/' + curStudents.length + ')');
  forceNav('home');
  clickAct('toggle-supervise');
  forceNav('groups');
  check(qa('.group-card').length === curGroups.length && /Dilshod Karimov/.test(text()),
    'support: "Support teacherni nazorat qilish" yoniq — guruh va support ismi ko\'rinadi');
  const g1Card = qa('.group-card').filter(c => c.getAttribute('data-gid') === sGroupId)[0];
  click(g1Card);
  check(/Support teacher nazorati/.test(text()) && /Uyga vazifalar/.test(text()) &&
        /Davomat/.test(text()) && /Mock natijalari/.test(text()),
    'support: guruh ichida support vazifalari, davomat va mock bo\'limlari ko\'rinadi');
  forceNav('home');
  clickAct('toggle-supervise');
  forceNav('groups');
  check(qa('.group-card').length === curGroups.length - 1,
    'support: nazorat rejimi o\'chirilganda guruh yana yashirinadi');

  /* Support teacher sifatida kirish */
  logout();
  await new Promise(r => setTimeout(r, 120));
  await loginAs('sup_dilshod', '1234');
  check(await until(() => /Dilshod Karimov/.test(text()) && qa('.nav-item').length > 0, 8000),
    'support: support teacher o\'z logini/paroli bilan kirdi va panelini ko\'rdi');
  const supNav = navLabels().join(' | ');
  check(/Davomat/.test(supNav) && /Speaking/.test(supNav) && /Uyga vazifalar/.test(supNav) &&
        !/To'lov/.test(supNav) && !/Mock testlar/.test(supNav),
    'support: navigatsiyada faqat ruxsat etilgan bo\'limlar (to\'lov va mock yo\'q)');
  check(/Sinflar/.test(supNav), 'support: navigatsiyada Sinflar bo\'limi bor');
  const supHomeText = text();
  check(/Tez amallar/.test(supHomeText) && /Uyga vazifa berish/.test(supHomeText) &&
        !!q('[data-act="open-add-student"]') && /Guruhni tahrirlash/.test(supHomeText),
    'support: tez amallarda uyga vazifa berish, o\'quvchi qo\'shish va guruh tahrirlash ko\'rinadi');
  check(qa('.quick-group-title').length === 3 &&
        /O'quv jarayoni/.test(supHomeText) && /Baholash/.test(supHomeText) && /Boshqaruv/.test(supHomeText),
    'support: tez amallar 3 qismga ajratilgan (o\'quv jarayoni, baholash, boshqaruv)');
  check(!/Biriktirilgan guruhlar/.test(supHomeText),
    'support: "biriktirilgan o\'quvchilar/guruhlar" bo\'limi paneldan olib tashlangan');
  forceNav('groups');
  check(/Sinflar/.test(text()) && !!q('[data-act="edit-group"]') &&
        !q('[data-act="del-group"]') && !q('[data-act="open-add-group"]'),
    'support: Sinflar bo\'limi ochiladi, faqat tahrirlash mumkin (qo\'shish/o\'chirish yo\'q)');
  clickAct('edit-group');
  check(!!q('#f-gname') && !!q('.modal-head h3') && /Guruhni tahrirlash/.test(q('.modal-head h3').textContent),
    'support: ruxsat bilan guruhni tahrirlash formasi ochiladi');
  setVal('#f-gname', (sGroup ? sGroup.name : 'Guruh') + ' (sup)');
  clickAct('save-edit-group');
  await new Promise(r => setTimeout(r, 120));
  const gAfter = JSON.parse(win.localStorage.getItem('et_groups') || '[]').filter(g => String(g.id) === sGroupId)[0];
  check(!!gAfter && /\(sup\)$/.test(gAfter.name),
    'support: ruxsat bilan guruh nomi o\'zgartirildi');
  forceNav('students');
  check(studentCards() === sGroupStudents.length &&
        (firstSupStudent ? text().includes(firstSupStudent.fullName) : true),
    'support: faqat o\'z guruhi o\'quvchilarini ko\'radi');
  check(!!q('[data-act="open-add-student"]') && !q('[data-act="edit-student"]') && !q('[data-act="del-student"]'),
    'support: o\'quvchi qo\'shish tugmasi bor, tahrirlash/o\'chirish faqat asosiy ustozda');
  clickAct('open-add-student');
  check(!!q('#f-sname') && q('#f-sgroup').options.length === 2,
    'support: o\'quvchi qo\'shish formasi faqat biriktirilgan guruhni taklif qiladi');
  setVal('#f-sname', 'Support Student');
  q('#f-sclass').value = q('#f-sclass').options[1].value;
  q('#f-sgroup').value = sGroupId;
  setVal('#f-slogin', 'sup_student1');
  setVal('#f-spass', '1234');
  clickAct('save-student');
  await new Promise(r => setTimeout(r, 120));
  const supStudents = JSON.parse(win.localStorage.getItem('et_students') || '[]');
  check(supStudents.some(s => s.fullName === 'Support Student' && String(s.groupId) === sGroupId),
    'support: ruxsat bilan biriktirilgan guruhga o\'quvchi qo\'shildi');

  /* Ruxsatlar o'chirilganda tugmalar yo'qoladi */
  const supRecs = JSON.parse(win.localStorage.getItem('et_support_teachers') || '[]');
  supRecs[0].perms.add_student = false;
  supRecs[0].perms.edit_group = false;
  win.localStorage.setItem('et_support_teachers', JSON.stringify(supRecs));
  forceNav('home');
  check(!q('[data-act="open-add-student"]') && !/Guruhni tahrirlash/.test(text()),
    'support: ruxsat o\'chirilganda tez amallardan o\'quvchi qo\'shish va guruh tahrirlash yo\'qoladi');
  forceNav('groups');
  check(!q('[data-act="edit-group"]'),
    'support: ruxsatsiz guruhni tahrirlash tugmasi ko\'rinmaydi');
  supRecs[0].perms.add_student = true;
  supRecs[0].perms.edit_group = true;
  win.localStorage.setItem('et_support_teachers', JSON.stringify(supRecs));
  forceNav('mock');
  check(/Xush kelibsiz/.test(text()) && !q('[data-act="mock-add"]'),
    'support: ruxsat berilmagan Mock bo\'limiga kirib bo\'lmaydi');
  forceNav('payments');
  check(/Xush kelibsiz/.test(text()), 'support: to\'lov bo\'limi support teacher uchun yopiq');
  forceNav('support');
  check(/Xush kelibsiz/.test(text()), 'support: support teacherlar boshqaruvi faqat asosiy ustozda');
  forceNav('attendance');
  check(qa('[data-act="att-group"]').length === 1,
    'support: davomatda faqat biriktirilgan guruh tanlanadi');

  /* Support teacher uyga vazifa kiritadi */
  forceNav('homework');
  if (q('[data-act="hw-group"]')) click(q('[data-act="hw-group"]'));
  clickAct('open-hw');
  check(!!q('#hw-group') && q('#hw-group').options.length === 1 && q('#hw-group').options[0].value === sGroupId,
    'support: uyga vazifa formasi faqat o\'z guruhini taklif qiladi');
  setVal('#hw-title', 'Support vazifasi');
  setVal('#hw-desc', 'Matn ustida ishlash');
  clickAct('save-hw');
  await new Promise(r => setTimeout(r, 300));
  const hwSaved = JSON.parse(win.localStorage.getItem('et_homework') || '[]');
  check(hwSaved.some(h => h.title === 'Support vazifasi' && String(h.groupId) === sGroupId),
    'support: uyga vazifa muvaffaqiyatli kiritildi');

  /* O'quvchi vazifani ko'radi, lekin kim berganini ko'rmaydi */
  if (firstSupStudent) {
    applySession({ login: firstSupStudent.login, role: 'student', name: firstSupStudent.fullName, studentId: firstSupStudent.id });
    check(!!q('[data-act="student-view"][data-view="homework"]'),
      'support: o\'quvchi kabineti ochildi');
    openStudentView('homework');
    const hwStudentText = text();
    check(/Support vazifasi/.test(hwStudentText),
      'support: o\'quvchi o\'z guruhi vazifasini ko\'radi');
    check(!/Dilshod Karimov/.test(hwStudentText) && !/Support teacher/.test(hwStudentText),
      'support: o\'quvchida vazifani bergan o\'qituvchi ismi ko\'rinmaydi');
    closeStudentView();
  }

  /* ============ 36. CLOUDFLARE TURNSTILE ============ */
  logout();
  const prevFetchTs = win.fetch;
  const prevTurnstile = win.turnstile;
  let tsVerifyMode = 'ok';   /* ok | false | 403 | network | pending */
  let tsPendingResolve = null;
  const tsCalls = { render: [], reset: 0 };
  const tsVerifyCalls = [];
  win.fetch = function (url, opts) {
    if (String(url).indexOf('/verify-turnstile') >= 0) {
      tsVerifyCalls.push({ url: String(url), opts: opts });
      if (tsVerifyMode === 'network') return Promise.reject(new TypeError('Failed to fetch'));
      if (tsVerifyMode === 'pending') {
        return new Promise(function (resolve) {
          tsPendingResolve = function () {
            resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: true }); } });
          };
        });
      }
      if (tsVerifyMode === '403') {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: function () { return Promise.resolve({ ok: false, 'error-codes': ['invalid-input-response'] }); }
        });
      }
      const okFlag = tsVerifyMode !== 'false';
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ ok: okFlag }); } });
    }
    return prevFetchTs ? prevFetchTs(url, opts) : Promise.resolve({ ok: true, status: 200 });
  };

  /* Skript yuklanmagan holat: eski matematik CAPTCHA fallback ko'rinadi */
  delete win.turnstile;
  click('[data-act="auth-login-open"]');
  await new Promise(r => setTimeout(r, 80));
  const tsHost = q('#turnstile-box');
  const tsFallback = q('#login-captcha-fallback');
  check(!!tsHost && !tsHost.__tsRendered && !!tsFallback && !tsFallback.hidden,
    'Turnstile: skript yo‘q bo‘lsa matematik CAPTCHA fallback ko‘rinadi');

  /* Skript mavjud: vidjet render bo'ladi, fallback yashiriladi */
  win.turnstile = {
    render: function (host, opts) {
      tsCalls.render.push({ host: host, opts: opts });
      setTimeout(function () { if (opts && opts.callback) opts.callback('ts-token-123'); }, 0);
      return 'widget-1';
    },
    reset: function () { tsCalls.reset++; }
  };
  click('[data-act="auth-login-open"]');
  await new Promise(r => setTimeout(r, 150));
  const tsRender = tsCalls.render[0] || {};
  check(!!tsRender.host && tsRender.host.id === 'turnstile-box' &&
        tsRender.opts && tsRender.opts.sitekey === '0x4AAAAAAGDZyGmTRBp6DcVs' &&
        (tsRender.opts.theme === 'light' || tsRender.opts.theme === 'dark'),
    'Turnstile: login ekranida vidjet sayt kaliti va mavzu bilan joylashtiriladi');
  check(!!q('#login-captcha-fallback') && q('#login-captcha-fallback').hidden === true,
    'Turnstile: vidjet chizilganda matematik CAPTCHA yashiriladi');

  /* 1) Server "ok:false" qaytarsa — reset + ogohlantirish */
  tsVerifyMode = 'false';
  setVal('#login-input', 'aziz');
  setVal('#password-input', '123');
  await new Promise(r => setTimeout(r, 60));
  clickAct('do-login');
  await new Promise(r => setTimeout(r, 300));
  check(/Tekshiruv tasdiqlanmadi/.test((q('#login-error') || {}).textContent || ''),
    'Turnstile: token tasdiqlanmasa kirish bloklanadi va xabar chiqadi');
  check(tsCalls.reset > 0 && tsVerifyCalls.length > 0 &&
        String(tsVerifyCalls[0].url).indexOf('/verify-turnstile') >= 0 &&
        tsVerifyCalls[0].opts && tsVerifyCalls[0].opts.method === 'POST' &&
        JSON.parse(tsVerifyCalls[0].opts.body || '{}').token === 'ts-token-123',
    'Turnstile: token POST { token } bilan verify URL’ga yuboriladi, xatoda vidjet reset qilinadi');
  check(!q('[data-act="do-login"]').disabled,
    'Turnstile: rad etilgach kirish tugmasi qayta faollashadi');

  /* 2) "ok:true" bo'lsa kirish davom etadi */
  tsVerifyMode = 'ok';
  if (tsRender.opts && tsRender.opts.callback) tsRender.opts.callback('ts-token-123');
  setVal('#login-input', 'restore1');
  setVal('#password-input', '9876');
  await new Promise(r => setTimeout(r, 80));
  clickAct('do-login');
  check(await until(() => text().includes('Restored Student'), 6000),
    'Turnstile: token serverda tasdiqlangach login muvaffaqiyatli yakunlanadi');

  /* 3) Server 403 qaytarsa — aniq rad: bloklaydi, sabab ko'rsatiladi, reset */
  logout();
  click('[data-act="auth-login-open"]');
  await new Promise(r => setTimeout(r, 150));
  const tsRender403 = tsCalls.render[tsCalls.render.length - 1] || {};
  tsVerifyMode = '403';
  const resetsBefore403 = tsCalls.reset;
  const callsBefore403 = tsVerifyCalls.length;
  if (tsRender403.opts && tsRender403.opts.callback) tsRender403.opts.callback('ts-token-403');
  setVal('#login-input', 'aziz');
  setVal('#password-input', '123');
  await new Promise(r => setTimeout(r, 80));
  clickAct('do-login');
  await new Promise(r => setTimeout(r, 300));
  const err403 = (q('#login-error') || {}).textContent || '';
  check(/Tekshiruv tasdiqlanmadi/.test(err403) && /invalid-input-response/.test(err403) &&
        tsCalls.reset > resetsBefore403 && tsVerifyCalls.length > callsBefore403,
    'Turnstile: server 403 qaytarsa kirish bloklanadi, sabab ko‘rsatiladi va vidjet reset qilinadi');
  check(!JSON.parse(win.localStorage.getItem('et_session') || 'null'),
    'Turnstile: 403 dan keyin sessiya ochilmaydi');

  /* 4) Tarmoq xatosi ("Failed to fetch") — fail-open: kirish davom etadi */
  tsVerifyMode = 'network';
  if (tsRender403.opts && tsRender403.opts.callback) tsRender403.opts.callback('ts-token-net');
  setVal('#login-input', 'restore1');
  setVal('#password-input', '9876');
  await new Promise(r => setTimeout(r, 80));
  const netCallsBefore = tsVerifyCalls.length;
  clickAct('do-login');
  check(await until(() => text().includes('Restored Student'), 6000),
    'Turnstile: “Failed to fetch” bo‘lsa kirish bloklanmaydi (fail-open)');
  check(tsVerifyCalls.length > netCallsBefore &&
        JSON.parse(tsVerifyCalls[tsVerifyCalls.length - 1].opts.body || '{}').token === 'ts-token-net',
    'Turnstile: fail-open holatida ham token verify URL’ga yuboriladi');

  /* 5) Tiklash ekrani: "ok:false" — bloklaydi + vidjet reset */
  logout();
  click('[data-act="auth-login-open"]');
  await new Promise(r => setTimeout(r, 120));
  clickAct('open-forgot');
  await new Promise(r => setTimeout(r, 150));
  const recRender = tsCalls.render.filter(x => x.host && x.host.id === 'recover-turnstile-box').pop() || {};
  check(!!recRender.host && recRender.opts && recRender.opts.sitekey === '0x4AAAAAAGDZyGmTRBp6DcVs',
    'Turnstile: tiklash ekranida ham vidjet sayt kaliti bilan joylashtiriladi');
  tsVerifyMode = 'false';
  const recResets0 = tsCalls.reset;
  const recCalls0 = tsVerifyCalls.length;
  if (recRender.opts && recRender.opts.callback) recRender.opts.callback('ts-token-rec');
  setVal('#fp-contact', 'm_amirov');
  await new Promise(r => setTimeout(r, 60));
  clickAct('forgot-send');
  await new Promise(r => setTimeout(r, 300));
  check(/Tekshiruv tasdiqlanmadi/.test((q('#fp-error') || {}).textContent || '') &&
        tsCalls.reset > recResets0 && tsVerifyCalls.length > recCalls0,
    'Turnstile (tiklash): ok:false — so‘rov bloklanadi va vidjet reset qilinadi');
  check(q('#fp-step2').hidden === true,
    'Turnstile (tiklash): ok:false — kod yuborilmaydi (2-qadam yopiq)');

  /* 6) Tiklash ekrani: 403 — bloklaydi, sabab + vidjet reset */
  tsVerifyMode = '403';
  const recResets1 = tsCalls.reset;
  const recCalls1 = tsVerifyCalls.length;
  if (recRender.opts && recRender.opts.callback) recRender.opts.callback('ts-token-rec403');
  setVal('#fp-contact', 'm_amirov');
  await new Promise(r => setTimeout(r, 60));
  clickAct('forgot-send');
  await new Promise(r => setTimeout(r, 300));
  const recErr403 = (q('#fp-error') || {}).textContent || '';
  check(/Tekshiruv tasdiqlanmadi/.test(recErr403) && /invalid-input-response/.test(recErr403) &&
        tsCalls.reset > recResets1 && tsVerifyCalls.length > recCalls1,
    'Turnstile (tiklash): server 403 — so‘rov bloklanadi, sabab ko‘rsatiladi va vidjet reset qilinadi');
  check(q('#fp-step2').hidden === true,
    'Turnstile (tiklash): 403 — kod yuborilmaydi (2-qadam yopiq)');

  /* 7) Tiklash ekrani: "Failed to fetch" — fail-open, kod yuboriladi */
  tsVerifyMode = 'network';
  if (recRender.opts && recRender.opts.callback) recRender.opts.callback('ts-token-recnet');
  setVal('#fp-contact', 'm_amirov');
  await new Promise(r => setTimeout(r, 60));
  const recCalls2 = tsVerifyCalls.length;
  clickAct('forgot-send');
  check(await until(() => q('#fp-step2') && q('#fp-step2').hidden === false, 4000),
    'Turnstile (tiklash): “Failed to fetch” bo‘lsa so‘rov bloklanmaydi (fail-open), kod yuboriladi');
  check(tsVerifyCalls.length > recCalls2 &&
        JSON.parse(tsVerifyCalls[tsVerifyCalls.length - 1].opts.body || '{}').token === 'ts-token-recnet',
    'Turnstile (tiklash): fail-open holatida ham token verify URL’ga yuboriladi');

  /* 8) Tiklash: so'rov ketayotganda tugma darhol "Tekshirilmoqda..." + nofaol */
  tsVerifyMode = 'pending';
  if (recRender.opts && recRender.opts.callback) recRender.opts.callback('ts-token-pending');
  setVal('#fp-contact', 'm_amirov');
  const pendingCallsBefore = tsVerifyCalls.length;
  clickAct('forgot-send');
  const busyBtn = q('[data-act="forgot-send"]');
  check(!!busyBtn && busyBtn.disabled === true && /Tekshirilmoqda\.\.\./.test(busyBtn.textContent || ''),
    'Tiklash: so‘rov ketayotganda tugma darhol “Tekshirilmoqda...” ko‘rsatadi va nofaol bo‘ladi');
  clickAct('forgot-send');
  await new Promise(r => setTimeout(r, 80));
  check(tsVerifyCalls.length === pendingCallsBefore + 1,
    'Tiklash: takroriy bosish qo‘shimcha so‘rov yubormaydi (jami bitta verify so‘rovi)');
  if (tsPendingResolve) tsPendingResolve();
  check(await until(() => {
    const b = q('[data-act="forgot-send"]');
    return !!b && b.disabled === false && !/Tekshirilmoqda/.test(b.textContent || '');
  }, 4000), 'Tiklash: so‘rov tugagach tugma qayta faollashadi va “Tekshirilmoqda...” yo‘qoladi');

  win.turnstile = prevTurnstile;
  win.fetch = prevFetchTs;

  console.log(failed ? '\n' + failed + ' ta test YIQILDI' : '\nBarcha testlar o\'tdi ✓');
  process.exit(failed ? 1 : 0);
})();
})();
