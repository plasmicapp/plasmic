import type { Database } from "@/types/supabase";
import { createClient as createClientPrimitive } from "@supabase/supabase-js";

/**
 * This function creates a new Supabase client to be used in the getStaticProps function on a page.
 * See more https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-props
 * Not used in our example. Most of the time you would want to use usePlasmicDataQuery() instead, which works for both SSG and SSR.
 * See more here: https://docs.plasmic.app/learn/data-code-components/#fetching-data-from-your-code-components instead
 */
export function createSupabaseClient() {
  const supabase = createClientPrimitive<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabase;
}
