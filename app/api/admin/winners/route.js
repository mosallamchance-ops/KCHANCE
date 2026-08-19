import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "verified", "delivered", "completed"];

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active") {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const { winner_id, status } = await request.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const { data: winner, error: fetchErr } = await supabaseAdmin
    .from("winners")
    .select("user_id, status, draws(products(name))")
    .eq("id", winner_id)
    .single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

  const { error } = await supabaseAdmin.from("winners").update({ status }).eq("id", winner_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: "update_prize_status",
    entity_type: "winner",
    entity_id: winner_id,
    old_value: { status: winner.status },
    new_value: { status }
  });

  if (status === "delivered") {
    await supabaseAdmin.from("notifications").insert({
      user_id: winner.user_id,
      title: "تم تحديث حالة تسليم جائزتك",
      message: `تم تسليم جائزتك: ${winner.draws?.products?.name ?? ""}`,
      type: "prize_delivered"
    });
  }

  return NextResponse.json({ success: true });
}
