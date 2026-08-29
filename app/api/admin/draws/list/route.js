import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";
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

  const { data, error } = await supabaseAdmin
    .from("draws")
    .select("id, status, ticket_price, total_tickets, sold_tickets, end_at, pinned, products(name, image_url)")
    .order("created_at", { ascending: false });

  if (error) return adminErrorResponse(error, 500, "some short label for this action");

  return NextResponse.json({ draws: data });
}
