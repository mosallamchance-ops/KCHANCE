"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleDelete(e) {
    e.preventDefault();
    setMsg(null);

    if (!confirmed) {
      setMsg({ type: "error", text: "الرجاء تأكيد أنك قرأت الشروط أعلاه." });
      return;
    }

    setLoading(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMsg({ type: "error", text: data.error || "حدث خطأ، حاول مرة أخرى." });
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="font-display text-2xl mb-4 text-[var(--ember)]">حذف الحساب</h1>

      <div className="text-sm text-gray-600 leading-relaxed space-y-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 mb-4">
        <p>قبل المتابعة، يرجى العلم أنه بحسب شروط الاستخدام:</p>
        <ul className="list-disc pr-4 space-y-1">
          <li>حذف الحساب لا يلغي التذاكر التي تم شراؤها مسبقاً.</li>
          <li>حذف الحساب لا يؤدي إلى استرداد الرصيد المشحون.</li>
          <li>أي سحوبات أو معاملات معلّقة وقت الحذف قد تستكمل معالجتها وفق الشروط.</li>
          <li>لن تتمكن من تسجيل الدخول إلى هذا الحساب مرة أخرى بعد الحذف.</li>
        </ul>
      </div>

      <form onSubmit={handleDelete} className="space-y-3">
        <input
          type="password"
          placeholder="أدخل كلمة المرور لتأكيد الحذف"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={password}
          onChange={function (e) {
            setPassword(e.target.value);
          }}
          required
        />

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={function (e) {
              setConfirmed(e.target.checked);
            }}
            className="mt-1"
          />
          فهمت ما ورد أعلاه، وأرغب في حذف حسابي نهائياً.
        </label>

        <button
          disabled={loading || !confirmed}
          className="w-full py-3 rounded-xl bg-[var(--ember)] text-white font-bold disabled:opacity-40"
        >
          {loading ? "...جارِ الحذف" : "حذف حسابي نهائياً"}
        </button>
      </form>

      {msg && (
        <p className={"text-sm mt-3 " + (msg.type === "error" ? "text-[var(--ember)]" : "text-[var(--emerald)]")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
