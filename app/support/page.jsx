"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const statusAr = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setTickets(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTicket(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, subject })
      .select()
      .single();

    if (error) {
      setLoading(false);
      return setMsg(error.message);
    }

    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_type: "user",
      sender_id: user.id,
      message: firstMessage
    });

    setLoading(false);
    setSubject("");
    setFirstMessage("");
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">الدعم</h1>

      <form onSubmit={createTicket} className="card space-y-2">
        <h2 className="font-bold">فتح تذكرة دعم جديدة</h2>
        <input
          placeholder="عنوان المشكلة"
          className="w-full border rounded-lg p-2"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          placeholder="اشرح المشكلة بالتفصيل"
          className="w-full border rounded-lg p-2"
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          required
        />
        <button disabled={loading} className="btn-primary w-full">
          {loading ? "...جارِ الإرسال" : "فتح تذكرة"}
        </button>
        {msg && <p className="text-sm text-[var(--ember)]">{msg}</p>}
      </form>

      <div>
        <h2 className="font-bold mb-2">تذاكري</h2>
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/support/${t.id}`} className="card flex justify-between items-center text-sm block">
              <div>
                <p className="font-bold">{t.subject}</p>
                <p className="text-gray-400">{new Date(t.created_at).toLocaleString("ar")}</p>
              </div>
              <span
                className={
                  t.status === "open"
                    ? "text-[var(--gold-deep)]"
                    : t.status === "closed"
                    ? "text-gray-400"
                    : "text-[var(--emerald)]"
                }
              >
                {statusAr[t.status]}
              </span>
            </Link>
          ))}
          {tickets.length === 0 && <p className="text-gray-500 text-sm">لا توجد تذاكر دعم بعد.</p>}
        </div>
      </div>
    </div>
  );
}
