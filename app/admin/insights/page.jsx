"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminInsightsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(function () {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/insights", {
        headers: { Authorization: "Bearer " + session?.access_token }
      });
      const result = await res.json();
      if (res.ok) setData(result);
      else setError(result.error);
    }
    load();
  }, []);

  if (error) return <p className="text-[var(--ember)]">{error}</p>;
  if (!data) return <p className="text-gray-500">...جارِ التحميل</p>;

  const maxLogins = Math.max(1, ...data.dailyStats.map(function (d) {
    return d.logins;
  }));

  return (
    <AdminGuard>
      <div className="space-y-8">
        <h1 className="font-display text-2xl">إحصائيات ونشاط المستخدمين (للإدارة فقط)</h1>

        <div>
          <h2 className="font-bold mb-2">نشاط آخر 14 يوماً</h2>
          <div className="card">
            <div className="flex items-end gap-1 h-32 mb-2">
              {data.dailyStats.map(function (d) {
                const heightPct = Math.max(4, Math.round((d.logins / maxLogins) * 100));
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={d.day}>
                    <div
                      className="w-full bg-[var(--emerald)] rounded-t"
                      style={{ height: heightPct + "%" }}
                    />
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
      </div>
    </AdminGuard>
  );
}
