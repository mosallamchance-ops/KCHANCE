"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/FileUpload";
import AdminGuard from "@/components/AdminGuard";

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
  const searchParams = useSearchParams();
  const repeatId = searchParams.get("repeat");

  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(!!repeatId);

  useEffect(
    function () {
      async function loadForRepeat() {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/draws/" + repeatId, {
          headers: { Authorization: "Bearer " + session?.access_token }
        });
        const result = await res.json();
        if (res.ok) {
          const d = result.draw;
          setForm({
            name: d.products.name || "",
            description: d.products.description || "",
            image_url: d.products.image_url || "",
            product_value: d.products.product_value || "",
            ticket_price: d.ticket_price || "",
            total_tickets: d.total_tickets || "",
            max_tickets_per_user: d.max_tickets_per_user || "3",
            start_at: "",
            end_at: ""
          });
        }
        setPrefilling(false);
      }
      if (repeatId) loadForRepeat();
    },
    [repeatId]
  );

  function update(field, value) {
    setForm(function (f) {
      return Object.assign({}, f, { [field]: value });
    });
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
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
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
      setMsg({ type: "success", text: "تم إنشاء السحب بنجاح." });
      setForm(empty);
    }
  }

  if (prefilling) {
    return (
      <AdminGuard>
        <p className="text-gray-500">...جارِ تحميل بيانات السحب السابق</p>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="max-w-lg mx-auto card">
        <h1 className="font-display text-2xl mb-4">{repeatId ? "تكرار السحب" : "إضافة سحب جديد"}</h1>
        {repeatId && (
          <p className="text-sm text-[var(--emerald)] bg-[var(--paper)] rounded-lg p-2 mb-3">
            تم نسخ بيانات المنتج من السحب السابق. عدّل ما تحتاجه وحدد تواريخ جديدة.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="اسم المنتج"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.name}
            onChange={function (e) {
              update("name", e.target.value);
            }}
            required
          />
          <textarea
            placeholder="وصف المنتج"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.description}
            onChange={function (e) {
              update("description", e.target.value);
            }}
          />
          <FileUpload
            bucket="product-images"
            label="صورة المنتج"
            viaServerEndpoint="/api/admin/upload-image"
            onUploaded={function (url) {
              update("image_url", url);
            }}
          />
          {form.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="" className="h-24 rounded-lg object-cover" />
          )}
          <input
            type="number"
            placeholder="قيمة المنتج ($)"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.product_value}
            onChange={function (e) {
              update("product_value", e.target.value);
            }}
            required
          />
          <input
            type="number"
            placeholder="سعر التذكرة ($)"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.ticket_price}
            onChange={function (e) {
              update("ticket_price", e.target.value);
            }}
            required
          />
          <input
            type="number"
            placeholder="العدد الإجمالي للتذاكر"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.total_tickets}
            onChange={function (e) {
              update("total_tickets", e.target.value);
            }}
            required
          />
          <input
            type="number"
            placeholder="الحد الأقصى للتذاكر لكل مستخدم"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.max_tickets_per_user}
            onChange={function (e) {
              update("max_tickets_per_user", e.target.value);
            }}
          />
          <label className="block text-sm text-gray-500">تاريخ ووقت بداية السحب</label>
          <input
            type="datetime-local"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.start_at}
            onChange={function (e) {
              update("start_at", e.target.value);
            }}
            required
          />
          <label className="block text-sm text-gray-500">تاريخ ووقت نهاية السحب</label>
          <input
            type="datetime-local"
            className="w-full border border-[var(--line)] rounded-lg p-2.5"
            value={form.end_at}
            onChange={function (e) {
              update("end_at", e.target.value);
            }}
            required
          />
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "...جارِ الإنشاء" : repeatId ? "إنشاء السحب المكرر" : "إنشاء السحب"}
          </button>
        </form>
        {msg && (
          <p className={"mt-3 font-bold " + (msg.type === "error" ? "text-[var(--ember)]" : "text-[var(--emerald)]")}>
            {msg.text}
          </p>
        )}
      </div>
    </AdminGuard>
  );
}
