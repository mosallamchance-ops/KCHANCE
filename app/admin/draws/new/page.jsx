"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/FileUpload";

const empty = {
  name: "",
  description: "",
  image_url: "",
  product_value: "",
  ticket_price: "",
  total_tickets: "",
  max_tickets_per_user: "3",
  start_at: "",
  end_at: ""
};

export default function AdminCreateDrawPage() {
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    const res = await fetch("/api/admin/draws", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        ...form,
        product_value: Number(form.product_value),
        ticket_price: Number(form.ticket_price),
        total_tickets: Number(form.total_tickets),
        max_tickets_per_user: Number(form.max_tickets_per_user)
      })
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) setMsg({ type: "error", text: result.error });
    else {
      setMsg({ type: "success", text: "تم إنشاء السحب بنجاح." });
      setForm(empty);
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-bold mb-4">إضافة سحب جديد</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="اسم المنتج"
          className="w-full border rounded-lg p-2"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
        <textarea
          placeholder="وصف المنتج"
          className="w-full border rounded-lg p-2"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <FileUpload
          bucket="product-images"
          label="صورة المنتج"
          onUploaded={(url) => update("image_url", url)}
        />
        {form.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.image_url} alt="" className="h-24 rounded-lg object-cover" />
        )}
        <input
          type="number"
          placeholder="قيمة المنتج ($)"
          className="w-full border rounded-lg p-2"
          value={form.product_value}
          onChange={(e) => update("product_value", e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="سعر التذكرة ($)"
          className="w-full border rounded-lg p-2"
          value={form.ticket_price}
          onChange={(e) => update("ticket_price", e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="العدد الإجمالي للتذاكر"
          className="w-full border rounded-lg p-2"
          value={form.total_tickets}
          onChange={(e) => update("total_tickets", e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="الحد الأقصى للتذاكر لكل مستخدم"
          className="w-full border rounded-lg p-2"
          value={form.max_tickets_per_user}
          onChange={(e) => update("max_tickets_per_user", e.target.value)}
        />
        <label className="block text-sm text-gray-500">تاريخ ووقت بداية السحب</label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg p-2"
          value={form.start_at}
          onChange={(e) => update("start_at", e.target.value)}
          required
        />
        <label className="block text-sm text-gray-500">تاريخ ووقت نهاية السحب</label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg p-2"
          value={form.end_at}
          onChange={(e) => update("end_at", e.target.value)}
          required
        />
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "...جارِ الإنشاء" : "إنشاء السحب"}
        </button>
      </form>
      {msg && (
        <p className={`mt-3 font-bold ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
