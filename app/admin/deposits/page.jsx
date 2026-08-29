"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const tabs = [
  { key: "pending", label: "معلقة" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
  { key: "all", label: "الكل" }
];

export default function AdminDepositsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deposits, setDeposits] = useState([]);
  const [msg, setMsg] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  function buildQuery() {
    let q = "status=" + activeTab;
    if (dateFrom) q += "&date_from=" + dateFrom;
    if (dateTo) q += "&date_to=" + dateTo;
    return q;
  }

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/deposits/list?" + buildQuery(), {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) setDeposits(result.deposits ?? []);
  }

  useEffect(
    function () {
      load();
    },
    [activeTab, dateFrom, dateTo]
  );

  async function viewReceipt(path) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function act(deposit_id, action) {
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ deposit_id: deposit_id, action: action })
    });
    const result = await res.json();
    if (!res.ok) setMsg(result.error);
    else load();
  }

  async function exportExcel() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/deposits/export?" + buildQuery(), {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    if (!res.ok) {
      const err = await res.json();
      setMsg(err.error);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deposits-" + activeTab + ".xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    const {
      data: { session }
    } = await supabase.auth.getSession();

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/deposits/import", {
      method: "POST",
      headers: { Authorization: "Bearer " + session?.access_token },
      body: formData
    });
    const result = await res.json();
    setImporting(false);
    e.target.value = "";

    if (!res.ok) {
      setMsg(result.error);
    } else {
      setImportResult(result);
      load();
    }
  }

  return (
    <AdminGuard>
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="font-display text-2xl">طلبات شحن الرصيد</h1>
          <div className="flex gap-2 items-center">
            <button onClick={exportExcel} className="py-2 px-4 rounded-lg border border-[var(--line)] text-sm font-bold">
              ⬇ تصدير Excel
            </button>
            <label className="py-2 px-4 rounded-lg border border-[var(--line)] text-sm font-bold cursor-pointer">
              {importing ? "...جارِ الاستيراد" : "⬆ استيراد التغييرات"}
              <input type="file" accept=".xlsx" className="hidden" onChange={importExcel} disabled={importing} />
            </label>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-[var(--line)]">
          {tabs.map(function (t) {
            return (
              <button
                key={t.key}
                onClick={function () {
                  setActiveTab(t.key);
                }}
                className={
                  "px-4 py-2 text-sm font-bold border-b-2 -mb-px " +
                  (activeTab === t.key
                    ? "border-[var(--emerald)] text-[var(--emerald)]"
                    : "border-transparent text-gray-400")
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
            <input
              type="date"
              className="border border-[var(--line)] rounded-lg p-2 text-sm"
              value={dateFrom}
              onChange={function (e) {
                setDateFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
            <input
              type="date"
              className="border border-[var(--line)] rounded-lg p-2 text-sm"
              value={dateTo}
              onChange={function (e) {
                setDateTo(e.target.value);
              }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={function () {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-sm text-gray-500 underline pb-2"
            >
              مسح التاريخ
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4">
          صدّر الملف، غيّر قيمة عمود "الحالة" إلى approved أو rejected للطلبات المطلوب معالجتها (اتركها كما هي لتجاهل
          الباقي)، ثم أعد رفع الملف نفسه.
        </p>

        {importResult && (
          <div className="card mb-4 text-sm">
            <p className="font-bold mb-1">تمت معالجة {importResult.processed} صف.</p>
            {importResult.results
              .filter(function (r) {
                return r.error;
              })
              .map(function (r, i) {
                return (
                  <p key={i} className="text-[var(--ember)] text-xs">
                    {r.id}: {r.error}
                  </p>
                );
              })}
          </div>
        )}

        {msg && <p className="text-[var(--ember)] mb-2">{msg}</p>}

        <div className="space-y-3">
          {deposits.map(function (d) {
            return (
              <div key={d.id} className="card flex flex-wrap justify-between items-center gap-3">
                <div className="text-sm">
                  <p className="font-bold">
                    {d.users?.first_name} {d.users?.last_name} — {d.users?.phone}
                  </p>
                  <p className="font-mono-num">المبلغ: ${d.amount}</p>
                  <p>رقم العملية: {d.transaction_code}</p>
                  <p>المحفظة المرسلة: {d.sender_wallet}</p>
                  <p className="text-gray-400">{new Date(d.created_at).toLocaleString("ar")}</p>
                  {d.receipt_url && (
                    <button
                      className="text-[var(--emerald)] underline"
                      onClick={function () {
                        viewReceipt(d.receipt_url);
                      }}
                    >
                      عرض الإيصال
                    </button>
                  )}
                  {d.rejection_reason && (
                    <p className="text-[var(--ember)] text-xs mt-1">سبب الرفض: {d.rejection_reason}</p>
                  )}
                </div>
                {activeTab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={function () {
                        act(d.id, "approve");
                      }}
                    >
                      قبول
                    </button>
                    <button
                      className="py-2.5 px-4 rounded-xl border border-[var(--ember)] text-[var(--ember)] font-bold"
                      onClick={function () {
                        act(d.id, "reject");
                      }}
                    >
                      رفض
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {deposits.length === 0 && <p className="text-gray-500">لا توجد طلبات في هذا القسم.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
