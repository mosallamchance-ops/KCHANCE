import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "سحب الرصيد غير متاح حالياً. الجوائز النقدية تُرسل يدوياً كهدية من قبل الإدارة." },
    { status: 403 }
  );
}
