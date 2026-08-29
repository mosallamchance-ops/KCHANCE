import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import * as XLSX from "xlsx";

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

  const { data: deposits, error } = await supabaseAdmin
    .from("deposits")
    .select("id, amount, transaction_code, sender_wallet, status, rejection_reason, created_at, users(first_name,last_name,phone)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = deposits.map(function (d) {
    return {
      id: d.id,
      "اسم المستخدم": ((d.users?.first_name || "") + " " + (d.users?.last_name || "")).trim(),
      "رقم الهاتف": d.users?.phone || "",
      المبلغ: d.amount,
      "رقم العملية": d.transaction_code || "",
      "المحفظة المرسلة": d.sender_wallet || "",
      الحالة: d.status,
      "سبب الرفض": d.rejection_reason || "",
      "تاريخ الطلب": new Date(d.created_at).toLocaleString("ar")
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 38 },
    { wch: 20 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الشحن");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="deposits.xlsx"'
    }
  });
}
