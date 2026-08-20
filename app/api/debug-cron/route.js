import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.CRON_SECRET || "";
  return NextResponse.json({
    exists: !!process.env.CRON_SECRET,
    length: secret.length,
    firstTwo: secret.slice(0, 2),
    lastTwo: secret.slice(-2)
  });
}
