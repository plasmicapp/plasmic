import { ensurePlasmicAppUser, PlasmicUser } from "@plasmicapp/auth-api";
import { SupabaseClient } from "@supabase/auth-helpers-nextjs";

// This is the secret that allows us to create users in the Plasmic API.
// This should be kept secret and not exposed to the client.
const PLASMIC_AUTH_SECRET = process.env.PLASMIC_AUTH_SECRET;

// Converts the current user in Supabase session to a Plasmic user.
export async function getPlasmicAuthData(
  supabaseServerClient: SupabaseClient
): Promise<{
  plasmicUser?: PlasmicUser | null;
  plasmicUserToken?: string | null;
}> {
  // Using supabase session as a source of thruth for the user's email.
  // This could have better performance by managing plasmic user and supabase user
  // separately, but this is a simple example.
  const {
    data: { user },
  } = await supabaseServerClient.auth.getUser();

  if (user?.email && user?.email_confirmed_at) {
    // If we have a confirmed email we then create a Plasmic user.
    // It's not an issue to create a user multiple times, as the API will
    // return the same user if it already exists.
    const result = await ensurePlasmicAppUser({
      email: user?.email,
      appSecret: PLASMIC_AUTH_SECRET!,
    });

    if (result.error) {
      throw new Error("Error creating user: " + result.error);
    }

    const { user: plasmicUser, token: plasmicUserToken } = result;

    return {
      plasmicUser,
      plasmicUserToken,
    };
  }

  return {
    plasmicUser: null,
    plasmicUserToken: null,
  };
}
