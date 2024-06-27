import {
  ensure,
  ensureString,
  ensureType,
  extractDomainFromEmail,
  hackyCast,
  isValidEmail,
  spawn,
  uncheckedCast,
} from "@/wab/shared/common";
import {
  DbMgr,
  generateSecretToken,
  MismatchPasswordError,
  PwnedPasswordError,
  WeakPasswordError,
} from "@/wab/server/db/DbMgr";
import { sendResetPasswordEmail } from "@/wab/server/emails/reset-password-email";
import { sendEmailVerificationToUser } from "@/wab/server/emails/verification-email";
import { sendWelcomeEmail } from "@/wab/server/emails/welcome-email";
import { OauthTokenProvider, User } from "@/wab/server/entities/Entities";
import "@/wab/server/extensions";
import {
  extractSsoConfig,
  UserNotWhitelistedError,
} from "@/wab/server/passport-cfg";
import {
  customTeamApiAuth,
  customTeamApiUserAuth,
} from "@/wab/server/routes/custom-api-auth";
import { isCustomPublicApiRequest } from "@/wab/server/routes/custom-routes";
import { getPromotionCodeCookie } from "@/wab/server/routes/promo-code";
import {
  addShopify,
  getShopifyClientForUserId,
  shopifyPostInstallSetup,
} from "@/wab/server/routes/shopify";
import {
  getUser,
  makeUserTraits,
  superDbMgr,
  userAnalytics,
  userDbMgr,
} from "@/wab/server/routes/util";
import { doLogin, doLogout } from "@/wab/server/util/auth-util";
import {
  NotFoundError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import {
  ConfirmEmailRequest,
  ConfirmEmailResponse,
  ForgotPasswordResponse,
  GetEmailVerificationTokenRequest,
  GetEmailVerificationTokenResponse,
  ListAuthIntegrationsResponse,
  LoginResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SelfResponse,
  SendEmailVerificationResponse,
  SignUpRequest,
  SignUpResponse,
  UpdatePasswordResponse,
  UpdateSelfRequest,
} from "@/wab/shared/ApiSchema";
import { findGoogleAuthRequiredEmailDomain } from "@/wab/shared/devflag-utils";
import * as Sentry from "@sentry/node";
import Shopify, { AuthQuery } from "@shopify/shopify-api";
import { NextFunction, Request, Response } from "express-serve-static-core";
import fs from "fs";
import passport from "passport";
import { AuthenticateOptionsGoogle } from "passport-google-oauth20";
import { IVerifyOptions } from "passport-local";
import util from "util";

export function csrf(req: Request, res: Response, _next: NextFunction) {
  res.json({ csrf: res.locals._csrf });
}
export async function login(req: Request, res: Response, next: NextFunction) {
  console.log("logging in as", req.body.email);
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "local",
      (err: Error, user: User, _info: IVerifyOptions) =>
        (async () => {
          if (err || !user) {
            console.error("could not log in", user, err);
            res.json(
              ensureType<LoginResponse>({
                status: false,
                reason: "IncorrectLoginError",
              })
            );
          } else {
            doLogin(req, user, (err2) => {
              if (err2) {
                return next(err2);
              }
              console.log(
                "logged in as",
                getUser(req, { allowUnverifiedEmail: true }).email
              );
              res.json(ensureType<LoginResponse>({ status: true, user }));
            });
          }
        })().then(() => resolve())
    )(req, res, next)
  );
}

/**
 * @returns undefined if email was not whitelisted.
 */
export async function createUserFull({
  mgr,
  email,
  password,
  firstName,
  lastName,
  req,
  nextPath,
  noWelcomeEmailAndSurvey,
  appInfo,
}: {
  mgr: DbMgr;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  req: Request;
  nextPath?: string;
  noWelcomeEmailAndSurvey?: boolean;
  appInfo?: {
    appName: string;
    authorizationPath: string;
  };
}) {
  const signUpPromotionCode = getPromotionCodeCookie(req);
  const user = await mgr.createUser({
    email,
    password,
    firstName,
    lastName,
    signUpPromotionCode,
    ...(noWelcomeEmailAndSurvey != null
      ? {
          needsSurvey: !noWelcomeEmailAndSurvey,
        }
      : {}),
    needsTeamCreationPrompt:
      !noWelcomeEmailAndSurvey && req.devflags.createTeamPrompt,
  });

  const emailVerificationToken = password
    ? await mgr.createEmailVerificationForUser(user)
    : null;

  if (!noWelcomeEmailAndSurvey) {
    if (!appInfo) {
      await sendWelcomeEmail(req, email, emailVerificationToken, nextPath);
    } else {
      // If we are dealing with an app, we don't want to send the welcome email.
      // Just a verification email.
      await sendEmailVerificationToUser(
        req,
        email,
        emailVerificationToken ?? "",
        appInfo.authorizationPath,
        appInfo.appName
      );
    }
  }

  req.app.analytics.identify({
    userId: user.id,
    traits: makeUserTraits(user),
  });
  userAnalytics(req, user.id).track({
    event: "Create Plasmic user",
    properties: {
      method: password ? "password" : "oauth",
    },
  });
  return user;
}

export async function signUp(req: Request, res: Response, next: NextFunction) {
  const { email, password, firstName, lastName, nextPath, appInfo } =
    uncheckedCast<SignUpRequest>(req.body);
  const mgr = superDbMgr(req);

  await mgr.logSignUpAttempt(email);

  if (findGoogleAuthRequiredEmailDomain(email, req.devflags)) {
    // plasmic.app users should sign up with Google.
    res.json(
      ensureType<SignUpResponse>({
        status: false,
        reason: "BadEmailError",
      })
    );
    return;
  }

  const existingUser = await mgr.tryGetUserByEmail(email);
  if (existingUser) {
    const secret = await mgr.createResetPasswordForUser(existingUser);
    await sendResetPasswordEmail(
      req,
      email,
      secret,
      appInfo
        ? {
            appName: appInfo.appName,
            nextPath: appInfo.authorizationPath,
          }
        : undefined
    );
    res.json(
      ensureType<SignUpResponse>({
        status: false,
        reason: "EmailSent",
      })
    );
    return;
  }

  if (!email.trim() || !firstName.trim() || !lastName.trim()) {
    res.json(
      ensureType<SignUpResponse>({
        status: false,
        reason: "MissingFieldsError",
      })
    );
    return;
  }

  if (!isValidEmail(email)) {
    res.json(
      ensureType<SignUpResponse>({
        status: false,
        reason: "BadEmailError",
      })
    );
    return;
  }

  try {
    const user = await createUserFull({
      mgr,
      email,
      password,
      firstName,
      lastName,
      req,
      nextPath,
      appInfo,
    });
    if (!user) {
      res.json(
        ensureType<SignUpResponse>({
          status: false,
          reason: "UserNotWhitelistedError",
        })
      );
      return;
    }
    await new Promise<void>((resolve) => {
      doLogin(req, user, (err2) => {
        if (err2) {
          return next(err2);
        }
        resolve();
      });
    });

    res.json(ensureType<SignUpResponse>({ status: true, user }));
  } catch (error) {
    if (error instanceof WeakPasswordError) {
      res.json(
        ensureType<SignUpResponse>({
          status: false,
          reason: "WeakPasswordError",
        })
      );
    } else if (error instanceof PwnedPasswordError) {
      res.json(
        ensureType<SignUpResponse>({
          status: false,
          reason: "PwnedPasswordError",
        })
      );
    } else {
      throw error;
    }
  }
}

export async function logout(req: Request, res: Response) {
  console.log(
    "logging out as",
    getUser(req, { allowUnverifiedEmail: true }).email
  );
  await doLogout(req);
  res.clearCookie("plasmic-observer");
  // Must reset the session to prevent session fixation attacks, reset the CSRF
  // token, etc.
  if (req.session) {
    await util.promisify(req.session.destroy.bind(req.session))();
  }
  res.json({});
}

export async function self(req: Request, res: Response) {
  const dbMgr = userDbMgr(req, { allowUnverifiedEmail: true });
  const user = getUser(req, { allowUnverifiedEmail: true });
  console.log("getting self info for", user.email);
  const usesOauth = await dbMgr.isOauthUser(user.id);
  res.json(
    ensureType<SelfResponse>({
      user,
      usesOauth,
      observer: req.cookies?.["plasmic-observer"] === "true",
    })
  );
}

export async function updateSelf(req: Request, res: Response) {
  const dbMgr = userDbMgr(req, { allowUnverifiedEmail: true });
  const user = await dbMgr.updateUser({
    id: getUser(req, { allowUnverifiedEmail: true }).id,
    ...uncheckedCast<UpdateSelfRequest>(req.body),
  });
  req.app.analytics.identify({
    userId: user.id,
    traits: makeUserTraits(user),
  });
  res.json({});
}

export async function updateSelfPassword(req: Request, res: Response) {
  const superMgr = superDbMgr(req);
  const dbMgr = userDbMgr(req);
  const oldPassword = (req.body.oldPassword as string) || "";
  const newPassword = (req.body.newPassword as string) || "";
  try {
    await dbMgr.updateSelfPassword(oldPassword, newPassword);
  } catch (error) {
    if (
      error instanceof WeakPasswordError ||
      error instanceof PwnedPasswordError ||
      error instanceof MismatchPasswordError
    ) {
      res.json(
        ensureType<UpdatePasswordResponse>({
          status: false,
          reason: error.name,
        })
      );
      return;
    } else {
      throw error;
    }
  }
  await superMgr.deleteSessionsForUser(req.sessionID, getUser(req).id);

  res.json(
    ensureType<UpdatePasswordResponse>({
      status: true,
    })
  );
}

export async function forgotPassword(req: Request, res: Response) {
  const { email, appName, nextPath } = req.body;

  const mgr = superDbMgr(req);
  const user = await mgr.tryGetUserByEmail(email);
  if (user) {
    const secret = await mgr.createResetPasswordForUser(user);
    await sendResetPasswordEmail(
      req,
      email,
      secret,
      appName
        ? {
            appName,
            nextPath,
          }
        : undefined
    );
  }

  // We don't respond differently when there is no user with the provided
  // email to avoid letting an atacker find out whether an email exists
  // in our database.

  res.json(ensureType<ForgotPasswordResponse>({ status: true }));
}

export async function resetPassword(req: Request, res: Response) {
  const { email, resetPasswordToken, newPassword } =
    ensureType<ResetPasswordRequest>(req.body);

  const mgr = superDbMgr(req);
  const user = await mgr.tryGetUserByEmail(email);

  if (!user) {
    res.json(
      ensureType<ResetPasswordResponse>({
        status: false,
        reason: "InvalidToken",
      })
    );
    return;
  }

  const resetRequest = await mgr.getResetPassword(user, resetPasswordToken);
  if (!resetRequest) {
    res.json(
      ensureType<ResetPasswordResponse>({
        status: false,
        reason: "InvalidToken",
      })
    );
    return;
  }

  const MILLIS_IN_TEN_MINUTES = 1000 * 60 * 10;
  const millisElapsed = new Date().valueOf() - resetRequest.createdAt.valueOf();
  if (millisElapsed > MILLIS_IN_TEN_MINUTES) {
    res.json(
      ensureType<ResetPasswordResponse>({
        status: false,
        reason: "InvalidToken",
      })
    );
    return;
  }

  try {
    await mgr.updateUserPassword(user, newPassword);
  } catch (error) {
    if (error instanceof WeakPasswordError) {
      res.json(
        ensureType<ResetPasswordResponse>({
          status: false,
          reason: "WeakPasswordError",
        })
      );
      return;
    }
    if (error instanceof PwnedPasswordError) {
      res.json(
        ensureType<ResetPasswordResponse>({
          status: false,
          reason: "PwnedPasswordError",
        })
      );
      return;
    }

    throw error;
  }

  await mgr.markResetPasswordUsed(resetRequest);
  await mgr.deleteSessionsForUser(req.sessionID, user.id);

  res.json(ensureType<ResetPasswordResponse>({ status: true }));
}

export async function confirmEmail(req: Request, res: Response) {
  const { email, token } = ensureType<ConfirmEmailRequest>(req.body);

  const mgr = userDbMgr(req, { allowUnverifiedEmail: true });
  const user = await mgr.tryGetUserByEmail(email);
  if (!user) {
    res.json(
      ensureType<ConfirmEmailResponse>({
        status: false,
        reason: "InvalidToken",
      })
    );
    return;
  }

  const emailVerificationRequest = await mgr.compareEmailVerificationToken(
    user,
    token
  );
  if (!emailVerificationRequest) {
    res.json(
      ensureType<ConfirmEmailResponse>({
        status: false,
        reason: "InvalidToken",
      })
    );
    return;
  }

  await mgr.markEmailAsVerified(user);

  await mgr.deleteEmailVerificationRequestForUser(user);

  res.json(ensureType<ConfirmEmailResponse>({ status: true }));
}

export async function sendEmailVerification(req: Request, res: Response) {
  const { email, nextPath, appName } = req.body;

  const mgr = userDbMgr(req, { allowUnverifiedEmail: true });
  const user = await mgr.tryGetUserByEmail(email);
  if (user) {
    const token = await mgr.createEmailVerificationForUser(user);
    await sendEmailVerificationToUser(req, email, token, nextPath, appName);
  }

  res.json(ensureType<SendEmailVerificationResponse>({ status: true }));
}

export async function getEmailVerificationToken(req: Request, res: Response) {
  if (!process.env.ENABLED_GET_EMAIL_VERIFICATION_TOKEN) {
    throw new UnauthorizedError("Unauthorized API request.");
  }

  const { email } = uncheckedCast<GetEmailVerificationTokenRequest>(req.body);

  const mgr = userDbMgr(req, { allowUnverifiedEmail: true });
  const user = await mgr.tryGetUserByEmail(email);

  // We store the token encrypted, so we don't have access to the token after the creation.
  // To get a valid token, we need to generate a new one.
  // If the user doesn't exist in our database, we generate a token only to don't respond differently.
  // This way, we avoid letting an attacker find out whether an email exists in our database.
  const token = user
    ? await mgr.createEmailVerificationForUser(user)
    : generateSecretToken().secret;

  res.json(
    ensureType<GetEmailVerificationTokenResponse>({
      status: true,
      token: token,
    })
  );
}

export async function googleLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const prompt = req.query.force ? { prompt: "consent" } : {};
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "google",
      {
        ...prompt,
        accessType: "offline",
        scope: ["email", "profile", "openid"],
      } as AuthenticateOptionsGoogle,
      () => resolve()
    )(req, res, next)
  );
}

async function handleOauthCallback(
  provider: OauthTokenProvider,
  req: Request,
  res: Response,
  next: NextFunction,
  opts: {
    requireRefreshToken?: boolean;

    // provider is used as the strategy to pass to passport.authenticate,
    // unless an override is specified here, where strategy differs from
    // the provider
    strategy?: string;
  }
) {
  await new Promise<void>((resolve) =>
    passport.authenticate(
      opts.strategy ?? provider,
      async (err: Error, user: User, info: IVerifyOptions) =>
        (async () => {
          console.log("AUTH CALLBACK", { err, user, info });
          if (err || !user) {
            const errName =
              err instanceof UserNotWhitelistedError
                ? "UserNotWhitelistedError"
                : `${err}`;
            console.error(`could not ${provider} auth due to error:`, errName);
            Sentry.captureException(err);
            res.send(callbackHtml(errName));
            return;
          }

          const mgr = superDbMgr(req);

          // If after the login, we still don't have a refresh_token, then try again
          // but this time forcing consent=prompt. This is pretty rare; normally, the first time
          // a user goes through an auth flow, we will get a refresh_token; subsequent logins via
          // oauth would not have refresh_token.  So that means we somehow missed storing the
          // refresh token the first time (possibly due to, say, InvalidOrg error, etc.)
          // In that case, we force the user to go through the oauth flow again with prompt=consent.
          // prompt=consent means we'll definitely get a refresh_token, but we don't always want
          // to do this because we don't want the user to have to go through the consent screen
          // just to log in normally.
          const oauthToken = await mgr.tryGetOauthToken(user.id, provider);
          if (
            opts.requireRefreshToken &&
            (!oauthToken || !oauthToken.token.refreshToken)
          ) {
            console.log(`forcing ${provider} consent...`);
            // Annoyingly, there's no "clean" way to trigger a redirect directly to
            // the oauth provider, since passport.authenticate() reads req.query to
            // determine whether this .authenticate() call is the initial request or
            // the callback request.  So, we rely on redirecting to our own endpoint,
            // which in turn redirects us to the oauth provider.
            return res.redirect(`/api/v1/auth/${provider}?force=1`);
          }

          doLogin(req, user, (err2) => {
            if (err2) {
              return next(err2);
            }
            console.log("logged in as", getUser(req).email);
            res.send(callbackHtml("Success"));
          });
        })().then(() => resolve())
    )(req, res, next)
  );
}

export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await handleOauthCallback("google", req, res, next, {
    requireRefreshToken: true,
  });
}

async function extractApiTeam(req: Request) {
  const teamToken = req.headers["x-plasmic-team-token"];
  if (teamToken && typeof teamToken === "string") {
    const mgr = superDbMgr(req);
    const token = await mgr.getTeamApiToken(teamToken);
    if (token) {
      const team = await mgr.getTeamById(token.teamId);
      req.apiTeam = team;
      return team;
    }
  }
  return undefined;
}

/**
 * Checks if request is using a Team API token. Populates
 * req.apiTeam if so.
 */
export async function teamApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await extractApiTeam(req);
  await customTeamApiAuth(req, res, next);
}

/**
 * Checks if request is using a Team API token, acting on behalf of
 * a specific user.  Populates req.apiTeam and req.user if so.
 */
export async function teamApiUserAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const team = await extractApiTeam(req);
  if (team) {
    const externalId = req.headers["x-plasmic-external-user"];
    if (externalId && typeof externalId === "string") {
      const mgr = superDbMgr(req);
      const user = await mgr.tryGetUserByWhiteLabelId(team.id, externalId);
      if (!user) {
        throw new NotFoundError(`No external user found with ID ${externalId}`);
      }
      req.user = user;
    }
  }
  await customTeamApiUserAuth(req, res, next);
}

/**
 * Returns true if request is not coming from our Studio app, but from
 * users explicitly using the REST API with credentials. These requests
 * should be exempt from csrf checks.
 */
export function isPublicApiRequest(req: Request) {
  return (
    // project ID and project tokens; mainly used from CLI
    req.body?.projectIdsAndTokens ||
    req.headers?.["x-plasmic-api-project-tokens"] ||
    // CMS
    req.headers?.["x-plasmic-api-cms-tokens"] ||
    // Team API token
    req.headers?.["x-plasmic-team-token"] ||
    isCustomPublicApiRequest(req)
  );
}

export async function isValidSamlEmail(req: Request, res: Response) {
  if (
    req.query.email &&
    typeof req.query.email === "string" &&
    isValidEmail(req.query.email)
  ) {
    const domain = extractDomainFromEmail(req.query.email);
    const db = userDbMgr(req);
    const config = await db.getSamlConfigByDomain(domain);
    if (config) {
      res.json({ valid: true });
      return;
    }
  }
  res.json({ valid: false });
}

export async function samlLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate("saml", {}, () => resolve())(req, res, next)
  );
}

export async function samlCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "saml",
      async (err: Error, user: User, info: IVerifyOptions) =>
        (async () => {
          if (err || !user) {
            console.error(`Could not log in via SAML: ${err}`);
            Sentry.captureException(err);
            res.send(callbackHtml(`${err}`));
            return;
          }

          doLogin(req, user, (err2) => {
            if (err2) {
              return next(err2);
            }
            console.log(`Logged in as`, getUser(req).email);
            res.send(callbackHtml("Success"));
          });
        })().then(() => resolve())
    )(req, res, next)
  );
}

export async function isValidSsoEmail(req: Request, res: Response) {
  if (
    req.query.email &&
    typeof req.query.email === "string" &&
    isValidEmail(req.query.email)
  ) {
    const domain = extractDomainFromEmail(req.query.email);
    const db = userDbMgr(req);
    const config = await db.getSsoConfigByDomain(domain);
    if (config) {
      res.json({ valid: true, tenantId: config.tenantId });
      return;
    }
  }
  res.json({ valid: false });
}

export async function ssoLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate("sso", {}, () => resolve())(req, res, next)
  );
}

export async function ssoCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ssoConfig = await extractSsoConfig(req);
  await handleOauthCallback(ssoConfig.provider, req, res, next, {
    requireRefreshToken: false,
    strategy: "sso",
  });
}

function callbackHtml(_authStatus: string) {
  // TODO Ideally we have something a bit safer.
  return eval(
    "`" +
      fs.readFileSync(__dirname + "/callback.html", { encoding: "utf8" }) +
      "`"
  );
}

export async function authApiTokenMiddleware(
  req: Request,
  res: Response | null,
  next: NextFunction
) {
  const email = req.headers["x-plasmic-api-user"];
  const token = req.headers["x-plasmic-api-token"];

  if (process.env.NODE_ENV !== "production") {
    // If we're not in production we allow logging using password instead of
    // user token. That is used for tests (e.g. loader-tests).
    const password = req.headers["x-plasmic-api-password"];
    if (email && password) {
      const mgr = superDbMgr(req);
      const user = await mgr.tryGetUserByEmail(email as string);
      if (user && (await mgr.comparePassword(user.id, password as string))) {
        req.user = user;
        return next();
      }
    }
  }

  if (!email || !token) {
    return next();
  }

  const mgr = superDbMgr(req);
  const { apiToken, user } = await getApiTokenUser(
    mgr,
    email as string,
    token as string
  );
  if (!apiToken) {
    throw new UnauthorizedError("Invalid API token");
  }

  if (!user) {
    throw new UnauthorizedError(
      `Error - the email in plasmic.json (${email}) must match the email of the API token (${
        apiToken.user?.email || "<unknown>"
      }), which is the email you use to sign into Plasmic.`
    );
  }
  req.user = user;
  next();
}

export function apiAuth(
  req: Request,
  res: Response | null,
  next: NextFunction
) {
  // Simply having a projectIdsAndTokens (even if it's empty/invalid) in the
  // body means we don't have to provide more user friendly checks. The actual
  // authorization depends on the specific projects accessed by the API method.
  if (req.body.projectIdsAndTokens) {
    return next();
  }
  if (req.headers["x-plasmic-api-project-tokens"]) {
    // same for if project tokens are specified as the headers
    return next();
  }
  if (req.headers["x-plasmic-api-cms-tokens"]) {
    // if cms tokens are specified, also allow
    return next();
  }
  if (req.user) {
    // If there's an authenticated user -- because this request was made from
    // within the Studio, or with x-plasmic-api-token/user pair -- then also allow.
    return next();
  }
  if (!req.headers["x-plasmic-api-token"]) {
    // not a API token requests
    throw new UnauthorizedError(
      "Missing API token - make sure your plasmic.auth have the 'token' field."
    );
  }
  if (!req.headers["x-plasmic-api-user"]) {
    throw new UnauthorizedError(
      "Missing API user - make sure your plasmic.auth have the 'user' field."
    );
  }

  throw new UnauthorizedError("Unauthenticated API request.");
}

export async function getApiTokenUser(
  mgr: DbMgr,
  email: string,
  token: string
) {
  const apiToken = await mgr.getPersonalApiToken(token as string);
  if (!apiToken) {
    return {};
  }

  const user = await mgr.tryGetUserByEmail(email as string);
  if (!user) {
    return { apiToken };
  }

  if (user.id !== apiToken.userId) {
    return { apiToken };
  }

  return { apiToken, user };
}

/**
 * We use shopify-node-api instead of the passport plugin, but not for any
 * particular good reason.
 *
 * shopify-node-api is actually a bit opinionated in how it manages session
 * data. We'd eventually need to implement a custom session store, and the shape
 * of the data doesn't fit well with the current OAuthToken entity.
 *
 * Probably it would be better to use the passport plugin - although it wasn't
 * updated for a long time, it seems fine at a glance.
 */
export async function shopifyAuthStart(req: Request, res: Response) {
  const shop = ensureString(req.query.shop);
  addShopify(req.config, shop);
  const authRoute = await Shopify.Auth.beginAuth(
    req,
    res,
    shop,
    "/auth/shopify-callback",
    false
  );
  return res.redirect(authRoute);
}

// Only by this point can we assume the user is authenticated into Plasmic.
export async function shopifyCallback(req: Request, res: Response) {
  // We assume that the query parameters are as specified in AuthQuery (assume
  // that Shopify is always calling us back correctly). Must be type-cast to be
  // accepted.
  const authQuery = uncheckedCast<AuthQuery>(req.query);
  addShopify(req.config, authQuery.shop);

  await Shopify.Auth.validateAuthCallback(req, res, authQuery);

  // We are using this because Shopify's node API client takes Sessions.
  const session = ensure(
    await Shopify.Utils.loadCurrentSession(req, res, false),
    "Shopify load current session should exist"
  );
  const sudo = superDbMgr(req);
  await sudo.upsertOauthToken(
    getUser(req).id,
    "shopify",
    hackyCast(session),
    {}
  );

  // We perform the post-installation Shopify setup here, but spawn it off into a thread.
  const { client } = await getShopifyClientForUserId(sudo, getUser(req).id);
  spawn(shopifyPostInstallSetup(client));

  // Simply redirect back to the homepage - should at least show some
  // confirmation.
  return res.redirect("/");
}

export async function airtableLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate("airtable", {}, () => resolve())(req, res, next)
  );
}

export async function airtableCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "airtable",
      async (err: Error, row: { id: string }, info: IVerifyOptions) =>
        (async () => {
          console.log("AUTH CALLBACK", { err, row, info });
          if (err) {
            const errName =
              err instanceof UserNotWhitelistedError
                ? "UserNotWhitelistedError"
                : `${err}`;
            console.error(`could not airtable auth due to error:`, errName);
            Sentry.captureException(err);
            res.send(callbackHtml(errName));
            return;
          }
          res.send(callbackHtml(`Success`));
        })().then(() => resolve())
    )(req, res, next)
  );
}

export async function googleSheetsLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const prompt = req.query.force ? { prompt: "consent" } : {};
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "google-sheets",
      {
        ...prompt,
        accessType: "offline",
        scope: [
          "email",
          "profile",
          "openid",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
      } as AuthenticateOptionsGoogle,
      () => resolve()
    )(req, res, next)
  );
}

export async function googleSheetsCallback(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await new Promise<void>((resolve) =>
    passport.authenticate(
      "google-sheets",
      async (err: Error, row: { id: string }, info: IVerifyOptions) =>
        (async () => {
          console.log("AUTH CALLBACK", { err, row, info });
          if (err) {
            const errName =
              err instanceof UserNotWhitelistedError
                ? "UserNotWhitelistedError"
                : `${err}`;
            console.error(`could not google-sheets due to error:`, errName);
            Sentry.captureException(err);
            res.send(callbackHtml(errName));
            return;
          }

          res.send(callbackHtml(`Success`));
        })().then(() => resolve())
    )(req, res, next)
  );
}

export async function getUserAuthIntegrations(req: Request, res: Response) {
  const dbMgr = userDbMgr(req);
  const user = req.user;
  if (!user) {
    res.json({ providers: [] });
    return;
  }
  const providers = await dbMgr.getUserTokenProviders();
  res.json({
    providers: providers.map((p) => {
      return { name: p.provider, id: p.id };
    }),
  } as ListAuthIntegrationsResponse);
}
