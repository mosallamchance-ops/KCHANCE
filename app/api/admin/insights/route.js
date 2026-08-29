import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  try {
        const [leaderboard, dailyStats, topActive, funnel, funnelDays, drawPerf, revenue] = await Promise.all([
      supabaseAdmin.rpc("leaderboard_top_buyers", { p_limit: 50 }),
      supabaseAdmin.rpc("activity_daily_stats", { p_days: 14 }),
      supabaseAdmin.rpc("activity_top_active_users", { p_days: 30, p_limit: 20 }),
      supabaseAdmin.rpc("funnel_stats"),
      supabaseAdmin.rpc("funnel_avg_days"),
      supabaseAdmin.rpc("draw_performance_stats"),
      supabaseAdmin.rpc("revenue_summary")
    ]);

    if (leaderboard.error) return adminErrorResponse(leaderboard.error, 500, "insights: leaderboard");
    if (dailyStats.error) return adminErrorResponse(dailyStats.error, 500, "insights: daily stats");
    if (topActive.error) return adminErrorResponse(topActive.error, 500, "insights: top active users");
    if (funnel.error) return adminErrorResponse(funnel.error, 500, "insights: funnel");
    if (funnelDays.error) return adminErrorResponse(funnelDays.error, 500, "insights: funnel days");
    if (drawPerf.error) return adminErrorResponse(drawPerf.error, 500, "insights: draw performance");
    if (revenue.error) return adminErrorResponse(revenue.error, 500, "insights: revenue summary");

    return NextResponse.json(
      {
        leaderboard: leaderboard.data,
        dailyStats: dailyStats.data,
        topActive: topActive.data,
        funnel: funnel.data?.[0] ?? null,
        funnelDays: funnelDays.data?.[0] ?? null,
        drawPerf: drawPerf.data,
        revenue: revenue.data?.[0] ?? null
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return adminErrorResponse(e, 500, "insights: general");
  }
}
