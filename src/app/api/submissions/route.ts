import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Teacher } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;

const metaSchema = z.object({
  student_full_name: z.string().min(2),
  class_name: z.string().min(1),
  coursework_title: z.string().min(3),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Авторизация қажет" }, { status: 401 });
  }

  const { data: teacher, error: teacherErr } = await supabase
    .from("teachers")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (teacherErr || !teacher) {
    return NextResponse.json(
      { error: "Мұғалім профилі табылмады" },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const meta = metaSchema.safeParse({
    student_full_name: form.get("student_full_name"),
    class_name: form.get("class_name"),
    coursework_title: form.get("coursework_title"),
  });
  if (!meta.success) {
    return NextResponse.json(
      { error: meta.error.issues[0]?.message ?? "Қате толтыру" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "PDF файл қажет" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "PDF файлы бос немесе 50 MB-тан үлкен" },
      { status: 400 },
    );
  }
  if ((file as File).type && (file as File).type !== "application/pdf") {
    return NextResponse.json({ error: "Тек PDF қабылданады" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const typedTeacher = teacher as Teacher;
  const submissionId = crypto.randomUUID();
  const fileName = (file as File).name || "coursework.pdf";
  const filePath = `${typedTeacher.id}/${submissionId}/original.pdf`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("coursework-pdfs")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `PDF жүктелмеді: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { error: insertErr } = await supabase
    .from("submissions")
    .insert({
      id: submissionId,
      teacher_id: typedTeacher.id,
      student_full_name: meta.data.student_full_name,
      class_name: meta.data.class_name,
      coursework_title: meta.data.coursework_title,
      pdf_file_path: filePath,
      pdf_file_name: fileName,
      pdf_file_size: file.size,
      status: "uploaded",
    });

  if (insertErr) {
    await admin.storage.from("coursework-pdfs").remove([filePath]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ submission_id: submissionId });
}
