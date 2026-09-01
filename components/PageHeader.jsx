"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";
import { WalletIcon } from "@/components/icons";

function formatSyp(n) {
  return new Intl.NumberFormat("ar").format(Math.round(n || 0));
}

/**
 * Shared top bar used across the authenticated pages (mobile-first).
 * - title: centered page title (e.g. "المحفظة", "حسابي")
 * - greeting: if provided, replaces the title with "مساء الخير، <name>" style text, right-aligned
 * - showBalance: shows the wallet-balance chip on the left
 */
export default function PageHeader({ title, greeting, showBalance = false }) {
  const [balance, setBalance] = useState(null);

  useEffect(
    function () {
      if (!showBalance) return;
      let cancelled = false;
      async function load() {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase.from("users").select("balance").eq("id", user.id).single();
        if (!cancelled) setBalance(data?.balance ?? 0);
      }
      load();
      return function () {
        cancelled = true;
      };
    },
    [showBalance]
  );

  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <NotificationBell />
        {!greeting && <h1 className="font-bold text-lg">{title}</h1>}
      </div>

      {greeting && <p className="font-bold text-lg">{greeting}</p>}

      {showBalance && (
        <div className="flex items-center gap-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-3 py-1.5">
          <div className="text-left">
            <p className="text-[0.65rem] text-gray-500">رصيد المحفظة</p>
            <p className="font-mono-num font-bold text-sm">
              {balance === null ? "…" : formatSyp(balance)} <span className="font-body">ل.س</span>
            </p>
          </div>
          <WalletIcon className="w-5 h-5 text-[var(--emerald)]" />
        </div>
      )}
    </div>
  );
}
