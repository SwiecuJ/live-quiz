import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key, which bypasses
 * RLS. Only ever import this from Route Handlers / server code -- never
 * from a "use client" file, or the service role key would end up in the
 * browser bundle.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
