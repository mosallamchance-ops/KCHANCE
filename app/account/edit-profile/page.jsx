"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const provinces = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة",
  "الحسكة", "القامشلي"
];

export default function EditProfilePage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    age: "",
    gender: "",
    province: "",
    wallet_number: ""
  });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("first_name, last_name, age, gender, province, wallet_number, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setForm({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          age: profile.age || "",
          gender: profile.gender || "",
          province: profile.province || "",
          wallet_number: profile.wallet_number || ""
        });
        setPhone(profile.phone || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("users")
      .update({
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        province: form.province || null,
        wallet_number: form.wallet_number || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) setMsg({ type: "error", text: error.message });
    else setMsg({ type: "success", text: "تم حفظ معلوماتك بنجاح." });
  }

  if (loading) return <p className="text-gray-500">...جارِ التحميل</p>;

  return (
    <div className="max-w-sm mx-auto card">
      <h1 className="text-xl font-bold mb-4">معلوماتي الشخصية</h1>

      <div className="mb-3 text-sm text-gray-500">
        رقم الهاتف: {phone || "—"}{" "}
        <span className="text-xs">(لتغيير رقم الهاتف الرجاء التواصل مع الدعم)</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="الاسم"
          className="w-full border rounded-lg p-2"
          value={form.first_name}
          onChange={(e) => update("first_name", e.target.value)}
        />
        <input
          placeholder="الكنية"
          className="w-full border rounded-lg p-2"
          value={form.last_name}
          onChange={(e) => update("last_name", e.target.value)}
        />
        <input
          type="number"
          placeholder="العمر"
          className="w-full border rounded-lg p-2"
          value={form.age}
          onChange={(e) => update("age", e.target.value)}
        />
        <select
          className="w-full border rounded-lg p-2"
          value={form.gender}
          onChange={(e) => update("gender", e.target.value)}
        >
          <option value="">الجنس</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </select>
        <select
          className="w-full border rounded-lg p-2"
          value={form.province}
          onChange={(e) => update("province", e.target.value)}
        >
          <option value="">المحافظة</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          placeholder="رقم المحفظة"
          className="w-full border rounded-lg p-2"
          value={form.wallet_number}
          onChange={(e) => update("wallet_number", e.target.value)}
        />
        <button disabled={saving} className="btn-primary w-full">
          {saving ? "...جارِ الحفظ" : "حفظ المعلومات"}
        </button>
      </form>
      {msg && (
        <p className={`text-sm mt-3 ${msg.type === "error" ? "text-red-600" : "text-green-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
