-- ============================================================
-- English Teacher — Supabase ustunlari (idempotent migratsiya)
-- Supabase Dashboard → SQL Editor → "New query" → hammasini joylashtirib → "Run".
--
-- Bu fayl loyiha davomida jadvallarga QO'SHILGAN barcha ustunlarni bir joyga
-- yig'adi. Ichida `add column if not exists` ishlatilgani uchun:
--   * mavjud ustunlarga tegmaydi, ma'lumot o'chirmaydi;
--   * necha marta ishga tushirsangiz ham xavfsiz;
--   * eski bazada yetishmayotgan ustunlar qo'shiladi (PGRST204 xatosi yo'qoladi).
-- ============================================================

-- 1) O'QUVCHILAR (students)
alter table public.students add column if not exists telegram_chat_id bigint;
alter table public.students add column if not exists voice_allowed boolean not null default true;
alter table public.students add column if not exists web_speaking_allowed boolean not null default false;
alter table public.students add column if not exists homework_upload_allowed boolean not null default false;
alter table public.students add column if not exists payment_debt numeric default 0;
alter table public.students add column if not exists fee_period text;
alter table public.students add column if not exists last_paid_month text;
alter table public.students add column if not exists last_payment_info text;
alter table public.students add column if not exists password_hash text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists email text;
alter table public.students add column if not exists email_verified boolean not null default false;
alter table public.students add column if not exists last_device text;
alter table public.students add column if not exists last_seen timestamptz;

-- 2) GURUHLAR (groups)
alter table public.groups add column if not exists monthly_fee numeric default 0;
alter table public.groups add column if not exists group_type text default 'school';

-- 3) BAHOLAR (grades) — izoh ustuni
alter table public.grades add column if not exists category text;
alter table public.grades add column if not exists note text;

-- 4) UYGA VAZIFA (homework) — media va ko'p faylli biriktirmalar
alter table public.homework add column if not exists media_url text;
alter table public.homework add column if not exists media_type text;
alter table public.homework add column if not exists attachments jsonb default '[]'::jsonb;

-- 5) XABARLAR (messages) — tahrirlangan vaqti
alter table public.messages add column if not exists edited_at timestamptz;

-- 6) SPEAKING TOPSHIRIQLARI (speaking_submissions) — sayt videosi va ko'z nazorati
alter table public.speaking_submissions add column if not exists student_id bigint references public.students (id) on delete cascade;
alter table public.speaking_submissions add column if not exists score smallint check (score between 1 and 10);
alter table public.speaking_submissions add column if not exists feedback text;
alter table public.speaking_submissions add column if not exists media_url text;
alter table public.speaking_submissions add column if not exists duration_sec integer;
alter table public.speaking_submissions add column if not exists look_away_count integer;
alter table public.speaking_submissions add column if not exists eye_contact_percent integer;

-- 7) UYGA VAZIFA TOPSHIRIQLARI (homework_submissions)
alter table public.homework_submissions add column if not exists student_name text not null default '';
alter table public.homework_submissions add column if not exists group_name text not null default '';
alter table public.homework_submissions add column if not exists status text not null default 'yangi';
alter table public.homework_submissions add column if not exists files jsonb not null default '[]'::jsonb;
alter table public.homework_submissions add column if not exists note text not null default '';
alter table public.homework_submissions add column if not exists teacher_comment text not null default '';
alter table public.homework_submissions add column if not exists commented_at timestamptz;
alter table public.homework_submissions add column if not exists updated_at timestamptz not null default now();

-- 8) 1-ON-1 SPEAKING SLOTLARI (speaking_slots)
alter table public.speaking_slots add column if not exists student_id bigint references public.students (id) on delete set null;
alter table public.speaking_slots add column if not exists score smallint check (score between 1 and 10);

-- 9) TO'LOV CHEKLARI (payment_receipts) — admin/kanal xabarlari
alter table public.payment_receipts add column if not exists note text;
alter table public.payment_receipts add column if not exists admin_message_id bigint;
alter table public.payment_receipts add column if not exists admin_chat_id text;
alter table public.payment_receipts add column if not exists channel_message_id bigint;
alter table public.payment_receipts add column if not exists channel_chat_id text;
alter table public.payment_receipts add column if not exists admin_messages jsonb default '[]'::jsonb;

-- 10) OYLIK TO'LOVLAR (monthly_fees) — oy kaliti
alter table public.monthly_fees add column if not exists month_key text;

-- 11) O'QUVCHI TO'LOVLARI (student_payments)
alter table public.student_payments add column if not exists group_id bigint references public.groups (id) on delete set null;
alter table public.student_payments add column if not exists month_key text;
alter table public.student_payments add column if not exists month_name text;
alter table public.student_payments add column if not exists amount_due numeric default 0;
alter table public.student_payments add column if not exists amount_paid numeric default 0;
alter table public.student_payments add column if not exists is_paid boolean default false;
alter table public.student_payments add column if not exists paid_at timestamptz;
alter table public.student_payments add column if not exists note text;

-- 12) TO'LOVLAR TARIXI (payments)
alter table public.payments add column if not exists period text;
alter table public.payments add column if not exists note text;

-- 13) MOCK TESTLAR (mock_tests)
alter table public.mock_tests add column if not exists title text not null default '';
alter table public.mock_tests add column if not exists category text;
alter table public.mock_tests add column if not exists group_ids jsonb not null default '[]'::jsonb;
alter table public.mock_tests add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.mock_tests add column if not exists updated_at timestamptz not null default now();

-- 14) MOCK URINISHLARI (mock_attempts)
alter table public.mock_attempts add column if not exists student_id bigint references public.students (id) on delete cascade;
alter table public.mock_attempts add column if not exists sid text;
alter table public.mock_attempts add column if not exists category text;
alter table public.mock_attempts add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.mock_attempts add column if not exists updated_at timestamptz not null default now();

-- 15) TELEGRAM OUTBOX
alter table public.telegram_outbox add column if not exists chat_id text;
alter table public.telegram_outbox add column if not exists student_id bigint references public.students (id) on delete set null;

-- 16) AUTH KODLARI (auth_codes) — 'verify_email' maqsadi
alter table public.auth_codes add column if not exists student_id bigint references public.students (id) on delete cascade;
alter table public.auth_codes add column if not exists contact text;
alter table public.auth_codes drop constraint if exists auth_codes_purpose_check;
alter table public.auth_codes add constraint auth_codes_purpose_check
  check (purpose in ('reset', 'teacher_2fa', 'verify_email'));

-- 17) AUDIO TOPSHIRIQLAR (audio_submissions)
alter table public.audio_submissions add column if not exists feedback text;
alter table public.audio_submissions add column if not exists status text not null default 'pending';

-- PostgREST sxema keshini yangilash (yangi ustunlar darhol ko'rinadi)
notify pgrst, 'reload schema';
