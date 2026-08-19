"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("deposits")
      .select("*, users(phone, first_name, last_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setDeposits(data ?? []);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ deposit_id, action })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">طلبات شحن الرصيد المعلقة</h1>
      {msg && <p className="text-red-600 mb-2">{msg}</p>}
      <div className="space-y-3">
        {deposits.map((d) => (
          <div key={d.id} className="card flex justify-between items-center">
            <div className="text-sm">
              <p className="font-bold">
                {d.users?.first_name} {d.users?.last_name} — {d.users?.phone}
              </p>
              <p>المبلغ: ${d.amount}</p>
              <p>رقم العملية: {d.transaction_code}</p>
              <p>المحفظة المرسلة: {d.sender_wallet}</p>
              <p className="text-gray-400">{new Date(d.created_at).toLocaleString("ar")}</p>
              {d.receipt_url && (
                <button className="text-brand-600 underline" onClick={() => viewReceipt(d.receipt_url)}>
                  عرض الإيصال
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => act(d.id, "approve")}>
                قبول
              </button>
              <button
                className="py-2 px-4 rounded-lg border border-red-300 text-red-600"
                onClick={() => act(d.id, "reject")}
              >
                رفض
              </button>
            </div>
          </div>
        ))}
        {deposits.length === 0 && <p className="text-gray-500">لا توجد طلبات معلقة.</p>}
      </div>
    </div>
  );
}
