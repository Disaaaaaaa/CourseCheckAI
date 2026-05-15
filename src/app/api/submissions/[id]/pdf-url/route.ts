import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Авторизация қажет" }, { status: 401 });
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, pdf_file_path")
    .eq("id", id)
    .single();
  if (!submission) {
    return NextResponse.json({ error: "Жұмыс табылмады" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("coursework-pdfs")
    .createSignedUrl(submission.pdf_file_path, env.signedUrlTtl());
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Сілтеме жасалмады" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
