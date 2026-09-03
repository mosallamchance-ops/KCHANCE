"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ShieldCheckIcon, CheckCircleIcon, TicketIcon } from "@/components/icons";

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ResultsPage() {
  const [tab, setTab] = useState("latest"); // "latest" | "howto"
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    async function load() {
      const { data } = await supabase.from("public_results").select("*").order("draw_date", { ascending: false }).limit(30);
      setResults(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const [featured, ...previous] = results;

  return (
    <div className="pb-6">
      <h1 className="font-display text-2xl mb-4">النتائج</h1>

      <div className="flex border-b border-[var(--line)] mb-5">
        <button
          onClick={function () {
            setTab("howto");
          }}
          className={
            "flex-1 pb-2.5 text-sm font-bold border-b-2 -mb-px " +
            (tab === "howto" ? "border-[var(--emerald)] text-[var(--emerald)]" : "border-transparent text-gray-400")
          }
        >
          طريقة التحقق
        </button>
        <button
          onClick={function () {
            setTab("latest");
          }}
          className={
            "flex-1 pb-2.5 text-sm font-bold border-b-2 -mb-px " +
            (tab === "latest" ? "border-[var(--emerald)] text-[var(--emerald)]" : "border-transparent text-gray-400")
          }
        >
          أحدث النتائج
        </button>
      </div>

      {tab === "howto" && <HowVerificationWorks />}

      {tab === "latest" && (
        <>
          {loading && <p className="text-gray-400 text-sm text-center py-12">جارِ التحميل…</p>}
          {!loading && results.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">لا توجد نتائج منشورة بعد.</p>
          )}

          {featured && <FeaturedResult r={featured} />}

          {previous.length > 0 && (
            <div className="mt-8">
              <h2 className="font-bold text-lg mb-3">نتائج سابقة</h2>
              <div className="space-y-3">
                {previous.map(function (r) {
                  return <PastResultRow key={r.id} r={r} />;
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FeaturedResult({ r }) {
  const [copied, setCopied] = useState(false);
  const [showLog, setShowLog] = useState(false);

  function copyHash() {
    navigator.clipboard.writeText(r.verification_hash || "").then(function () {
      setCopied(true);
      setTimeout(function () {
        setCopied(false);
      }, 2000);
    });
  }

  return (
    <>
      <div className="ticket-card mb-5">
        <div className="aspect-[4/3] bg-gray-100 relative">
          <span className="badge-verified absolute top-3 right-3 z-10 bg-[var(--card)]">
            <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            تم اعتماد النتيجة
          </span>
          {r.product_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.product_image} alt={r.product_name} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg mb-3">{r.product_name}</h3>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="stat-box">
              <p className="font-mono-num font-bold text-sm">#{r.draw_id?.slice(0, 8).toUpperCase()}</p>
              <p className="text-[0.65rem] text-gray-500 mt-0.5">رقم السحب</p>
            </div>
            <div className="stat-box">
              <p className="font-bold text-sm">{formatDate(r.draw_date)}</p>
              <p className="text-[0.65rem] text-gray-500 mt-0.5">تاريخ السحب</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="avatar-circle w-9 h-9 text-sm">
              {r.winner_display_name ? r.winner_display_name.charAt(0) : "؟"}
            </div>
            <div>
              <p className="text-[0.65rem] text-gray-500">الفائز</p>
              <p className="font-bold text-sm">{r.winner_display_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="stat-box">
              <p className="font-mono-num font-bold text-sm">{formatSyp(r.sold_tickets)}</p>
              <p className="text-[0.65rem] text-gray-500 mt-0.5">إجمالي التذاكر المشاركة</p>
            </div>
            <div className="stat-box">
              <p className="font-mono-num font-bold text-sm text-[var(--emerald)]">
                {r.winning_ticket_number ? "#" + r.winning_ticket_number : "—"}
              </p>
              <p className="text-[0.65rem] text-gray-500 mt-0.5">رقم التذكرة الفائزة</p>
            </div>
          </div>

          {r.prize_type === "cash" && (
            <p className="text-sm font-bold text-[var(--emerald)] mb-1">
              جائزة نقدية بديلة — {formatSyp(r.prize_amount)} ل.س (80% من قيمة التذاكر المباعة)
            </p>
          )}

          <div className="badge-verified w-full justify-center py-2 mt-2">
            <ShieldCheckIcon className="w-4 h-4" strokeWidth={2.2} />
            النتيجة موثّقة ويمكن التحقق منها
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="font-bold mb-1">التحقق من نتيجة السحب</h2>
        <p className="text-sm text-gray-500 mb-4">
          يمكن لأي شخص التحقق من أن الرقم الفائز اختير عشوائياً من بين التذاكر المباعة فقط.
        </p>

        <div className="relative pr-6 mb-5">
          <div className="absolute right-[9px] top-2 bottom-2 w-px bg-[var(--line)]" />
          <div className="space-y-5">
            <TimelineStep n={3} title="اعتمدت النتيجة ونُشرت" time={formatTime(r.published_at)} done={!!r.published_at} />
            <TimelineStep n={2} title="تم توليد النتيجة عشوائياً" time={formatTime(r.selected_at)} done={!!r.selected_at} />
            <TimelineStep n={1} title="أُغلق بيع التذاكر" time={formatTime(r.closed_at)} done={!!r.closed_at} />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-1.5">مرجع التحقق (هاش النتيجة)</p>
        <div className="flex items-center gap-2">
          <p className="flex-1 font-mono-num text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg p-2.5 break-all" dir="ltr">
            {r.verification_hash}
          </p>
          <button
            onClick={copyHash}
            className="flex-shrink-0 text-xs font-bold text-[var(--emerald)] border border-[var(--line)] rounded-lg px-3 py-2.5"
          >
            {copied ? "✓" : "نسخ"}
          </button>
        </div>

        <button
          onClick={function () {
            setShowLog(!showLog);
          }}
          className="w-full flex items-center justify-between text-sm font-bold text-[var(--emerald)] mt-4"
        >
          <span>عرض سجل التحقق</span>
          <span>{showLog ? "‹" : "›"}</span>
        </button>

        {showLog && (
          <div className="mt-3 space-y-1.5 text-xs text-gray-500 font-mono-num" dir="ltr">
            <p>draw_id: {r.draw_id}</p>
            <p>winning_ticket: {r.winning_ticket_number}</p>
            <p>closed_at: {r.closed_at || "—"}</p>
            <p>selected_at: {r.selected_at || "—"}</p>
            <p>published_at: {r.published_at || "—"}</p>
          </div>
        )}
      </div>
    </>
  );
}

function TimelineStep({ n, title, time, done }) {
  return (
    <div className="relative">
      <span
        className={
          "absolute right-[-24px] top-0.5 w-[19px] h-[19px] rounded-full text-[0.65rem] font-bold flex items-center justify-center " +
          (done ? "bg-[var(--emerald)] text-white" : "bg-gray-200 text-gray-400")
        }
      >
        {n}
      </span>
      <p className="font-bold text-sm mb-0.5">{title}</p>
      <p className="text-xs text-gray-400 font-mono-num" dir="ltr">
        {time}
      </p>
    </div>
  );
}

function PastResultRow({ r }) {
  return (
    <div className="ticket-card flex">
      <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
        {r.product_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.product_image} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3 flex-1 min-w-0">
        <p className="badge-verified mb-1">
          <CheckCircleIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
          موثّق
        </p>
        <p className="font-bold text-sm truncate">{r.product_name}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>
            رقم التذكرة الفائزة:{" "}
            <span className="font-mono-num text-[var(--ink)] font-bold">
              {r.winning_ticket_number ? "#" + r.winning_ticket_number : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>الفائز: {r.winner_display_name}</span>
          <span>{formatDate(r.draw_date)}</span>
        </div>
        {r.prize_type === "cash" && (
          <p className="text-xs font-bold text-[var(--emerald)] mt-1">
            جائزة نقدية بديلة — {formatSyp(r.prize_amount)} ل.س
          </p>
        )}
      </div>
    </div>
  );
}

function HowVerificationWorks() {
  const steps = [
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

  return (
    <div>
      <div className="card mb-5 flex items-start gap-3">
        <TicketIcon className="w-8 h-8 text-[var(--emerald)] flex-shrink-0" strokeWidth={1.6} />
        <p className="text-sm text-gray-600 leading-relaxed">
          كل سحب يمر بثلاث مراحل موثّقة وثابتة الترتيب. كل نتيجة منشورة مرتبطة بمرجع تحقق فريد (هاش) — انظر مثالاً حياً
          في تبويب "أحدث النتائج".
        </p>
      </div>

      <div className="relative pr-6">
        <div className="absolute right-[9px] top-2 bottom-2 w-px bg-[var(--line)]" />
        <div className="space-y-5">
          {steps.map(function (s) {
            return (
              <div key={s.n} className="relative">
                <span className="absolute right-[-24px] top-0.5 w-[19px] h-[19px] rounded-full bg-[var(--emerald)] text-white text-[0.65rem] font-bold flex items-center justify-center">
                  {s.n}
                </span>
                <p className="font-bold text-sm mb-1">{s.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/support/integrity" className="text-sm font-bold text-[var(--emerald)] block mt-5">
        قراءة المزيد عن النزاهة وطريقة اختيار الفائز ‹
      </Link>
    </div>
  );
}
