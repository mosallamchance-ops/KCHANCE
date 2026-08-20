"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState("checking");
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        setStatus("denied");
        router.push("/auth");
        return;
      }

      const res = await fetch("/api/admin/check", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await res.json();

      if (result.isAdmin) {
        setStatus("allowed");
      } else {
        setStatus("denied");
        router.push("/");
      }
    }
    check();
  }, [router]);

  if (status === "checking") return <p className="text-gray-500">...جارِ التحقق</p>;
  if (status === "denied") return null;
  return children;
}
