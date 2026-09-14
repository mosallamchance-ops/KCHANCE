"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (password.length < 6) {
      return setMsg({ type: "error", text: "يجب أن تكون كلمة المرور 6 أحرف على الأقل." });
    }
    if (password !== confirmPassword) {
      return setMsg({ type: "error", text: "كلمتا المرور غير متطابقتين." });
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });
    setLoading(false);

    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }

    setMsg({ type: "success", text: "تم تعيين كلمة المرور الجديدة بنجاح." });
    setTimeout(function () {
      router.push("/auth");
    }, 1500);
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="font-display text-2xl mb-4 text-center">تعيين كلمة مرور جديدة</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="كلمة المرور الجديدة"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={password}
          onChange={function (e) {
            setPassword(e.target.value);
          }}
          required
        />
        <input
          type="password"
          placeholder="تأكيد كلمة المرور الجديدة"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={confirmPassword}
          onChange={function (e) {
            setConfirmPassword(e.target.value);
          }}
          required
        />
        <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? "...جارِ الحفظ" : "حفظ كلمة المرور"}
        </button>
      </form>

      {msg && (
        <p className={"text-sm mt-3 text-center " + (msg.type === "error" ? "text-[var(--ember)]" : "text-[var(--emerald)]")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
