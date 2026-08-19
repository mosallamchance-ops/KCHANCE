import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must NEVER be imported into
// client-side ("use client") components — only inside app/api/* route handlers.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
