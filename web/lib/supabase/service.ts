import { createClient } from '@supabase/supabase-js'

/**
 * Bypasses RLS. Only use in server-to-server contexts (Stripe webhook).
 * Never use in request handlers that run on behalf of a user.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
