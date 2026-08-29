import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function isValidIp(ip) {
  if (!ip) return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (ipv4.test(ip)) {
    return ip.split(".").every(function (part) {
      return Number(part) >= 0 && Number(part) <= 255;
    });
  }
  return ipv6.test(ip) && ip.includes(":");
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ip = isValidIp(rawIp) ? rawIp : null; // reject anything that isn't a plausible IP shape
  const userAgent = request.headers.get("user-agent") || null;

  await supabaseAdmin.from("login_events").insert({
    user_id: userData.user.id,
    ip_address: ip,
    user_agent: userAgent
  });

  return NextResponse.json({ success: true });
}
