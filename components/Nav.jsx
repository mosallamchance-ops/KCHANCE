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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!loaded) return null;

  const linkClass = "hover:text-[var(--emerald)] transition-colors";

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
          <a href="/" className={linkClass}>
            السحوبات
          </a>
          <a href="/results" className={linkClass}>
            النتائج
          </a>

          {loggedIn ? (
            <>
              <a href="/account" className={linkClass}>
                حسابي
              </a>
              <a href="/wallet" className={linkClass}>
                رصيدي
              </a>
              <a href="/support" className={linkClass}>الدعم</a>
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
          ) : (
            <a href="/auth" className="btn-primary text-sm">
              تسجيل الدخول
            </a>
          )}
        </nav>

        {/* Mobile: bell (if logged in) + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          {loggedIn && <NotificationBell />}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="القائمة"
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-[var(--line)]"
          >
            <span
              className="block w-5 h-0.5 bg-[var(--ink)] transition-transform"
              style={mobileOpen ? { transform: "translateY(6px) rotate(45deg)" } : {}}
            />
            <span
              className="block w-5 h-0.5 bg-[var(--ink)] transition-opacity"
              style={mobileOpen ? { opacity: 0 } : {}}
            />
            <span
              className="block w-5 h-0.5 bg-[var(--ink)] transition-transform"
              style={mobileOpen ? { transform: "translateY(-6px) rotate(-45deg)" } : {}}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[var(--card)] border border-[var(--line)] rounded-2xl mt-2 p-4 flex flex-col gap-3 text-sm font-bold shadow-lg z-30">
          <a href="/" className={linkClass} onClick={() => setMobileOpen(false)}>
            السحوبات
          </a>
          <a href="/results" className={linkClass} onClick={() => setMobileOpen(false)}>
            النتائج
          </a>
          {loggedIn ? (
            <>
              <a href="/account" className={linkClass} onClick={() => setMobileOpen(false)}>
                حسابي
              </a>
              <a href="/wallet" className={linkClass} onClick={() => setMobileOpen(false)}>
                رصيدي
              </a>
              <a href="/support" className={linkClass} onClick={() => setMobileOpen(false)}>الدعم</a>
              {isAdmin && (
                
                  href="/admin"
                  className="text-[var(--gold-deep)]"
                  onClick={() => setMobileOpen(false)}
                >
                  لوحة الإدارة
                </a>
              )}
              <button onClick={handleLogout} className="text-[var(--ember)] text-right">
                تسجيل الخروج
              </button>
            </>
          ) : (
            <a href="/auth" className="btn-primary text-center" onClick={() => setMobileOpen(false)}>
              تسجيل الدخول
            </a>
          )}
        </div>
      )}
    </div>
  );
}
