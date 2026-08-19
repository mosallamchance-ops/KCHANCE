"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusOptions = ["pending", "verified", "delivered", "completed"];
const statusAr = { pending: "قيد الانتظار", verified: "تم التحقق", delivered: "تم التسليم", completed: "مكتملة" };

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("winners")
      .select("id, prize_type, prize_amount, status, created_at, users(first_name, last_name, phone), draws(products(name))")
      .order("created_at", { ascending: false });
    setWinners(data ?? []);
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ winner_id, status })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">الفائزون والجوائز</h1>
      {msg && <p className="text-red-600 mb-2">{msg}</p>}
      <div className="space-y-3">
        {winners.map((w) => (
          <div key={w.id} className="card flex flex-wrap justify-between items-center gap-3 text-sm">
            <div>
              <p className="font-bold">{w.draws?.products?.name}</p>
              <p className="text-gray-500">
                {w.users?.first_name} {w.users?.last_name} — {w.users?.phone}
              </p>
              <p className="text-gray-500">
                {w.prize_type === "product" ? "جائزة: المنتج" : `جائزة نقدية: $${w.prize_amount}`}
              </p>
              <p className="text-gray-400">{new Date(w.created_at).toLocaleDateString("ar")}</p>
            </div>
            <select
              className="border rounded-lg p-2"
              value={w.status}
              onChange={(e) => updateStatus(w.id, e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusAr[s]}
                </option>
              ))}
            </select>
          </div>
        ))}
        {winners.length === 0 && <p className="text-gray-500">لا يوجد فائزون بعد.</p>}
      </div>
    </div>
  );
}
