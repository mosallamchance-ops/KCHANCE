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

    const { draw_id, quantity } = await request.json();

    if (!draw_id || !Number.isInteger(quantity) || quantity < 1 || quantity > 3) {
      return NextResponse.json({ error: "كمية غير صالحة" }, { status: 400 });
    }

    // All validation + concurrency-safety happens inside this Postgres function.
    const { data, error } = await supabaseAdmin.rpc("purchase_tickets", {
      p_user_id: userId,
      p_draw_id: draw_id,
      p_quantity: quantity
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
