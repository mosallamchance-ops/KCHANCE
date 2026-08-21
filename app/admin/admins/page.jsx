"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";

const roleAr = {
  super_admin: "مدير أعلى (كل الصلاحيات)",
  finance_admin: "مدير مالي (شحن وسحب)",
  draw_manager: "مدير سحوبات",
  support_admin: "دعم ومستخدمون"
};
const roles = Object.keys(roleAr);

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("support_admin");
  const [msg, setMsg] = useState(null);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/admins", {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await res.json();
    if (res.ok) setAdmins(result.admins ?? []);
    else setError(result.error);
  }

  useEffect(() => {
    load();
  }, []);

  async function searchUsers(e) {
    e.preventDefault();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQ)}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    const result = await res.json();
    if (res.ok) setSearchResults(result.users ?? []);
  }

  async function grantAdmin() {
    if (!selectedUser) return;
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ user_id: selectedUser.id, role: newRole })
    });
    const result = await res.json();
    if (!res.ok) setMsg({ type: "error", text: result.error });
    else {
      setMsg({ type: "success", text: "تم منح صلاحية الإدارة بنجاح." });
      setSelectedUser(null);
      setSearchResults([]);
      setSearchQ("");
      load();
    }
  }

  async function changeRole(adminId, role) {
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/admins/${adminId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ role })
    });
    const result = await res.json();
    if (!res.ok) setMsg({ type: "error", text: result.error });
    else load();
  }

  async function toggleAdminStatus(adminId, currentStatus) {
    setMsg(null);
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    if (!confirm(newStatus === "suspended" ? "إزالة صلاحيات الإدارة من هذا الحساب؟" : "إعادة تفعيل صلاحيات الإدارة؟")) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/admins/${adminId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (!res.ok) setMsg({ type: "error", text: result.error });
    else load();
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">إدارة المشرفين والصلاحيات</h1>

        {error && <p className="text-red-600">{error}</p>}
        {msg && (
          <p className={msg.type === "error" ? "text-red-600" : "text-green-600"}>{msg.text}</p>
        )}

        <div className="card space-y-3">
          <h2 className="font-bold">منح صلاحية إدارة لمستخدم</h2>
          <form onSubmit={searchUsers} className="flex gap-2">
            <input
              placeholder="ابحث بالاسم أو رقم الهاتف"
              className="flex-1 border rounded-lg p-2"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <button className="btn-primary">بحث</button>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`text-sm border rounded-lg p-2 cursor-pointer ${
                    selectedUser?.id === u.id ? "border-brand-500 bg-brand-50" : ""
                  }`}
                >
                  {u.first_name || "—"} {u.last_name || ""} — {u.phone || "بدون هاتف"}
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="flex gap-2 items-center pt-2 border-t">
              <span className="text-sm">
                {selectedUser.first_name} {selectedUser.last_name}
              </span>
              <select className="border rounded-lg p-2 flex-1" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleAr[r]}
                  </option>
                ))}
              </select>
              <button className="btn-primary" onClick={grantAdmin}>
                منح الصلاحية
              </button>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-bold mb-2">المشرفون الحاليون</h2>
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="card flex justify-between items-center text-sm">
                <div>
                  <p className="font-bold">
                    {a.profile?.first_name || a.name || "—"} {a.profile?.last_name || ""}
                  </p>
                  <p className="text-gray-500">{a.profile?.phone || a.email || "—"}</p>
                  <p className={a.status === "active" ? "text-green-600" : "text-red-600"}>
                    {a.status === "active" ? "نشط" : "معلّق"}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    className="border rounded-lg p-2"
                    value={a.role}
                    onChange={(e) => changeRole(a.id, e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {roleAr[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => toggleAdminStatus(a.id, a.status)}
                    className={`py-2 px-3 rounded-lg border text-xs ${
                      a.status === "active" ? "border-red-300 text-red-600" : "border-green-300 text-green-600"
                    }`}
                  >
                    {a.status === "active" ? "إزالة الصلاحية" : "إعادة التفعيل"}
                  </button>
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="text-gray-500 text-sm">لا يوجد مشرفون.</p>}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
