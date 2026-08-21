import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  let filter = "";
  if (q) {
    const encoded = encodeURIComponent(q);
    filter = `&or=(first_name.ilike.*${encoded}*,last_name.ilike.*${encoded}*,phone.ilike.*${encoded}*)`;
  }

  // Direct REST call to Supabase's database API, always fresh, never cached —
  // same fix as the deposits list and user detail routes.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=id,first_name,last_name,phone,balance,status,created_at&order=created_at.desc&limit=50${filter}`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      },
      cache: "no-store"
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: 500 });
  }

  const data = await res.json();

  return NextResponse.json({ users: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
