"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "@/components/NotificationBell";

export default function Nav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
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

  return (
    <nav className="flex items-center gap-4 text-sm font-medium">
      <a href="/" className="hover:text-brand-600">
        السحوبات
      </a>
      <a href="/results" className="hover:text-brand-600">
        النتائج
      </a>

      {loggedIn ? (
        <>
          <a href="/account" className="hover:text-brand-600">
            حسابي
          </a>
          <a href="/wallet" className="hover:text-brand-600">
            رصيدي
          </a>
          {isAdmin && (
            <a href="/admin" className="text-brand-600 font-bold hover:underline">
              لوحة الإدارة
            </a>
          )}
          <NotificationBell />
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-600">
            تسجيل الخروج
          </button>
        </>
      ) : (
        <a href="/auth" className="btn-primary">
          تسجيل الدخول
        </a>
      )}
    </nav>
  );
}
