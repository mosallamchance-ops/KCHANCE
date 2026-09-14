import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  // The dashboard overview is harmless to any active admin regardless of
  // their specific role — every role needs to land somewhere after login.
  const admin = await requireAdminRole(request, ["finance_admin", "draw_manager", "support_admin"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  // Direct REST call to Supabase's database API, always fresh, never cached —
  // same fix applied to every other admin read route.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_stats?select=*`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: errText }, { status: 500 });
  }

  const data = await res.json();

  return NextResponse.json(data[0] ?? {}, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
