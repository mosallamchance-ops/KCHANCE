"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(function (event) {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(function (result) {
      if (result.data.session) setReady(true);
    });

    return function () {
      listener.subscription.unsubscribe();
    };
  }, []);

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

    if (error) setMsg({ type: "error", text: error.message });
    else {
      setMsg({ type: "success", text: "تم تحديث كلمة المرور بنجاح! سيتم تحويلك الآن." });
      setTimeout(function () {
        router.push("/");
      }, 1500);
    }
  }

  if (!ready) {
    return (
      <div className="max-w-sm mx-auto card">
        <p className="text-gray-500 text-sm">
          ...جارِ التحقق من رابط إعادة التعيين. إذا لم يعمل هذا خلال لحظات، فقد يكون الرابط منتهي الصلاحية — يرجى طلب
          رابط جديد من صفحة{" "}
          <a href="/auth/forgot-password" className="text-[var(--emerald)] underline">
            نسيت كلمة المرور
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="font-display text-2xl mb-4">إعادة تعيين كلمة المرور</h1>
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
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "...جارِ الحفظ" : "حفظ كلمة المرور الجديدة"}
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
