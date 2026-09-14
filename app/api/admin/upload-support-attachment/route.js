import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/requireAdminRole";

export async function POST(request) {
  const admin = await requireAdminRole(request, ["support_admin"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const path = `admin/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("support-attachments")
    .upload(path, buffer, { contentType: file.type });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 400 });
  }

  return NextResponse.json({ url: path });
}
