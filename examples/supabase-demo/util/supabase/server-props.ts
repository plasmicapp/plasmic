import { createServerClient, serializeCookieHeader } from "@supabase/ssr";
import { type GetServerSidePropsContext } from "next";

/**
 * This function creates a new Supabase client to be used in the getServerSideProps function on a page.
 * See more https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props
 * Not used in our example. Most of the time you would want to use usePlasmicDataQuery() instead, which works for both SSG and SSR.
 * See more here: https://docs.plasmic.app/learn/data-code-components/#fetching-data-from-your-code-components instead
 */
export function createSupabaseClient({ req, res }: GetServerSidePropsContext) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name] || "",
          }));
        },
        setAll(cookiesToSet) {
          res.setHeader(
            "Set-Cookie",
            cookiesToSet.map(({ name, value, options }) =>
              serializeCookieHeader(name, value, options)
            )
          );
        },
      },
    }
  );

  return supabase;
}
