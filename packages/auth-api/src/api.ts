import fetch from '@plasmicapp/isomorphic-unfetch';

const PLASMIC_HOST = 'https://studio.plasmic.app';

export interface PlasmicUser {
  email: string;
  properties: Record<string, unknown> | null;
  roleId: string;
  roleName: string;
  roleIds: string[];
  roleNames: string[];
}

export type PlasmicUserResult =
  | {
      user: null;
      token: null;
      error: Error;
    }
  | {
      user: PlasmicUser;
      token: string;
      error?: never;
    };

export async function getPlasmicAppUserFromToken(opts: {
  host?: string;
  token: string;
}): Promise<PlasmicUserResult> {
  const { host, token } = opts;
  const url = `${host || PLASMIC_HOST}/api/v1/app-auth/userinfo`;
  const result = await fetch(url, {
    headers: {
      'x-plasmic-data-user-auth-token': token,
    },
  });

  const user = await result.json();

  if (result.status >= 400) {
    return {
      user: null,
      token: null,
      error: new Error('Invalid token'),
    };
  }

  return {
    user,
    token,
  };
}

export async function getPlasmicAppUser(opts: {
  host?: string;
  appId: string;
  codeVerifier: string;
  code: string;
}): Promise<PlasmicUserResult> {
  const { host, appId, codeVerifier, code } = opts;

  const requestParams = new URLSearchParams();
  requestParams.set('grant_type', 'authorization_code');
  requestParams.set('code', code);
  requestParams.set('code_verifier', codeVerifier);
  requestParams.set('client_id', appId);

  const url = `${
    host || PLASMIC_HOST
  }/api/v1/app-auth/token?${requestParams.toString()}`;
  const result = await fetch(url);

  const { token, user, error } = await result.json();

  if (result.status >= 400 || error) {
    return {
      user: null,
      token: null,
      error: error ?? new Error('Internal error'),
    };
  }

  return {
    user,
    token,
  };
}

export async function createPlasmicAppUser(opts: {
  host?: string;
  appSecret: string;
  email: string;
}): Promise<PlasmicUserResult> {
  const { host, appSecret, email } = opts;
  const url = `${host || PLASMIC_HOST}/api/v1/app-auth/user`;
  const result = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-plasmic-app-auth-api-token': appSecret,
    },
    body: JSON.stringify({
      email,
    }),
  });

  const { user, token, error } = await result.json();

  if (result.status >= 400 || error) {
    return {
      user: null,
      token: null,
      error: error ?? new Error('Internal error'),
    };
  }

  return {
    user,
    token,
  };
}
