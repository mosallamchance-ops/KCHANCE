import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Verifies the request's bearer token belongs to an ACTIVE admin whose role
// is one of allowedRoles. super_admin always passes, regardless of the list
// passed in — it's the one role that can do everything.
//
// Returns the admin row ({ id, role, status }) on success, or null on any
// failure (no session, unknown user, inactive admin, or wrong role for this
// action). Callers should respond with a 403 when this returns null.
//
// Usage:
//   const admin = await requireAdminRole(request, ["finance_admin"]);
//   if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
export async function requireAdminRole(request, allowedRoles) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, role, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active") return null;
  if (admin.role !== "super_admin" && !allowedRoles.includes(admin.role)) return null;

  return admin;
}
