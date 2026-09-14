import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const admin = await requireAdminRole(request, ["support_admin"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const { user_id, title, message } = await request.json();
  if (!user_id || !title || !message) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id,
    title,
    message,
    type: "admin_message"
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
