import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("status")
    .eq("id", userData.user.id)
    .single();

  return NextResponse.json({ isAdmin: !!admin && admin.status === "active" });
}
