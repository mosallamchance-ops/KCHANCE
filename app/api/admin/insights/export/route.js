import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
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

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  function applyRange(query, column) {
    if (dateFrom) query = query.gte(column, dateFrom);
    if (dateTo) query = query.lte(column, dateTo + "T23:59:59");
    return query;
  }

  try {
    let purchasesQ = supabaseAdmin
      .from("purchases")
      .select("id, quantity, total_amount, created_at, users(first_name,last_name,phone), draws(products(name))")
      .order("created_at", { ascending: false });
    purchasesQ = applyRange(purchasesQ, "created_at");

    let depositsQ = supabaseAdmin
      .from("deposits")
      .select("id, amount, status, created_at, approved_at, users(first_name,last_name,phone)")
      .order("created_at", { ascending: false });
    depositsQ = applyRange(depositsQ, "created_at");

    let winnersQ = supabaseAdmin
      .from("winners")
      .select("id, prize_type, prize_amount, status, created_at, users(first_name,last_name,phone), draws(products(name))")
      .order("created_at", { ascending: false });
    winnersQ = applyRange(winnersQ, "created_at");

    let usersQ = supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, phone, province, balance, status, created_at")
      .order("created_at", { ascending: false });
    usersQ = applyRange(usersQ, "created_at");

    const [purchases, deposits, winners, users] = await Promise.all([purchasesQ, depositsQ, winnersQ, usersQ]);

    if (purchases.error) return adminErrorResponse(purchases.error, 500, "export: purchases");
    if (deposits.error) return adminErrorResponse(deposits.error, 500, "export: deposits");
    if (winners.error) return adminErrorResponse(winners.error, 500, "export: winners");
    if (users.error) return adminErrorResponse(users.error, 500, "export: users");

    const workbook = XLSX.utils.book_new();

    const purchaseRows = purchases.data.map(function (p) {
      return {
        id: p.id,
        المستخدم: ((p.users?.first_name || "") + " " + (p.users?.last_name || "")).trim(),
        الهاتف: p.users?.phone || "",
        المنتج: p.draws?.products?.name || "",
        الكمية: p.quantity,
        المبلغ: p.total_amount,
        التاريخ: p.created_at
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(purchaseRows), "المشتريات");

    const depositRows = deposits.data.map(function (d) {
      return {
        id: d.id,
        المستخدم: ((d.users?.first_name || "") + " " + (d.users?.last_name || "")).trim(),
        الهاتف: d.users?.phone || "",
        المبلغ: d.amount,
        الحالة: d.status,
        تاريخ_الطلب: d.created_at,
        تاريخ_الموافقة: d.approved_at || ""
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(depositRows), "الشحن");

    const winnerRows = winners.data.map(function (w) {
      return {
        id: w.id,
        المستخدم: ((w.users?.first_name || "") + " " + (w.users?.last_name || "")).trim(),
        الهاتف: w.users?.phone || "",
        المنتج: w.draws?.products?.name || "",
        نوع_الجائزة: w.prize_type,
        قيمة_الجائزة: w.prize_amount || "",
        الحالة: w.status,
        التاريخ: w.created_at
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(winnerRows), "الفائزون");

    const userRows = users.data.map(function (u) {
      return {
        id: u.id,
        الاسم: ((u.first_name || "") + " " + (u.last_name || "")).trim(),
        الهاتف: u.phone || "",
        المحافظة: u.province || "",
        الرصيد: u.balance,
        الحالة: u.status,
        تاريخ_التسجيل: u.created_at
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows), "المستخدمون");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="raw-data-export.xlsx"'
      }
    });
  } catch (e) {
    return adminErrorResponse(e, 500, "export: general");
  }
}
