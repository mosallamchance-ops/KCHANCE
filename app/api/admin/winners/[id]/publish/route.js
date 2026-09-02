import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: admin } = await supabaseAdmin
    .from("admins")
    .select("id, status")
    .eq("id", userData.user.id)
    .single();

  if (!admin || admin.status !== "active") {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const { published } = await request.json();

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("winners")
    .select("published, user_id, prize_type, prize_amount, draws(products(name))")
    .eq("id", params.id)
    .single();

  if (fetchErr) return adminErrorResponse(fetchErr, 404, "publish winner: fetch existing");

  const { error } = await supabaseAdmin.from("winners").update({ published: !!published }).eq("id", params.id);
  if (error) return adminErrorResponse(error, 400, "toggle winner publish status");

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: published ? "publish_winner" : "unpublish_winner",
    entity_type: "winner",
    entity_id: params.id
  });

  // Only send the "you won" notification the moment it transitions from
  // unapproved to approved — never on repeat toggles.
  if (published && !existing.published) {
    const productName = existing.draws?.products?.name ?? "";
    const message =
      existing.prize_type === "product"
        ? "لقد فزت بالمنتج في السحب: " + productName + ". سيتم التواصل معك لتسليم الجائزة."
        : "لقد فزت بجائزة نقدية قدرها " + existing.prize_amount + " ل.س. سيتم التواصل معك لتسليمها.";

    await supabaseAdmin.from("notifications").insert({
      user_id: existing.user_id,
      title: "مبروك! لقد ربحت السحب",
      message,
      type: "winner"
    });
  }

  return NextResponse.json({ success: true });
}
