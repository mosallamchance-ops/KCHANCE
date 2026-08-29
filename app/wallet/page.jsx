"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/FileUpload";

const WALLET_NAME = "USDT (TRC20) - يُحدَّث من الإدارة";
const WALLET_ADDRESS = "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState([]);
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [receiptPath, setReceiptPath] = useState(null);
  const [userId, setUserId] = useState(null);
  const [msg, setMsg] = useState(null);

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
      .limit(20);
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
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return setMsg("الرجاء تسجيل الدخول أولاً.");

    const { error } = await supabase.from("deposits").insert({
      user_id: user.id,
      amount: Number(amount),
      transaction_code: code,
      sender_wallet: senderWallet,
      receipt_url: receiptPath
    });

    if (error) setMsg(error.message);
    else {
      setMsg("تم إرسال طلب الشحن، بانتظار مراجعة الإدارة.");
      setAmount("");
      setCode("");
      setSenderWallet("");
      setReceiptPath(null);
      loadData();
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="card bg-[var(--ink)] text-white border-none">
          <p className="text-white/60 text-sm">الرصيد الحالي</p>
          <p className="font-display text-4xl text-[var(--gold)]">${balance}</p>
          <p className="text-xs text-white/40 mt-2">
            ملاحظة: لا يمكن سحب الرصيد. الجوائز النقدية تُرسل كهدية مباشرة من الإدارة عند الفوز.
          </p>
        </div>

        <div className="card mt-4">
          <h2 className="font-bold mb-2">تعليمات التحويل</h2>
          <p className="text-sm">اسم المحفظة: {WALLET_NAME}</p>
          <p className="text-sm break-all font-mono-num">رقم المحفظة: {WALLET_ADDRESS}</p>
          <p className="text-xs text-gray-500 mt-2">
            حوّل المبلغ إلى المحفظة أعلاه، ثم أرسل طلب شحن الرصيد بالتفاصيل أدناه.
          </p>
        </div>

        <form onSubmit={submitDeposit} className="card mt-4 space-y-2">
          <h2 className="font-bold mb-2">طلب شحن الرصيد</h2>
          <input
            type="number"
            step="0.01"
            placeholder="المبلغ المحول"
            className="w-full border border-[var(--line)] rounded-lg p-2"
            value={amount}
            onChange={function (e) {
              setAmount(e.target.value);
            }}
            required
          />
          <input
            placeholder="رقم/كود الحوالة"
            className="w-full border border-[var(--line)] rounded-lg p-2"
            value={code}
            onChange={function (e) {
              setCode(e.target.value);
            }}
            required
          />
          <input
            placeholder="رقم المحفظة المرسل منها"
            className="w-full border border-[var(--line)] rounded-lg p-2"
            value={senderWallet}
            onChange={function (e) {
              setSenderWallet(e.target.value);
            }}
          />
          {userId && (
            <FileUpload bucket="receipts" pathPrefix={userId} label="صورة إيصال التحويل" onUploaded={setReceiptPath} />
          )}
          <button className="btn-primary w-full">إرسال طلب الشحن</button>
          {msg && <p className="text-sm text-[var(--emerald)]">{msg}</p>}
        </form>
      </div>

      <div>
        <h2 className="font-bold mb-2">سجل المعاملات</h2>
        <div className="space-y-2">
          {txns.map(function (t) {
            return (
              <div key={t.id} className="card flex justify-between text-sm">
                <div>
                  <p className="font-bold">{t.description}</p>
                  <p className="text-gray-400">{new Date(t.created_at).toLocaleString("ar")}</p>
                </div>
                <p className={"font-mono-num font-bold " + (t.amount >= 0 ? "text-[var(--emerald)]" : "text-[var(--ember)]")}>
                  {t.amount >= 0 ? "+" : ""}
                  {t.amount}$
                </p>
              </div>
            );
          })}
          {txns.length === 0 && <p className="text-gray-500 text-sm">لا توجد معاملات بعد.</p>}
        </div>
      </div>
    </div>
  );
}
