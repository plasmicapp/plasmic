import { setupCustomPassport } from "@/wab/server/auth/custom-passport-cfg";
import { createUserFull } from "@/wab/server/auth/routes";
import { Config } from "@/wab/server/config";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { OauthTokenProvider, User } from "@/wab/server/entities/Entities";
import "@/wab/server/extensions";
import { superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import {
  getAirtableSsoSecrets,
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleSheetsClientId,
  getGoogleSheetsClientSecret,
} from "@/wab/server/secrets";
import {
  MultiOAuth2Strategy,
  OAuth2Config,
} from "@/wab/server/util/passport-multi-oauth2";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { SsoConfigId, UserId } from "@/wab/shared/ApiSchema";
import {
  assert,
  asyncToCallback,
  ensure,
  maybes,
  StandardCallback,
} from "@/wab/shared/common";
import { isGoogleAuthRequiredEmailDomain } from "@/wab/shared/devflag-utils";
import { DevFlagsType } from "@/wab/shared/devflags";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { getPublicUrl } from "@/wab/shared/urls";
import { Request } from "express-serve-static-core";
import { omit } from "lodash";
import passport, { Profile } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passportLocal from "passport-local";
import OAuth2Strategy from "passport-oauth2";
import refresh from "passport-oauth2-refresh";
import { getManager } from "typeorm";
import * as util from "util";

const LocalStrategy = passportLocal.Strategy;

export async function setupPassport(
  dbMgr: DbMgr,
  config: Config,
  devflags: DevFlagsType
) {
  passport.serializeUser<User, any>((user: any, done: any) => {
    done(undefined, user.id);
  });

  passport.deserializeUser((id: string, done) => {
    asyncToCallback(done, async () => {
      const mgr = new DbMgr(getManager(), SUPER_USER);
      try {
        return await mgr.getUserById(id);
      } catch (err) {
        // Do not use NotFoundError.  This is necessary for now since our global error handler blindly transforms
        // NotFoundErrors into 404s.
        throw new Error(err.message);
      }
    });
  });

  /**
   * Sign in using Email and Password.
   */
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passReqToCallback: true },
      (req, email, password, done) => {
        asyncToCallback(done, async () => {
          const mgr = superDbMgr(req);
          const user = await mgr.tryGetUserByEmail(email);

          if (!user) {
            return false;
          }

          if (await mgr.comparePassword(user.id, password)) {
            // Must reset the session to prevent session fixation.
            if (req.session) {
              await util.promisify(req.session.regenerate).bind(req.session)();
            }
            return user;
          } else {
            return false;
          }
        });
      }
    )
  );

  /**
   * Sign in using Google.
   */
  passport.use(
    new GoogleStrategy(
      {
        clientID: getGoogleClientId(),
        clientSecret: getGoogleClientSecret(),
        callbackURL: `${config.host}/api/v1/oauth2/google/callback`,
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) =>
        asyncToCallback(done, async () => {
          const user = await upsertOauthUser(
            req,
            "google",
            accessToken,
            refreshToken,
            profile,
            { requireRefreshToken: true }
          );
          return user;
        })
    )
  );

  passport.use(
    "sso",
    new MultiOAuth2Strategy(
      {
        passReqToCallback: true,
        state: true,
        scope: ["openid", "email", "profile"],
        getOAuth2Options(req, callback) {
          asyncToCallback(
            callback as StandardCallback<OAuth2Config>,
            async () => {
              const row = await extractSsoConfig(req);
              const sso: OAuth2Config = row.config as any;
              const fullConfig = {
                callbackURL: `${getPublicUrl()}/api/v1/auth/sso/${
                  row.tenantId
                }/consume`,
                provider: row.provider,
                ...sso,
              };
              return fullConfig;
            }
          );
        },
      },
      (req, accessToken, refreshToken, profile, done) => {
        asyncToCallback(done as StandardCallback<User>, async () => {
          if (!profile) {
            throw new BadRequestError(`Unable to obtain Profile`);
          }

          const row = await extractSsoConfig(req);
          profile.tenantId = row.tenantId;
          console.log("SSO profile", profile);
          let user = await upsertOauthUser(
            req,
            row.provider,
            accessToken,
            refreshToken,
            profile,
            {
              ssoConfigId: row.id,
            }
          );

          const mgr = superDbMgr(req);

          // No need for new users to create their own team
          if (user.needsTeamCreationPrompt) {
            user = await mgr.updateUser({
              id: user.id,
              needsTeamCreationPrompt: false,
            });
          }

          // If the user is already on the team, don't do anything
          const userCurrentAccessLevel = await mgr.getTeamAccessLevelByUser(
            row.teamId,
            user.id
          );
          if (
            accessLevelRank(userCurrentAccessLevel) >= accessLevelRank("viewer")
          ) {
            return user;
          }

          // Add user to team directly
          const team = await mgr.getTeamById(row.teamId);
          await mgr.grantTeamPermissionByEmail(
            row?.teamId,
            user.email,
            team.defaultAccessLevel ?? "editor"
          );

          return user;
        });
      }
    )
  );

  const airtableSsoSecrets = getAirtableSsoSecrets();
  if (airtableSsoSecrets) {
    const airtableStrategy = new OAuth2Strategy(
      {
        authorizationURL: "https://airtable.com/oauth2/v1/authorize",
        tokenURL: "https://airtable.com/oauth2/v1/token",
        clientID: airtableSsoSecrets.clientId,
        clientSecret: airtableSsoSecrets.clientSecret,
        callbackURL: `${config.host}/api/v1/oauth2/airtable/callback`,
        customHeaders: {
          Authorization: `Basic ${Buffer.from(
            `${airtableSsoSecrets.clientId}:${airtableSsoSecrets.clientSecret}`
          ).toString("base64")}`,
        },
        state: true,
        pkce: true,
        passReqToCallback: true,
        scope: ["data.records:read", "data.records:write", "schema.bases:read"],
      },
      (req, accessToken, refreshToken, profile, done) =>
        asyncToCallback(done, async () => {
          const mgr = superDbMgr(req);
          const user = await mgr.tryGetUserById(req.user.id);
          assert(user, "Oauth2Error: unable to get user");
          const row = await mgr.upsertOauthToken(
            user.id,
            "airtable",
            { accessToken, refreshToken },
            {}
          );
          return row;
        })
    );
    passport.use("airtable", airtableStrategy);
    refresh.use("airtable", airtableStrategy);
  }

  // Google Sheets
  const googleSheetsClientId = getGoogleSheetsClientId();
  const googleSheetsClientSecret = getGoogleSheetsClientSecret();
  if (googleSheetsClientId && googleSheetsClientSecret) {
    const googleStrategy = new GoogleStrategy(
      {
        clientID: googleSheetsClientId,
        clientSecret: googleSheetsClientSecret,
        callbackURL: `${config.host}/api/v1/oauth2/google-sheets/callback`,
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, done) =>
        asyncToCallback<User | undefined>(done, async () => {
          const mgr = superDbMgr(req);
          const user = await mgr.tryGetUserById(
            ensure(req.user, "Should have a user").id
          );
          assert(user, "Oauth2Error: unable to get user");
          const row = await mgr.upsertOauthToken(
            user.id,
            "google-sheets",
            { accessToken, refreshToken },
            {}
          );
          return undefined;
        })
    );
    passport.use("google-sheets", googleStrategy);
    refresh.use("google-sheets", googleStrategy);
  }

  await setupCustomPassport(dbMgr, config);
}

export async function extractSsoConfig(req: Request) {
  const tenantId = req.params.tenantId;
  const db = userDbMgr(req);
  const sso = await db.getSsoConfigByTenantId(tenantId);
  if (!sso) {
    throw new BadRequestError(`Not configured to use SSO`);
  }
  return sso;
}

export async function upsertOauthUser(
  req: Request,
  provider: OauthTokenProvider,
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  opts: {
    requireRefreshToken?: boolean;
    ssoConfigId?: SsoConfigId;
  }
) {
  const mgr = superDbMgr(req);

  const userFields = deriveOAuthUserFields(profile);

  const email = userFields.email;

  assert(
    email,
    `Oauth2Error: unable to get profile email. Profile: ${JSON.stringify(
      profile
    )}`
  );

  // NOTE: devflags is loaded on startup, not per request!
  const devflags = req.devflags;
  const googleRequiredDom = isGoogleAuthRequiredEmailDomain(email, devflags);
  assert(
    !googleRequiredDom || provider === "google",
    `${googleRequiredDom} users should sign in with Google`
  );

  assert(
    userFields.emailVerified !== false,
    `OAuth2Error: user email is not verified`
  );

  let user = await mgr.tryGetUserByEmail(email);
  if (!user) {
    user = await createUserFull({
      mgr,
      email,
      firstName: userFields.firstName,
      lastName: userFields.lastName ?? "",
      req,
    });
  } else {
    // Prefer OAuth over password login
    await mgr.clearUserPassword(user.id);
  }

  await updateUserFromProfile(mgr, user.id, profile);

  // refreshToken may not be set.  See the /callback handler for more
  // details on how we handle this.
  if (refreshToken || !opts.requireRefreshToken) {
    await mgr.upsertOauthToken(
      user.id,
      provider,
      { accessToken, refreshToken },
      (profile as any)._json,
      opts.ssoConfigId
    );
  }

  // Must reset the session to prevent session fixation.
  if (req.session) {
    await util.promisify(req.session.regenerate).bind(req.session)();
  }

  return user;
}

export async function updateUserFromProfile(
  mgr: DbMgr,
  userId: UserId,
  profile: Profile
) {
  const userFields = deriveOAuthUserFields(profile);
  return await mgr.updateUser({
    id: userId,
    // Update all non-email user fields
    ...omit(userFields, "email"),
  });
}

function deriveOAuthUserFields(profile: any) {
  const email: string | undefined =
    profile?.email ?? profile?.emails?.[0]?.value;
  const emailUser = email?.split("@")[0];
  const firstName: string =
    profile?.name?.givenName ??
    profile?.givenName ??
    profile?.given_name ??
    emailUser;
  const lastName: string | undefined =
    profile?.name?.familyName ?? profile?.familyName ?? profile?.family_name;
  const avatarUrl = maybes(profile?.photos)((x) => x[0])((x) => x.value)();
  const emailVerified: boolean | undefined =
    profile?.emailVerified ?? profile?.email_verified;
  return {
    email,
    firstName,
    lastName,
    avatarUrl,
    emailVerified,
  };
}
