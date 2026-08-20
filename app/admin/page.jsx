"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const cards = [
  { key: "total_users", label: "عدد المستخدمين" },
  { key: "active_users", label: "المستخدمون النشطون" },
  { key: "total_deposited", label: "إجمالي الأموال المشحونة", money: true },
  { key: "total_ticket_sales", label: "إجمالي مبيعات التذاكر", money: true },
  { key: "total_draws", label: "إجمالي السحوبات" },
  { key: "active_draws", label: "السحوبات النشطة" },
  { key: "completed_draws", label: "السحوبات المنتهية" },
  { key: "total_winners", label: "عدد الفائزين" },
  { key: "pending_cash_prizes", label: "الجوائز النقدية المستحقة", money: true },
  { key: "pending_deposits", label: "طلبات الشحن المعلقة" }
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (!res.ok) setError(result.error);
      else setStats(result);
    }
    load();
  }, []);

  return (
    <AdminGuard>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">لوحة تحكم الإدارة</h1>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/draws/new" className="btn-primary">
              + سحب جديد
            </Link>
            <Link href="/admin/deposits" className="py-2 px-4 rounded-lg border">
              طلبات الشحن
            </Link>
            <Link href="/admin/winners" className="py-2 px-4 rounded-lg border">
              الفائزون والجوائز
            </Link>
          </div>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((c) => (
              <div key={c.key} className="card">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-2xl font-extrabold text-brand-600">
                  {c.money ? "$" : ""}
                  {stats[c.key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
