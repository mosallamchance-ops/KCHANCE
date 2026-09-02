import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // Verify the user's token server-side — never trust a user id sent from the client.
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { draw_id, ticket_slots } = await request.json();

    if (!draw_id || !Array.isArray(ticket_slots) || ticket_slots.length < 1 || ticket_slots.length > 20) {
      return NextResponse.json({ error: "اختيار غير صالح" }, { status: 400 });
    }
    if (!ticket_slots.every(function (n) { return Number.isInteger(n) && n > 0; })) {
      return NextResponse.json({ error: "أرقام تذاكر غير صالحة" }, { status: 400 });
    }

    // All validation + concurrency-safety happens inside this Postgres function.
    const { data, error } = await supabaseAdmin.rpc("purchase_selected_tickets", {
      p_user_id: userId,
      p_draw_id: draw_id,
      p_ticket_slots: ticket_slots
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
