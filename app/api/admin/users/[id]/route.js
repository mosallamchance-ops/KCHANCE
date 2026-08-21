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

export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { id } = params;

  const [
    { data: user, error: userErr },
    { data: authUserData },
    { data: tickets },
    { data: transactions },
    { data: winners }
  ] = await Promise.all([
    supabaseAdmin.from("users").select("*").eq("id", id).single(),
    supabaseAdmin.auth.admin.getUserById(id),
    supabaseAdmin
      .from("tickets")
      .select("id, ticket_number, price, created_at, draws(status, products(name))")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("winners")
      .select("id, prize_type, prize_amount, status, created_at, draws(products(name))")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
  ]);

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 404 });

  const authUser = authUserData?.user;

  return NextResponse.json({
    user: {
      ...user,
      email: authUser?.email || null,
      email_confirmed_at: authUser?.email_confirmed_at || null,
      last_sign_in_at: authUser?.last_sign_in_at || null,
      auth_created_at: authUser?.created_at || null
    },
    tickets: tickets ?? [],
    transactions: transactions ?? [],
    winners: winners ?? []
  });
}

export async function PUT(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { id } = params;
  const { status } = await request.json();

  if (!["active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const { data: before } = await supabaseAdmin.from("users").select("status").eq("id", id).single();

  const { error } = await supabaseAdmin.from("users").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: status === "suspended" ? "suspend_user" : "reactivate_user",
    entity_type: "user",
    entity_id: id,
    old_value: before,
    new_value: { status }
  });

  if (status === "suspended") {
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      title: "تم تعليق حسابك",
      message: "تم تعليق حسابك من قبل الإدارة. تواصل مع الدعم لمزيد من المعلومات.",
      type: "account_suspended"
    });
  } else {
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      title: "تم إعادة تفعيل حسابك",
      message: "تم إعادة تفعيل حسابك. يمكنك الآن استخدام الموقع بشكل طبيعي.",
      type: "account_reactivated"
    });
  }

  return NextResponse.json({ success: true });
}
