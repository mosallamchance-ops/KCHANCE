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

  const { amount, wallet_address } = await request.json();
  if (!amount || amount <= 0 || !wallet_address) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("request_withdrawal", {
    p_user_id: userData.user.id,
    p_amount: amount,
    p_wallet_address: wallet_address
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, ...data });
}
