import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { TicketIcon, WalletIcon, TrophyIcon, ChevronLeftIcon } from "@/components/icons";

const steps = [
  {
    icon: TicketIcon,
    title: "اختر السحب",
    body: "تصفّح السحويات المتاحة على الصفحة الرئيسية، وكل سحب مرتبط بمنتج واحد بسعر تذكرة ثابت وعدد تذاكر محدد."
  },
  {
    icon: WalletIcon,
    title: "اشترِ تذكرتك",
    body: "ادفع من رصيد محفظتك، وسيحصل كل مشترٍ على رقم تذكرة عشوائي فريد مسجّل باسمه، ولا يمكن بيع الرقم نفسه لمستخدم آخر."
  },
  {
    icon: TrophyIcon,
    title: "انتظر النتيجة",
    body: "عند اكتمال بيع التذاكر أو انتهاء الوقت المحدد، يتم اختيار الفائز تلقائياً وبشكل عشوائي بالكامل."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="pb-6">
      <PageHeader title="كيف تعمل السحويات؟" />

      <div className="space-y-3 mb-6">
        {steps.map(function (s, i) {
          const Icon = s.icon;
          return (
            <div key={s.title} className="card flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--paper)] flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[var(--emerald)]" />
              </div>
              <div>
                <p className="font-bold text-sm mb-1">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mb-4">
        <h2 className="font-bold mb-2">نتيجتان محتملتان لكل سحب</h2>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
          <p>
            <span className="font-bold text-[var(--ink)]">إذا بيعت كل التذاكر قبل انتهاء الوقت المحدد</span> — يُسحب
            رقم عشوائي من بين التذاكر المباعة، ويفوز صاحبه بالمنتج نفسه.
          </p>
          <p>
            <span className="font-bold text-[var(--ink)]">إذا انتهى الوقت قبل اكتمال البيع</span> — يُسحب رقم عشوائي
            من بين المشترين، ويفوز صاحبه بجائزة نقدية تعادل 80% من إجمالي قيمة التذاكر المباعة في هذا السحب.
          </p>
        </div>
      </div>

      <Link
        href="/support/integrity"
        className="settings-group settings-row"
        style={{ display: "flex" }}
      >
        <span className="font-bold text-sm">كيف نضمن أن السحب عشوائي وعادل؟</span>
        <ChevronLeftIcon className="w-4 h-4 text-[var(--line)]" />
      </Link>
    </div>
  );
}
