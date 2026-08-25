"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const statusAr = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

export default function SupportThreadPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState(null);

  async function load() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: t } = await supabase.from("support_tickets").select("*").eq("id", id).single();
    setTicket(t);

    const { data: m } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });
    setMessages(m ?? []);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);

    await supabase.from("support_messages").insert({
      ticket_id: id,
      sender_type: "user",
      sender_id: userId,
      message: reply
    });

    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", id);

    setReply("");
    setSending(false);
    load();
  }

  if (!ticket) return <p className="text-gray-500">...جارِ التحميل</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="card">
        <h1 className="font-bold text-lg">{ticket.subject}</h1>
        <p className="text-sm text-gray-500">الحالة: {statusAr[ticket.status]}</p>
      </div>

      <div className="space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl text-sm max-w-[85%] ${
              m.sender_type === "user"
                ? "bg-[var(--emerald)] text-white mr-auto"
                : "bg-[var(--card)] border border-[var(--line)] ml-auto"
            }`}
          >
            <p>{m.message}</p>
            <p className={`text-xs mt-1 ${m.sender_type === "user" ? "text-white/70" : "text-gray-400"}`}>
              {new Date(m.created_at).toLocaleString("ar")}
            </p>
          </div>
        ))}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={sendReply} className="flex gap-2">
          <input
            placeholder="اكتب رداً..."
            className="flex-1 border rounded-lg p-2"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <button disabled={sending} className="btn-primary">
            إرسال
          </button>
        </form>
      ) : (
        <p className="text-center text-gray-400 text-sm">تم إغلاق هذه التذكرة.</p>
      )}
    </div>
  );
}
