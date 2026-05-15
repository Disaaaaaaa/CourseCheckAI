-- CourseCheck AI — Storage bucket + RLS
-- Bucket layout: <teacher_id>/<submission_id>/original.pdf, report.pdf, report.xlsx

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coursework-pdfs',
  'coursework-pdfs',
  false,
  52428800, -- 50 MB
  array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── policies ───────────────────────────────────────────────────────────
drop policy if exists "coursework_pdfs_select_own" on storage.objects;
create policy "coursework_pdfs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'coursework-pdfs'
    and (storage.foldername(name))[1] = public.current_teacher_id()::text
  );

drop policy if exists "coursework_pdfs_insert_own" on storage.objects;
create policy "coursework_pdfs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'coursework-pdfs'
    and (storage.foldername(name))[1] = public.current_teacher_id()::text
  );

drop policy if exists "coursework_pdfs_update_own" on storage.objects;
create policy "coursework_pdfs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'coursework-pdfs'
    and (storage.foldername(name))[1] = public.current_teacher_id()::text
  );

drop policy if exists "coursework_pdfs_delete_own" on storage.objects;
create policy "coursework_pdfs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'coursework-pdfs'
    and (storage.foldername(name))[1] = public.current_teacher_id()::text
  );
