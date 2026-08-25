"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/deposits/list", {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) setDeposits(result.deposits ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function viewReceipt(path) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function act(deposit_id, action) {
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ deposit_id: deposit_id, action: action })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  return (
    <AdminGuard>
      <div>
        <h1 className="font-display text-2xl mb-4">طلبات شحن الرصيد المعلقة</h1>
        {msg && <p className="text-[var(--ember)] mb-2">{msg}</p>}
        <div className="space-y-3">
          {deposits.map(function (d) {
            return (
              <div key={d.id} className="card flex flex-wrap justify-between items-center gap-3">
                <div className="text-sm">
                  <p className="font-bold">
                    {d.users?.first_name} {d.users?.last_name} — {d.users?.phone}
                  </p>
                  <p className="font-mono-num">المبلغ: ${d.amount}</p>
                  <p>رقم العملية: {d.transaction_code}</p>
                  <p>المحفظة المرسلة: {d.sender_wallet}</p>
                  <p className="text-gray-400">{new Date(d.created_at).toLocaleString("ar")}</p>
                  {d.receipt_url && (
                    <button
                      className="text-[var(--emerald)] underline"
                      onClick={function () {
                        viewReceipt(d.receipt_url);
                      }}
                    >
                      عرض الإيصال
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={function () {
                      act(d.id, "approve");
                    }}
                  >
                    قبول
                  </button>
                  <button
                    className="py-2.5 px-4 rounded-xl border border-[var(--ember)] text-[var(--ember)] font-bold"
                    onClick={function () {
                      act(d.id, "reject");
                    }}
                  >
                    رفض
                  </button>
                </div>
              </div>
            );
          })}
          {deposits.length === 0 && <p className="text-gray-500">لا توجد طلبات معلقة.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
