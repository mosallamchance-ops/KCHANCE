"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/PageHeader";
import FileUpload from "@/components/FileUpload";
import { WalletIcon, ShieldCheckIcon, ChevronLeftIcon } from "@/components/icons";

const WALLET_NAME = "USDT (TRC20) - يُحدَّث من الإدارة";
const WALLET_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const SHAM_CASH_ADDRESS = "e5412852e157a39b1eed9280c24054e9";

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

const txnTabs = [
  { key: "all", label: "الكل" },
  { key: "deposit", label: "شحن" },
  { key: "purchase", label: "شراء تذاكر" },
  { key: "prize", label: "جوائز" }
];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [txns, setTxns] = useState([]);
  const [txnTab, setTxnTab] = useState("all");

  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiptPath, setReceiptPath] = useState(null);
  const [userId, setUserId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const [expandedMethod, setExpandedMethod] = useState(null); // "bank" | null

  function copyShamCashAddress() {
    navigator.clipboard.writeText(SHAM_CASH_ADDRESS).then(function () {
      setCopied(true);
      setTimeout(function () {
        setCopied(false);
      }, 2000);
    });
  }

  async function loadData() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: profile } = await supabase.from("users").select("balance").eq("id", user.id).single();
    setBalance(profile?.balance ?? 0);
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setTxns(transactions ?? []);
  }

  useEffect(function () {
    loadData();

    async function logView() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;
      fetch("/api/log-pageview", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ page: "wallet" })
      }).catch(function () {});
    }
    logView();
  }, []);

  async function submitDeposit(e) {
    e.preventDefault();
    setMsg(null);

    if (!amount || !code || !senderName.trim() || !receiptPath) {
      setMsg("جميع الحقول مطلوبة، بما في ذلك صورة الإيصال.");
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return setMsg("الرجاء تسجيل الدخول أولاً.");

    const { error } = await supabase.from("deposits").insert({
      user_id: user.id,
      amount: Number(amount),
      transaction_code: code,
      sender_name: senderName,
      receipt_url: receiptPath
    });

    if (error) setMsg(error.message);
    else {
      setMsg("تم إرسال طلب الشحن، بانتظار مراجعة الإدارة.");
      setAmount("");
      setCode("");
      setSenderName("");
      setReceiptPath(null);
      loadData();
    }
  }

  const canSubmit = Boolean(amount && code && senderName.trim() && receiptPath);
  const shownTxns = txnTab === "all" ? txns : txns.filter(function (t) { return t.type === txnTab; });

  function toggleMethod(key) {
    setExpandedMethod(function (cur) {
      return cur === key ? null : key;
    });
  }

  return (
    <div className="pb-6">
      <PageHeader title="المحفظة" />

      {/* Balance hero */}
      <div className="balance-card mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="badge-verified bg-white/15 text-white">
            <ShieldCheckIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            محفوظ
          </span>
          <span className="text-sm text-white/70">الرصيد المتاح</span>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={function () {
              setBalanceHidden(!balanceHidden);
            }}
            aria-label={balanceHidden ? "إظهار الرصيد" : "إخفاء الرصيد"}
            className="text-white/70 text-lg"
          >
            {balanceHidden ? "🙈" : "👁️"}
          </button>
          <p className="font-mono-num font-bold text-3xl">
            {balanceHidden ? "••••••" : formatSyp(balance)} <span className="text-base font-body">ل.س</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={function () {
              document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-center bg-white/10 hover:bg-white/15 transition-colors rounded-xl py-2.5 text-sm font-bold"
          >
            سجل العمليات
          </button>
          <button
            onClick={function () {
              document.getElementById("deposit-methods")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-center bg-white rounded-xl py-2.5 text-sm font-bold text-[var(--emerald-deep)]"
          >
            شحن الرصيد
          </button>
        </div>
      </div>

      {/* Payment methods */}
      <div id="deposit-methods">
        <h2 className="font-bold mb-2">اختر طريقة الشحن</h2>
        <p className="text-xs text-gray-500 mb-3">اختر الطريقة المناسبة، ثم اتبع التعليمات لإضافة الرصيد بأمان.</p>

        <div className="settings-group mb-5">
          <MethodRow
            title="دفع بالكريبتو USDT"
            expanded={expandedMethod === "bank"}
            onToggle={function () {
              toggleMethod("bank");
            }}
          >
            <p className="text-sm">اسم المحفظة: {WALLET_NAME}</p>
            <p className="text-sm break-all font-mono-num mt-1">رقم المحفظة: {WALLET_ADDRESS}</p>
            <p className="text-xs text-gray-500 mt-2">حوّل المبلغ إلى المحفظة أعلاه، ثم أرسل طلب شحن الرصيد أدناه.</p>
          </MethodRow>
        </div>

        <div className="card mb-5">
          <h2 className="font-bold mb-3">شام كاش</h2>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sham-cash-qr.jpeg"
              alt="رمز Sham Cash"
              className="w-24 h-24 rounded-xl border border-[var(--line)] object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">امسح الرمز من تطبيق Sham Cash، أو انسخ العنوان:</p>
              <p className="text-sm break-all font-mono-num" dir="ltr">
                {SHAM_CASH_ADDRESS}
              </p>
              <button
                type="button"
                onClick={copyShamCashAddress}
                className="mt-2 text-xs font-bold text-[var(--emerald)]"
              >
                {copied ? "تم النسخ ✓" : "نسخ العنوان"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">بعد التحويل، أرسل طلب شحن الرصيد أدناه مع صورة الإيصال.</p>
        </div>
      </div>

      {/* Deposit request form */}
      <form onSubmit={submitDeposit} className="card mb-6 space-y-2">
        <h2 className="font-bold mb-1">طلب شحن الرصيد</h2>
        <p className="text-xs text-gray-500 mb-1">كل الحقول أدناه مطلوبة، بما في ذلك صورة الإيصال.</p>
        <input
          type="number"
          step="0.01"
          placeholder="المبلغ المحول *"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={amount}
          onChange={function (e) {
            setAmount(e.target.value);
          }}
          required
        />
        <input
          placeholder="رقم/كود الحوالة *"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={code}
          onChange={function (e) {
            setCode(e.target.value);
          }}
          required
        />
        <input
          placeholder="اسم المرسل *"
          className="w-full border border-[var(--line)] rounded-lg p-2.5"
          value={senderName}
          onChange={function (e) {
            setSenderName(e.target.value);
          }}
          required
        />
        {userId && (
          <FileUpload
            bucket="receipts"
            pathPrefix={userId}
            label="صورة إيصال التحويل *"
            onUploaded={setReceiptPath}
          />
        )}
        <button className="btn-primary w-full disabled:opacity-40" disabled={!canSubmit}>
          إرسال طلب الشحن
        </button>
        {msg && (
          <p className={"text-sm " + (msg.startsWith("تم إرسال") ? "text-[var(--emerald)]" : "text-[var(--ember)]")}>
            {msg}
          </p>
        )}
      </form>

      {/* Transaction log */}
      <div id="transactions">
        <h2 className="font-bold mb-3">سجل العمليات</h2>

        <div className="flex gap-2 mb-3 overflow-x-auto">
          {txnTabs.map(function (t) {
            return (
              <button
                key={t.key}
                onClick={function () {
                  setTxnTab(t.key);
                }}
                className={
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border " +
                  (txnTab === t.key
                    ? "bg-[var(--emerald)] text-white border-[var(--emerald)]"
                    : "border-[var(--line)] text-gray-500")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {shownTxns.map(function (t) {
            return (
              <div key={t.id} className="card flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold">{t.description}</p>
                  <p className="text-gray-400">{new Date(t.created_at).toLocaleString("ar")}</p>
                </div>
                <p
                  className={
                    "font-mono-num font-bold " + (t.amount >= 0 ? "text-[var(--emerald)]" : "text-[var(--ember)]")
                  }
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatSyp(t.amount)} ل.س
                </p>
              </div>
            );
          })}
          {shownTxns.length === 0 && <p className="text-gray-500 text-sm text-center py-8">لا توجد معاملات بعد.</p>}
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500 bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 mt-4">
          <ShieldCheckIcon className="w-8 h-8 text-[var(--emerald)] flex-shrink-0" strokeWidth={1.6} />
          <p>رصيدك محفوظ ويمكن تتبع كل عملية. نضمن أمان معاملاتك وشفافية كل حركة في محفظتك.</p>
        </div>
      </div>
    </div>
  );
}

function MethodRow({ title, expanded, onToggle, children }) {
  return (
    <div>
      <button type="button" onClick={onToggle} className="settings-row w-full text-right">
        <span className="flex items-center gap-3">
          <WalletIcon className="w-5 h-5 text-[var(--emerald)]" />
          <span className="font-bold text-sm">{title}</span>
        </span>
        <ChevronLeftIcon
          className={"w-4 h-4 text-[var(--line)] transition-transform " + (expanded ? "-rotate-90" : "")}
        />
      </button>
      {expanded && <div className="px-4 pb-4 pt-1 border-b border-[var(--line)] last:border-b-0">{children}</div>}
    </div>
  );
}
