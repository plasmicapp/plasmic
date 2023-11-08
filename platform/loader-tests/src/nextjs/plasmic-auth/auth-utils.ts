import { createPlasmicAppUser } from "@plasmicapp/auth-api";
import authConfig from "./auth.config.json";

export async function getPlasmicAppUserFromConfig(queryUserEmail?: string) {
  const {
    userEmail: configUserEmail,
    appSecret,
    authHost,
  } = authConfig as {
    userEmail?: string;
    appSecret?: string;
    authHost?: string;
  };

  const userEmail = queryUserEmail || configUserEmail;

  if (!userEmail || !appSecret) {
    // Anonymous
    return {
      plasmicUser: null,
      plasmicUserToken: null,
    };
  }

  const result = await createPlasmicAppUser({
    email: userEmail,
    appSecret,
    host: authHost,
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
