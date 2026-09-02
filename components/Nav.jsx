"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";

export default function Nav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        setLoggedIn(false);
        setLoaded(true);
        return;
      }

      setLoggedIn(true);

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      setIsAdmin(result.isAdmin);
      setLoaded(true);
    }
    check();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return function () {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!loaded) return null;

  const linkClass = "hover:text-[var(--emerald)] transition-colors";

  function closeMobile() {
    setMobileOpen(false);
  }

  function goTo(href) {
    setMobileOpen(false);
    router.push(href);
  }

  const mobileLinks = [
    { href: "/", label: "السحوبات" },
    { href: "/results", label: "النتائج" }
  ];
  if (loggedIn) {
    mobileLinks.push(
      { href: "/account", label: "حسابي" },
      { href: "/account/tickets", label: "تذاكري" },
      { href: "/wallet", label: "رصيدي" },
      { href: "/support", label: "الدعم" }
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
          <a href="/" className={linkClass}>
            السحوبات
          </a>
          <a href="/results" className={linkClass}>
            النتائج
          </a>

          {loggedIn && (
            <>
              <a href="/account" className={linkClass}>
                حسابي
              </a>
              <a href="/account/tickets" className={linkClass}>
                تذاكري
              </a>
              <a href="/wallet" className={linkClass}>
                رصيدي
              </a>
              <a href="/support" className={linkClass}>
                الدعم
              </a>
              {isAdmin && (
                <a href="/admin" className="text-[var(--gold-deep)] hover:underline">
                  لوحة الإدارة
                </a>
              )}
              <NotificationBell />
              <button onClick={handleLogout} className="text-gray-500 hover:text-[var(--ember)] font-medium">
                تسجيل الخروج
              </button>
            </>
          )}

          {!loggedIn && (
            <a href="/auth" className="btn-primary text-sm">
              تسجيل الدخول
            </a>
          )}
        </nav>

        <div className="flex md:hidden items-center gap-3">
          {loggedIn && <NotificationBell />}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--line)]"
          >
            <span className="block w-5 h-0.5 bg-[var(--ink)]" />
            <span className="block w-5 h-0.5 bg-[var(--ink)]" />
            <span className="block w-5 h-0.5 bg-[var(--ink)]" />
          </button>
        </div>
      </div>

      <div
        onClick={closeMobile}
        className={
          "md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 " +
          (mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
      />

      <div
        className={
          "md:hidden fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-[var(--card)] z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out " +
          (mobileOpen ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
          <span className="font-display text-xl text-[var(--emerald)]">القائمة</span>
          <button
            onClick={closeMobile}
            aria-label="إغلاق القائمة"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--line)] text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {mobileLinks.map(function (l) {
            return (
              <div
                key={l.href}
                onClick={function () {
                  goTo(l.href);
                }}
                className="flex items-center justify-between px-3 py-3.5 rounded-xl text-base font-bold hover:bg-[var(--paper)] transition-colors cursor-pointer"
              >
                <span>{l.label}</span>
                <span className="text-[var(--line)]">‹</span>
              </div>
            );
          })}

          {loggedIn && isAdmin && (
            <div
              onClick={function () {
                goTo("/admin");
              }}
              className="flex items-center justify-between px-3 py-3.5 rounded-xl text-base font-bold text-[var(--gold-deep)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
            >
              <span>لوحة الإدارة</span>
              <span>‹</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--line)]">
          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="w-full text-center py-3 rounded-xl border border-[var(--ember)] text-[var(--ember)] font-bold"
            >
              تسجيل الخروج
            </button>
          ) : (
            <button
              onClick={function () {
                goTo("/auth");
              }}
              className="btn-primary w-full text-center block"
            >
              تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
