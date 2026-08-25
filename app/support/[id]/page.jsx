"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import FileUpload from "@/components/FileUpload";

const statusAr = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

export default function SupportThreadPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
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

    const withAttachments = (m ?? []).filter(function (msg) {
      return msg.attachment_url;
    });
    const urls = {};
    for (const msg of withAttachments) {
      const { data } = await supabase.storage.from("support-attachments").createSignedUrl(msg.attachment_url, 3600);
      if (data) urls[msg.id] = data.signedUrl;
    }
    setSignedUrls(urls);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() && !attachment) return;
    setSending(true);

    await supabase.from("support_messages").insert({
      ticket_id: id,
      sender_type: "user",
      sender_id: userId,
      message: reply || "(صورة مرفقة)",
      attachment_url: attachment
    });

    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", id);

    setReply("");
    setAttachment(null);
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
        {messages.map(function (m) {
          return (
            <div
              key={m.id}
              className={
                "p-3 rounded-xl text-sm max-w-[85%] " +
                (m.sender_type === "user" ? "bg-[var(--emerald)] text-white mr-auto" : "bg-[var(--card)] border border-[var(--line)] ml-auto")
              }
            >
              <p>{m.message}</p>
              {m.attachment_url && signedUrls[m.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrls[m.id]}
                  alt=""
                  className="mt-2 rounded-lg max-h-48 cursor-pointer"
                  onClick={function () {
                    window.open(signedUrls[m.id], "_blank");
                  }}
                />
              )}
              <p className={"text-xs mt-1 " + (m.sender_type === "user" ? "text-white/70" : "text-gray-400")}>
                {new Date(m.created_at).toLocaleString("ar")}
              </p>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={sendReply} className="card space-y-2">
          <input
            placeholder="اكتب رداً..."
            className="w-full border rounded-lg p-2"
            value={reply}
            onChange={function (e) {
              setReply(e.target.value);
            }}
          />
          <FileUpload
            bucket="support-attachments"
            pathPrefix={userId}
            label="إرفاق صورة (اختياري)"
            onUploaded={setAttachment}
          />
          <button disabled={sending} className="btn-primary w-full">
            {sending ? "...جارِ الإرسال" : "إرسال"}
          </button>
        </form>
      ) : (
        <p className="text-center text-gray-400 text-sm">تم إغلاق هذه التذكرة.</p>
      )}
    </div>
  );
}
