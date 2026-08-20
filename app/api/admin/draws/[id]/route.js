import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const dynamic = "force-dynamic";

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

  const { data, error } = await supabaseAdmin
    .from("draws")
    .select("*, products(*)")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ draw: data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PUT(request, { params }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("draws")
    .select("sold_tickets, product_id")
    .eq("id", params.id)
    .single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  if (existing.sold_tickets > 0) {
    return NextResponse.json(
      { error: "لا يمكن تعديل هذا السحب لأنه تم بيع تذاكر منه بالفعل." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    name,
    description,
    image_url,
    product_value,
    ticket_price,
    total_tickets,
    max_tickets_per_user,
    start_at,
    end_at
  } = body;

  const { error: productErr } = await supabaseAdmin
    .from("products")
    .update({ name, description, image_url, product_value })
    .eq("id", existing.product_id);
  if (productErr) return NextResponse.json({ error: productErr.message }, { status: 400 });

  const { data: updatedDraw, error: drawErr } = await supabaseAdmin
    .from("draws")
    .update({ ticket_price, total_tickets, max_tickets_per_user, start_at, end_at })
    .eq("id", params.id)
    .select()
    .single();
  if (drawErr) return NextResponse.json({ error: drawErr.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: "edit_draw",
    entity_type: "draw",
    entity_id: params.id,
    new_value: updatedDraw
  });

  return NextResponse.json({ success: true, draw: updatedDraw });
}
