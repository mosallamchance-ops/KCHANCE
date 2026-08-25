"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: { phone: phone } }
      });
      if (error) return setMsg(error.message);
      if (data.user) {
        await supabase.from("users").upsert({ id: data.user.id, phone: phone });
      }
      setMsg("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيله.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email, password: password });
      if (error) return setMsg(error.message);

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session) {
        fetch("/api/log-login", {
          method: "POST",
          headers: { Authorization: "Bearer " + session.access_token }
        }).catch(function () {});
      }

      router.push("/");
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-6">
        <p className="font-display text-2xl text-[var(--emerald)]">منصة السحوبات</p>
      </div>
      <div className="card">
        <h1 className="font-display text-2xl mb-4">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
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
          {mode === "signup" && (
            <input
              type="tel"
              placeholder="رقم الهاتف"
              className="w-full border border-[var(--line)] rounded-lg p-2.5"
              value={phone}
              onChange={function (e) {
                setPhone(e.target.value);
              }}
            />
          )}
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
          <button className="btn-primary w-full">{mode === "login" ? "دخول" : "تسجيل"}</button>
        </form>
        {msg && <p className="text-sm text-[var(--emerald)] mt-3">{msg}</p>}

        {mode === "login" && (
          <a href="/auth/forgot-password" className="text-sm text-gray-500 mt-3 underline block">
            نسيت كلمة المرور؟
          </a>
        )}

        <button
          className="text-sm text-gray-500 mt-4 underline"
          onClick={function () {
            setMode(mode === "login" ? "signup" : "login");
          }}
        >
          {mode === "login" ? "ليس لديك حساب؟ أنشئ واحداً" : "لديك حساب بالفعل؟ سجل الدخول"}
        </button>
      </div>
    </div>
  );
}
