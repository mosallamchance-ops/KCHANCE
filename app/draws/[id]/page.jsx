"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Countdown from "@/components/Countdown";
import {
  ChevronLeftIcon,
  ShieldCheckIcon,
  WalletIcon,
  CheckCircleIcon,
  ShareIcon,
  BellIcon
} from "@/components/icons";

const PAGE_SIZE = 40; // 4 columns x 10 rows, matches the mockup's grid density

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

function digitWidth(totalTickets) {
  return Math.max(4, String(totalTickets).length);
}

function padNum(n, width) {
  return String(n).padStart(width, "0");
}

export default function DrawDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [draw, setDraw] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [balance, setBalance] = useState(0);
  const [alreadyOwned, setAlreadyOwned] = useState(0);

  const [page, setPage] = useState(0);
  const [takenSlots, setTakenSlots] = useState(new Set());
  const [loadingPage, setLoadingPage] = useState(false);
  const [selected, setSelected] = useState([]);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showSelected, setShowSelected] = useState(true);
  const [jumpValue, setJumpValue] = useState("");

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(function () {
    async function load() {
      const { data: drawData } = await supabase
        .from("draws")
        .select("*, products(name, description, image_url, product_value)")
        .eq("id", id)
        .single();
      setDraw(drawData);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        setLoggedIn(true);
        const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single();
        setBalance(profile?.balance ?? 0);

        const { count } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("draw_id", id)
          .eq("user_id", user.id)
          .eq("status", "valid");
        setAlreadyOwned(count ?? 0);
      } else {
        setLoggedIn(false);
      }
      setCheckedAuth(true);
    }
    load();
  }, [id]);

  useEffect(
    function () {
      if (!draw) return;
      let cancelled = false;
      async function loadPage() {
        setLoadingPage(true);
        const start = page * PAGE_SIZE + 1;
        const end = Math.min(draw.total_tickets, start + PAGE_SIZE - 1);
        const { data } = await supabase
          .from("draw_taken_slots")
          .select("ticket_slot")
          .eq("draw_id", id)
          .gte("ticket_slot", start)
          .lte("ticket_slot", end);
        if (!cancelled) {
          setTakenSlots(new Set((data || []).map(function (r) { return r.ticket_slot; })));
          setLoadingPage(false);
        }
      }
      loadPage();
      return function () {
        cancelled = true;
      };
    },
    [draw, page, id]
  );

  if (!draw || !checkedAuth) {
    return <p className="text-gray-500 text-center py-16">جارِ التحميل…</p>;
  }

  const remaining = draw.total_tickets - draw.sold_tickets;
  const soldPct = Math.min(100, Math.round((draw.sold_tickets / draw.total_tickets) * 100));
  const maxSelectable = Math.max(0, Math.min(draw.max_tickets_per_user - alreadyOwned, remaining));
  const totalPages = Math.ceil(draw.total_tickets / PAGE_SIZE);
  const total = selected.length * draw.ticket_price;
  const drawOpen = draw.status === "active" && remaining > 0;
  const width = digitWidth(draw.total_tickets);

  const start = page * PAGE_SIZE + 1;
  const end = Math.min(draw.total_tickets, start + PAGE_SIZE - 1);
  const pageSlots = [];
  for (let n = start; n <= end; n++) pageSlots.push(n);

  function toggleSlot(n) {
    if (!loggedIn) {
      router.push("/auth");
      return;
    }
    if (takenSlots.has(n)) return;
    setSelected(function (prev) {
      if (prev.includes(n)) return prev.filter(function (x) { return x !== n; });
      if (prev.length >= maxSelectable) return prev;
      return [...prev, n];
    });
  }

  function jumpToNumber() {
    const n = parseInt(jumpValue, 10);
    if (!n || n < 1 || n > draw.total_tickets) return;
    setPage(Math.floor((n - 1) / PAGE_SIZE));
    setJumpValue("");
  }

  async function handleConfirm() {
    setError(null);
    if (selected.length === 0) return;
    setConfirming(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      setConfirming(false);
      router.push("/auth");
      return;
    }
    const res = await fetch("/api/purchase/select", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify({ draw_id: draw.id, ticket_slots: selected })
    });
    const data = await res.json();
    setConfirming(false);
    if (!res.ok) {
      setError(data.error || "حدث خطأ أثناء الشراء.");
      return;
    }
    setResult(data);
    setBalance(function (b) {
      return b - Number(data.total);
    });
  }

  if (result) {
    return <PurchaseSuccess draw={draw} result={result} width={width} balance={balance} />;
  }

  return (
    <div className="pb-32">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-3 py-1.5">
          <div className="text-left">
            <p className="text-[0.65rem] text-gray-500">رصيدك</p>
            <p className="font-mono-num font-bold text-sm">
              {formatSyp(balance)} <span className="font-body">ل.س</span>
            </p>
          </div>
          <WalletIcon className="w-5 h-5 text-[var(--emerald)]" />
        </div>
        <button
          onClick={function () {
            router.back();
          }}
          aria-label="رجوع"
          className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--line)] flex items-center justify-center"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>

      <h1 className="font-bold text-lg mb-3">تفاصيل السحب</h1>

      <div className="card flex items-center gap-3 mb-4">
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draw.products.image_url}
            alt={draw.products?.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <span className="badge-verified mb-1">
            <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            موثّق
          </span>
          <p className="font-bold truncate">{draw.products?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Stat label="سعر التذكرة" value={formatSyp(draw.ticket_price)} />
        <Stat label="إجمالي التذاكر" value={formatSyp(draw.total_tickets)} />
        <Stat label="المباع" value={formatSyp(draw.sold_tickets)} />
        <Stat label="المتبقي" value={formatSyp(remaining)} />
      </div>

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="text-gray-500">تقدم السحب</span>
          <span className="font-mono-num font-bold text-[var(--emerald)]">{soldPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[var(--gold)]" style={{ width: soldPct + "%" }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">ينتهي خلال</span>
          <Countdown endAt={draw.end_at} />
        </div>
      </div>

      {!drawOpen ? (
        <p className="text-[var(--ember)] font-bold text-center py-6">هذا السحب غير متاح للشراء حالياً.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">اختر أرقام تذاكرك</h2>
            <span className="text-xs text-gray-500">يمكنك اختيار حتى {maxSelectable} تذاكر</span>
          </div>

          <div className="flex items-center gap-4 mb-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showSelected}
                onChange={function () {
                  setShowSelected(!showSelected);
                }}
              />
              مختار
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showAvailable}
                onChange={function () {
                  setShowAvailable(!showAvailable);
                }}
              />
              متاح
            </label>

            <div className="flex-1 flex items-center gap-1.5 justify-end">
              <input
                type="text"
                inputMode="numeric"
                value={jumpValue}
                onChange={function (e) {
                  setJumpValue(e.target.value.replace(/\D/g, ""));
                }}
                placeholder="رقم"
                className="w-16 border border-[var(--line)] rounded-lg px-2 py-1 text-xs font-mono-num text-center"
              />
              <button onClick={jumpToNumber} className="text-xs font-bold text-[var(--emerald)]">
                انتقال
              </button>
            </div>
          </div>

          <div className={"grid grid-cols-4 gap-2 mb-3 " + (loadingPage ? "opacity-40" : "")}>
            {pageSlots.map(function (n) {
              const taken = takenSlots.has(n);
              const isSelected = selected.includes(n);
              if (taken && !showAvailable && !isSelected) return null;
              if (!taken && isSelected && !showSelected) return null;
              if (!taken && !isSelected && !showAvailable) return null;

              let cls = "ticket-chip justify-center ";
              if (taken) cls += "opacity-50 cursor-not-allowed";
              else if (isSelected) cls += "!bg-[var(--emerald)] !border-[var(--emerald)] !text-white cursor-pointer";
              else cls += "cursor-pointer hover:border-[var(--emerald)]";

              return (
                <button
                  key={n}
                  type="button"
                  disabled={taken}
                  onClick={function () {
                    toggleSlot(n);
                  }}
                  className={cls}
                >
                  {taken ? "—" : padNum(n, width)}
                  {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 mr-1" strokeWidth={2.4} />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm mb-8">
            <button
              disabled={page === 0}
              onClick={function () {
                setPage(function (p) { return Math.max(0, p - 1); });
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] disabled:opacity-40"
            >
              السابق
            </button>
            <span className="text-gray-500 text-xs">
              الصفحة {page + 1} من {totalPages}
            </span>
            <button
              disabled={page >= totalPages - 1}
              onClick={function () {
                setPage(function (p) { return Math.min(totalPages - 1, p + 1); });
              }}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] disabled:opacity-40"
            >
              التالي
            </button>
          </div>

          {error && <p className="text-[var(--ember)] font-bold text-sm mb-3 text-center">{error}</p>}

          {/* Sticky purchase summary bar */}
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 bg-[var(--card)] border-t border-[var(--line)] p-3">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[0.65rem] text-gray-500">عدد التذاكر</p>
                  <p className="font-mono-num font-bold">{selected.length}</p>
                </div>
                <div>
                  <p className="text-[0.65rem] text-gray-500">الإجمالي</p>
                  <p className="font-mono-num font-bold">{formatSyp(total)}</p>
                </div>
                <div>
                  <p className="text-[0.65rem] text-gray-500">رصيدك بعد الشراء</p>
                  <p className="font-mono-num font-bold text-[var(--emerald)]">{formatSyp(balance - total)}</p>
                </div>
              </div>
              <button
                disabled={selected.length === 0 || total > balance || confirming || !loggedIn}
                onClick={handleConfirm}
                className="btn-primary px-6 disabled:opacity-40"
              >
                {confirming ? "جارِ التأكيد…" : "تأكيد الشراء"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat-box">
      <p className="font-mono-num font-bold text-sm">{value}</p>
      <p className="text-[0.6rem] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function PurchaseSuccess({ draw, result, width, balance }) {
  return (
    <div className="pb-10 text-center">
      <div className="flex justify-center mt-6 mb-4">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--gold)] flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-[var(--gold-deep)]" strokeWidth={2} />
        </div>
      </div>

      <p className="text-[var(--emerald)] font-bold mb-1">تم الشراء بنجاح</p>
      <h1 className="font-display text-2xl mb-6">تذاكرك أصبحت ملكك</h1>

      <div className="card flex items-center gap-3 text-right mb-5">
        {draw.products?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draw.products.image_url}
            alt={draw.products?.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <p className="font-bold">{draw.products?.name}</p>
      </div>

      <p className="text-sm text-gray-500 mb-2 text-right">أرقام تذاكرك</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {result.ticket_slots.map(function (slot) {
          return (
            <div key={slot} className="card py-3">
              <p className="font-mono-num font-bold text-lg">#{padNum(slot, width)}</p>
              <span className="badge-verified mt-1">
                <CheckCircleIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                مملوكة لك
              </span>
            </div>
          );
        })}
      </div>

      <div className="card text-right mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <WalletIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">المبلغ المدفوع</span>
          <span className="font-mono-num font-bold">{formatSyp(result.total)} ل.س</span>
        </div>
        <div className="flex justify-between">
          <ShieldCheckIcon className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">الرصيد المتبقي</span>
          <span className="font-mono-num font-bold">{formatSyp(balance)} ل.س</span>
        </div>
        <div className="flex justify-between">
          <span />
          <span className="text-gray-500">رقم العملية</span>
          <span className="font-mono-num text-xs">{result.purchase_id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 mb-5">
        سُجّلت التذاكر باسمك، ولا يمكن بيع هذه الأرقام مرة أخرى.
      </p>

      <Link href="/account/tickets" className="btn-primary w-full block text-center mb-3">
        عرض تذاكري
      </Link>
      <Link href="/" className="text-sm font-bold text-[var(--emerald)] block mb-6">
        العودة إلى الرئيسية
      </Link>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-2">
        <ShareIcon className="w-4 h-4" />
        مشاركة أو تحميل الإيصال
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <BellIcon className="w-4 h-4" />
        سنرسل لك إشعاراً عند موعد السحب
      </div>
    </div>
  );
}
