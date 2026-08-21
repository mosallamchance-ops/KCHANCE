import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, role, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active" || admin.role !== "super_admin") return null;
  return admin;
}

export async function PUT(request, { params }) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "هذه الصفحة لصلاحية المدير الأعلى (super_admin) فقط" }, { status: 403 });

  const { id } = params;
  const { role, status } = await request.json();

  const validRoles = ["super_admin", "finance_admin", "draw_manager", "support_admin"];
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }
  if (status && !["active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  // Safety check: never allow the LAST active super_admin to be demoted or suspended,
  // to prevent permanently locking everyone out of admin management.
  const isRemovingSuperAdminPower =
    (role && role !== "super_admin") || status === "suspended";

  if (isRemovingSuperAdminPower) {
    const { data: target } = await supabaseAdmin.from("admins").select("role").eq("id", id).single();
    if (target?.role === "super_admin") {
      const { count } = await supabaseAdmin
        .from("admins")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin")
        .eq("status", "active");

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "لا يمكن إزالة صلاحية آخر مدير أعلى (super_admin) في النظام" },
          { status: 400 }
        );
      }
    }
  }

  const { data: before } = await supabaseAdmin.from("admins").select("role, status").eq("id", id).single();

  const updates = {};
  if (role) updates.role = role;
  if (status) updates.status = status;

  const { error } = await supabaseAdmin.from("admins").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: "update_admin",
    entity_type: "admin",
    entity_id: id,
    old_value: before,
    new_value: updates
  });

  return NextResponse.json({ success: true });
}
