"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { HomeIcon, TicketIcon, ChartIcon, WalletIcon, UserIcon } from "@/components/icons";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(function () {
    async function check() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setLoggedIn(!!session);
    }
    check();
    const { data: listener } = supabase.auth.onAuthStateChange(function () {
      check();
    });
    return function () {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  const items = [
    { href: "/account", label: "حسابي", icon: UserIcon, authOnly: true },
    { href: "/wallet", label: "المحفظة", icon: WalletIcon, authOnly: true },
    { href: "/results", label: "النتائج", icon: ChartIcon, authOnly: false },
    { href: "/account/tickets", label: "تذاكري", icon: TicketIcon, authOnly: true },
    { href: "/", label: "الرئيسية", icon: HomeIcon, authOnly: false }
  ];

  function handleClick(item) {
    if (item.authOnly && !loggedIn) {
      router.push("/auth");
      return;
    }
    router.push(item.href);
  }

  return (
    <nav className="bottom-nav md:hidden flex items-stretch" dir="rtl">
      {items.map(function (item) {
        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <button
            key={item.href}
            onClick={function () {
              handleClick(item);
            }}
            className={"bottom-nav-item " + (isActive ? "active" : "")}
          >
            <Icon className="w-6 h-6" style={{ strokeWidth: isActive ? 2.1 : 1.8 }} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
