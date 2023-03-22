import {
  getPlasmicAppUser,
  getPlasmicAppUserFromToken,
} from '@plasmicapp/auth-api';
import useSWR from 'swr/immutable';

interface PlasmicAuthData {
  user: any;
  token: string | null;
}

const STORAGE_USER_KEY = 'plasmic_user';

function getCallbackParams() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const code = params.get('code');
  const state = params.get('state');

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
    return localStorage.getItem('code_verifier');
  } catch (err) {
    return null;
  }
}

function removeCallbackParams() {
  try {
    window.history.replaceState({}, '', location.pathname);
  } catch (err) {}
}

async function handleCallback(opts: {
  host?: string;
  appId: string;
  code: string;
  state: string;
  codeVerifier: string;
}): Promise<PlasmicAuthData | undefined> {
  const { host, appId, code, state, codeVerifier } = opts;

  let continueTo = undefined;
  try {
    if (state) {
      const parsedState = JSON.parse(state);
      continueTo = parsedState.continueTo;
    }
  } catch (err) {}

  const { token, user, error } = await getPlasmicAppUser({
    host,
    appId,
    code,
    codeVerifier,
  });

  if (error) {
    console.log(`Error while performing code exchange: ${error}`);
    return undefined;
  }

  localStorage.setItem(STORAGE_USER_KEY, token);

  if (continueTo) {
    window.location.assign(continueTo);
  } else {
    window.location.assign('/');
  }

  return { token, user };
}

async function checkAlreadyLoggedUser(opts: {
  host?: string;
}): Promise<PlasmicAuthData> {
  const { host } = opts;

  const token = localStorage.getItem(STORAGE_USER_KEY);
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
    localStorage.removeItem(STORAGE_USER_KEY);
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
  const { data: userData, isLoading } = useSWR(
    ['plasmic-auth', appId],
    async (): Promise<PlasmicAuthData> => {
      if (!appId) {
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
              console.error('No code verifier found');
              return { user: null, token: null };
            } else {
              // We will perform the code exchange, currently it's assumed that
              // by the end of the exchange a navigation is going to happen
              // This can be improved so that we don't navigate to the same page
              const result = await handleCallback({
                host,
                appId,
                code: callbackParams.code!,
                state: callbackParams.state!,
                codeVerifier,
              });
              // If the code exchange failed, we just remove the callback params
              if (!result) {
                removeCallbackParams();
                return { user: null, token: null };
              }

              // If the code exchange succeeded, we just return the result
              // Even though we are not going to use it, because we are going to navigate
              // If the callback page requires login, it will may trigger a login redirect
              // and we will end up in this hook again instead of displaying an unauthorized page

              // In the above case where the code exchange failed and the callback page requires login
              // a login redirect will be triggered
              return result;
            }
          }
        } else {
          return await checkAlreadyLoggedUser({
            host,
          });
        }
      } catch (err) {}

      return { user: null, token: null };
    }
  );

  return {
    user: userData?.user,
    token: userData?.token,
    isUserLoading: isLoading,
  };
}
