import type { Database } from "@/types/supabase";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a new Supabase client to be used in the component. Gets executed on the client side, in browser.
 */
export function createSupabaseClient() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabase;
}
