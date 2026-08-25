"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const statusOptions = ["pending", "verified", "delivered", "completed"];
const statusAr = { pending: "قيد الانتظار", verified: "تم التحقق", delivered: "تم التسليم", completed: "مكتملة" };

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/winners/list", {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) setWinners(result.winners ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(winner_id, status) {
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/winners", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ winner_id: winner_id, status: status })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  return (
    <AdminGuard>
      <div>
        <h1 className="font-display text-2xl mb-4">الفائزون والجوائز</h1>
        {msg && <p className="text-[var(--ember)] mb-2">{msg}</p>}
        <div className="space-y-3">
          {winners.map(function (w) {
            return (
              <div key={w.id} className="card flex flex-wrap justify-between items-start gap-3 text-sm">
                <div>
                  <p className="font-bold">{w.draws?.products?.name}</p>
                  <p className="text-gray-500">
                    {w.users?.first_name} {w.users?.last_name} — {w.users?.phone}
                  </p>
                  <p className="text-gray-500 font-mono-num">
                    {w.prize_type === "product" ? "جائزة: المنتج" : "جائزة نقدية: $" + w.prize_amount}
                  </p>
                  <p className="text-gray-400">{new Date(w.created_at).toLocaleDateString("ar")}</p>

                  {w.claim_submitted_at ? (
                    <div className="mt-2 bg-[var(--paper)] rounded-lg p-2 text-xs">
                      <p className="font-bold text-[var(--emerald)]">بيانات الاستلام المُرسلة من الفائز:</p>
                      {w.claim_payment_method && (
                        <p>طريقة الاستلام: {w.claim_payment_method === "cash" ? "نقداً" : "USDT (TRC20)"}</p>
                      )}
                      {w.claim_wallet_address && <p>عنوان المحفظة: {w.claim_wallet_address}</p>}
                      {w.claim_shipping_address && <p>عنوان التوصيل: {w.claim_shipping_address}</p>}
                      {w.claim_phone && <p>هاتف التواصل: {w.claim_phone}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--gold-deep)]">لم يرسل الفائز بيانات الاستلام بعد.</p>
                  )}
                </div>
                <select
                  className="border border-[var(--line)] rounded-lg p-2"
                  value={w.status}
                  onChange={function (e) {
                    updateStatus(w.id, e.target.value);
                  }}
                >
                  {statusOptions.map(function (s) {
                    return (
                      <option key={s} value={s}>
                        {statusAr[s]}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
          {winners.length === 0 && <p className="text-gray-500">لا يوجد فائزون بعد.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
