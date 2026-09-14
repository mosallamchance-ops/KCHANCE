import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const admin = await requireAdminRole(request, ["finance_admin"]);
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
  const admin = await requireAdminRole(request, ["finance_admin"]);
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

  if (error) return adminErrorResponse(error, 400, "some short label for this action");

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: `withdrawal_${action}`,
    entity_type: "withdrawal",
    entity_id: withdrawal_id
  });

  return NextResponse.json({ success: true });
}
