"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [notifStatus, setNotifStatus] = useState(null);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await res.json();
    if (res.ok) setData(result);
    else setMsg(result.error);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleStatus() {
    const newStatus = data.user.status === "active" ? "suspended" : "active";
    if (!confirm(newStatus === "suspended" ? "تعليق حساب هذا المستخدم؟" : "إعادة تفعيل هذا الحساب؟")) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  async function sendNotification(e) {
    e.preventDefault();
    setNotifStatus(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id: id, title: notifTitle, message: notifMsg })
    });
    const result = await res.json();
    if (!res.ok) setNotifStatus({ type: "error", text: result.error });
    else {
      setNotifStatus({ type: "success", text: "تم إرسال الإشعار." });
      setNotifTitle("");
      setNotifMsg("");
    }
  }

  if (msg) return <p className="text-red-600">{msg}</p>;
  if (!data) return <p className="text-gray-500">...جارِ التحميل</p>;

    function computeLifecycle() {
    const deposits = transactions.filter(function (t) {
      return t.type === "deposit";
    });
    const purchases = transactions.filter(function (t) {
      return t.type === "purchase";
    });
    const firstDeposit = deposits.length
      ? deposits.reduce(function (a, b) {
          return new Date(a.created_at) < new Date(b.created_at) ? a : b;
        })
      : null;
    const firstPurchase = purchases.length
      ? purchases.reduce(function (a, b) {
          return new Date(a.created_at) < new Date(b.created_at) ? a : b;
        })
      : null;
    const totalDeposited = deposits.reduce(function (s, t) {
      return s + Number(t.amount);
    }, 0);
    const totalSpent = purchases.reduce(function (s, t) {
      return s + Math.abs(Number(t.amount));
    }, 0);

    return {
      firstDepositDate: firstDeposit ? new Date(firstDeposit.created_at) : null,
      firstPurchaseDate: firstPurchase ? new Date(firstPurchase.created_at) : null,
      totalDeposited,
      totalSpent,
      purchaseCount: purchases.length,
      winCount: winners.length
    };
  }
  const lifecycle = computeLifecycle();

  function parseDevice(ua) {
    if (!ua) return "غير معروف";
    let browser = "متصفح غير معروف";
    if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
    else if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

    let os = "نظام غير معروف";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return browser + " — " + os;
  }

  function goToUser(userId) {
    router.push("/admin/users/" + userId);
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="card flex justify-between items-start">
          <div className="space-y-1 text-sm">
            <h1 className="text-xl font-bold">
              {user.first_name || "—"} {user.last_name || ""}
            </h1>
            <p className="text-gray-500">📧 {user.email || "—"}</p>
            <p className="text-gray-500">
              ✉️ تأكيد البريد: {user.email_confirmed_at ? "مؤكد" : "غير مؤكد"}
            </p>
            <p className="text-gray-500">📱 الهاتف: {user.phone || "—"}</p>
            <p className="text-gray-500">🎂 العمر: {user.age || "—"}</p>
            <p className="text-gray-500">⚧ الجنس: {user.gender || "—"}</p>
            <p className="text-gray-500">📍 المحافظة: {user.province || "—"}</p>
            <p className="text-gray-500">💳 رقم المحفظة: {user.wallet_number || "—"}</p>
            <p className="font-bold text-brand-600 text-base mt-1">الرصيد: {user.balance} ل.س</p>
            <p>
              الحالة:{" "}
              <span className={user.status === "active" ? "text-green-600" : "text-red-600"}>
                {user.status === "active" ? "نشط" : "معلّق"}
              </span>
            </p>
                        <div className="pt-2 border-t mt-2 text-gray-400 text-xs space-y-1">
              <p>
                تاريخ إنشاء الحساب:{" "}
                {user.auth_created_at ? new Date(user.auth_created_at).toLocaleString("ar") : "—"}
              </p>
              <p>
                آخر تسجيل دخول:{" "}
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("ar") : "لم يسجل الدخول بعد"}
              </p>
              <p>
                آخر تحديث للملف الشخصي:{" "}
                {user.updated_at ? new Date(user.updated_at).toLocaleString("ar") : "—"}
              </p>
            </div>

            <div className="pt-2 border-t mt-2 space-y-1 text-xs">
              <p className="font-bold text-[var(--ink)]">دورة حياة المستخدم:</p>
              <p className="text-gray-500">
                أول شحن رصيد: {lifecycle.firstDepositDate ? lifecycle.firstDepositDate.toLocaleDateString("ar") : "لم يشحن بعد"}
              </p>
              <p className="text-gray-500">
                أول شراء تذكرة:{" "}
                {lifecycle.firstPurchaseDate ? lifecycle.firstPurchaseDate.toLocaleDateString("ar") : "لم يشترِ بعد"}
              </p>
              <p className="text-gray-500 font-mono-num">إجمالي المشحون: {lifecycle.totalDeposited} ل.س</p>
              <p className="text-gray-500 font-mono-num">إجمالي المصروف على تذاكر: {lifecycle.totalSpent} ل.س</p>
              <p className="text-gray-500 font-mono-num">عدد عمليات الشراء: {lifecycle.purchaseCount}</p>
              <p className="text-gray-500 font-mono-num">عدد مرات الفوز: {lifecycle.winCount}</p>
            </div>
          </div>
          <button
            onClick={toggleStatus}
            className={
              "py-2 px-4 rounded-lg border whitespace-nowrap " +
              (user.status === "active" ? "border-red-300 text-red-600" : "border-green-300 text-green-600")
            }
          >
            {user.status === "active" ? "تعليق الحساب" : "إعادة تفعيل الحساب"}
          </button>
        </div>

        <form onSubmit={sendNotification} className="card space-y-2">
          <h2 className="font-bold">إرسال إشعار</h2>
          <input
            placeholder="عنوان الإشعار"
            className="w-full border rounded-lg p-2"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="نص الإشعار"
            className="w-full border rounded-lg p-2"
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            required
          />
          <button className="btn-primary">إرسال</button>
          {notifStatus && (
            <p className={notifStatus.type === "error" ? "text-red-600 text-sm" : "text-green-600 text-sm"}>
              {notifStatus.text}
            </p>
          )}
        </form>

        {relatedAccounts.length > 0 && (
          <div className="card border-2 border-red-300">
            <h2 className="font-bold text-red-600 mb-2">⚠️ حسابات محتملة الارتباط</h2>
            <p className="text-xs text-gray-500 mb-2">
              هذه الحسابات سجّلت دخولاً من نفس عنوان IP و/أو نفس الجهاز — قد تكون حسابات متعددة لنفس الشخص.
            </p>
            <div className="space-y-2">
              {relatedAccounts.map(function (acc) {
                return (
                  <div
                    key={acc.id}
                    onClick={function () {
                      goToUser(acc.id);
                    }}
                    className="flex justify-between items-center text-sm border rounded-lg p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <span>
                      {acc.first_name || "—"} {acc.last_name || ""} — {acc.phone || "بدون هاتف"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {acc.sharedIp && "نفس IP "}
                      {acc.sharedAgent && "نفس الجهاز"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-bold mb-2">سجل تسجيل الدخول</h2>
          <div className="space-y-2">
            {loginEvents.map(function (e, i) {
              return (
                <div key={i} className="card flex justify-between text-sm">
                  <div>
                    <p className="font-bold">{parseDevice(e.user_agent)}</p>
                    <p className="text-gray-500">IP: {e.ip_address || "غير معروف"}</p>
                  </div>
                  <p className="text-gray-400">{new Date(e.created_at).toLocaleString("ar")}</p>
                </div>
              );
            })}
            {loginEvents.length === 0 && (
              <p className="text-gray-500 text-sm">لا يوجد سجل دخول مسجّل بعد (يبدأ التسجيل من هذا التحديث فصاعداً).</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">الجوائز</h2>
          <div className="space-y-2">
            {winners.map(function (w) {
              return (
                <div key={w.id} className="card text-sm">
                  <p className="font-bold">{w.draws?.products?.name}</p>
                  <p>
                    {w.prize_type === "product" ? "المنتج" : w.prize_amount + " ل.س"} — {w.status}
                  </p>
                </div>
              );
            })}
            {winners.length === 0 && <p className="text-gray-500 text-sm">لا توجد جوائز.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">التذاكر</h2>
          <div className="space-y-2">
            {tickets.map(function (t) {
              return (
                <div key={t.id} className="card flex justify-between text-sm">
                  <p>
                    {t.draws?.products?.name} — #{t.ticket_number}
                  </p>
                  <p className="text-gray-400">{new Date(t.created_at).toLocaleDateString("ar")}</p>
                </div>
              );
            })}
            {tickets.length === 0 && <p className="text-gray-500 text-sm">لا توجد تذاكر.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">سجل المعاملات</h2>
          <div className="space-y-2">
            {transactions.map(function (t) {
              return (
                <div key={t.id} className="card flex justify-between text-sm">
                  <div>
                    <p className="font-bold">{t.description}</p>
                    <p className="text-gray-400">{new Date(t.created_at).toLocaleString("ar")}</p>
                  </div>
                  <p className={t.amount >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount} ل.س
                  </p>
                </div>
              );
            })}
            {transactions.length === 0 && <p className="text-gray-500 text-sm">لا توجد معاملات.</p>}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
