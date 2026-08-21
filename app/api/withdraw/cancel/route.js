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

  const { withdrawal_id } = await request.json();
  if (!withdrawal_id) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("cancel_withdrawal", {
    p_withdrawal_id: withdrawal_id,
    p_user_id: userData.user.id
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
