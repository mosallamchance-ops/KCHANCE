"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const statusAr = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/support", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (res.ok) setTickets(result.tickets ?? []);
    }
    load();
  }, []);

  return (
    <AdminGuard>
      <div>
        <h1 className="text-xl font-bold mb-4">تذاكر الدعم</h1>
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/support/${t.id}`} className="card flex justify-between items-center text-sm block">
              <div>
                <p className="font-bold">{t.subject}</p>
                <p className="text-gray-500">
                  {t.users?.first_name} {t.users?.last_name} — {t.users?.phone}
                </p>
                <p className="text-gray-400">{new Date(t.updated_at).toLocaleString("ar")}</p>
              </div>
              <span
                className={
                  t.status === "open"
                    ? "text-[var(--gold-deep)] font-bold"
                    : t.status === "closed"
                    ? "text-gray-400"
                    : "text-[var(--emerald)]"
                }
              >
                {statusAr[t.status]}
              </span>
            </Link>
          ))}
          {tickets.length === 0 && <p className="text-gray-500">لا توجد تذاكر دعم.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
