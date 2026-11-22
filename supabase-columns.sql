-- ============================================================
-- English Teacher — Supabase to'liq migratsiya (idempotent)
-- Supabase Dashboard → SQL Editor → New query → hammasini qo'ying → Run.
--
-- Nima qiladi:
--   1) Yetishmayotgan jadvallarni yaratadi (mock_tests, mock_attempts, ...).
--   2) Mavjud jadvallarga loyiha davomida qo'shilgan BARCHA ustunlarni qo'shadi.
--   3) anon kalit uchun ruxsat va demo RLS policy'larini tiklaydi.
--
-- Xavfsizligi: faqat `create table if not exists` va
-- `add column if not exists` ishlatiladi — hech qanday ma'lumot o'chmaydi.
-- Jadval topilmasa, o'sha qadam jimgina o'tkazib yuboriladi (xato bermaydi).
-- Necha marta ishga tushirsangiz ham mumkin.
-- ============================================================

-- 0) Yordamchi: jadval bo'lsa ustun qo'shadi, bo'lmasa o'tkazib yuboradi
create or replace function public.et_add_col(tbl text, col text, decl text)
returns void
language plpgsql
as $$
begin
  if to_regclass('public.' || tbl) is null then
    raise notice 'Jadval yo''q, o''tkazib yuborildi: %', tbl;
    return;
  end if;
  execute format('alter table public.%I add column if not exists %I %s', tbl, col, decl);
end;
$$;

-- Yordamchi: jadval va ustunlar bo'lsa indeks yaratadi (aks holda o'tkazib yuboradi)
create or replace function public.et_add_index(idx text, tbl text, cols text)
returns void
language plpgsql
as $$
begin
  if to_regclass('public.' || tbl) is null then
    raise notice 'Jadval yo''q, indeks o''tkazib yuborildi: %', idx;
    return;
  end if;
  begin
    execute format('create index if not exists %I on public.%I (%s)', idx, tbl, cols);
  exception when others then
    raise notice 'Indeks o''tkazib yuborildi (%): %', idx, sqlerrm;
  end;
end;
$$;

-- ============================================================
-- 1) YETISHMAYOTGAN JADVALLAR
-- ============================================================

create table if not exists public.audio_submissions (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  date        date not null,
  url         text not null,
  status      text not null default 'pending' check (status in ('pending', 'graded')),
  score       smallint check (score between 1 and 10),
  feedback    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  sender      text not null check (sender in ('teacher', 'student')),
  text        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.speaking_submissions (
  id               bigint generated always as identity primary key,
  student_id       bigint references public.students (id) on delete cascade,
  media_type       text not null check (media_type in ('voice', 'video_note', 'video')),
  telegram_file_id text not null,
  status           text not null default 'kutilmoqda',
  score            smallint check (score between 1 and 10),
  feedback         text,
  created_at       timestamptz not null default now()
);

create table if not exists public.homework (
  id          bigint generated always as identity primary key,
  group_id    bigint not null references public.groups (id) on delete cascade,
  title       text not null,
  description text not null default '',
  due_date    date,
  created_at  timestamptz not null default now()
);

create table if not exists public.bot_settings (
  key   text primary key,
  value text not null default ''
);

create table if not exists public.user_sessions (
  id          uuid primary key,
  user_type   text not null check (user_type in ('teacher', 'student')),
  user_id     text not null,
  device_name text not null default '',
  last_active timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.telegram_outbox (
  id          bigint generated always as identity primary key,
  chat_id     text,
  student_id  bigint references public.students (id) on delete set null,
  text        text not null,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at  timestamptz not null default now()
);

create table if not exists public.payments (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  amount      numeric not null default 0,
  note        text,
  period      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.student_payments (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  group_id    bigint references public.groups (id) on delete set null,
  month_key   text,
  month_name  text,
  amount_due  numeric default 0,
  amount_paid numeric default 0,
  is_paid     boolean default false,
  paid_at     timestamptz,
  note        text,
  created_at  timestamptz default now()
);

create table if not exists public.monthly_fees (
  id          bigint generated always as identity primary key,
  group_id    bigint not null references public.groups (id) on delete cascade,
  period      text not null,
  month_key   text,
  amount      numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (group_id, period)
);

create table if not exists public.speaking_slots (
  id          bigint generated always as identity primary key,
  date        date not null,
  start_time  text not null,
  end_time    text not null,
  student_id  bigint references public.students (id) on delete set null,
  score       smallint check (score between 1 and 10),
  created_at  timestamptz not null default now()
);

create table if not exists public.payment_receipts (
  id          bigint generated always as identity primary key,
  student_id  bigint not null references public.students (id) on delete cascade,
  month_key   text not null,
  amount      numeric not null default 0,
  receipt_url text not null,
  status      text not null default 'kutilmoqda' check (status in ('kutilmoqda', 'tasdiqlandi', 'rad_etildi')),
  created_at  timestamptz not null default now()
);

create table if not exists public.auth_codes (
  id          bigint generated always as identity primary key,
  purpose     text not null default 'reset' check (purpose in ('reset', 'teacher_2fa', 'verify_email')),
  student_id  bigint references public.students (id) on delete cascade,
  contact     text,
  code        text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id          bigint generated always as identity primary key,
  to_email    text not null,
  subject     text not null,
  body_html   text not null,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);

create table if not exists public.homework_submissions (
  id              bigint generated always as identity primary key,
  student_id      bigint not null references public.students (id) on delete cascade,
  homework_id     bigint not null references public.homework (id) on delete cascade,
  student_name    text not null default '',
  group_name      text not null default '',
  status          text not null default 'yangi',
  files           jsonb not null default '[]'::jsonb,
  note            text not null default '',
  teacher_comment text not null default '',
  commented_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, homework_id)
);

create table if not exists public.mock_tests (
  id text primary key,
  title text not null default '',
  category text,
  group_ids jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_attempts (
  id text primary key,
  student_id bigint references public.students (id) on delete cascade,
  sid text,
  category text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) USTUNLAR (jadval bo'lmasa o'tkazib yuboriladi)
-- ============================================================

-- O'quvchilar
select public.et_add_col('students', 'telegram_chat_id', 'bigint');
select public.et_add_col('students', 'voice_allowed', 'boolean not null default true');
select public.et_add_col('students', 'web_speaking_allowed', 'boolean not null default false');
select public.et_add_col('students', 'homework_upload_allowed', 'boolean not null default false');
select public.et_add_col('students', 'payment_debt', 'numeric default 0');
select public.et_add_col('students', 'fee_period', 'text');
select public.et_add_col('students', 'last_paid_month', 'text');
select public.et_add_col('students', 'last_payment_info', 'text');
select public.et_add_col('students', 'password_hash', 'text');
select public.et_add_col('students', 'phone', 'text');
select public.et_add_col('students', 'email', 'text');
select public.et_add_col('students', 'email_verified', 'boolean not null default false');
select public.et_add_col('students', 'last_device', 'text');
select public.et_add_col('students', 'last_seen', 'timestamptz');

-- Guruhlar
select public.et_add_col('groups', 'monthly_fee', 'numeric default 0');
select public.et_add_col('groups', 'group_type', 'text default ''school''');

-- Baholar
select public.et_add_col('grades', 'category', 'text');
select public.et_add_col('grades', 'note', 'text');

-- Uyga vazifa
select public.et_add_col('homework', 'media_url', 'text');
select public.et_add_col('homework', 'media_type', 'text');
select public.et_add_col('homework', 'attachments', 'jsonb default ''[]''::jsonb');

-- Xabarlar
select public.et_add_col('messages', 'edited_at', 'timestamptz');

-- Speaking topshiriqlari
select public.et_add_col('speaking_submissions', 'student_id', 'bigint references public.students (id) on delete cascade');
select public.et_add_col('speaking_submissions', 'score', 'smallint check (score between 1 and 10)');
select public.et_add_col('speaking_submissions', 'feedback', 'text');
select public.et_add_col('speaking_submissions', 'media_url', 'text');
select public.et_add_col('speaking_submissions', 'duration_sec', 'integer');
select public.et_add_col('speaking_submissions', 'look_away_count', 'integer');
select public.et_add_col('speaking_submissions', 'eye_contact_percent', 'integer');

-- Uyga vazifa topshiriqlari
select public.et_add_col('homework_submissions', 'student_name', 'text not null default ''''');
select public.et_add_col('homework_submissions', 'group_name', 'text not null default ''''');
select public.et_add_col('homework_submissions', 'status', 'text not null default ''yangi''');
select public.et_add_col('homework_submissions', 'files', 'jsonb not null default ''[]''::jsonb');
select public.et_add_col('homework_submissions', 'note', 'text not null default ''''');
select public.et_add_col('homework_submissions', 'teacher_comment', 'text not null default ''''');
select public.et_add_col('homework_submissions', 'commented_at', 'timestamptz');
select public.et_add_col('homework_submissions', 'updated_at', 'timestamptz not null default now()');

-- Speaking slotlari
select public.et_add_col('speaking_slots', 'student_id', 'bigint references public.students (id) on delete set null');
select public.et_add_col('speaking_slots', 'score', 'smallint check (score between 1 and 10)');

-- To'lov cheklari
select public.et_add_col('payment_receipts', 'note', 'text');
select public.et_add_col('payment_receipts', 'admin_message_id', 'bigint');
select public.et_add_col('payment_receipts', 'admin_chat_id', 'text');
select public.et_add_col('payment_receipts', 'channel_message_id', 'bigint');
select public.et_add_col('payment_receipts', 'channel_chat_id', 'text');
select public.et_add_col('payment_receipts', 'admin_messages', 'jsonb default ''[]''::jsonb');

-- Oylik to'lovlar (eski jadvalda period/group_id bo'lmasligi mumkin)
select public.et_add_col('monthly_fees', 'group_id', 'bigint references public.groups (id) on delete cascade');
select public.et_add_col('monthly_fees', 'period', 'text');
select public.et_add_col('monthly_fees', 'month_key', 'text');
select public.et_add_col('monthly_fees', 'amount', 'numeric not null default 0');

-- O'quvchi to'lovlari
select public.et_add_col('student_payments', 'group_id', 'bigint references public.groups (id) on delete set null');
select public.et_add_col('student_payments', 'month_key', 'text');
select public.et_add_col('student_payments', 'month_name', 'text');
select public.et_add_col('student_payments', 'amount_due', 'numeric default 0');
select public.et_add_col('student_payments', 'amount_paid', 'numeric default 0');
select public.et_add_col('student_payments', 'is_paid', 'boolean default false');
select public.et_add_col('student_payments', 'paid_at', 'timestamptz');
select public.et_add_col('student_payments', 'note', 'text');

-- To'lovlar tarixi
select public.et_add_col('payments', 'period', 'text');
select public.et_add_col('payments', 'note', 'text');

-- Mock testlar
select public.et_add_col('mock_tests', 'title', 'text not null default ''''');
select public.et_add_col('mock_tests', 'category', 'text');
select public.et_add_col('mock_tests', 'group_ids', 'jsonb not null default ''[]''::jsonb');
select public.et_add_col('mock_tests', 'payload', 'jsonb not null default ''{}''::jsonb');
select public.et_add_col('mock_tests', 'updated_at', 'timestamptz not null default now()');

-- Mock urinishlari
select public.et_add_col('mock_attempts', 'student_id', 'bigint references public.students (id) on delete cascade');
select public.et_add_col('mock_attempts', 'sid', 'text');
select public.et_add_col('mock_attempts', 'category', 'text');
select public.et_add_col('mock_attempts', 'payload', 'jsonb not null default ''{}''::jsonb');
select public.et_add_col('mock_attempts', 'updated_at', 'timestamptz not null default now()');

-- Telegram outbox
select public.et_add_col('telegram_outbox', 'chat_id', 'text');
select public.et_add_col('telegram_outbox', 'student_id', 'bigint references public.students (id) on delete set null');

-- Auth kodlari
select public.et_add_col('auth_codes', 'student_id', 'bigint references public.students (id) on delete cascade');
select public.et_add_col('auth_codes', 'contact', 'text');

-- Audio topshiriqlar
select public.et_add_col('audio_submissions', 'feedback', 'text');
select public.et_add_col('audio_submissions', 'status', 'text not null default ''pending''');

-- auth_codes CHECK cheklovini 'verify_email' bilan yangilash
do $$
begin
  if to_regclass('public.auth_codes') is not null then
    execute 'alter table public.auth_codes drop constraint if exists auth_codes_purpose_check';
    execute $sql$alter table public.auth_codes add constraint auth_codes_purpose_check check (purpose in ('reset', 'teacher_2fa', 'verify_email'))$sql$;
  end if;
end $$;

-- ============================================================
-- 3) INDEKSLAR
-- ============================================================
select public.et_add_index('audio_submissions_student_idx', 'audio_submissions', 'student_id, created_at');
select public.et_add_index('messages_student_idx', 'messages', 'student_id, created_at');
select public.et_add_index('speaking_submissions_status_idx', 'speaking_submissions', 'status, created_at');
select public.et_add_index('speaking_submissions_student_idx', 'speaking_submissions', 'student_id, created_at');
select public.et_add_index('homework_group_idx', 'homework', 'group_id, created_at');
select public.et_add_index('user_sessions_user_idx', 'user_sessions', 'user_type, user_id');
select public.et_add_index('telegram_outbox_status_idx', 'telegram_outbox', 'status, created_at');
select public.et_add_index('payments_student_idx', 'payments', 'student_id, created_at');
select public.et_add_index('monthly_fees_group_idx', 'monthly_fees', 'group_id, period');
select public.et_add_index('speaking_slots_date_idx', 'speaking_slots', 'date');
select public.et_add_index('payment_receipts_student_idx', 'payment_receipts', 'student_id, created_at');
select public.et_add_index('payment_receipts_status_idx', 'payment_receipts', 'status, created_at');
select public.et_add_index('auth_codes_code_idx', 'auth_codes', 'purpose, code, used');
select public.et_add_index('auth_codes_student_idx', 'auth_codes', 'student_id, created_at');
select public.et_add_index('email_outbox_status_idx', 'email_outbox', 'status, created_at');
select public.et_add_index('homework_submissions_hw_idx', 'homework_submissions', 'homework_id, created_at desc');
select public.et_add_index('homework_submissions_student_idx', 'homework_submissions', 'student_id, created_at desc');
select public.et_add_index('mock_tests_cat_idx', 'mock_tests', 'category, updated_at desc');
select public.et_add_index('mock_attempts_sid_idx', 'mock_attempts', 'sid, updated_at desc');
select public.et_add_index('mock_attempts_cat_idx', 'mock_attempts', 'category, updated_at desc');

-- ============================================================
-- 4) RUXSATLAR VA DEMO RLS POLICY'LAR
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter table public.audio_submissions enable row level security;
alter table public.messages enable row level security;
alter table public.speaking_submissions enable row level security;
alter table public.homework enable row level security;
alter table public.bot_settings enable row level security;
alter table public.user_sessions enable row level security;
alter table public.telegram_outbox enable row level security;
alter table public.payments enable row level security;
alter table public.student_payments enable row level security;
alter table public.monthly_fees enable row level security;
alter table public.speaking_slots enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.auth_codes enable row level security;
alter table public.email_outbox enable row level security;
alter table public.homework_submissions enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_attempts enable row level security;

drop policy if exists "demo audio all" on public.audio_submissions;
create policy "demo audio all" on public.audio_submissions
  for all using (true) with check (true);

drop policy if exists "demo messages all" on public.messages;
create policy "demo messages all" on public.messages
  for all using (true) with check (true);

drop policy if exists "demo speaking_submissions all" on public.speaking_submissions;
create policy "demo speaking_submissions all" on public.speaking_submissions
  for all using (true) with check (true);

drop policy if exists "demo homework all" on public.homework;
create policy "demo homework all" on public.homework
  for all using (true) with check (true);

drop policy if exists "demo bot_settings all" on public.bot_settings;
create policy "demo bot_settings all" on public.bot_settings
  for all using (true) with check (true);

drop policy if exists "demo user_sessions all" on public.user_sessions;
create policy "demo user_sessions all" on public.user_sessions
  for all using (true) with check (true);

drop policy if exists "demo telegram_outbox all" on public.telegram_outbox;
create policy "demo telegram_outbox all" on public.telegram_outbox
  for all using (true) with check (true);

drop policy if exists "demo payments all" on public.payments;
create policy "demo payments all" on public.payments
  for all using (true) with check (true);

drop policy if exists "demo student_payments all" on public.student_payments;
create policy "demo student_payments all" on public.student_payments
  for all using (true) with check (true);

drop policy if exists "demo monthly_fees all" on public.monthly_fees;
create policy "demo monthly_fees all" on public.monthly_fees
  for all using (true) with check (true);

drop policy if exists "demo speaking_slots all" on public.speaking_slots;
create policy "demo speaking_slots all" on public.speaking_slots
  for all using (true) with check (true);

drop policy if exists "demo payment_receipts all" on public.payment_receipts;
create policy "demo payment_receipts all" on public.payment_receipts
  for all using (true) with check (true);

drop policy if exists "demo auth_codes all" on public.auth_codes;
create policy "demo auth_codes all" on public.auth_codes
  for all using (true) with check (true);

drop policy if exists "demo email_outbox all" on public.email_outbox;
create policy "demo email_outbox all" on public.email_outbox
  for all using (true) with check (true);

drop policy if exists "demo homework_submissions all" on public.homework_submissions;
create policy "demo homework_submissions all" on public.homework_submissions
  for all using (true) with check (true);

drop policy if exists "mock_tests anon all" on public.mock_tests;
create policy "mock_tests anon all" on public.mock_tests
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "mock_attempts anon all" on public.mock_attempts;
create policy "mock_attempts anon all" on public.mock_attempts
  for all to anon, authenticated using (true) with check (true);

-- ============================================================
-- 5) YAKUN
-- ============================================================
drop function if exists public.et_add_col(text, text, text);
drop function if exists public.et_add_index(text, text, text);
notify pgrst, 'reload schema';
