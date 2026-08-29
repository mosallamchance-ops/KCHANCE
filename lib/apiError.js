import { NextResponse } from "next/server";

// Logs the full error server-side (visible in Vercel's Function Logs) but
// never exposes raw database error text (table/column names, constraint
// names, etc.) to whoever is calling the API.
export function adminErrorResponse(error, status, context) {
  console.error((context || "admin API error") + ":", error?.message || error);
  return NextResponse.json({ error: "حدث خطأ في الخادم، حاول مرة أخرى." }, { status: status || 500 });
}
