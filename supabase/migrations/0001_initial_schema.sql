-- CourseCheck AI — initial schema
-- Apply via: Supabase Dashboard → SQL Editor, or `supabase db push`

create extension if not exists "pgcrypto";

-- ─── teachers ───────────────────────────────────────────────────────────
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  school_name text,
  subject text not null default 'Қазақстан тарихы',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_user_id_idx on public.teachers (user_id);

-- ─── submissions ───────────────────────────────────────────────────────
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  student_full_name text not null,
  class_name text not null,
  coursework_title text not null,
  pdf_file_path text not null,
  pdf_file_name text not null,
  pdf_file_size integer not null default 0,
  status text not null default 'uploaded'
    check (status in ('uploaded','extracting','analyzing','ready','reviewed','failed')),
  word_count integer,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_teacher_idx on public.submissions (teacher_id, created_at desc);
create index if not exists submissions_status_idx on public.submissions (status);

-- ─── extracted_documents ───────────────────────────────────────────────
create table if not exists public.extracted_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  full_text text not null default '',
  intro_text text,
  main_text text,
  method_text text,
  evaluation_text text,
  conclusion_text text,
  references_text text,
  detected_language text not null default 'kk',
  extraction_quality text not null default 'unknown',
  created_at timestamptz not null default now()
);

-- ─── ai_reviews ────────────────────────────────────────────────────────
create table if not exists public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  model_name text not null,
  raw_json jsonb not null,
  total_ai_score numeric(5,2) not null default 0,
  bm1_score numeric(5,2) not null default 0,
  bm2_score numeric(5,2) not null default 0,
  bm3_score numeric(5,2) not null default 0,
  summary text,
  student_feedback text,
  teacher_annotation text,
  academic_integrity_risk text not null default 'low'
    check (academic_integrity_risk in ('low','medium','high')),
  created_at timestamptz not null default now()
);

create index if not exists ai_reviews_submission_idx on public.ai_reviews (submission_id, created_at desc);

-- ─── criterion_results ─────────────────────────────────────────────────
create table if not exists public.criterion_results (
  id uuid primary key default gen_random_uuid(),
  ai_review_id uuid not null references public.ai_reviews (id) on delete cascade,
  section text not null,
  criterion_code text not null,
  criterion_name text not null,
  max_score numeric(5,2) not null,
  ai_score numeric(5,2) not null default 0,
  teacher_score numeric(5,2),
  level text not null default 'missing'
    check (level in ('high','medium','low','missing')),
  evidence text,
  problem text,
  recommendation text,
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  created_at timestamptz not null default now()
);

create index if not exists criterion_results_review_idx on public.criterion_results (ai_review_id);
create index if not exists criterion_results_code_idx on public.criterion_results (criterion_code);

-- ─── teacher_final_reviews ─────────────────────────────────────────────
create table if not exists public.teacher_final_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  final_total_score numeric(5,2),
  final_bm1_score numeric(5,2),
  final_bm2_score numeric(5,2),
  final_bm3_score numeric(5,2),
  final_comment text,
  strengths text,
  needs_improvement text,
  next_revision text,
  is_finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── interview_questions ───────────────────────────────────────────────
create table if not exists public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question text not null,
  purpose text,
  risk_area text,
  created_at timestamptz not null default now()
);

create index if not exists interview_submission_idx on public.interview_questions (submission_id);

-- ─── export_logs ───────────────────────────────────────────────────────
create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  export_type text not null check (export_type in ('pdf','excel','csv')),
  file_path text,
  created_at timestamptz not null default now()
);

create index if not exists export_logs_submission_idx on public.export_logs (submission_id);

-- ─── updated_at trigger ────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at
before update on public.teachers
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_submissions_updated_at on public.submissions;
create trigger trg_submissions_updated_at
before update on public.submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_teacher_final_reviews_updated_at on public.teacher_final_reviews;
create trigger trg_teacher_final_reviews_updated_at
before update on public.teacher_final_reviews
for each row execute procedure public.set_updated_at();

-- ─── auto-provision teacher row on signup ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teachers (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
