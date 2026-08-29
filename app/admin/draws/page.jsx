"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const statusAr = { active: "نشط", sold_out: "بيع كامل", expired: "منتهي", completed: "مكتمل" };
const statusColor = {
  active: "text-[var(--emerald)]",
  sold_out: "text-[var(--gold-deep)]",
  expired: "text-[var(--ember)]",
  completed: "text-gray-400"
};

export default function AdminDrawsListPage() {
  const [draws, setDraws] = useState([]);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/draws/list", {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) setDraws(result.draws ?? []);
  }

  useEffect(function () {
    load();
  }, []);

  async function togglePin(id, currentlyPinned) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    await fetch("/api/admin/draws/" + id + "/pin", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ pinned: !currentlyPinned })
    });
    load();
  }

  return (
    <AdminGuard>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl">كل السحوبات</h1>
          <Link href="/admin/draws/new" className="btn-primary">
            + سحب جديد
          </Link>
        </div>
        <div className="space-y-2">
          {draws.map(function (d) {
            return (
              <div key={d.id} className="card flex flex-wrap justify-between items-center gap-3 text-sm">
                <div>
                  <p className="font-bold">
                    {d.pinned && <span className="text-[var(--gold-deep)]">⭐ </span>}
                    {d.products?.name}
                  </p>
                  <p className="text-gray-500 font-mono-num">
                    {d.sold_tickets} / {d.total_tickets} تذكرة — ${d.ticket_price} —{" "}
                    <span className={statusColor[d.status]}>{statusAr[d.status]}</span>
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={function () {
                      togglePin(d.id, d.pinned);
                    }}
                    className={
                      "py-2 px-3 rounded-lg border text-xs font-bold " +
                      (d.pinned
                        ? "border-[var(--gold-deep)] text-[var(--gold-deep)]"
                        : "border-[var(--line)] text-gray-500")
                    }
                  >
                    {d.pinned ? "إلغاء التثبيت" : "⭐ تثبيت"}
                  </button>
                  <Link
                    href={"/admin/draws/new?repeat=" + d.id}
                    className="py-2 px-3 rounded-lg border border-[var(--emerald)] text-[var(--emerald)] text-xs font-bold"
                  >
                    ↻ تكرار
                  </Link>
                  {d.sold_tickets === 0 ? (
                    <Link
                      href={"/admin/draws/" + d.id + "/edit"}
                      className="py-2 px-4 rounded-lg border border-[var(--line)]"
                    >
                      تعديل
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400 self-center">غير قابل للتعديل</span>
                  )}
                </div>
              </div>
            );
          })}
          {draws.length === 0 && <p className="text-gray-500">لا توجد سحوبات بعد.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
