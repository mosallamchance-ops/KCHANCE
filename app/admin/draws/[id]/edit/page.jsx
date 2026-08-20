"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/FileUpload";
import AdminGuard from "@/components/AdminGuard";

function toLocalInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function EditDrawPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/draws/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const result = await res.json();
      if (res.ok) {
        const d = result.draw;
        setForm({
          name: d.products.name,
          description: d.products.description || "",
          image_url: d.products.image_url || "",
          product_value: d.products.product_value,
          ticket_price: d.ticket_price,
          total_tickets: d.total_tickets,
          max_tickets_per_user: d.max_tickets_per_user,
          start_at: toLocalInput(d.start_at),
          end_at: toLocalInput(d.end_at),
          sold_tickets: d.sold_tickets
        });
      } else {
        setMsg({ type: "error", text: result.error });
      }
    }
    load();
  }, [id]);

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

    const res = await fetch(`/api/admin/draws/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        ...form,
        product_value: Number(form.product_value),
        ticket_price: Number(form.ticket_price),
        total_tickets: Number(form.total_tickets),
        max_tickets_per_user: Number(form.max_tickets_per_user),
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString()
      })
    });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) setMsg({ type: "error", text: result.error });
    else {
      setMsg({ type: "success", text: "تم تحديث السحب بنجاح." });
      setTimeout(() => router.push("/admin/draws"), 1000);
    }
  }

  if (!form) return <p className="text-gray-500">...جارِ التحميل</p>;

  return (
    <AdminGuard>
      <div className="max-w-lg mx-auto card">
        <h1 className="text-xl font-bold mb-4">تعديل السحب</h1>
        {form.sold_tickets > 0 && (
          <p className="text-red-600 text-sm mb-3">
            تم بيع {form.sold_tickets} تذكرة من هذا السحب — لا يمكن تعديله.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="اسم المنتج"
            className="w-full border rounded-lg p-2"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={form.sold_tickets > 0}
            required
          />
          <textarea
            placeholder="وصف المنتج"
            className="w-full border rounded-lg p-2"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            disabled={form.sold_tickets > 0}
          />
          <FileUpload
            bucket="product-images"
            label="صورة المنتج"
            viaServerEndpoint="/api/admin/upload-image"
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
            disabled={form.sold_tickets > 0}
            required
          />
          <input
            type="number"
            placeholder="سعر التذكرة ($)"
            className="w-full border rounded-lg p-2"
            value={form.ticket_price}
            onChange={(e) => update("ticket_price", e.target.value)}
            disabled={form.sold_tickets > 0}
            required
          />
          <input
            type="number"
            placeholder="العدد الإجمالي للتذاكر"
            className="w-full border rounded-lg p-2"
            value={form.total_tickets}
            onChange={(e) => update("total_tickets", e.target.value)}
            disabled={form.sold_tickets > 0}
            required
          />
          <input
            type="number"
            placeholder="الحد الأقصى للتذاكر لكل مستخدم"
            className="w-full border rounded-lg p-2"
            value={form.max_tickets_per_user}
            onChange={(e) => update("max_tickets_per_user", e.target.value)}
            disabled={form.sold_tickets > 0}
          />
          <label className="block text-sm text-gray-500">تاريخ ووقت بداية السحب</label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg p-2"
            value={form.start_at}
            onChange={(e) => update("start_at", e.target.value)}
            disabled={form.sold_tickets > 0}
            required
          />
          <label className="block text-sm text-gray-500">تاريخ ووقت نهاية السحب</label>
          <input
            type="datetime-local"
            className="w-full border rounded-lg p-2"
            value={form.end_at}
            onChange={(e) => update("end_at", e.target.value)}
            disabled={form.sold_tickets > 0}
            required
          />
          <button disabled={loading || form.sold_tickets > 0} className="btn-primary w-full disabled:opacity-50">
            {loading ? "...جارِ الحفظ" : "حفظ التعديلات"}
          </button>
        </form>
        {msg && (
          <p className={`mt-3 font-bold ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
        )}
      </div>
    </AdminGuard>
  );
}
