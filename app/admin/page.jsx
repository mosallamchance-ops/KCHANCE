"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const cards = [
  { key: "total_users", label: "عدد المستخدمين" },
  { key: "active_users", label: "المستخدمون النشطون" },
  { key: "total_deposited", label: "إجمالي الأموال المشحونة", money: true },
  { key: "total_ticket_sales", label: "إجمالي مبيعات التذاكر", money: true },
  { key: "total_draws", label: "إجمالي السحوبات" },
  { key: "active_draws", label: "السحوبات النشطة" },
  { key: "completed_draws", label: "السحوبات المنتهية" },
  { key: "total_winners", label: "عدد الفائزين" },
  { key: "pending_cash_prizes", label: "الجوائز النقدية المستحقة", money: true },
  { key: "pending_deposits", label: "طلبات الشحن المعلقة" }
];

const actionLinks = [
  { href: "/admin/draws/new", label: "+ سحب جديد", primary: true },
  { href: "/admin/draws", label: "كل السحوبات" },
  { href: "/admin/deposits", label: "طلبات الشحن" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/admins", label: "المشرفون" },
  { href: "/admin/winners", label: "الفائزون والجوائز" }
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (!res.ok) setError(result.error);
      else setStats(result);
    }
    load();
  }, []);

  return (
    <AdminGuard>
      <div>
        <div className="flex items-center justify-between mb-4 relative">
          <h1 className="text-xl font-bold">لوحة تحكم الإدارة</h1>

          {/* Desktop: full row of links */}
          <div className="hidden md:flex gap-3 text-sm flex-wrap">
            {actionLinks.map((l) =>
              l.primary ? (
                <Link key={l.href} href={l.href} className="btn-primary">
                  {l.label}
                </Link>
              ) : (
                <Link key={l.href} href={l.href} className="py-2 px-4 rounded-lg border border-[var(--line)]">
                  {l.label}
                </Link>
              )
            )}
          </div>

          {/* Mobile: hamburger menu */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="القائمة"
              className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--line)]"
            >
              <span
                className="block w-5 h-0.5 bg-[var(--ink)] transition-transform"
                style={menuOpen ? { transform: "translateY(6px) rotate(45deg)" } : {}}
              />
              <span
                className="block w-5 h-0.5 bg-[var(--ink)] transition-opacity"
                style={menuOpen ? { opacity: 0 } : {}}
              />
              <span
                className="block w-5 h-0.5 bg-[var(--ink)] transition-transform"
                style={menuOpen ? { transform: "translateY(-6px) rotate(-45deg)" } : {}}
              />
            </button>

            {menuOpen && (
              <div className="absolute top-full left-0 mt-2 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3 flex flex-col gap-2 text-sm font-bold shadow-lg z-30 w-56">
                {actionLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={l.primary ? "btn-primary text-center" : "py-2 px-3 rounded-lg border border-[var(--line)] text-center"}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-[var(--ember)]">{error}</p>}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((c) => (
              <div key={c.key} className="card">
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="font-display text-2xl text-[var(--emerald)]">
                  {c.money ? "$" : ""}
                  {stats[c.key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
