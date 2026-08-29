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

  const url =
    SUPABASE_URL +
    "/rest/v1/winners?select=id,prize_type,prize_amount,status,published,created_at,claim_payment_method,claim_wallet_address,claim_shipping_address,claim_phone,claim_submitted_at,users(first_name,last_name,phone),draws(products(name))&order=created_at.desc";

  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const errText = await res.text();
    return adminErrorResponse(new Error(errText), 500, "list winners");
  }

  const data = await res.json();

  return NextResponse.json({ winners: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
