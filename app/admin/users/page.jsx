"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  async function load(query = "") {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await res.json();
    if (res.ok) setUsers(result.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  return (
    <AdminGuard>
      <div>
        <h1 className="text-xl font-bold mb-4">المستخدمون</h1>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            placeholder="ابحث بالاسم أو رقم الهاتف"
            className="flex-1 border rounded-lg p-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn-primary">بحث</button>
        </form>
        <div className="space-y-2">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/users/${u.id}`}
              className="card flex justify-between items-center text-sm hover:shadow-md transition"
            >
              <div>
                <p className="font-bold">
                  {u.first_name || "—"} {u.last_name || ""} {u.status === "suspended" && (
                    <span className="text-red-600 text-xs">(معلّق)</span>
                  )}
                </p>
                <p className="text-gray-500">{u.phone || "بدون رقم هاتف"}</p>
              </div>
              <p className="font-bold text-brand-600">${u.balance}</p>
            </Link>
          ))}
          {users.length === 0 && <p className="text-gray-500">لا يوجد مستخدمون.</p>}
        </div>
      </div>
    </AdminGuard>
  );
}
