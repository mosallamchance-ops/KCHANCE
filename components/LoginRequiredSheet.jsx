"use client";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon, ChevronLeftIcon } from "@/components/icons";

/**
 * Bottom-sheet shown when a guest tries to select/search/confirm tickets.
 * The mockup this is based on showed an inline phone-number "continue" field,
 * but this app's actual auth is email/password (phone is stored as metadata,
 * not yet used for OTP login — see the "Next Steps" list). So instead of a
 * phone input, this offers the two real entry points (log in / create
 * account) and carries the current draw along via ?redirect= so the person
 * lands back exactly here once they're signed in.
 */
export default function LoginRequiredSheet({ open, onClose, productName, productImage, redirectPath }) {
  const router = useRouter();

  if (!open) return null;

  function goTo(mode) {
    const params = new URLSearchParams({ mode, redirect: redirectPath });
    router.push("/auth?" + params.toString());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[var(--card)] rounded-t-3xl p-5 pb-6 animate-[slideUp_0.2s_ease-out]">
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[var(--paper)] flex items-center justify-center text-lg"
        >
          ✕
        </button>

        <div className="flex items-center justify-end gap-3 mb-5 pl-10">
          <div className="text-right">
            <p className="text-xs text-gray-500">أنت على وشك المشاركة في سحب</p>
            <p className="font-bold text-sm">{productName}</p>
          </div>
          {productImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={productImage} alt={productName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          )}
        </div>

        <h2 className="font-display text-2xl mb-1.5 text-center">سجّل دخولك لإكمال الشراء</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          سنحفظ هذا السحب ونُعيدك إليه مباشرة بعد تسجيل الدخول.
        </p>

        <button
          onClick={function () {
            goTo("login");
          }}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
        >
          تسجيل الدخول
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--line)]" />
          <span className="text-xs text-gray-400">أو</span>
          <div className="flex-1 h-px bg-[var(--line)]" />
        </div>

        <button
          onClick={function () {
            goTo("signup");
          }}
          className="w-full border border-[var(--line)] rounded-xl py-3 font-bold text-sm mb-6"
        >
          إنشاء حساب جديد
        </button>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5 justify-center">
            <span>⏱️</span>
            يستغرق إنشاء الحساب أقل من دقيقة
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-[var(--emerald)]" strokeWidth={2.2} />
            لن يتم حجز أي مبلغ قبل تأكيدك
          </div>
        </div>
      </div>
    </div>
  );
}
