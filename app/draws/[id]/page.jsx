"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Countdown from "@/components/Countdown";

export default function DrawDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [draw, setDraw] = useState(null);
  const [qty, setQty] = useState(1);
  const [balance, setBalance] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: drawData } = await supabase
        .from("draws")
        .select("*, products(name, description, image_url, product_value)")
        .eq("id", id)
        .single();
      setDraw(drawData);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        setLoggedIn(true);
        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single();
        setBalance(profile?.balance ?? 0);
      } else {
        setLoggedIn(false);
      }
      setCheckedAuth(true);
    }
    load();
  }, [id]);

  if (!draw || !checkedAuth) return <p className="text-gray-500">...جارِ التحميل</p>;

  const remaining = draw.total_tickets - draw.sold_tickets;
  const max = Math.min(draw.max_tickets_per_user, remaining);
  const total = (qty * draw.ticket_price).toFixed(2);
  const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));

  async function handleConfirmPurchase() {
    setLoading(true);
    setStatus(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      setStatus({ type: "error", msg: "الرجاء تسجيل الدخول أولاً." });
      setLoading(false);
      setConfirming(false);
      return;
    }

    const res = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ draw_id: draw.id, quantity: qty })
    });
    const result = await res.json();
    setLoading(false);
    setConfirming(false);

    if (!res.ok) {
      setStatus({ type: "error", msg: result.error || "حدث خطأ أثناء الشراء." });
    } else {
      setStatus({ type: "success", msg: "تم شراء " + qty + " تذكرة بنجاح!" });
      setBalance(function (b) {
        return b - Number(total);
      });
    }
  }

  const drawOpen = draw.status === "active" && remaining > 0;

  return (
    <div>
      <div className="ticket-card md:grid md:grid-cols-2 md:gap-0">
        <div className="aspect-video md:aspect-auto md:h-full bg-gray-100">
          {draw.products?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draw.products.image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-5 sm:p-7">
          <h1 className="font-display text-3xl">{draw.products?.name}</h1>
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">{draw.products?.description}</p>
          <p className="font-display text-2xl text-[var(--emerald)] mt-3">
            قيمة المنتج: ${draw.products?.product_value}
          </p>

          <div className="mt-4 border-t border-[var(--line)] pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">سعر التذكرة</span>
              <span className="font-mono-num font-bold">${draw.ticket_price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">التذاكر المباعة</span>
              <span className="font-mono-num">
                {draw.sold_tickets} / {draw.total_tickets}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--gold)]" style={{ width: soldPct + "%" }} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">التذاكر المتبقية</span>
              <span className="font-mono-num font-bold text-[var(--emerald)]">{remaining}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">الحد الأقصى لكل مستخدم</span>
              <span className="font-mono-num">{draw.max_tickets_per_user}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">الوقت المتبقي</span>
              <Countdown endAt={draw.end_at} />
            </div>
          </div>

          {!drawOpen ? (
            <p className="mt-5 text-[var(--ember)] font-bold">هذا السحب غير متاح للشراء حالياً.</p>
          ) : !loggedIn ? (
            <div className="mt-5 bg-[var(--paper)] rounded-2xl p-5 text-center">
              <p className="font-bold mb-1">سجّل الدخول لشراء تذاكر هذا السحب</p>
              <p className="text-sm text-gray-500 mb-4">تحتاج إلى حساب لتتمكن من المشاركة في السحب.</p>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1"
                  onClick={function () {
                    router.push("/auth");
                  }}
                >
                  تسجيل الدخول
                </button>
                <button
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--line)] font-bold"
                  onClick={function () {
                    router.push("/auth");
                  }}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 bg-[var(--paper)] rounded-2xl p-4">
              <p className="font-bold mb-3 text-sm">اختر عدد التذاكر:</p>
              <div className="flex items-center gap-4">
                <button
                  className="w-10 h-10 rounded-xl bg-[var(--ink)] text-white font-bold text-lg"
                  onClick={function () {
                    setQty(function (q) {
                      return Math.max(1, q - 1);
                    });
                  }}
                >
                  −
                </button>
                <span className="font-mono-num text-2xl font-bold w-8 text-center">{qty}</span>
                <button
                  className="w-10 h-10 rounded-xl bg-[var(--ink)] text-white font-bold text-lg"
                  onClick={function () {
                    setQty(function (q) {
                      return Math.min(max, q + 1);
                    });
                  }}
                >
                  +
                </button>
              </div>
              <div className="flex justify-between items-baseline mt-4">
                <span className="text-sm text-gray-500">الإجمالي</span>
                <span className="font-display text-2xl text-[var(--emerald)]">${total}</span>
              </div>
              <p className="text-xs text-gray-400 font-mono-num">الرصيد الحالي: ${balance}</p>
              <button
                className="btn-primary w-full mt-4"
                onClick={function () {
                  setConfirming(true);
                }}
              >
                شراء التذاكر
              </button>
            </div>
          )}

          {status && (
            <p className={"mt-3 font-bold text-sm " + (status.type === "error" ? "text-[var(--ember)]" : "text-[var(--emerald)]")}>
              {status.msg}
            </p>
          )}
        </div>
      </div>

      {confirming && loggedIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-display text-xl mb-3">تأكيد عملية الشراء</h3>
            <div className="text-sm space-y-1">
              <p>المنتج: {draw.products?.name}</p>
              <p>عدد التذاكر: {qty}</p>
              <p>سعر التذكرة: ${draw.ticket_price}</p>
              <p className="font-bold">الإجمالي: ${total}</p>
              <p className="text-gray-500">الرصيد بعد العملية: ${(balance - total).toFixed(2)}</p>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              أقر بأن عملية شراء التذاكر نهائية وغير قابلة للإلغاء أو الاسترداد.
            </p>
            <div className="flex gap-2 mt-4">
              <button disabled={loading} className="btn-primary flex-1" onClick={handleConfirmPurchase}>
                {loading ? "...جارِ التنفيذ" : "تأكيد الشراء"}
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl border border-[var(--line)]"
                onClick={function () {
                  setConfirming(false);
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
