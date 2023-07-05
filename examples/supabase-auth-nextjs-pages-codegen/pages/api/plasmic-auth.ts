import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { getPlasmicAuthData } from "../../utils/plasmic-auth";

// This API endpoint is used to provide the Plasmic user in client-side code.
export default async function getPlasmicAuthDataHandler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const supabaseServerClient = createPagesServerClient({
    req,
    res,
  });

  res.json(await getPlasmicAuthData(supabaseServerClient));
}
