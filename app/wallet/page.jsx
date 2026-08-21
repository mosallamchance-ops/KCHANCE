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
  const [wAmount, setWAmount] = useState("");
  const [wAddress, setWAddress] = useState("");
  const [wMsg, setWMsg] = useState(null);
  const [wLoading, setWLoading] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState([]);
  const [cancelMsg, setCancelMsg] = useState(null);

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

    const { data: withdrawals } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setMyWithdrawals(withdrawals ?? []);
  }

  useEffect(() => {
    loadData();
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

  async function submitWithdrawal(e) {
    e.preventDefault();
    setWMsg(null);
    setWLoading(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ amount: Number(wAmount), wallet_address: wAddress })
    });
    const result = await res.json();
    setWLoading(false);

    if (!res.ok) setWMsg({ type: "error", text: result.error });
    else {
      setWMsg({ type: "success", text: "تم إرسال طلب السحب، بانتظار مراجعة الإدارة." });
      setWAmount("");
      setWAddress("");
      loadData();
    }
  }

  async function cancelWithdrawal(withdrawal_id) {
    setCancelMsg(null);
    if (!confirm("إلغاء طلب السحب هذا وإعادة المبلغ إلى رصيدك؟")) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    const res = await fetch("/api/withdraw/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ withdrawal_id })
    });
    const result = await res.json();

    if (!res.ok) setCancelMsg({ type: "error", text: result.error });
    else {
      setCancelMsg({ type: "success", text: "تم إلغاء طلب السحب وإعادة المبلغ إلى رصيدك." });
      loadData();
    }
  }

  const statusAr = { pending: "قيد الانتظار", paid: "تم الدفع", rejected: "مرفوض", cancelled: "ملغى" };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="card">
          <p className="text-gray-500">الرصيد الحالي</p>
          <p className="text-3xl font-extrabold text-brand-600">${balance}</p>
        </div>

        <div className="card mt-4">
          <h2 className="font-bold mb-2">تعليمات التحويل</h2>
          <p className="text-sm">اسم المحفظة: {WALLET_NAME}</p>
          <p className="text-sm break-all">رقم المحفظة: {WALLET_ADDRESS}</p>
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
            className="w-full border rounded-lg p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            placeholder="رقم/كود الحوالة"
            className="w-full border rounded-lg p-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            placeholder="رقم المحفظة المرسل منها"
            className="w-full border rounded-lg p-2"
            value={senderWallet}
            onChange={(e) => setSenderWallet(e.target.value)}
          />
          {userId && (
            <FileUpload bucket="receipts" pathPrefix={userId} label="صورة إيصال التحويل" onUploaded={setReceiptPath} />
          )}
          <button className="btn-primary w-full">إرسال طلب الشحن</button>
          {msg && <p className="text-sm text-brand-600">{msg}</p>}
        </form>

        <form onSubmit={submitWithdrawal} className="card mt-4 space-y-2">
          <h2 className="font-bold mb-2">طلب سحب الرصيد</h2>
          <input
            type="number"
            step="0.01"
            max={balance}
            placeholder="المبلغ المراد سحبه"
            className="w-full border rounded-lg p-2"
            value={wAmount}
            onChange={(e) => setWAmount(e.target.value)}
            required
          />
          <input
            placeholder="عنوان محفظتك (لاستلام المبلغ)"
            className="w-full border rounded-lg p-2"
            value={wAddress}
            onChange={(e) => setWAddress(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500">سيتم خصم المبلغ من رصيدك فوراً لحين مراجعة الطلب من الإدارة.</p>
          <button disabled={wLoading} className="btn-primary w-full">
            {wLoading ? "...جارِ الإرسال" : "إرسال طلب السحب"}
          </button>
          {wMsg && (
            <p className={`text-sm ${wMsg.type === "error" ? "text-red-600" : "text-brand-600"}`}>{wMsg.text}</p>
          )}
        </form>

        {myWithdrawals.length > 0 && (
          <div className="card mt-4">
            <h2 className="font-bold mb-2">طلبات السحب الخاصة بي</h2>
            {cancelMsg && (
              <p className={`text-sm mb-2 ${cancelMsg.type === "error" ? "text-red-600" : "text-green-600"}`}>
                {cancelMsg.text}
              </p>
            )}
            <div className="space-y-2">
              {myWithdrawals.map((w) => (
                <div key={w.id} className="flex justify-between items-center text-sm border rounded-lg p-2">
                  <div>
                    <p className="font-bold">${w.amount}</p>
                    <p className="text-gray-500">{statusAr[w.status]}</p>
                    <p className="text-gray-400 text-xs">{new Date(w.created_at).toLocaleString("ar")}</p>
                  </div>
                  {w.status === "pending" && (
                    <button
                      onClick={() => cancelWithdrawal(w.id)}
                      className="py-1 px-3 rounded-lg border border-red-300 text-red-600 text-xs"
                    >
                      إلغاء الطلب
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-bold mb-2">سجل المعاملات</h2>
        <div className="space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="card flex justify-between text-sm">
              <div>
                <p className="font-bold">{t.description}</p>
                <p className="text-gray-400">{new Date(t.created_at).toLocaleString("ar")}</p>
              </div>
              <p className={t.amount >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {t.amount >= 0 ? "+" : ""}
                {t.amount}$
              </p>
            </div>
          ))}
          {txns.length === 0 && <p className="text-gray-500 text-sm">لا توجد معاملات بعد.</p>}
        </div>
      </div>
    </div>
  );
}
