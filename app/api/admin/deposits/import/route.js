import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(request) {
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const results = [];

  for (const row of rows) {
    const id = row.id;
    const newStatus = (row["الحالة"] || "").toString().trim();
    const reason = (row["سبب الرفض"] || "").toString().trim();

    if (!id || !["approved", "rejected"].includes(newStatus)) {
      continue; // skip rows with no change or an unrecognized status value
    }

    const { data: existing } = await supabaseAdmin.from("deposits").select("status").eq("id", id).single();

    if (!existing) {
      results.push({ id, error: "لم يتم العثور على هذا الطلب" });
      continue;
    }
    if (existing.status !== "pending") {
      results.push({ id, error: "تم معالجة هذا الطلب مسبقاً، تم تجاهله" });
      continue;
    }

    // Reuse the exact same atomic logic as the normal one-by-one approve/reject
    // flow, so the ledger, notifications, and audit log all stay consistent.
    if (newStatus === "approved") {
      const { error } = await supabaseAdmin.rpc("approve_deposit", {
        p_deposit_id: id,
        p_admin_id: admin.id
      });
      results.push({ id, success: !error, error: error?.message });
    } else {
      const { error } = await supabaseAdmin
        .from("deposits")
        .update({ status: "rejected", rejection_reason: reason, admin_id: admin.id })
        .eq("id", id)
        .eq("status", "pending");
      results.push({ id, success: !error, error: error?.message });
    }

    await supabaseAdmin.from("audit_logs").insert({
      admin_id: admin.id,
      action: "deposit_" + newStatus + "_via_excel_import",
      entity_type: "deposit",
      entity_id: id
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
