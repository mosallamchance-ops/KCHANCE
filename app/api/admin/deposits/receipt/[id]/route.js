import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const admin = await requireAdminRole(request, ["finance_admin"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const { data: deposit, error: depositErr } = await supabaseAdmin
    .from("deposits")
    .select("receipt_url")
    .eq("id", params.id)
    .single();

  if (depositErr || !deposit?.receipt_url) {
    return NextResponse.json({ error: "لا يوجد إيصال لهذا الطلب" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from("receipts")
    .createSignedUrl(deposit.receipt_url, 300); // 5 minutes — just long enough to view it now

  if (signErr) return NextResponse.json({ error: signErr.message }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
