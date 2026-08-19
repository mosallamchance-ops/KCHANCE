import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // Confirm the caller is a registered admin — regular users can never hit this.
    const { data: admin } = await supabaseAdmin
      .from("admins")
      .select("id, role, status")
      .eq("id", userData.user.id)
      .single();

    if (!admin || admin.status !== "active") {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }

    const { deposit_id, action, rejection_reason } = await request.json();

    if (action === "approve") {
      const { error } = await supabaseAdmin.rpc("approve_deposit", {
        p_deposit_id: deposit_id,
        p_admin_id: admin.id
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else if (action === "reject") {
      const { error } = await supabaseAdmin
        .from("deposits")
        .update({ status: "rejected", rejection_reason, admin_id: admin.id })
        .eq("id", deposit_id)
        .eq("status", "pending");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
