"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminInsightsPage() {
  const [data, setData] = useState(null);
    const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState(null);

   async function loadInsights() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    let url = "/api/admin/insights";
    const params = [];
    if (dateFrom) params.push("date_from=" + dateFrom);
    if (dateTo) params.push("date_to=" + dateTo);
    if (params.length) url += "?" + params.join("&");

    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) setData(result);
    else setError(result.error);
  }

  useEffect(
    function () {
      loadInsights();
    },
    [dateFrom, dateTo]
  );

  async function exportRawData() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    let url = "/api/admin/insights/export";
    const params = [];
    if (dateFrom) params.push("date_from=" + dateFrom);
    if (dateTo) params.push("date_to=" + dateTo);
    if (params.length) url += "?" + params.join("&");

    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error);
      return;
    }
    const blob = await res.blob();
    const objUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "raw-data-export.xlsx";
    a.click();
    window.URL.revokeObjectURL(objUrl);
  }

  if (error) return <p className="text-[var(--ember)]">{error}</p>;
  if (!data) return <p className="text-gray-500">...جارِ التحميل</p>;

  const maxLogins = Math.max(
    1,
    ...data.dailyStats.map(function (d) {
      return d.logins;
    })
  );

  const rev = data.revenue;
  const netMargin = rev
    ? Number(rev.total_ticket_revenue) - Number(rev.total_cash_prizes_paid) - Number(rev.total_product_prizes_value)
    : 0;

  const f = data.funnel;
  const funnelSteps = f
    ? [
        { label: "التسجيل", count: Number(f.total_signups) },
        { label: "تأكيد البريد", count: Number(f.confirmed_email) },
        { label: "شحن رصيد", count: Number(f.made_deposit) },
        { label: "شراء تذكرة", count: Number(f.bought_ticket) },
        { label: "شراء متكرر", count: Number(f.repeat_buyer) },
        { label: "فاز بجائزة", count: Number(f.won_prize) }
      ]
    : [];

  return (
    <AdminGuard>
      <div className="space-y-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl">إحصائيات ونشاط المستخدمين (للإدارة فقط)</h1>
          <div className="flex flex-wrap gap-2 items-end">
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
            <button onClick={exportRawData} className="py-2 px-4 rounded-lg border border-[var(--line)] text-sm font-bold">
              ⬇ تصدير البيانات الخام
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-6">
          يطبَّق نطاق التاريخ على: الإيرادات، أداء السحوبات، قائمة الأكثر شراءً، ونسب التحويل. النشاط اليومي وقائمة
          الأكثر نشاطاً تبقى ثابتة على آخر 14/30 يوماً.
        </p>

        {rev && (
          <div>
            <h2 className="font-bold mb-2">الإيرادات والأرباح (كامل الفترة)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card text-center">
                <p className="text-xs text-gray-500">إجمالي إيرادات التذاكر</p>
                <p className="font-display text-xl text-[var(--emerald)]">${rev.total_ticket_revenue}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500">إجمالي الجوائز النقدية المدفوعة</p>
                <p className="font-display text-xl text-[var(--ember)]">${rev.total_cash_prizes_paid}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500">قيمة الجوائز العينية (منتجات)</p>
                <p className="font-display text-xl text-[var(--gold-deep)]">${rev.total_product_prizes_value}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500">هامش الربح التقديري</p>
                <p
                  className={
                    "font-display text-xl " + (netMargin >= 0 ? "text-[var(--emerald)]" : "text-[var(--ember)]")
                  }
                >
                  ${netMargin}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              هامش الربح = إيرادات التذاكر − الجوائز النقدية المدفوعة − قيمة المنتجات الموزّعة كجوائز (لا يشمل تكاليف
              تشغيل أخرى).
            </p>
          </div>
        )}

        {data.walletConversion && (
          <div>
            <h2 className="font-bold mb-2">تحويل صفحة شحن الرصيد</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <p className="text-xs text-gray-500">زاروا صفحة الشحن</p>
                <p className="font-display text-xl text-[var(--ink)]">{data.walletConversion.total_viewers}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500">شحنوا فعلياً</p>
                <p className="font-display text-xl text-[var(--emerald)]">{data.walletConversion.total_who_deposited}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500">نسبة التحويل</p>
                <p className="font-display text-xl text-[var(--gold-deep)]">
                  {data.walletConversion.conversion_pct ?? 0}%
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              يبدأ التسجيل من هذا التحديث فصاعداً — الأرقام ستصبح أدق مع مرور الوقت.
            </p>
          </div>
        )}

        {data.conversionWindows && data.conversionWindows.length > 0 && (
          <div>
            <h2 className="font-bold mb-2">التحويل حسب المدة منذ التسجيل (D0 / D3 / D7 / D30)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.conversionWindows.map(function (w) {
                return (
                  <div key={w.window_label} className="card text-center">
                    <p className="text-xs text-gray-500">{w.window_label}</p>
                    <p className="font-display text-xl text-[var(--emerald)]">{w.conversion_pct ?? 0}%</p>
                    <p className="text-xs text-gray-400 font-mono-num">
                      {w.converted_users} / {w.total_users}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">نسبة المستخدمين الذين شحنوا رصيدهم خلال كل مدة من تاريخ التسجيل.</p>
          </div>
        )}
        
        <div>
          <h2 className="font-bold mb-2">أداء السحوبات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] text-gray-500 text-right">
                  <th className="p-2">المنتج</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">نسبة البيع</th>
                  <th className="p-2">الإيرادات</th>
                  <th className="p-2">قيمة الجائزة</th>
                  <th className="p-2">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {data.drawPerf.map(function (d) {
                  return (
                    <tr key={d.draw_id} className="border-b border-[var(--line)]">
                      <td className="p-2 font-bold">{d.product_name}</td>
                      <td className="p-2">{d.status}</td>
                      <td className="p-2 font-mono-num">{d.sell_through_pct ?? 0}%</td>
                      <td className="p-2 font-mono-num text-[var(--emerald)]">${d.revenue}</td>
                      <td className="p-2 font-mono-num">${d.prize_value}</td>
                      <td className="p-2 text-gray-400 text-xs">
                        {new Date(d.created_at).toLocaleDateString("ar")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.drawPerf.length === 0 && <p className="text-gray-500 text-sm mt-2">لا توجد سحوبات بعد.</p>}
          </div>
        </div>

        {funnelSteps.length > 0 && (
          <div>
            <h2 className="font-bold mb-2">دورة حياة المستخدم — قمع التحويل</h2>
            <div className="card space-y-2">
              {funnelSteps.map(function (step, i) {
                const total = funnelSteps[0].count || 1;
                const pctOfTotal = Math.round((step.count / total) * 100);
                const prevCount = i > 0 ? funnelSteps[i - 1].count : step.count;
                const pctOfPrev = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0;

                return (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold">{step.label}</span>
                      <span className="font-mono-num">
                        {step.count} ({pctOfTotal}% من الكل{i > 0 ? " — " + pctOfPrev + "% من الخطوة السابقة" : ""})
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--emerald)]" style={{ width: Math.max(2, pctOfTotal) + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {data.funnelDays && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="card text-center">
                  <p className="text-xs text-gray-500">متوسط الأيام حتى أول شحن</p>
                  <p className="font-display text-xl text-[var(--emerald)]">
                    {data.funnelDays.avg_days_to_first_deposit ?? "—"} يوم
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-gray-500">متوسط الأيام حتى أول شراء تذكرة</p>
                  <p className="font-display text-xl text-[var(--emerald)]">
                    {data.funnelDays.avg_days_to_first_purchase ?? "—"} يوم
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h2 className="font-bold mb-2">نشاط آخر 14 يوماً</h2>
          <div className="card">
            <div className="flex items-end gap-1 h-32 mb-2">
              {data.dailyStats.map(function (d) {
                const heightPct = Math.max(4, Math.round((d.logins / maxLogins) * 100));
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={d.day}>
                    <div className="w-full bg-[var(--emerald)] rounded-t" style={{ height: heightPct + "%" }} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 text-center">تسجيلات الدخول يومياً</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="card text-center">
              <p className="text-xs text-gray-500">مستخدمون جدد (14 يوم)</p>
              <p className="font-display text-xl text-[var(--emerald)]">
                {data.dailyStats.reduce(function (s, d) {
                  return s + Number(d.new_users);
                }, 0)}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">تسجيلات دخول (14 يوم)</p>
              <p className="font-display text-xl text-[var(--emerald)]">
                {data.dailyStats.reduce(function (s, d) {
                  return s + Number(d.logins);
                }, 0)}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">تذاكر مباعة (14 يوم)</p>
              <p className="font-display text-xl text-[var(--emerald)]">
                {data.dailyStats.reduce(function (s, d) {
                  return s + Number(d.tickets_sold);
                }, 0)}
              </p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500">مبالغ مشحونة (14 يوم)</p>
              <p className="font-display text-xl text-[var(--emerald)]">
                $
                {data.dailyStats.reduce(function (s, d) {
                  return s + Number(d.deposits_amount);
                }, 0)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">🏆 قائمة الأكثر شراءً للتذاكر</h2>
          <div className="space-y-2">
            {data.leaderboard.map(function (u, i) {
              return (
                <div key={u.user_id} className="card flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg text-[var(--gold-deep)] w-6 text-center">{i + 1}</span>
                    <div>
                      <p className="font-bold">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-gray-500 font-mono-num">{u.phone}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-mono-num font-bold text-[var(--emerald)]">{u.total_tickets} تذكرة</p>
                    <p className="font-mono-num text-xs text-gray-400">${u.total_spent}</p>
                  </div>
                </div>
              );
            })}
            {data.leaderboard.length === 0 && <p className="text-gray-500 text-sm">لا توجد بيانات بعد.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">أكثر المستخدمين نشاطاً (آخر 30 يوماً)</h2>
          <div className="space-y-2">
            {data.topActive
              .filter(function (u) {
                return u.login_count > 0;
              })
              .map(function (u) {
                return (
                  <div key={u.user_id} className="card flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-gray-500 font-mono-num">{u.phone}</p>
                    </div>
                    <div className="text-left font-mono-num text-xs text-gray-500">
                      <p>{u.login_count} تسجيل دخول</p>
                      <p>{u.ticket_count} تذكرة</p>
                    </div>
                  </div>
                );
              })}
            {data.topActive.filter(function (u) {
              return u.login_count > 0;
            }).length === 0 && <p className="text-gray-500 text-sm">لا يوجد نشاط مسجّل بعد.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">توزّع المستخدمين حسب المحافظة</h2>
          <div className="space-y-2">
            {data.provinces.map(function (p) {
              const maxCount = Math.max(
                1,
                ...data.provinces.map(function (x) {
                  return Number(x.user_count);
                })
              );
              const widthPct = Math.round((Number(p.user_count) / maxCount) * 100);
              return (
                <div key={p.province} className="flex items-center gap-3 text-sm">
                  <span className="w-24 flex-shrink-0">{p.province}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--gold)]" style={{ width: widthPct + "%" }} />
                  </div>
                  <span className="font-mono-num w-8 text-left">{p.user_count}</span>
                </div>
              );
            })}
            {data.provinces.length === 0 && <p className="text-gray-500 text-sm">لا توجد بيانات بعد.</p>}
          </div>
        </div>

        <div>
          <h2 className="font-bold mb-2">مستخدمون توقفوا عن الشراء (أكثر من 21 يوماً)</h2>
          <p className="text-xs text-gray-500 mb-2">
            اشتروا تذاكر من قبل لكن لم يعودوا مؤخراً — فرصة جيدة للتواصل معهم وإعادة تفعيلهم.
          </p>
          <div className="space-y-2">
            {data.churned.map(function (u) {
              return (
                <div key={u.user_id} className="card flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-gray-500 font-mono-num">{u.phone}</p>
                  </div>
                  <div className="text-left text-xs">
                    <p className="text-gray-400">
                      آخر شراء: {new Date(u.last_purchase_at).toLocaleDateString("ar")}
                    </p>
                    <p className="font-mono-num text-gray-500">
                      {u.total_tickets} تذكرة — ${u.total_spent}
                    </p>
                  </div>
                </div>
              );
            })}
            {data.churned.length === 0 && (
              <p className="text-gray-500 text-sm">لا يوجد مستخدمون متوقفون حالياً — نشاط جيد!</p>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
