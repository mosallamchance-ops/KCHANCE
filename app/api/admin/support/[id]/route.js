import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store"
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return null;

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active") return null;
  return admin;
}

export async function GET(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  try {
    const tickets = await restGet(`support_tickets?select=*,users(first_name,last_name,phone)&id=eq.${params.id}`);
    const messages = await restGet(`support_messages?select=*&ticket_id=eq.${params.id}&order=created_at.asc`);

    if (!tickets?.[0]) return NextResponse.json({ error: "التذكرة غير موجودة" }, { status: 404 });

    // Generate signed URLs server-side with the service role, bypassing any
    // client-side storage RLS ambiguity — same fix used for the product image
    // upload issue earlier.
    const messagesWithUrls = await Promise.all(
      messages.map(async function (m) {
        if (!m.attachment_url) return m;
        const { data, error } = await supabaseAdmin.storage
          .from("support-attachments")
          .createSignedUrl(m.attachment_url, 3600);
        return { ...m, signedAttachmentUrl: error ? null : data?.signedUrl };
      })
    );

    return NextResponse.json(
      { ticket: tickets[0], messages: messagesWithUrls },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { message, attachment_url, status } = await request.json();

  if (message) {
    const { error: msgErr } = await supabaseAdmin.from("support_messages").insert({
      ticket_id: params.id,
      sender_type: "admin",
      sender_id: admin.id,
      message,
      attachment_url: attachment_url || null
    });
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("user_id, subject")
      .eq("id", params.id)
      .single();

    if (ticket) {
      await supabaseAdmin.from("notifications").insert({
        user_id: ticket.user_id,
        title: "رد جديد على تذكرة الدعم",
        message: `تم الرد على تذكرتك: ${ticket.subject}`,
        type: "support_reply"
      });
    }
  }

  const updates = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;

  const { error } = await supabaseAdmin.from("support_tickets").update(updates).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
