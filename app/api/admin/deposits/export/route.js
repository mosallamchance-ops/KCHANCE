import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import * as XLSX from "xlsx";

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

  let filters =
    "select=id,amount,transaction_code,sender_wallet,status,rejection_reason,receipt_url,created_at,users(first_name,last_name,phone)&order=created_at.desc";
  if (statusFilter !== "all") filters += "&status=eq." + statusFilter;
  if (dateFrom) filters += "&created_at=gte." + dateFrom + "T00:00:00";
  if (dateTo) filters += "&created_at=lte." + dateTo + "T23:59:59";

  const res = await fetch(SUPABASE_URL + "/rest/v1/deposits?" + filters, {
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY },
    cache: "no-store"
  });

  if (!res.ok) {
    const errText = await res.text();
    return adminErrorResponse(new Error(errText), 500, "export deposits");
  }

  const deposits = await res.json();
  const siteUrl = new URL(request.url).origin;

  const rows = [];
  for (const d of deposits) {
    const receiptLink = d.receipt_url ? siteUrl + "/admin/deposits/receipt/" + d.id : "";

    rows.push({
      id: d.id,
      "اسم المستخدم": ((d.users?.first_name || "") + " " + (d.users?.last_name || "")).trim(),
      "رقم الهاتف": d.users?.phone || "",
      المبلغ: d.amount,
      "رقم العملية": d.transaction_code || "",
      "المحفظة المرسلة": d.sender_wallet || "",
      الحالة: d.status,
      "سبب الرفض": d.rejection_reason || "",
      "رابط الإيصال": receiptLink,
      "تاريخ الطلب": new Date(d.created_at).toLocaleString("ar")
    });
  }

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
    { wch: 60 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الشحن");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="deposits-' + statusFilter + '.xlsx"'
    }
  });
}
