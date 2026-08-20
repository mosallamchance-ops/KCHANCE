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
        email,
        password,
        options: { data: { phone } }
      });
      if (error) return setMsg(error.message);
      if (data.user) {
        await supabase.from("users").upsert({ id: data.user.id, phone });
      }
      setMsg("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيله.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setMsg(error.message);
      router.push("/");
    }
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="text-xl font-bold mb-4">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          className="w-full border rounded-lg p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode === "signup" && (
          <input
            type="tel"
            placeholder="رقم الهاتف"
            className="w-full border rounded-lg p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        )}
        <input
          type="password"
          placeholder="كلمة المرور"
          className="w-full border rounded-lg p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn-primary w-full">{mode === "login" ? "دخول" : "تسجيل"}</button>
      </form>
      {msg && <p className="text-sm text-brand-600 mt-3">{msg}</p>}
      <button
        className="text-sm text-gray-500 mt-4 underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "ليس لديك حساب؟ أنشئ واحداً" : "لديك حساب بالفعل؟ سجل الدخول"}
      </button>
    </div>
  );
}
