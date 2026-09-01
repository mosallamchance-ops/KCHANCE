import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { ShieldCheckIcon, TicketIcon } from "@/components/icons";

const timeline = [
  { n: 1, title: "أُغلق بيع التذاكر", body: "يتوقف البيع فور اكتمال التذاكر أو انتهاء الوقت المحدد للسحب." },
  {
    n: 2,
    title: "تم توليد النتيجة عشوائياً",
    body: "يختار النظام رقماً عشوائياً من بين التذاكر المباعة فقط، داخل معاملة قاعدة بيانات مقفلة، دون أي تدخل بشري."
  },
  {
    n: 3,
    title: "اعتمدت النتيجة ونُشرت",
    body: "يراجع فريقنا النتيجة قبل نشرها للتأكد من سلامة العملية، دون أي صلاحية لتغيير الفائز الذي اختاره النظام."
  }
];

const commitments = [
  "لا يوجد مشترون وهميون أو حسابات آلية تشارك في السحوبات على الإطلاق — كل ورقة يانصيب مملوكة لمستخدم حقيقي دفع ثمنها.",
  "لا يملك أي موظف في فُرصة صلاحية تغيير نتيجة السحب يدوياً بعد اختيارها.",
  "لا يُضمَن الفوز لأكبر مشترٍ للتذاكر — كل تذكرة لها فرصة متساوية تماماً بغض النظر عن عدد التذاكر التي اشتراها صاحبها."
];

export default function IntegrityPage() {
  return (
    <div className="pb-6">
      <PageHeader title="النزاهة وطريقة اختيار الفائز" />

      <div className="card mb-5 flex items-start gap-3">
        <ShieldCheckIcon className="w-9 h-9 text-[var(--emerald)] flex-shrink-0" strokeWidth={1.6} />
        <p className="text-sm text-gray-600 leading-relaxed">
          كل سحب يمر بثلاث مراحل موثّقة وثابتة الترتيب، ويمكن لأي مستخدم مراجعتها من صفحة{" "}
          <Link href="/results" className="text-[var(--emerald)] font-bold underline">
            النتائج
          </Link>
          .
        </p>
      </div>

      <div className="relative pr-6 mb-6">
        <div className="absolute right-[9px] top-2 bottom-2 w-px bg-[var(--line)]" />
        <div className="space-y-5">
          {timeline.map(function (step) {
            return (
              <div key={step.n} className="relative">
                <span className="absolute right-[-24px] top-0.5 w-[19px] h-[19px] rounded-full bg-[var(--emerald)] text-white text-[0.65rem] font-bold flex items-center justify-center">
                  {step.n}
                </span>
                <p className="font-bold text-sm mb-1">{step.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <TicketIcon className="w-5 h-5 text-[var(--emerald)]" />
          <h2 className="font-bold">التزاماتنا تجاهك</h2>
        </div>
        <ul className="space-y-2.5 text-sm text-gray-600 leading-relaxed">
          {commitments.map(function (c) {
            return (
              <li key={c} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] mt-2 flex-shrink-0" />
                <span>{c}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed px-1">
        كل نتيجة سحب مرتبطة بمرجع تحقق فريد (هاش) يظهر في صفحة النتائج، بحيث يمكن لأي شخص التأكد أن الفائز اختير من
        بين التذاكر المباعة فقط.
      </p>
    </div>
  );
}
