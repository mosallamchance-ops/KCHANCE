"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      return setMsg({ type: "error", text: "يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل." });
    }
    if (newPassword !== confirmPassword) {
      return setMsg({ type: "error", text: "كلمتا المرور غير متطابقتين." });
    }

    setLoading(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      setLoading(false);
      return setMsg({ type: "error", text: "كلمة المرور الحالية غير صحيحة." });
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) setMsg({ type: "error", text: error.message });
    else {
      setMsg({ type: "success", text: "تم تغيير كلمة المرور بنجاح." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="font-display text-2xl mb-4">تغيير كلمة المرور</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="كلمة المرور الحالية"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={currentPassword}
          onChange={function (e) {
            setCurrentPassword(e.target.value);
          }}
          required
        />
        <input
          type="password"
          placeholder="كلمة المرور الجديدة"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={newPassword}
          onChange={function (e) {
            setNewPassword(e.target.value);
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
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "...جارِ الحفظ" : "حفظ التغييرات"}
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
