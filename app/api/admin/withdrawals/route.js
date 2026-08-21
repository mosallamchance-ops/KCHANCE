import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active") return null;
  return admin;
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("withdrawals")
    .select("*, users(phone, first_name, last_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ withdrawals: data });
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { withdrawal_id, action, rejection_reason } = await request.json();
  if (!["paid", "rejected"].includes(action)) {
    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("resolve_withdrawal", {
    p_withdrawal_id: withdrawal_id,
    p_admin_id: admin.id,
    p_action: action,
    p_rejection_reason: rejection_reason || null
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: `withdrawal_${action}`,
    entity_type: "withdrawal",
    entity_id: withdrawal_id
  });

  return NextResponse.json({ success: true });
}
