import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { page } = await request.json();
  if (!page) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await supabaseAdmin.from("page_views").insert({
    user_id: userData.user.id,
    page: String(page).slice(0, 50)
  });

  return NextResponse.json({ success: true });
}
