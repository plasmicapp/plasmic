import {
  getPlasmicAppUser,
  getPlasmicAppUserFromToken,
  PlasmicUser,
} from "@plasmicapp/auth-api";
import { useMutablePlasmicQueryData } from "@plasmicapp/query";

interface PlasmicAuthData {
  user: PlasmicUser | null;
  token: string | null;
}

const storageUserKey = (appId: string) => `$user.${appId}`;

const isBrowser = typeof window !== "undefined";

function getCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  return {
    isCallbackError: !!error,
    isCodeExchange: !!code && !!state,
    error,
    code,
    state,
  };
}

function getCodeVerifier() {
  try {
    return localStorage.getItem("code_verifier");
  } catch (err) {
    return null;
  }
}

function removeCallbackParams() {
  try {
    window.history.replaceState({}, "", location.pathname);
  } catch (err) {
    console.error(`Error while removing callback params: ${err}`);
  }
}

// continueTo can be only a pathname or a full url with origin
// we can consider that currently we are at the callback page
// with callback params, so ignore the search params
function isContinueToSameLocation(continueTo: string) {
  const pathname = window.location.pathname;
  const origin = window.location.origin;
  return continueTo === pathname || continueTo === origin + pathname;
}

async function handleCallback(opts: {
  host?: string;
  appId: string;
  code: string;
  state: string;
  codeVerifier: string;
}): Promise<PlasmicAuthData | undefined> {
  const { host, appId, code, state, codeVerifier } = opts;

  let continueTo = "/";
  try {
    if (state) {
      const parsedState = JSON.parse(state);
      continueTo = parsedState.continueTo;
    }
  } catch (err) {
    console.error(`Error while parsing state: ${err}`);
  }

  const result = await getPlasmicAppUser({
    host,
    appId,
    code,
    codeVerifier,
  });

  if (result.error) {
    console.log(`Error while performing code exchange: ${result.error}`);
    return undefined;
  }

  localStorage.setItem(storageUserKey(appId), result.token);

  if (!isContinueToSameLocation(continueTo)) {
    window.location.assign(continueTo);
  } else {
    removeCallbackParams();
  }

  return { token: result.token, user: result.user };
}

async function checkAlreadyLoggedUser(opts: {
  appId: string;
  host?: string;
}): Promise<PlasmicAuthData> {
  const { appId, host } = opts;

  const token = localStorage.getItem(storageUserKey(appId));
  if (!token) {
    return { user: null, token: null };
  }

  const { user, error } = await getPlasmicAppUserFromToken({
    host,
    token,
  });

  if (error) {
    // If there is an error, we just remove the token
    // But ideally we should check if the reason is token expired
    localStorage.removeItem(storageUserKey(appId));
    console.log(`Error while checking logged user`);
    return { user: null, token: null };
  }

  return { user, token };
}

/**
 * Handles the authentication flow for Plasmic Auth and returns the user and token
 */
export function usePlasmicAuth(opts: { host?: string; appId?: string }) {
  const { host, appId } = opts;
  const authKey = `$csq$plasmic-auth-${appId}`;
  const { data: userData, isLoading } = useMutablePlasmicQueryData(
    authKey,
    async (): Promise<PlasmicAuthData> => {
      if (!appId || !isBrowser) {
        return { user: null, token: null };
      }

      // Fail silently for now
      try {
        // We first check if we are currently in the callback flow
        const callbackParams = getCallbackParams();
        if (callbackParams.isCallbackError || callbackParams.isCodeExchange) {
          if (callbackParams.isCallbackError) {
            // If there is an error, we just remove the callback params
            removeCallbackParams();
            console.error(`Error: ${callbackParams.error}`);
            return { user: null, token: null };
          } else {
            const codeVerifier = getCodeVerifier();
            if (!codeVerifier) {
              // If there is no codeVerifier, we just remove the callback params
              removeCallbackParams();
              console.error("No code verifier found");
              return { user: null, token: null };
            } else {
              // Perform code exchange, by the end of the callback handling we will either still be
              // in the callback page or we will be redirected to the continueTo page.

              const result = await handleCallback({
                host,
                appId,
                code: callbackParams.code!,
                state: callbackParams.state!,
                codeVerifier,
              });

              // Undefined result means that the code exchange failed
              if (!result) {
                removeCallbackParams();
                return { user: null, token: null };
              }

              // In the above case where the code exchange failed and the callback page requires login
              // a login redirect will be triggered
              return result;
            }
          }
        } else {
          return await checkAlreadyLoggedUser({
            appId,
            host,
          });
        }
      } catch (err) {
        console.error(`Error while handling auth: ${err}`);
      }

      return { user: null, token: null };
    }
  );

  return {
    user: userData?.user ?? null,
    token: userData?.token ?? null,
    isUserLoading: isLoading,
  };
}
