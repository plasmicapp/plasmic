import { ForbiddenError } from "@/wab/server/db/DbMgr";
import {
  getAppUserInfo,
  getUserRoleForApp,
} from "@/wab/server/routes/end-user";
import { superDbMgr } from "@/wab/server/routes/util";
import { getEncryptionKey } from "@/wab/server/secrets";
import { makeStableEncryptor } from "@/wab/server/util/crypt";
import { ProjectId, UserId } from "@/wab/shared/ApiSchema";
import crypto from "crypto";
import { Request, Response } from "express-serve-static-core";
import jwt from "jsonwebtoken";
import { isString } from "lodash";

const encryptor = makeStableEncryptor(getEncryptionKey());
interface OauthCodeMeta {
  id: string;
  clientId: string;
  redirectUri: string;
  codeChallengeMethod: "S256";
  codeChallenge: string;
  user: {
    id: string;
    email: string;
  };
  expiration: number;
}

const encryptCodeMeta = (meta: OauthCodeMeta) => {
  return encryptor.to(JSON.stringify(meta));
};

const decryptCodeMeta = (code: string): OauthCodeMeta => {
  return JSON.parse(encryptor.from(code)) as OauthCodeMeta;
};

function isValidRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);
    const { protocol, host } = url;
    // Restrict to HTTPS or localhost HTTP
    if (protocol === "http:") {
      return host.includes("localhost");
    }
    return protocol === "https:";
  } catch (e) {
    return false;
  }
}

export async function issueOauthCode(req: Request, res: Response) {
  const userId = req.user?.id,
    userEmail = req.user?.email,
    waitingEmailVerification = req.user?.waitingEmailVerification;
  if (!userId || !userEmail || waitingEmailVerification) {
    throw new Error("User not authenticated");
  }

  const {
    client_id: clientId, // clientId is the appId
    scope: scope,
    state: state,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    redirect_uri: queryRedirectUri,
    // origin_host is not part of the OAuth2 spec, but we use it to define the preferred
    // redirect_uri when the client is a trusted domain
    origin_host: rawOriginHost,
  } = req.query;

  const mgr = superDbMgr(req);
  const appAuthConfig = await mgr.getAppAuthConfig(clientId as ProjectId);
  const originHost = isString(rawOriginHost) ? rawOriginHost : undefined;

  if (
    !clientId ||
    !isString(clientId) ||
    !appAuthConfig ||
    appAuthConfig.provider !== "plasmic-auth"
  ) {
    // We don't perform the redirect because we don't have an official redirectUri
    res.status(400).json({ error: "invalid_client_id" });
    return;
  }

  const projectDomains = await mgr.getDomainsForProject(clientId as ProjectId);

  const { valid, redirectUri } = parseRedirectURI(
    queryRedirectUri,
    state,
    appAuthConfig.redirectUris,
    projectDomains,
    originHost
  );

  if (!valid || !redirectUri) {
    res.status(400).json({ error: "invalid_redirect_uri" });
    return;
  }

  function performRedirect(params: Record<string, any>) {
    const qs = new URLSearchParams(params);
    res.redirect(`${redirectUri}?${qs.toString()}`);
  }

  if (responseType !== "code") {
    performRedirect({ error: "invalid_response_type" });
    return;
  }

  if (codeChallengeMethod !== "S256") {
    performRedirect({ error: "invalid_code_challenge_method" });
    return;
  }

  if (!isString(codeChallenge)) {
    performRedirect({ error: "invalid_code_challenge" });
    return;
  }

  const userRoleInApp = await getUserRoleForApp(mgr, clientId, {
    email: userEmail,
  });

  if (!userRoleInApp) {
    performRedirect({ error: "unauthorized_user" });
    return;
  }

  // TODO(fmota): Validate scope (?)

  const ONE_MIN = 60 * 1000;

  const codeId = crypto.randomBytes(16).toString("hex");

  const codeMeta: OauthCodeMeta = {
    id: codeId,
    clientId,
    redirectUri,
    codeChallengeMethod,
    codeChallenge,
    user: {
      id: userId,
      email: userEmail,
    },
    expiration: Date.now() + ONE_MIN,
  };

  const code = encryptCodeMeta(codeMeta);
  performRedirect({ code, state });
}

function generateUserToken(appId: string, endUserId: string) {
  const token = jwt.sign(
    {
      appId,
      endUserId,
    },
    getEncryptionKey(),
    {
      expiresIn: "7d",
    }
  );
  return token;
}

function decodeUserToken(token: string) {
  try {
    const info = jwt.verify(token, getEncryptionKey()) as {
      appId: string;
      endUserId: string;
    };
    console.log("Decoded app auth token to ", info);
    return info;
  } catch (err) {
    throw new Error("Invalid token");
  }
}

export async function grantOauthToken(req: Request, res: Response) {
  const { grant_type, code, client_id, code_verifier } = req.query;

  // Errors should later be used to redirect to the redirect_uri with an error query param
  // https://www.oauth.com/oauth2-servers/server-side-apps/possible-errors/
  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "invalid_grant_type" });
    return;
  }

  const codeMeta = decryptCodeMeta(code as string);
  if (Date.now() > codeMeta.expiration) {
    res.status(400).json({ error: "code_expired" });
    return;
  }

  if (codeMeta.clientId !== client_id) {
    res.status(400).json({ error: "invalid_client_id" });
    return;
  }

  const codeVerifierHash = crypto
    .createHash("sha256")
    .update(code_verifier as string)
    .digest("hex");

  if (codeVerifierHash !== codeMeta.codeChallenge) {
    res.status(400).json({ error: "invalid_code_verifier" });
    return;
  }

  const mgr = superDbMgr(req);

  const alreadyUsedCode = await mgr.existsIssuedCode(code as string);

  if (alreadyUsedCode) {
    res.status(400).json({ error: "code_already_used" });
    return;
  }

  const appAuthConfig = await mgr.getAppAuthConfig(
    codeMeta.clientId as ProjectId
  );

  if (!appAuthConfig) {
    res.status(400).json({ error: "invalid_client_id" });
    return;
  }

  const plasmicUser = await mgr.getUserByEmail(codeMeta.user.email);

  const endUser = await mgr.upsertEndUser(
    appAuthConfig.directoryId,
    {
      email: codeMeta.user.email,
    },
    codeMeta.user.id as UserId,
    // We upsert some basics properties about the user, in it's existing account on the directory
    // Per app user properties won't be upserted here, but rather on the app's own database
    //
    // This information is only populated in the directory instead of being retrieved from the users table
    // when we need to create a currentUser, so that we don't allow apps to see data about users that
    // not necessarily logged to that app.
    {
      firstName: plasmicUser?.firstName,
      lastName: plasmicUser?.lastName,
      avatarUrl: plasmicUser?.avatarUrl,
    }
  );

  await mgr.upsertAppAccessRegistry(codeMeta.clientId, endUser.id);

  await mgr.insertIssuedCode(code as string);

  const token = generateUserToken(codeMeta.clientId, endUser.id);
  const user = await getAppUserInfo(req.con, mgr, {
    appId: codeMeta.clientId,
    endUserId: endUser.id,
  });

  trackAppUserActivity(req, codeMeta.clientId, endUser.id, "login");

  res.json({
    token,
    user,
  });
}

export function trackAppUserActivity(
  req: Request,
  appId: string,
  endUserId: string,
  type: "login" | "custom-auth-login" | "data-operation"
) {
  // Compose analytics id from appId and endUserId because we don't have a
  // id for (appId, endUserId) pair in the database as their relationship is
  // implicit through the app access
  const appAuthUserId = `${appId}-${endUserId}`;
  req.analytics.identify(appAuthUserId, { appId, endUserId });
  req.analytics.track("App User Activity", {
    type,
    appId,
  });
}

export function extractAppUserFromToken(req: Request, skipError = false) {
  const token = req.headers["x-plasmic-data-user-auth-token"];
  if (!token || !isString(token)) {
    console.log(
      `[${req.id}] - Data source request without app auth token or with invalid token`
    );
    if (skipError) {
      return {
        endUserId: undefined,
        appId: undefined,
      };
    }
    throw new ForbiddenError("No token provided");
  }
  return decodeUserToken(token);
}

export async function getEndUserByToken(req: Request, res: Response) {
  const tokenInfo = extractAppUserFromToken(req);
  const mgr = superDbMgr(req);
  const appUser = await getAppUserInfo(req.con, mgr, tokenInfo);
  res.json(appUser);
}

export async function upsertEndUser(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  const { email, externalId, properties, roleId } = req.body;
  const appAuthApiToken =
    req.body.appAuthApiToken ?? req.headers["x-plasmic-app-auth-api-token"];

  const identifier = {
    email: email && isString(email) ? email : undefined,
    externalId: externalId && isString(externalId) ? externalId : undefined,
  };

  if (!appAuthApiToken || (!identifier.email && !identifier.externalId)) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  const appAuthConfig = await mgr.getAppAuthConfigForToken(appAuthApiToken);

  if (!appAuthConfig || appAuthConfig.provider !== "custom-auth") {
    res.status(403).json({ error: "invalid_token" });
    return;
  }

  const directory = await mgr.getEndUserDirectoryById(
    appAuthConfig.directoryId
  );

  const appId = appAuthConfig.projectId;

  // For custom auth, we allow the user to specify a role to be assigned to the user
  if (roleId) {
    await mgr.upsertAppEndUserAccess(
      appId,
      identifier.email
        ? {
            email: identifier.email,
          }
        : {
            externalId: identifier.externalId!,
          },
      roleId,
      // We dont' consider this rule as manually added, which won't appear in the PermissionsTab
      // unless the user interacts with it in the Users tab
      /* manuallyAdded */ false
    );
  }

  const userRole = await getUserRoleForApp(mgr, appId, identifier);

  if (!userRole) {
    res.status(403).json({ error: "unauthorized_user" });
    return;
  }

  const endUser = await mgr.upsertEndUser(
    directory.id,
    identifier,
    undefined,
    properties
  );
  await mgr.upsertAppAccessRegistry(appId, endUser.id);

  const token = generateUserToken(appId, endUser.id);
  const user = await getAppUserInfo(req.con, mgr, {
    appId,
    endUserId: endUser.id,
  });

  trackAppUserActivity(req, appId, endUser.id, "custom-auth-login");

  res.json({
    token,
    user,
  });
}

// Here we validate the redirect_uri, the following order of precedence is used:
// 1. If the redirect_uri is provided in the query, we consider it to be either
// an exact match present in the list of allowed redirect uris
// we try to fallback to 2. if it's a domain that is present in the list of project domains
// 2. If the redirect_uri is not provided in the query.
//    - If there are no project domains, we consider it invalid
//    - If there is a origin_host query param, if it's to be a trusted domain we use it as domain
//      and we try to check the state for a continueTo url to include in the redirect uri
//    - If there is no origin_host query param, we use the first domain assigned to the project
//
// 3. Any other case we consider invalid
//
// This custom behavior for allowed domains is not part of the OAuth2 spec, which
// recommends exact match and letting the client handle the state parameter, but
// we do this to have a better experience in trusted domains set up by the user.
export function parseRedirectURI(
  queryRedirectUri: any,
  state: any,
  redirectUris: string[],
  projectDomains: string[],
  originHost?: string
): {
  valid: boolean;
  redirectUri?: string;
} {
  function getRedirectURIFromDomain(domain: string) {
    // Handling localhost only for testing purposes
    const protocol = domain.includes("localhost") ? "http" : "https";
    const baseDomain = `${protocol}://${domain}`;
    let redirectUri = new URL("/", baseDomain).toString();
    try {
      if (state && isString(state)) {
        const parsedState = JSON.parse(state);
        if (parsedState.continueTo && isString(parsedState.continueTo)) {
          // state.continueTo can be a full url or a pathanem
          if (isValidRedirectUri(parsedState.continueTo)) {
            const url = new URL(parsedState.continueTo);
            if (url.origin === baseDomain) {
              redirectUri = parsedState.continueTo;
            } else {
              // If the continueTo is not in the same domain, we fallback to the
              // default redirectUri
            }
          } else if (
            isValidRedirectUri(
              new URL(parsedState.continueTo, baseDomain).toString()
            )
          ) {
            redirectUri = new URL(
              parsedState.continueTo,
              baseDomain
            ).toString();
          }
        }
      }
    } catch (e) {}

    return {
      valid: true,
      redirectUri,
    };
  }

  if (queryRedirectUri) {
    if (!isString(queryRedirectUri)) {
      return {
        valid: false,
      };
    }

    if (!isValidRedirectUri(queryRedirectUri)) {
      return {
        valid: false,
      };
    }

    if (redirectUris.includes(queryRedirectUri)) {
      return {
        valid: true,
        redirectUri: queryRedirectUri,
      };
    }

    const domain = projectDomains.find((d) =>
      queryRedirectUri.startsWith(`https://${d}`)
    );

    if (domain) {
      return {
        valid: true,
        redirectUri: queryRedirectUri,
      };
    }

    return {
      valid: false,
    };
  }

  if (projectDomains.length === 0) {
    return {
      valid: false,
    };
  }

  if (originHost) {
    // We search for a exact match in the list of project domains
    const domain = projectDomains.find((d) => d === originHost);
    if (domain) {
      return getRedirectURIFromDomain(domain);
    }
    // If the originHost is not in the list of project domains, we fallback to the
    // first domain in the list
  }

  return getRedirectURIFromDomain(projectDomains[0]);
}
