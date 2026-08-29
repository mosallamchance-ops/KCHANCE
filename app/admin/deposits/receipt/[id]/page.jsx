"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function ReceiptViewPage() {
  const { id } = useParams();
  const [status, setStatus] = useState("loading");

  useEffect(
    function () {
      async function load() {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        const res = await fetch("/api/admin/deposits/receipt/" + id, {
          headers: { Authorization: "Bearer " + session?.access_token }
        });
        const result = await res.json();

        if (!res.ok) {
          setStatus(result.error || "حدث خطأ");
        } else {
          window.location.replace(result.url);
        }
      }
      load();
    },
    [id]
  );

  return (
    <AdminGuard>
      <div className="max-w-sm mx-auto card text-center">
        <p className="text-gray-500">
          {status === "loading" ? "...جارِ التحقق وفتح الإيصال" : status}
        </p>
      </div>
    </AdminGuard>
  );
}
