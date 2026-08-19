"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Countdown from "@/components/Countdown";

export default function DrawDetailPage() {
  const { id } = useParams();
  const [draw, setDraw] = useState(null);
  const [qty, setQty] = useState(1);
  const [balance, setBalance] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'error'|'success', msg }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: drawData } = await supabase
        .from("draws")
        .select("*, products(name, description, image_url, product_value)")
        .eq("id", id)
        .single();
      setDraw(drawData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single();
        setBalance(profile?.balance ?? 0);
      }
    }
    load();
  }, [id]);

  if (!draw) return <p>...جارِ التحميل</p>;

  const remaining = draw.total_tickets - draw.sold_tickets;
  const max = Math.min(draw.max_tickets_per_user, remaining);
  const total = (qty * draw.ticket_price).toFixed(2);

  async function handleConfirmPurchase() {
    setLoading(true);
    setStatus(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus({ type: "error", msg: "الرجاء تسجيل الدخول أولاً." });
      setLoading(false);
      return;
    }

    const res = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ draw_id: draw.id, quantity: qty })
    });
    const result = await res.json();
    setLoading(false);
    setConfirming(false);

    if (!res.ok) {
      setStatus({ type: "error", msg: result.error || "حدث خطأ أثناء الشراء." });
    } else {
      setStatus({ type: "success", msg: `تم شراء ${qty} تذكرة بنجاح!` });
      setBalance((b) => b - Number(total));
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draw.products.image_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">{draw.products?.name}</h1>
        <p className="text-gray-600 mt-2">{draw.products?.description}</p>
        <p className="text-brand-600 font-bold text-xl mt-2">قيمة المنتج: ${draw.products?.product_value}</p>

        <div className="card mt-4 space-y-1 text-sm">
          <p>سعر التذكرة: ${draw.ticket_price}</p>
          <p>عدد التذاكر الإجمالي: {draw.total_tickets}</p>
          <p>التذاكر المباعة: {draw.sold_tickets}</p>
          <p>التذاكر المتبقية: {remaining}</p>
          <p>الحد الأقصى للتذاكر لكل مستخدم: {draw.max_tickets_per_user}</p>
          <p>
            الوقت المتبقي: <Countdown endAt={draw.end_at} />
          </p>
        </div>

        {draw.status !== "active" || remaining <= 0 ? (
          <p className="mt-4 text-red-600 font-bold">هذا السحب غير متاح للشراء حالياً.</p>
        ) : (
          <div className="card mt-4">
            <p className="font-bold mb-2">اختر عدد التذاكر:</p>
            <div className="flex items-center gap-3">
              <button className="btn-primary px-3" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                -
              </button>
              <span className="font-bold text-lg">{qty}</span>
              <button className="btn-primary px-3" onClick={() => setQty((q) => Math.min(max, q + 1))}>
                +
              </button>
            </div>
            <p className="mt-3">الإجمالي: <span className="font-bold">${total}</span></p>
            <p className="text-sm text-gray-500">الرصيد الحالي: ${balance}</p>
            <button className="btn-primary w-full mt-4" onClick={() => setConfirming(true)}>
              شراء التذاكر
            </button>
          </div>
        )}

        {status && (
          <p className={`mt-3 font-bold ${status.type === "error" ? "text-red-600" : "text-green-600"}`}>
            {status.msg}
          </p>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-3">تأكيد عملية الشراء</h3>
            <p>المنتج: {draw.products?.name}</p>
            <p>عدد التذاكر: {qty}</p>
            <p>سعر التذكرة: ${draw.ticket_price}</p>
            <p>الإجمالي: ${total}</p>
            <p>الرصيد بعد العملية: ${(balance - total).toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-3">
              أقر بأن عملية شراء التذاكر نهائية وغير قابلة للإلغاء أو الاسترداد.
            </p>
            <div className="flex gap-2 mt-4">
              <button disabled={loading} className="btn-primary flex-1" onClick={handleConfirmPurchase}>
                {loading ? "...جارِ التنفيذ" : "تأكيد الشراء"}
              </button>
              <button className="flex-1 py-2 rounded-lg border" onClick={() => setConfirming(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
