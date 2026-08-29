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

  const { winner_id, payment_method, wallet_address, shipping_address, phone } = await request.json();

  if (!winner_id) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const { data: winner, error: fetchErr } = await supabaseAdmin
    .from("winners")
    .select("id, user_id, prize_type, status")
    .eq("id", winner_id)
    .single();

  if (fetchErr || !winner) {
    return NextResponse.json({ error: "الجائزة غير موجودة" }, { status: 404 });
  }
  if (winner.user_id !== userData.user.id) {
    return NextResponse.json({ error: "هذه ليست جائزتك" }, { status: 403 });
  }
  if (winner.status === "completed") {
    return NextResponse.json({ error: "تم تسليم هذه الجائزة بالفعل" }, { status: 400 });
  }

  const updates = { claim_submitted_at: new Date().toISOString() };

  if (winner.prize_type === "cash") {
    if (!["cash", "usdt_trc20"].includes(payment_method)) {
      return NextResponse.json({ error: "الرجاء اختيار طريقة الاستلام" }, { status: 400 });
    }
    if (payment_method === "usdt_trc20" && !wallet_address) {
      return NextResponse.json({ error: "الرجاء إدخال عنوان محفظة USDT" }, { status: 400 });
    }
    updates.claim_payment_method = payment_method;
    updates.claim_wallet_address = payment_method === "usdt_trc20" ? wallet_address : null;
    updates.claim_phone = phone || null;
  } else {
    if (!shipping_address) {
      return NextResponse.json({ error: "الرجاء إدخال عنوان التوصيل" }, { status: 400 });
    }
    updates.claim_shipping_address = shipping_address;
    updates.claim_phone = phone || null;
  }

    const { error } = await supabaseAdmin.from("winners").update(updates).eq("id", winner_id);
  if (error) {
    console.error("claim-prize update failed:", error.message); // full detail stays in your server logs only
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ بيانات الاستلام، حاول مرة أخرى." }, { status: 500 });
  }

  if (winner.status === "pending") {
    await supabaseAdmin.from("winners").update({ status: "verified" }).eq("id", winner_id);
  }

  return NextResponse.json({ success: true });
}
