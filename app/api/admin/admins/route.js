import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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

export async function GET(request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "هذه الصفحة لصلاحية المدير الأعلى (super_admin) فقط" }, { status: 403 });

  try {
    const admins = await restGet("admins?select=*&order=created_at.asc");
    const ids = admins.map((a) => a.id);
    const users = ids.length
      ? await restGet(`users?select=id,first_name,last_name,phone&id=in.(${ids.join(",")})`)
      : [];

    const merged = admins.map((a) => ({
      ...a,
      profile: users.find((u) => u.id === a.id) || null
    }));

    return NextResponse.json({ admins: merged }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) return NextResponse.json({ error: "هذه الصفحة لصلاحية المدير الأعلى (super_admin) فقط" }, { status: 403 });

  const { user_id, role } = await request.json();
  const validRoles = ["super_admin", "finance_admin", "draw_manager", "support_admin"];
  if (!user_id || !validRoles.includes(role)) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const { data: existingUser, error: userLookupErr } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name, phone")
    .eq("id", user_id)
    .single();

  if (userLookupErr || !existingUser) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id);

  const { error } = await supabaseAdmin.from("admins").upsert({
    id: user_id,
    role,
    status: "active",
    name: `${existingUser.first_name || ""} ${existingUser.last_name || ""}`.trim() || null,
    email: authUser?.user?.email || null
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: "grant_admin",
    entity_type: "admin",
    entity_id: user_id,
    new_value: { role }
  });

  return NextResponse.json({ success: true });
}
