"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusAr = { pending: "قيد الانتظار", verified: "تم التحقق", delivered: "تم التسليم", completed: "مكتملة" };

export default function MyPrizesPage() {
  const [prizes, setPrizes] = useState([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("winners")
        .select("id, prize_type, prize_amount, status, created_at, draws(products(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPrizes(data ?? []);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl mb-4">جوائزي</h1>
      <div className="space-y-2">
        {prizes.map(function (p) {
          return (
            <div key={p.id} className="card">
              <p className="font-bold">{p.draws?.products?.name}</p>
              <p className="text-sm text-gray-500 font-mono-num">
                {p.prize_type === "product" ? "جائزة: المنتج" : "جائزة نقدية: $" + p.prize_amount}
              </p>
              <p className="text-sm text-gray-500">تاريخ الفوز: {new Date(p.created_at).toLocaleDateString("ar")}</p>
              <p className="text-sm font-bold mt-1 text-[var(--emerald)]">حالة الاستلام: {statusAr[p.status]}</p>
            </div>
          );
        })}
        {prizes.length === 0 && <p className="text-gray-500">لا توجد جوائز بعد.</p>}
      </div>
    </div>
  );
}
