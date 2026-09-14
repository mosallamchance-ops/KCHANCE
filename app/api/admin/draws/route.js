import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import { requireAdminRole } from "@/lib/requireAdminRole";

export async function POST(request) {
  const admin = await requireAdminRole(request, ["draw_manager"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
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

  if (!name || !product_value || !ticket_price || !total_tickets || !start_at || !end_at) {
    return NextResponse.json({ error: "الرجاء تعبئة كل الحقول المطلوبة" }, { status: 400 });
  }

  const { data: product, error: productErr } = await supabaseAdmin
    .from("products")
    .insert({ name, description, image_url, product_value })
    .select()
    .single();

  if (productErr) return NextResponse.json({ error: productErr.message }, { status: 400 });

  const { data: draw, error: drawErr } = await supabaseAdmin
    .from("draws")
    .insert({
      product_id: product.id,
      ticket_price,
      total_tickets,
      max_tickets_per_user: max_tickets_per_user || 3,
      start_at,
      end_at,
      status: "active"
    })
    .select()
    .single();

  if (drawErr) return NextResponse.json({ error: drawErr.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: "create_draw",
    entity_type: "draw",
    entity_id: draw.id,
    new_value: draw
  });

  return NextResponse.json({ success: true, draw });
}
