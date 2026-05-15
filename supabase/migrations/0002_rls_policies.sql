-- CourseWorkCheck — Row Level Security
-- Each teacher can only access their own data.

-- helper: get teacher.id for the current auth user
create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.teachers where user_id = auth.uid() limit 1;
$$;

-- ─── teachers ──────────────────────────────────────────────────────────
alter table public.teachers enable row level security;

drop policy if exists "teachers_select_own" on public.teachers;
create policy "teachers_select_own" on public.teachers
  for select using (user_id = auth.uid());

drop policy if exists "teachers_update_own" on public.teachers;
create policy "teachers_update_own" on public.teachers
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── submissions ───────────────────────────────────────────────────────
alter table public.submissions enable row level security;

drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own" on public.submissions
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "submissions_insert_own" on public.submissions;
create policy "submissions_insert_own" on public.submissions
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "submissions_update_own" on public.submissions;
create policy "submissions_update_own" on public.submissions
  for update using (teacher_id = public.current_teacher_id())
  with check (teacher_id = public.current_teacher_id());

drop policy if exists "submissions_delete_own" on public.submissions;
create policy "submissions_delete_own" on public.submissions
  for delete using (teacher_id = public.current_teacher_id());

-- ─── extracted_documents ───────────────────────────────────────────────
alter table public.extracted_documents enable row level security;

drop policy if exists "extracted_select_own" on public.extracted_documents;
create policy "extracted_select_own" on public.extracted_documents
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = extracted_documents.submission_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

-- ─── ai_reviews ────────────────────────────────────────────────────────
alter table public.ai_reviews enable row level security;

drop policy if exists "ai_reviews_select_own" on public.ai_reviews;
create policy "ai_reviews_select_own" on public.ai_reviews
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = ai_reviews.submission_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

-- ─── criterion_results ─────────────────────────────────────────────────
alter table public.criterion_results enable row level security;

drop policy if exists "criterion_select_own" on public.criterion_results;
create policy "criterion_select_own" on public.criterion_results
  for select using (
    exists (
      select 1 from public.ai_reviews r
      join public.submissions s on s.id = r.submission_id
      where r.id = criterion_results.ai_review_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

drop policy if exists "criterion_update_own" on public.criterion_results;
create policy "criterion_update_own" on public.criterion_results
  for update using (
    exists (
      select 1 from public.ai_reviews r
      join public.submissions s on s.id = r.submission_id
      where r.id = criterion_results.ai_review_id
        and s.teacher_id = public.current_teacher_id()
    )
  )
  with check (
    exists (
      select 1 from public.ai_reviews r
      join public.submissions s on s.id = r.submission_id
      where r.id = criterion_results.ai_review_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

-- ─── teacher_final_reviews ─────────────────────────────────────────────
alter table public.teacher_final_reviews enable row level security;

drop policy if exists "final_reviews_select_own" on public.teacher_final_reviews;
create policy "final_reviews_select_own" on public.teacher_final_reviews
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "final_reviews_insert_own" on public.teacher_final_reviews;
create policy "final_reviews_insert_own" on public.teacher_final_reviews
  for insert with check (teacher_id = public.current_teacher_id());

drop policy if exists "final_reviews_update_own" on public.teacher_final_reviews;
create policy "final_reviews_update_own" on public.teacher_final_reviews
  for update using (teacher_id = public.current_teacher_id())
  with check (teacher_id = public.current_teacher_id());

-- ─── interview_questions ───────────────────────────────────────────────
alter table public.interview_questions enable row level security;

drop policy if exists "interview_select_own" on public.interview_questions;
create policy "interview_select_own" on public.interview_questions
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = interview_questions.submission_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

-- ─── export_logs ───────────────────────────────────────────────────────
alter table public.export_logs enable row level security;

drop policy if exists "exports_select_own" on public.export_logs;
create policy "exports_select_own" on public.export_logs
  for select using (teacher_id = public.current_teacher_id());

drop policy if exists "exports_insert_own" on public.export_logs;
create policy "exports_insert_own" on public.export_logs
  for insert with check (teacher_id = public.current_teacher_id());
