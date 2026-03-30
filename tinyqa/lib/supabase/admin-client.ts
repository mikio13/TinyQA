import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using service role key.
 * Use this for webhook routes where there is no user session (no cookies).
 * NEVER expose this on the client side.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
