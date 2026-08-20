"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const statusAr = { active: "نشط", sold_out: "بيع كامل", expired: "منتهي", completed: "مكتمل" };

export default function AdminDrawsListPage() {
  const [draws, setDraws] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/draws/list", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (res.ok) setDraws(result.draws ?? []);
    }
    load();
  }, []);

  return (
    <AdminGuard>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">كل السحوبات</h1>
          <Link href="/admin/draws/new" className="btn-primary">
            + سحب جديد
          </Link>
        </div>
        <div className="space-y-2">
          {draws.map((d) => (
            <div key={d.id} className="card flex justify-between items-center text-sm">
              <div>
                <p className="font-bold">{d.products?.name}</p>
                <p className="text-gray-500">
                  {d.sold_tickets} / {d.total_tickets} تذكرة — ${d.ticket_price} — {statusAr[d.status]}
                </p>
              </div>
              {d.sold_tickets === 0 ? (
                <Link href={`/admin/draws/${d.id}/edit`} className="py-2 px-4 rounded-lg border">
                  تعديل
                </Link>
              ) : (
                <span className="text-xs text-gray-400">غير قابل للتعديل (تم بيع تذاكر)</span>
              )}
            </div>
          ))}
          {draws.length === 0 && <p className="text-gray-500">لا توجد سحوبات بعد.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
