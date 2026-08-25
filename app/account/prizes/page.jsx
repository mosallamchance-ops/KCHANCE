"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const statusAr = {
  pending: "قيد الانتظار",
  verified: "تم استلام بيانات التسليم",
  delivered: "تم التسليم",
  completed: "مكتملة"
};

export default function MyPrizesPage() {
  const [prizes, setPrizes] = useState([]);
  const [forms, setForms] = useState({});
  const [msgs, setMsgs] = useState({});

  async function load() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("winners")
      .select(
        "id, prize_type, prize_amount, status, created_at, claim_payment_method, claim_wallet_address, claim_shipping_address, claim_phone, claim_submitted_at, draws(products(name))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setPrizes(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function updateForm(id, field, value) {
    setForms((f) => ({ ...f, [id]: { ...f[id], [field]: value } }));
  }

  async function submitClaim(prize) {
    setMsgs((m) => ({ ...m, [prize.id]: null }));
    const form = forms[prize.id] || {};

    if (prize.prize_type === "cash" && !form.payment_method) {
      return setMsgs((m) => ({ ...m, [prize.id]: { type: "error", text: "الرجاء اختيار طريقة الاستلام." } }));
    }
    if (prize.prize_type === "product" && !form.shipping_address) {
      return setMsgs((m) => ({ ...m, [prize.id]: { type: "error", text: "الرجاء إدخال عنوان التوصيل." } }));
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    const res = await fetch("/api/claim-prize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        winner_id: prize.id,
        payment_method: form.payment_method,
        wallet_address: form.wallet_address,
        shipping_address: form.shipping_address,
        phone: form.phone
      })
    });
    const result = await res.json();

    if (!res.ok) setMsgs((m) => ({ ...m, [prize.id]: { type: "error", text: result.error } }));
    else {
      setMsgs((m) => ({ ...m, [prize.id]: { type: "success", text: "تم إرسال بيانات الاستلام بنجاح." } }));
      load();
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">جوائزي</h1>
      <div className="space-y-3">
        {prizes.map((p) => {
          const claimed = !!p.claim_submitted_at;
          const form = forms[p.id] || {};
          const msg = msgs[p.id];

          return (
            <div key={p.id} className="card">
              <p className="font-bold">{p.draws?.products?.name}</p>
              <p className="text-sm text-gray-500">
                {p.prize_type === "product" ? "جائزة: المنتج" : `جائزة نقدية: $${p.prize_amount}`}
              </p>
              <p className="text-sm text-gray-500">تاريخ الفوز: {new Date(p.created_at).toLocaleDateString("ar")}</p>
              <p className="text-sm font-bold mt-1">حالة الاستلام: {statusAr[p.status]}</p>

              {claimed ? (
                <div className="mt-3 text-sm bg-gray-50 rounded-lg p-2">
                  <p className="text-green-600 font-bold">تم إرسال بيانات الاستلام، سيتم التواصل معك قريباً.</p>
                  {p.claim_payment_method && (
                    <p className="text-gray-500 mt-1">
                      طريقة الاستلام: {p.claim_payment_method === "cash" ? "نقداً" : "USDT (TRC20)"}
                    </p>
                  )}
                  {p.claim_wallet_address && <p className="text-gray-500">عنوان المحفظة: {p.claim_wallet_address}</p>}
                  {p.claim_shipping_address && <p className="text-gray-500">عنوان التوصيل: {p.claim_shipping_address}</p>}
                </div>
              ) : (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <p className="font-bold text-sm">أدخل بيانات استلام الجائزة:</p>

                  {p.prize_type === "cash" ? (
                    <>
                      <select
                        className="w-full border rounded-lg p-2 text-sm"
                        value={form.payment_method || ""}
                        onChange={(e) => updateForm(p.id, "payment_method", e.target.value)}
                      >
                        <option value="">اختر طريقة الاستلام</option>
                        <option value="cash">نقداً</option>
                        <option value="usdt_trc20">USDT (TRC20)</option>
                      </select>
                      {form.payment_method === "usdt_trc20" && (
                        <input
                          placeholder="عنوان محفظة USDT (TRC20)"
                          className="w-full border rounded-lg p-2 text-sm"
                          value={form.wallet_address || ""}
                          onChange={(e) => updateForm(p.id, "wallet_address", e.target.value)}
                        />
                      )}
                    </>
                  ) : (
                    <textarea
                      placeholder="عنوان التوصيل الكامل (المحافظة، المدينة، الشارع...)"
                      className="w-full border rounded-lg p-2 text-sm"
                      value={form.shipping_address || ""}
                      onChange={(e) => updateForm(p.id, "shipping_address", e.target.value)}
                    />
                  )}

                  <input
                    placeholder="رقم هاتف للتواصل"
                    className="w-full border rounded-lg p-2 text-sm"
                    value={form.phone || ""}
                    onChange={(e) => updateForm(p.id, "phone", e.target.value)}
                  />

                  <button className="btn-primary w-full text-sm" onClick={() => submitClaim(p)}>
                    إرسال بيانات الاستلام
                  </button>
                  {msg && (
                    <p className={`text-sm ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {prizes.length === 0 && <p className="text-gray-500">لا توجد جوائز بعد.</p>}
      </div>
    </div>
  );
}
