"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    setLoading(false);

    if (error) setMsg({ type: "error", text: error.message });
    else
      setMsg({
        type: "success",
        text: "إذا كان هذا البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور."
      });
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="text-xl font-bold mb-4">نسيت كلمة المرور؟</h1>
      <p className="text-sm text-gray-500 mb-4">
        أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          className="w-full border rounded-lg p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "...جارِ الإرسال" : "إرسال رابط إعادة التعيين"}
        </button>
      </form>
      {msg && (
        <p className={`text-sm mt-3 ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
      )}
      <a href="/auth" className="text-sm text-gray-500 mt-4 underline block">
        العودة لتسجيل الدخول
      </a>
    </div>
  );
}
