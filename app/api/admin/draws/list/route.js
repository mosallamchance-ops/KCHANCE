import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  const admin = await requireAdminRole(request, ["draw_manager"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  try {
    const res = await fetch(
      SUPABASE_URL +
        "/rest/v1/draws?select=id,status,ticket_price,total_tickets,sold_tickets,end_at,pinned,products(name,image_url)&order=created_at.desc",
      {
        headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY },
        cache: "no-store"
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return adminErrorResponse(new Error(errText), 500, "list draws");
    }

    const data = await res.json();

    return NextResponse.json({ draws: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    return adminErrorResponse(e, 500, "list draws");
  }
}
