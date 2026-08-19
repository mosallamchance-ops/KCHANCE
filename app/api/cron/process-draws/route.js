import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Protect this endpoint so only Vercel Cron (or you, manually, with the secret) can call it.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // 1) Mark any draw whose time ran out (without selling out) as expired.
  const { error: expireErr } = await supabaseAdmin.rpc("expire_overdue_draws");
  if (expireErr) {
    return NextResponse.json({ error: expireErr.message }, { status: 500 });
  }

  // 2) Find every draw that's sold_out or expired but not yet completed.
  const { data: pendingDraws, error: fetchErr } = await supabaseAdmin
    .from("draws")
    .select("id")
    .in("status", ["sold_out", "expired"]);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const results = [];
  for (const draw of pendingDraws ?? []) {
    const { data, error } = await supabaseAdmin.rpc("select_winner_for_draw", { p_draw_id: draw.id });
    results.push({ draw_id: draw.id, error: error?.message ?? null, result: data ?? null });
  }

  return NextResponse.json({ processed: results.length, results });
}
