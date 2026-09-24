import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "جلسة غير صالحة" }, { status: 401 });
    }
    const userId = userData.user.id;

    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "الرجاء تأكيد كلمة المرور" }, { status: 400 });
    }

    // Re-verify the password server-side before doing anything irreversible —
    // an open session alone shouldn't be enough to close the account.
    const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.user.email,
      password: password
    });
    if (verifyError) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Ban the auth identity so no future login/token-refresh succeeds.
    // We deliberately do NOT delete the auth user or the public.users row:
    // tickets/purchases/transactions/winners all reference public.users
    // with no ON DELETE CASCADE, so a hard delete would either fail
    // outright (if they ever bought a ticket) or, worse, silently corrupt
    // draw and financial history for everyone else. See supabase/account_deletion.sql.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h" // ~100 years — GoTrue has no literal "forever" value
    });
    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 400 });
    }

    // Anonymize optional profile fields. Phone is kept (unique, and needed
    // for the existing multi-account/fraud-detection checks per the Terms);
    // every ticket, purchase, transaction and winner row is left untouched.
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        first_name: null,
        last_name: null,
        age: null,
        gender: null,
        province: null,
        wallet_number: null,
        status: "suspended",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
