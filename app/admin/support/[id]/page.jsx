"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminGuard from "@/components/AdminGuard";
import FileUpload from "@/components/FileUpload";

const statusOptions = ["open", "in_progress", "closed"];
const statusAr = { open: "مفتوحة", in_progress: "قيد المعالجة", closed: "مغلقة" };

export default function AdminSupportThreadPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [signedUrls, setSignedUrls] = useState({});
  const [reply, setReply] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);

  async function load() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/support/" + id, {
      headers: { Authorization: "Bearer " + session?.access_token }
    });
    const result = await res.json();
    if (res.ok) {
      setTicket(result.ticket);
      setMessages(result.messages);

      const withAttachments = result.messages.filter(function (m) {
        return m.attachment_url;
      });
      const urls = {};
      for (const m of withAttachments) {
        const { data } = await supabase.storage.from("support-attachments").createSignedUrl(m.attachment_url, 3600);
        if (data) urls[m.id] = data.signedUrl;
      }
      setSignedUrls(urls);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() && !attachment) return;
    setSending(true);

    const {
      data: { session }
    } = await supabase.auth.getSession();
    await fetch("/api/admin/support/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ message: reply || "(صورة مرفقة)", attachment_url: attachment, status: "in_progress" })
    });

    setReply("");
    setAttachment(null);
    setSending(false);
    load();
  }

  async function changeStatus(status) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    await fetch("/api/admin/support/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session?.access_token },
      body: JSON.stringify({ status: status })
    });
    load();
  }

  if (!ticket) return <p className="text-gray-500">...جارِ التحميل</p>;

  return (
    <AdminGuard>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="card flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">{ticket.subject}</h1>
            <p className="text-sm text-gray-500">
              {ticket.users?.first_name} {ticket.users?.last_name} — {ticket.users?.phone}
            </p>
          </div>
          <select
            className="border rounded-lg p-2 text-sm"
            value={ticket.status}
            onChange={function (e) {
              changeStatus(e.target.value);
            }}
          >
            {statusOptions.map(function (s) {
              return (
                <option key={s} value={s}>
                  {statusAr[s]}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-2">
          {messages.map(function (m) {
            return (
              <div
                key={m.id}
                className={
                  "p-3 rounded-xl text-sm max-w-[85%] " +
                  (m.sender_type === "admin" ? "bg-[var(--emerald)] text-white mr-auto" : "bg-[var(--card)] border border-[var(--line)] ml-auto")
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
                <p className={"text-xs mt-1 " + (m.sender_type === "admin" ? "text-white/70" : "text-gray-400")}>
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
              viaServerEndpoint="/api/admin/upload-image"
              label="إرفاق صورة (اختياري)"
              onUploaded={setAttachment}
            />
            <button disabled={sending} className="btn-primary w-full">
              {sending ? "...جارِ الإرسال" : "إرسال"}
            </button>
          </form>
        ) : (
          <p className="text-center text-gray-400 text-sm">هذه التذكرة مغلقة.</p>
        )}
      </div>
    </AdminGuard>
  );
}
