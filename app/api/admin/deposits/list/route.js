import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";

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
  const statusFilter = searchParams.get("status") || "pending";
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  let filters = "select=*,users(phone,first_name,last_name)&order=created_at.desc";
  if (statusFilter !== "all") filters += "&status=eq." + statusFilter;
  if (dateFrom) filters += "&created_at=gte." + dateFrom + "T00:00:00";
  if (dateTo) filters += "&created_at=lte." + dateTo + "T23:59:59";

  try {
    // Direct call to Supabase's REST API with no-store, bypassing the
    // supabase-js client — this specific route previously regressed back
    // into a Next.js data-caching quirk when the status filter was added.
    const res = await fetch(SUPABASE_URL + "/rest/v1/deposits?" + filters, {
      headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY },
      cache: "no-store"
    });

    if (!res.ok) {
      const errText = await res.text();
      return adminErrorResponse(new Error(errText), 500, "list deposits");
    }

    const data = await res.json();

    return NextResponse.json({ deposits: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    return adminErrorResponse(e, 500, "list deposits");
  }
}
