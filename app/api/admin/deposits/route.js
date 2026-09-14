import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import { requireAdminRole } from "@/lib/requireAdminRole";

export async function POST(request) {
  try {
    const admin = await requireAdminRole(request, ["finance_admin"]);
    if (!admin) {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }

    const { deposit_id, action, rejection_reason } = await request.json();

    if (action === "approve") {
      const { error } = await supabaseAdmin.rpc("approve_deposit", {
        p_deposit_id: deposit_id,
        p_admin_id: admin.id
      });
      if (error) return adminErrorResponse(error, 400, "some short label for this action");
    } else if (action === "reject") {
      const { error } = await supabaseAdmin
        .from("deposits")
        .update({ status: "rejected", rejection_reason, admin_id: admin.id })
        .eq("id", deposit_id)
        .eq("status", "pending");
      if (error) return adminErrorResponse(error, 400, "some short label for this action");
    } else {
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
    }

    await supabaseAdmin.from("audit_logs").insert({
      admin_id: admin.id,
      action: `deposit_${action}`,
      entity_type: "deposit",
      entity_id: deposit_id
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
