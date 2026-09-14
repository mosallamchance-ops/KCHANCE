import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";
import { requireAdminRole } from "@/lib/requireAdminRole";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const admin = await requireAdminRole(request, ["draw_manager"]);
  if (!admin) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  const { pinned } = await request.json();

  const { error } = await supabaseAdmin.from("draws").update({ pinned: !!pinned }).eq("id", params.id);
  if (error) return adminErrorResponse(error, 400, "toggle draw pin");

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.id,
    action: pinned ? "pin_draw" : "unpin_draw",
    entity_type: "draw",
    entity_id: params.id
  });

  return NextResponse.json({ success: true });
}
