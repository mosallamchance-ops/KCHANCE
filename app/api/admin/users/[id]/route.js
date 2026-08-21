import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Direct REST call to Supabase's database API, always fresh, never cached —
// same fix applied here as the deposits list route, since this route hit
// the identical stale-data issue.
async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    },
    cache: "no-store"
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

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

  try {
    const [userRows, tickets, transactions, winners, loginEvents] = await Promise.all([
      restGet(`users?select=*&id=eq.${id}`),
      restGet(
        `tickets?select=id,ticket_number,price,created_at,draws(status,products(name))&user_id=eq.${id}&order=created_at.desc&limit=50`
      ),
      restGet(`transactions?select=*&user_id=eq.${id}&order=created_at.desc&limit=50`),
      restGet(
        `winners?select=id,prize_type,prize_amount,status,created_at,draws(products(name))&user_id=eq.${id}&order=created_at.desc`
      ),
      restGet(`login_events?select=ip_address,user_agent,created_at&user_id=eq.${id}&order=created_at.desc&limit=20`)
    ]);

    const user = userRows?.[0];
    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(id);
    const authUser = authUserData?.user;

    let relatedAccounts = [];
    const ips = [...new Set((loginEvents ?? []).map((e) => e.ip_address).filter(Boolean))];
    const agents = [...new Set((loginEvents ?? []).map((e) => e.user_agent).filter(Boolean))];

    if (ips.length > 0 || agents.length > 0) {
      const ipFilter = ips.length > 0 ? `ip_address.in.(${ips.join(",")})` : null;
      const agentFilter = agents.length > 0 ? `user_agent.in.(${agents.map((a) => `"${a}"`).join(",")})` : null;
      const orFilter = [ipFilter, agentFilter].filter(Boolean).join(",");

      const matches = await restGet(
        `login_events?select=user_id,ip_address,user_agent&user_id=neq.${id}&or=(${orFilter})`
      );

      if (matches?.length) {
        const matchedUserIds = [...new Set(matches.map((m) => m.user_id))];
        const matchedUsers = await restGet(
          `users?select=id,first_name,last_name,phone&id=in.(${matchedUserIds.join(",")})`
        );

        relatedAccounts = (matchedUsers ?? []).map((u) => {
          const userMatches = matches.filter((m) => m.user_id === u.id);
          const sharedIp = userMatches.some((m) => ips.includes(m.ip_address));
          const sharedAgent = userMatches.some((m) => agents.includes(m.user_agent));
          return { ...u, sharedIp, sharedAgent };
        });
      }
    }

    return NextResponse.json(
      {
        user: {
          ...user,
          email: authUser?.email || null,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          last_sign_in_at: authUser?.last_sign_in_at || null,
          auth_created_at: authUser?.created_at || null
        },
        tickets: tickets ?? [],
        transactions: transactions ?? [],
        winners: winners ?? [],
        loginEvents: loginEvents ?? [],
        relatedAccounts
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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
