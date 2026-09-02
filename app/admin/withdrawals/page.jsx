"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/withdrawals", {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await res.json();
    if (res.ok) setWithdrawals(result.withdrawals ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(withdrawal_id, action) {
    setMsg(null);
    let rejection_reason = null;
    if (action === "rejected") {
      rejection_reason = prompt("سبب الرفض (اختياري):") || "";
    }
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ withdrawal_id, action, rejection_reason })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  return (
    <AdminGuard>
      <div>
        <h1 className="text-xl font-bold mb-4">طلبات سحب الرصيد</h1>
        {msg && <p className="text-red-600 mb-2">{msg}</p>}
        <div className="space-y-3">
          {withdrawals.map((w) => (
            <div key={w.id} className="card flex justify-between items-center">
              <div className="text-sm">
                <p className="font-bold">
                  {w.users?.first_name} {w.users?.last_name} — {w.users?.phone}
                </p>
                <p>المبلغ: {w.amount} ل.س</p>
                <p>عنوان المحفظة: {w.wallet_address}</p>
                <p className="text-gray-400">{new Date(w.created_at).toLocaleString("ar")}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => act(w.id, "paid")}>
                  تم الدفع
                </button>
                <button
                  className="py-2 px-4 rounded-lg border border-red-300 text-red-600"
                  onClick={() => act(w.id, "rejected")}
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
          {withdrawals.length === 0 && <p className="text-gray-500">لا توجد طلبات معلقة.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
