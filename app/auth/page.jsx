"use client";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

function AuthPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect") || "/";

  const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { phone: phone } }
      });
      setLoading(false);
      if (error) return setMsg({ type: "error", text: error.message });
      if (data.user) {
        await supabase.from("users").upsert({ id: data.user.id, phone: phone });
      }
      setMsg({ type: "success", text: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيله." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email, password: password });
      setLoading(false);
      if (error) return setMsg({ type: "error", text: error.message });

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session) {
        fetch("/api/log-login", {
          method: "POST",
          headers: { Authorization: "Bearer " + session.access_token }
        }).catch(function () {});
      }

      router.push(redirectTo);
    }
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="font-display text-2xl mb-4 text-center">
        {mode === "signup" ? "إنشاء حساب جديد" : "تسجيل الدخول"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={email}
          onChange={function (e) {
            setEmail(e.target.value);
          }}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={password}
          onChange={function (e) {
            setPassword(e.target.value);
          }}
          required
        />
        {mode === "signup" && (
          <input
            type="tel"
            placeholder="رقم الهاتف"
            dir="ltr"
            className="w-full border border-[var(--line)] rounded-lg p-2.5 font-mono-num text-left"
            value={phone}
            onChange={function (e) {
              setPhone(e.target.value);
            }}
            required
          />
        )}

        <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "...جارِ المعالجة" : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}
        </button>
      </form>

      {mode === "login" && (
        <button
          type="button"
          onClick={function () {
            router.push("/auth/forgot-password");
          }}
          className="block text-sm text-gray-500 mt-3 underline mx-auto"
        >
          نسيت كلمة المرور؟
        </button>
      )}

      <button
        type="button"
        onClick={function () {
          setMode(mode === "signup" ? "login" : "signup");
          setMsg(null);
        }}
        className="block text-sm text-[var(--emerald)] font-bold mt-4 mx-auto"
      >
        {mode === "signup" ? "لديك حساب بالفعل؟ سجّل الدخول" : "ليس لديك حساب؟ أنشئ واحداً"}
      </button>

      {msg && (
        <p className={"text-sm mt-4 text-center " + (msg.type === "error" ? "text-[var(--ember)]" : "text-[var(--emerald)]")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
