/** @format */

import { sequentially } from "@/wab/commons/asyncutil";
import { removeFromArray } from "@/wab/commons/collections";
import * as semver from "@/wab/commons/semver";
import { toOpaque } from "@/wab/commons/types";
import { createSiteForHostlessProject } from "@/wab/server/code-components/code-components";
import { loadConfig } from "@/wab/server/config";
import {
  normalizeOperationTemplate,
  reevaluateAppAuthUserPropsOpId,
  reevaluateDataSourceExprOpIds,
} from "@/wab/server/data-sources/data-source-utils";
import {
  MigrationDbMgr,
  getLastBundleVersion,
  getMigratedBundle,
} from "@/wab/server/db/BundleMigrator";
import {
  unbundlePkgVersion,
  unbundlePkgVersionFromBundle,
  unbundleProjectFromBundle,
  unbundleProjectFromData,
} from "@/wab/server/db/DbBundleLoader";
import { getDevFlagsMergedWithOverrides } from "@/wab/server/db/appconfig";
import {
  AppAccessRegistry,
  AppAuthConfig,
  AppEndUserAccess,
  AppEndUserGroup,
  AppRole,
  Base,
  Branch,
  BundleBackup,
  CmsDatabase,
  CmsRow,
  CmsRowRevision,
  CmsTable,
  Comment,
  CommentReaction,
  CopilotInteraction,
  CopilotUsage,
  DataSource,
  DataSourceAllowedProjects,
  DataSourceOperation,
  DevFlagOverrides,
  DirectoryEndUserGroup,
  EmailVerification,
  EndUser,
  EndUserDirectory,
  EndUserIdentifier,
  ExpressSession,
  FeatureTier,
  GenericKeyValue,
  GenericKeyValueId,
  GenericPair,
  HostingHit,
  HostlessVersion,
  IssuedCode,
  KeyValueNamespace,
  LoaderPublishment,
  OauthToken,
  OauthTokenBase,
  OauthTokenProvider,
  Org,
  PairNamespace,
  PartialRevisionCache,
  Permission,
  PersonalApiToken,
  Pkg,
  PkgVersion,
  Project,
  ProjectRepository,
  ProjectRevision,
  ProjectSyncMetadata,
  ProjectWebhook,
  ProjectWebhookEvent,
  PromotionCode,
  ResetPassword,
  SignUpAttempt,
  SsoConfig,
  Team,
  TeamApiToken,
  TeamDiscourseInfo,
  TemporaryTeamApiToken,
  TokenData,
  TrustedHost,
  TutorialDb,
  User,
  Workspace,
  WorkspaceApiToken,
  WorkspaceAuthConfig,
  WorkspaceUser,
} from "@/wab/server/entities/Entities";
import { REAL_PLUME_VERSION } from "@/wab/server/pkg-mgr/plume-pkg-mgr";
import {
  TutorialType,
  createTutorialDb,
} from "@/wab/server/tutorialdb/tutorialdb-utils";
import { generateSomeApiToken } from "@/wab/server/util/Tokens";
import {
  makeSqlCondition,
  makeTypedFieldSql,
  normalizeTableSchema,
  traverseSchemaFields,
} from "@/wab/server/util/cms-util";
import { ancestors, leaves, subgraph } from "@/wab/server/util/commit-graphs";
import { stringToPair } from "@/wab/server/util/hash";
import { KnownProvider } from "@/wab/server/util/passport-multi-oauth2";
import {
  BadRequestError,
  CopilotRateLimitExceededError,
  GrantUserNotFoundError,
  UnauthorizedError,
} from "@/wab/shared/ApiErrors/errors";
import {
  ApiBranch,
  ApiCmsQuery,
  ApiFeatureTier,
  ApiNotificationSettings,
  ApiTeamMeta,
  AppEndUserAccessIdentifier,
  BranchId,
  CmsDatabaseId,
  CmsIdAndToken,
  CmsRowId,
  CmsRowRevisionId,
  CmsTableId,
  CmsTableSchema,
  CmsTableSettings,
  CommentId,
  CommentLocation,
  CommentReactionData,
  CommentReactionId,
  CommentThreadId,
  CommitGraph,
  CopilotInteractionId,
  DataSourceId,
  FeatureTierId,
  GitSyncAction,
  GitSyncLanguage,
  GitSyncPlatform,
  GitSyncScheme,
  MainBranchId,
  MergeResolution,
  MergeResult,
  MergeSrcDst,
  PkgVersionId,
  ProjectAndBranchId,
  ProjectId,
  ProjectIdAndToken,
  QueryCopilotFeedbackResponse,
  SsoConfigId,
  TeamId,
  TeamMember,
  TeamWhiteLabelInfo,
  TutorialDbId,
  UserId,
  WorkspaceId,
  branchStatuses,
} from "@/wab/shared/ApiSchema";
import { isMainBranchId, validateBranchName } from "@/wab/shared/ApiSchemaUtil";
import {
  AccessLevel,
  GrantableAccessLevel,
  accessLevelRank,
  ensureGrantableAccessLevel,
  humanLevel,
} from "@/wab/shared/EntUtil";
import {
  ORGANIZATION_CAP,
  ORGANIZATION_LOWER,
  PERSONAL_WORKSPACE,
  WORKSPACE_CAP,
} from "@/wab/shared/Labels";
import { Bundler } from "@/wab/shared/bundler";
import { getBundle } from "@/wab/shared/bundles";
import { toVarName } from "@/wab/shared/codegen/util";
import { Dict, mkIdMap, safeHas } from "@/wab/shared/collections";
import {
  assert,
  assertNever,
  assignAllowEmpty,
  check,
  ensure,
  ensureString,
  filterMapTruthy,
  generate,
  jsonClone,
  last,
  maybe,
  maybeOne,
  mergeSane,
  mkShortId,
  mkUuid,
  only,
  pairwise,
  spawn,
  tuple,
  unexpected,
  unreachable,
  withoutNils,
  xor,
} from "@/wab/shared/common";
import {
  cloneSite,
  fixAppAuthRefs,
  getAllOpExprSourceIdsUsedInSite,
} from "@/wab/shared/core/sites";
import { SplitStatus } from "@/wab/shared/core/splits";
import {
  DataSourceType,
  getDataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import { OperationTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import { WebhookHeader } from "@/wab/shared/db-json-blobs";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { MIN_ACCESS_LEVEL_FOR_SUPPORT } from "@/wab/shared/discourse/config";
import { LocalizationKeyScheme } from "@/wab/shared/localization";
import {
  HostLessPackageInfo,
  ProjectDependency,
  Site,
} from "@/wab/shared/model/classes";
import { withoutUids } from "@/wab/shared/model/model-meta";
import { ratePasswordStrength } from "@/wab/shared/password-strength";
import {
  ResourceId,
  ResourceType,
  SiteFeature,
  TaggedResourceId,
  TaggedResourceIds,
  createTaggedResourceId,
  pluralizeResourceId,
} from "@/wab/shared/perms";
import { isEnterprise } from "@/wab/shared/pricing/pricing-utils";
import {
  INITIAL_VERSION_NUMBER,
  calculateSemVer,
  compareSites,
  compareVersionNumbers,
} from "@/wab/shared/site-diffs";
import {
  DirectConflictPickMap,
  MergeStep,
  tryMerge,
} from "@/wab/shared/site-diffs/merge-core";
import { captureMessage } from "@sentry/node";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import { pwnedPassword } from "hibp";
import { Draft, createDraft, finishDraft } from "immer";
import * as _ from "lodash";
import L, { fromPairs, intersection, pick, uniq } from "lodash";
import moment from "moment";
import { CreateChatCompletionRequest } from "openai";
import ShortUuid from "short-uuid";
import type { Opaque } from "type-fest";
import {
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindConditions,
  FindOneOptions,
  FindOperator,
  In,
  IsNull,
  MoreThan,
  Not,
  ObjectLiteral,
  Raw,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from "typeorm";
import * as uuid from "uuid";

export const updatableUserFields = [
  "firstName",
  "lastName",
  "role",
  "source",
  "surveyResponse",
  "avatarUrl",
  "needsIntroSplash",
  "needsSurvey",
  "needsTeamCreationPrompt",
  "extraData",
  "whiteLabelInfo",
] as const;

export type UpdatableUserFields = Pick<
  User,
  (typeof updatableUserFields)[number]
>;

export const updatableCmsDatabaseFields = [
  "name",
  "extraData",
  "workspaceId",
] as const;

export type UpdatableCmsDatabaseFields = Pick<
  CmsDatabase,
  (typeof updatableCmsDatabaseFields)[number]
>;

export const updatableWorkspaceFields = [
  "name",
  "description",
  "teamId",
  "contentCreatorConfig",
] as const;

export type UpdatableWorkspaceFields = Pick<
  Workspace,
  (typeof updatableWorkspaceFields)[number]
>;

export const updatableProjectFields = [
  "name",
  "inviteOnly",
  "defaultAccessLevel",
  "codeSandboxInfos",
  "readableByPublic",
  "hostUrl",
  "workspaceId",
  "extraData",
  "isMainBranchProtected",
  "isUserStarter",
  "uiConfig",
] as const;

export const editorOnlyUpdatableProjectFields = [
  "inviteOnly",
  "defaultAccessLevel",
  "codeSandboxInfos",
  "readableByPublic",
  "hostUrl",
  "workspaceId",
  "uiConfig",
] as const;

export type UpdatableProjectFields = Pick<
  Project,
  (typeof updatableProjectFields)[number]
>;

export const userUpdatableTeamFields: readonly (keyof Team)[] = [
  "name",
  "billingEmail",
  "defaultAccessLevel",
  "uiConfig",
] as const;

export type UserUpdatableTeamFields = Pick<
  Team,
  (typeof userUpdatableTeamFields)[number]
>;

export const sudoUpdatableTeamFields: readonly (keyof Team)[] = [
  "name",
  "seats",
  "featureTierId",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "billingFrequency",
  "trialStartDate",
  "parentTeamId",
] as const;

export type SudoUpdatableTeamFields = Pick<
  Team,
  (typeof sudoUpdatableTeamFields)[number]
>;

export const updatableWebhookFields = [
  "method",
  "url",
  "headers",
  "payload",
] as const;

export type UpdatableWebhookFields = Pick<
  ProjectWebhook,
  (typeof updatableWebhookFields)[number]
>;

export const updatableBranchFields = ["name", "status", "hostUrl"] as const;

export type UpdatableBranchFields = Pick<
  Branch,
  (typeof updatableBranchFields)[number]
>;

export const updatableProjectRepositoryFields = ["cachedCname"] as const;

export type UpdatableProjectRepositoryFields = Pick<
  ProjectRepository,
  (typeof updatableProjectRepositoryFields)[number]
>;

export class DbMgrError extends Error {}

export class ProjectRevisionError extends DbMgrError {
  name = "ProjectRevisionError";
}

export class NotFoundError extends DbMgrError {
  name = "NotFoundError";
}

export class ForbiddenError extends DbMgrError {
  name = "ForbiddenError";
}

export class UnsupportedImportError extends DbMgrError {
  name = "UnsupportedImportError";
}

export class WeakPasswordError extends DbMgrError {
  name = "WeakPasswordError";
}

export class PwnedPasswordError extends DbMgrError {
  name = "PwnedPasswordError";
}

export class MismatchPasswordError extends DbMgrError {
  name = "MismatchPasswordError";
}

export const shortUuid = ShortUuid();

export function checkPermissions(
  predicate: boolean,
  msg: string
): asserts predicate {
  if (!predicate) {
    throw new ForbiddenError(msg);
  }
}

export function ensureFound<T>(x: T | null | undefined, name: string): T {
  if (!x) {
    throw new NotFoundError(name + " not found");
  }
  return x;
}

async function getOneOrFailIfTooMany<T>(queryBuilder: SelectQueryBuilder<T>) {
  return maybeOne(await queryBuilder.getMany());
}

function ensureResourceIdFromPermission(perm: Permission) {
  return ensure(
    [perm.teamId, perm.workspaceId, perm.projectId].find((id) => id != null),
    "Permission should have one of the ids set"
  );
}

export type StampNewFields = {
  id: string;
  createdAt: Date;
  createdById: UserId | null;
} & StampUpdateFields &
  StampDeleteFields;

export type StampUpdateFields = {
  updatedAt: Date;
  updatedById: UserId | null;
};

export type StampDeleteFields = {
  deletedAt: Date | null;
  deletedById: UserId | null;
};

export interface SuperUser {
  type: "SuperUser";
}

export interface AnonUser {
  type: "AnonUser";
}

export interface NormalUser {
  type: "NormalUser";
  userId: UserId;
  isSpy: boolean;
}

export interface TeamApiUser {
  type: "TeamApiUser";
  teamId: TeamId;
}

export type Actor = SuperUser | NormalUser | AnonUser | TeamApiUser;

export const SUPER_USER: SuperUser = { type: "SuperUser" };

export const ANON_USER: AnonUser = { type: "AnonUser" };

export function isNormalUser(actor: Actor): actor is NormalUser {
  return actor.type === "NormalUser";
}

export function normalActor(userId: UserId, isSpy?: boolean): NormalUser {
  return {
    type: "NormalUser",
    userId,
    isSpy: isSpy ?? false,
  };
}

export function teamActor(teamId: TeamId): TeamApiUser {
  return {
    type: "TeamApiUser",
    teamId,
  };
}

export type Capability = "read" | "write" | "delete";

export function excludeDeleted() {
  return { deletedAt: IsNull() };
}

function maybeIncludeDeleted(includeDeleted: boolean) {
  return includeDeleted ? {} : excludeDeleted();
}

interface ForcedAccessLevel {
  force: AccessLevel;
}

type Resource = Project | Workspace | Team | CmsDatabase;

function isForcedAccessLevel(x: any): x is ForcedAccessLevel {
  return !!x?.force;
}

async function findExactlyOne<T extends ObjectLiteral>(
  repo: Repository<T>,
  opts?: FindConditions<T> | FindOneOptions<T> | undefined
) {
  const found = await repo.find(opts);
  return ensure(
    maybeOne(found),
    () => `Not found entity given options ${opts}`
  );
}

export function generateSecretToken() {
  const secret = crypto.randomBytes(64).toString("base64");
  const hashSecret = bcrypt.hashSync(secret, bcrypt.genSaltSync());
  return { secret, hashSecret };
}

export function generateId() {
  return crypto.randomBytes(18).toString("base64").replace(/\W/g, "");
}

export async function checkWeakPassword(password: string | undefined) {
  if (password === undefined) {
    return;
  }
  const passwordStrength = await ratePasswordStrength(password);
  if (password.length < 6 || passwordStrength < 2) {
    throw new WeakPasswordError();
  }

  // There should be no rate limit on the Pwned Passwords API.
  // https://haveibeenpwned.com/API/v3#RateLimiting
  const numPwns = await pwnedPassword(password);
  if (numPwns > 0) {
    throw new PwnedPasswordError();
  }
}

function pickKnownFieldsByLocale(table: CmsTable, x: Dict<Dict<unknown>>) {
  return L.mapValues(x, (values) =>
    pick(values, ...table.schema.fields.map((f) => f.identifier))
  );
}

function mkCommitGraph(): CommitGraph {
  return {
    branches: {},
    parents: {},
  };
}

function checkBranchFields(
  { name, status }: Partial<UpdatableBranchFields>,
  otherBranches: ApiBranch[]
) {
  if (name !== undefined) {
    const msg = validateBranchName(name, otherBranches);
    if (msg) {
      throw new BadRequestError(msg);
    }
  }
  if (status !== undefined) {
    if (!branchStatuses.includes(status)) {
      throw new BadRequestError(`invalid branch status: ${status}`);
    }
  }
}

function whereEqOrNull<T>(
  qb: SelectQueryBuilder<T>,
  field: string,
  params: Record<string, any>,
  injectParam: boolean
) {
  const [[paramName, paramValue]] = Object.entries(params);
  if (paramValue) {
    qb.andWhere(`${field} = :${paramName}`);
  } else {
    qb.andWhere(`${field} is null`);
  }
  if (injectParam && paramValue) {
    qb.setParameter(paramName, paramValue);
  }
}

type MergeArgs = MergeSrcDst & {
  resolution?: Omit<MergeResolution, "resolvedSite"> & {
    resolvedSite?: Site | string;
  };
  autoCommitOnToBranch?: boolean;
  excludeMergeStepFromResult?: boolean;
};

function getCommitChainFromCommit(
  g: Draft<CommitGraph>,
  pkgVersionId: PkgVersionId | undefined
): PkgVersionId[] {
  return generate(function* () {
    while (pkgVersionId) {
      yield pkgVersionId;
      [pkgVersionId] = g.parents[pkgVersionId];
    }
  });
}

function getCommitChainFromBranch(
  g: CommitGraph,
  branchSpec: MainBranchId | BranchId
) {
  return getCommitChainFromCommit(g, g.branches[branchSpec]);
}

export type ProofSafeDelete = Opaque<
  | { SafeDelete: "SafeDelete" }
  | {
      SkipSafeDelete: "SkipSafeDelete";
    },
  "ProofSafeDelete"
>;
export const SkipSafeDelete: ProofSafeDelete = toOpaque({
  SkipSafeDelete: "SkipSafeDelete",
});

/**
 * DbMgr currently errs on the side of runtime strictness by throwing errors.
 * This doesn't afford great static time checking, since TS has neither checked
 * exceptions nor checked return values (for Rust style Result types).
 *
 * We prefer to wrap common errors, such as NotFound, in DbMgr-specific
 * exception types (e.g. NotFoundError).  Their messages should be directly
 * reusable by public facing APIs, such as our REST API.
 *
 * Eventually, if this grows large enough, it may be broken up into multiple
 * Mgr classes.
 */
export class DbMgr implements MigrationDbMgr {
  protected readonly entMgr: EntityManager;
  public readonly actor: Actor;
  public readonly projectIdsAndTokens?: ProjectIdAndToken[];
  public readonly cmsIdsAndTokens?: CmsIdAndToken[];
  public readonly teamApiToken?: string;
  public readonly temporaryTeamApiToken?: string;
  constructor(
    entMgr: EntityManager,
    actor: Actor,
    public opts?: {
      projectIdsAndTokens?: ProjectIdAndToken[];
      teamApiToken?: string;
      temporaryTeamApiToken?: string;
      cmsIdsAndTokens?: CmsIdAndToken[];
      workspaceApiToken?: string;
    }
  ) {
    this.entMgr = ensure(
      entMgr,
      "Please pass an entity manager object to use DbMgr!"
    );
    this.actor = ensure(actor, "Please pass an actor object to use DbMgr!");
    this.projectIdsAndTokens = opts?.projectIdsAndTokens;
    this.teamApiToken = opts?.teamApiToken;
    this.temporaryTeamApiToken = opts?.temporaryTeamApiToken;
    this.cmsIdsAndTokens = opts?.cmsIdsAndTokens;
  }

  // Should be used rarely
  public getEntMgr() {
    return this.entMgr;
  }
  //
  // Actor utilities.
  //

  tryGetNormalActorId() {
    if (this.actor.type === "NormalUser") {
      return this.actor.userId;
    } else {
      return undefined;
    }
  }

  private async tryGetNormalActorUser() {
    return maybe(this.tryGetNormalActorId(), (userId) =>
      this.getUserById(userId)
    );
  }

  private async getNormalActorUser() {
    return this.actor.type === "NormalUser"
      ? this.getUserById(this.actor.userId)
      : unexpected();
  }

  private async describeActor() {
    switch (this.actor.type) {
      case "SuperUser":
        return "Super User";
      case "AnonUser":
        return "Anonymous User";
      case "NormalUser":
        return (await this.getNormalActorUser()).email;
      case "TeamApiUser":
        return `Team ${this.actor.teamId}`;
    }
  }

  //
  // Permission utilities.
  //

  private sudo() {
    return new DbMgr(this.entMgr, SUPER_USER);
  }

  private asUser(userId: UserId) {
    return new DbMgr(this.entMgr, normalActor(userId));
  }

  private checkNotAnonUser() {
    checkPermissions(
      this.actor.type !== "AnonUser",
      "Must not be anonymous user"
    );
  }

  private checkNormalUser() {
    checkPermissions(this.actor.type === "NormalUser", "Must be a normal user");
    return this.actor.userId;
  }

  private checkTeamApiUser() {
    checkPermissions(this.actor.type === "TeamApiUser", "Must be a team user");
    return this.actor.teamId;
  }

  protected checkSuperUser() {
    checkPermissions(this.actor.type === "SuperUser", `Must be Super User.`);
  }

  private allowAnyone() {}

  //
  // Entity types.
  //
  private sessions() {
    return this.entMgr.getRepository(ExpressSession);
  }

  private users() {
    return this.entMgr.getRepository(User);
  }

  private featureTiers() {
    return this.entMgr.getRepository(FeatureTier);
  }

  private orgs() {
    return this.entMgr.getRepository(Org);
  }

  private teams() {
    return this.entMgr.getRepository(Team);
  }

  private workspaces() {
    return this.entMgr.getRepository(Workspace);
  }

  private projects() {
    return this.entMgr.getRepository(Project);
  }

  private projectRevs() {
    return this.entMgr.getRepository(ProjectRevision);
  }

  private projectSyncMetadata() {
    return this.entMgr.getRepository(ProjectSyncMetadata);
  }

  private pkgVersions() {
    return this.entMgr.getRepository(PkgVersion);
  }

  private pkgs() {
    return this.entMgr.getRepository(Pkg);
  }

  private partialRevCache() {
    return this.entMgr.getRepository(PartialRevisionCache);
  }

  private oauthTokens() {
    return this.entMgr.getRepository(OauthToken);
  }

  private ssoConfigs() {
    return this.entMgr.getRepository(SsoConfig);
  }

  private emailVerifications() {
    return this.entMgr.getRepository(EmailVerification);
  }

  private resetPasswords() {
    return this.entMgr.getRepository(ResetPassword);
  }

  protected permissions() {
    return this.entMgr.getRepository(Permission);
  }

  private personalApiTokens() {
    return this.entMgr.getRepository(PersonalApiToken);
  }

  private teamApiTokens() {
    return this.entMgr.getRepository(TeamApiToken);
  }

  private temporaryTeamApiTokens() {
    return this.entMgr.getRepository(TemporaryTeamApiToken);
  }

  private trustedHosts() {
    return this.entMgr.getRepository(TrustedHost);
  }

  private signUpAttempts() {
    return this.entMgr.getRepository(SignUpAttempt);
  }

  private devFlagOverrides() {
    return this.entMgr.getRepository(DevFlagOverrides);
  }

  private projectWebhooks() {
    return this.entMgr.getRepository(ProjectWebhook);
  }

  private projectWebhookEvents() {
    return this.entMgr.getRepository(ProjectWebhookEvent);
  }

  private projectRepositories() {
    return this.entMgr.getRepository(ProjectRepository);
  }

  private bundleBackups() {
    return this.entMgr.getRepository(BundleBackup);
  }

  private loaderPublishments() {
    return this.entMgr.getRepository(LoaderPublishment);
  }

  private dataSources() {
    return this.entMgr.getRepository(DataSource);
  }

  private dataSourceOperations() {
    return this.entMgr.getRepository(DataSourceOperation);
  }

  private keyValues() {
    return this.entMgr.getRepository(GenericKeyValue);
  }

  private pairs() {
    return this.entMgr.getRepository(GenericPair);
  }

  private cmsDatabases() {
    return this.entMgr.getRepository(CmsDatabase);
  }

  private cmsTables() {
    return this.entMgr.getRepository(CmsTable);
  }

  private cmsRows() {
    return this.entMgr.getRepository(CmsRow);
  }

  private cmsRowRevisions() {
    return this.entMgr.getRepository(CmsRowRevision);
  }

  private branches() {
    return this.entMgr.getRepository(Branch);
  }

  private workspaceApiTokens() {
    return this.entMgr.getRepository(WorkspaceApiToken);
  }

  private workspaceAuthConfigs() {
    return this.entMgr.getRepository(WorkspaceAuthConfig);
  }

  private hostlessVersions() {
    return this.entMgr.getRepository(HostlessVersion);
  }

  private comments() {
    return this.entMgr.getRepository(Comment);
  }

  private commentReactions() {
    return this.entMgr.getRepository(CommentReaction);
  }

  private workspaceUsers() {
    return this.entMgr.getRepository(WorkspaceUser);
  }

  private endUserDirectories() {
    return this.entMgr.getRepository(EndUserDirectory);
  }

  private appAuthConfigs() {
    return this.entMgr.getRepository(AppAuthConfig);
  }

  private endUsers() {
    return this.entMgr.getRepository(EndUser);
  }

  private issuedCodes() {
    return this.entMgr.getRepository(IssuedCode);
  }

  private directoryEndUserGroups() {
    return this.entMgr.getRepository(DirectoryEndUserGroup);
  }

  private appEndUserGroups() {
    return this.entMgr.getRepository(AppEndUserGroup);
  }

  private appRoles() {
    return this.entMgr.getRepository(AppRole);
  }

  private appEndUserAccess() {
    return this.entMgr.getRepository(AppEndUserAccess);
  }

  private appAccessRegistries() {
    return this.entMgr.getRepository(AppAccessRegistry);
  }

  private tutorialDbs() {
    return this.entMgr.getRepository(TutorialDb);
  }

  private copilotUsages() {
    return this.entMgr.getRepository(CopilotUsage);
  }

  private copilotInteractions() {
    return this.entMgr.getRepository(CopilotInteraction);
  }

  private promotioCodes() {
    return this.entMgr.getRepository(PromotionCode);
  }

  private dataSourceAllowedProjects() {
    return this.entMgr.getRepository(DataSourceAllowedProjects);
  }

  private discourseInfos() {
    return this.entMgr.getRepository(TeamDiscourseInfo);
  }

  //
  // Stamping utilities.
  //

  /**
   * Generate standard new-object timestamps and ID.
   */
  protected stampNew(genShortUuid?: boolean): StampNewFields {
    const actorUserId = this.tryGetNormalActorId() ?? null;
    const UUID = uuid.v4();
    const date = new Date();
    return {
      id: genShortUuid ? shortUuid.fromUUID(UUID) : UUID,
      createdAt: date,
      createdById: actorUserId,
      updatedAt: date,
      updatedById: actorUserId,
      deletedAt: null,
      deletedById: null,
    };
  }

  protected stampUpdate(): StampUpdateFields {
    const actorUserId = this.tryGetNormalActorId() ?? null;
    return {
      updatedAt: new Date(),
      updatedById: actorUserId,
    };
  }

  protected stampDelete(): StampDeleteFields {
    const actorUserId = this.tryGetNormalActorId() ?? null;
    return {
      deletedAt: new Date(),
      deletedById: actorUserId,
    };
  }

  private stampUndelete(): StampDeleteFields {
    return {
      deletedAt: null,
      deletedById: null,
    };
  }

  //
  // Team methods.
  //

  /** Throws `ForbiddenError` if user does not have required level in the team. */
  checkTeamPerms = (
    teamId: TeamId,
    requireLevel: AccessLevel,
    action: string,
    includeDeleted = false
  ) =>
    this._checkResourcePerms(
      { type: "team", id: teamId },
      requireLevel,
      action,
      includeDeleted
    );

  /** Throws `ForbiddenError` if user does not have required level in any team. */
  checkTeamsPerms = (
    teamIds: TeamId[],
    requireLevel: AccessLevel,
    action: string,
    includeDeleted = false
  ) =>
    this._checkResourcesPerms(
      { type: "team", ids: teamIds },
      requireLevel,
      action,
      includeDeleted
    );

  async getTeamAccessLevelByUser(
    teamId: TeamId,
    userId: UserId
  ): Promise<AccessLevel> {
    this.checkSuperUser();
    const existingPerm = await this.getPermissionsForResources(
      { type: "team", ids: [teamId] },
      true,
      { userId }
    );
    return existingPerm.length > 0
      ? _.maxBy(
          existingPerm.map((p) => p.accessLevel),
          (lvl) => accessLevelRank(lvl)
        )!
      : "blocked";
  }

  private _queryTeams(where: FindConditions<Team>, includeDeleted = false) {
    const qb = this.teams()
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.featureTier", "ft")
      .leftJoinAndSelect("t.parentTeam", "pt")
      .leftJoinAndSelect("pt.featureTier", "pft")
      .where(where);
    if (!includeDeleted) {
      qb.andWhere("t.deletedAt is null");
    }
    return qb;
  }

  async listAllTeams(where: FindConditions<Team> = {}): Promise<Team[]> {
    this.checkSuperUser();
    return this._queryTeams(where, false).getMany();
  }

  async createTeam(
    name: string,
    opts?: {
      extendedFreeTrial?: number;
    }
  ) {
    const userId = this.checkNormalUser();
    const user = await this.getUserById(userId);
    const devflags = await getDevFlagsMergedWithOverrides(this);
    const team = this.teams().create({
      ...this.stampNew(true),
      name,
      billingEmail: user.email,
      inviteId: generateId(),
      defaultAccessLevel: "editor",
      trialDays: opts?.extendedFreeTrial
        ? opts.extendedFreeTrial
        : devflags.freeTrialDays,
    });
    await this.entMgr.save(team);

    await this.sudo()._assignResourceOwner(
      { type: "team", id: team.id },
      userId
    );

    return team;
  }

  async getTeamById(id: TeamId, includeDeleted = false) {
    await this.checkTeamPerms(id, "viewer", "read", includeDeleted);
    return ensureFound<Team>(
      await this._queryTeams({ id }, includeDeleted).getOne(),
      `${ORGANIZATION_CAP} with ID ${id}`
    );
  }

  async getTeamsById(ids: TeamId[], includeDeleted = false) {
    await this._checkResourcesPerms(
      { type: "team", ids },
      "viewer",
      "get",
      includeDeleted
    );
    return this._queryTeams({ id: In(ids) }, includeDeleted).getMany();
  }

  // @todo Replace with how we actually store team owners
  async getTeamOwners(id: TeamId): Promise<User[]> {
    const team = await this.getTeamById(id);
    const ownerId = team.createdById;
    if (!ownerId) {
      return [];
    }
    const teamOwner = await this.getUserById(ownerId);
    return [teamOwner];
  }

  async getTeamsByParentId(ids: TeamId[]) {
    await this._checkResourcesPerms(
      { type: "team", ids: ids },
      "viewer",
      "get",
      false
    );

    return this._queryTeams({ parentTeamId: In(ids) }).getMany();
  }

  async getParentTeamIds(ids: TeamId[]): Promise<TeamId[]> {
    if (ids.length === 0 || this.actor.type === "AnonUser") {
      return [];
    }

    const userId =
      this.actor.type === "SuperUser" ? undefined : this.checkNormalUser();

    let parentTeamQb = this.entMgr.createQueryBuilder();
    parentTeamQb
      .select("t.parentTeamId", "teamId")
      .from(Team, "t")
      .where(`t.id IN (:...ids)`, { ids });

    if (userId) {
      parentTeamQb = parentTeamQb
        .innerJoin(Permission, "subperm", `subperm.teamId = t.parentTeamId`)
        .andWhere(
          `
            subperm.userId = :userId
            and subperm.accessLevel <> 'blocked'
            and subperm.deletedAt is null
          `,
          { userId }
        );
    }
    return (await parentTeamQb.getRawMany()).map((t) => t.teamId);
  }

  async updateTeam({
    id,
    ...fields
  }: { id: TeamId } & Partial<UserUpdatableTeamFields>): Promise<Team> {
    await this.checkTeamPerms(id, "editor", "update", true);
    fields = _.pick(fields, userUpdatableTeamFields);
    if (fields.billingEmail) {
      fields.billingEmail = fields.billingEmail.toLowerCase();
    }
    if (fields.defaultAccessLevel) {
      ensureGrantableAccessLevel(fields.defaultAccessLevel);
    }
    const team = await this.getTeamById(id);
    if (fields.uiConfig) {
      checkPermissions(
        isEnterprise(team.featureTier || team.parentTeam?.featureTier),
        "Must be on Enterprise plan"
      );
    }
    assignAllowEmpty(team, this.stampUpdate(), fields);
    return await this.entMgr.save(team);
  }

  async updateTeamWhiteLabelInfo(id: TeamId, info: TeamWhiteLabelInfo) {
    this.checkSuperUser();
    const team = await this.getTeamById(id);
    assignAllowEmpty(team, this.stampUpdate(), {
      whiteLabelInfo: {
        ...team.whiteLabelInfo,
        ...info,
      },
    });
    return await this.entMgr.save(team);
  }

  async updateTeamWhiteLabelName(id: TeamId, name: string | null) {
    this.checkSuperUser();
    const team = await this.getTeamById(id);
    assignAllowEmpty(team, this.stampUpdate(), {
      whiteLabelName: name,
    });
    return await this.entMgr.save(team);
  }

  async isTeamWhiteLabel(team: Team) {
    if (!!team.whiteLabelName) {
      return true;
    }
    let parentTeam = team.parentTeam;
    if (team.parentTeamId && !team.parentTeam) {
      parentTeam = await this.getTeamById(team.parentTeamId);
    }
    return !!team.whiteLabelName || !!parentTeam?.whiteLabelName;
  }

  async startFreeTrial({
    teamId,
    featureTierName,
  }: {
    teamId: TeamId;
    featureTierName: string;
  }): Promise<Team> {
    // @todo replace with admin role
    await this.checkTeamPerms(teamId, "editor", "start trial", true);
    const tiersList = await this.listCurrentFeatureTiers([featureTierName]);
    assert(tiersList.length > 0, "Free trial tier name invalid");
    const featureTier = tiersList[0];
    const featureTierId = featureTier.id;
    const seats = featureTier.maxUsers;

    const trialStartDate = new Date();
    return await this.sudo().sudoUpdateTeam({
      id: teamId,
      seats,
      featureTierId,
      trialStartDate,
    });
  }

  /**
   * Same as updateTeam, except checks for superuser and
   * allows updating sensitive fields (e.g. billing)
   */
  async sudoUpdateTeam({
    id,
    ...fields
  }: { id: TeamId } & Partial<SudoUpdatableTeamFields> &
    Partial<UserUpdatableTeamFields>): Promise<Team> {
    this.checkSuperUser();
    fields = _.pick(fields, [
      ...sudoUpdatableTeamFields,
      ...userUpdatableTeamFields,
    ]);
    const team = await this.getTeamById(id);
    // We need to keep featureTier and featureTierId consistent
    if (!fields.featureTierId) {
      fields["featureTier"] = undefined;
    } else if (fields.featureTierId) {
      fields["featureTier"] = { id: fields.featureTierId } as any;
    }
    assignAllowEmpty(team, this.stampUpdate(), fields);
    return await this.entMgr.save(team);
  }

  /**
   * Get all the teams that I'm associated with.
   */
  async getAffiliatedTeams() {
    const userId = this.checkNormalUser();
    return this._queryTeams({}, false)
      .innerJoin(
        Permission,
        "perm",
        "perm.teamId = t.id or perm.teamId = pt.id"
      )
      .andWhere(
        `
          t.deletedAt is null
          and
          perm.userId = :userId
          and
          perm.deletedAt is null
          `,
        { userId }
      )
      .getMany();
  }

  async getAffiliatedTeamPermissions() {
    const userId = this.checkNormalUser();
    return await this.permissions()
      .createQueryBuilder("perm")
      .innerJoin(Team, "t", "t.id = perm.teamId")
      .andWhere(
        `
          t.deletedAt is null
          and
          perm.userId = :userId
          and
          perm.deletedAt is null
          `,
        { userId }
      )
      .getMany();
  }

  async deleteTeam(id: TeamId) {
    return this._deleteResource({ type: "team", id });
  }

  async restoreTeam(id: TeamId) {
    return this._restoreResource({ type: "team", id });
  }

  async getTeamByWhiteLabelName(name: string) {
    return ensureFound<Team>(
      await this.tryGetTeamByWhiteLabelName(name),
      `${ORGANIZATION_CAP} with white label id ${name}`
    );
  }

  async tryGetTeamByWhiteLabelName(name: string) {
    this.checkSuperUser();
    return await this._queryTeams({ whiteLabelName: name }, false).getOne();
  }

  async grantTeamPermissionByEmail(
    teamId: TeamId,
    email: string,
    rawLevelToGrant: GrantableAccessLevel
  ) {
    return this.grantResourcesPermissionByEmail(
      {
        type: "team",
        ids: [teamId],
      },
      email,
      rawLevelToGrant
    );
  }

  async revokeTeamPermissionsByEmails(teamId: TeamId, emails: string[]) {
    return this.revokeResourcesPermissionsByEmail(
      { type: "team", ids: [teamId] },
      emails
    );
  }

  /**
   * Get the explicitly added members of a team.
   */
  async getPermissionsForTeams(teamIds: TeamId[]) {
    return this.getPermissionsForResources(
      { type: "team", ids: teamIds },
      true
    );
  }

  /**
   * Compute the set of users involved anywhere in a team, including team
   * members and additional users added to workspaces and projects within the
   * team.
   */
  async getEffectiveUsersForTeam(
    teamId: TeamId,
    excludePlasmicEmails: boolean
  ): Promise<Pick<Permission, "userId" | "email">[]> {
    await this.checkTeamPerms(teamId, "viewer", "get effective users in");

    // Find all users in team.
    const teamPerms = await this.getPermissionsForTeams([teamId]);

    // Find all users in workspaces in the team.
    const workspaces = await this.getWorkspacesByTeams([teamId]);
    const workspaceIds = workspaces.map((w) => w.id);
    const workspacePerms = await this.getPermissionsForWorkspaces(
      workspaceIds,
      true
    );

    // Find all users in projects in the workspaces.
    const projects = await this.getProjectsByWorkspaces(workspaceIds);
    const projectIds = projects.map((p) => p.id);
    const projectPerms = await this.getPermissionsForProjects(projectIds, true);

    // Collect all distinct users.
    let users = [
      ...teamPerms,
      ...workspacePerms,
      ...projectPerms.filter(
        (p) => accessLevelRank(p.accessLevel) >= accessLevelRank("content")
      ),
    ].map((p) => {
      return {
        userId: p.userId,
        email: p.user == null ? p.email : p.user.email,
      };
    });

    if (excludePlasmicEmails) {
      users = users.filter((u) => !isAdminTeamEmail(u.email, DEVFLAGS));
    }

    return _.uniqBy(users, (u) => `${u.userId}|${u.email}`);
  }

  async getTeamMeta(
    teamId: TeamId,
    includeDeleted = false
  ): Promise<ApiTeamMeta> {
    await this.checkTeamPerms(teamId, "viewer", "read");
    const workspaces = await this.getWorkspacesByTeams([teamId]);
    const workspaceCount = workspaces.length;
    const projectCount = await this.projects().count({
      workspaceId: In(workspaces.map((w) => w.id)),
      ...maybeIncludeDeleted(includeDeleted),
    });
    const members = await this.getEffectiveUsersForTeam(teamId, true);
    const memberCount = members.length;
    return { projectCount, workspaceCount, memberCount };
  }

  async getTeamMembers(teamId: TeamId): Promise<TeamMember[]> {
    const effectiveUsers = await this.getEffectiveUsersForTeam(teamId, false);
    const emails = filterMapTruthy(effectiveUsers, (u) => !u.userId && u.email);
    const userIds = filterMapTruthy(effectiveUsers, (u) => u.userId);
    const users = (await this.tryGetUsersById(userIds)).filter(
      (u) => u
    ) as User[];
    return [
      ...emails.map((email) => ({ type: "email", email } as TeamMember)),
      ...(await this.appendTeamMembersMeta(teamId, users)),
    ];
  }

  async getTeamByProjectId(projectId: ProjectId) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get",
      undefined,
      undefined,
      false
    );
    return await this.teams()
      .createQueryBuilder("t")
      .innerJoin(Workspace, "w", "w.teamId = t.id")
      .innerJoin(Project, "p", "p.workspaceId = w.id")
      .where(
        "p.id = :projectId AND p.deletedAt IS NULL AND w.deletedAt IS NULL AND t.deletedAt IS NULL",
        { projectId }
      )
      .getOne();
  }

  async getTeamByWorkspaceId(workspaceId: WorkspaceId) {
    await this.checkWorkspacePerms(workspaceId, "viewer", "get", false);
    return await this.teams()
      .createQueryBuilder("t")
      .innerJoin(Workspace, "w", "w.teamId = t.id")
      .where(
        "w.id = :workspaceId AND w.deletedAt IS NULL AND t.deletedAt IS NULL",
        { workspaceId }
      )
      .getOne();
  }

  //
  // User methods.
  //

  async getSelfPerms() {
    const userId = this.checkNormalUser();
    const perms = await this.permissions().find({
      where: {
        userId,
        deletedAt: IsNull(),
      },
    });
    return { perms };
  }

  private checkUsersPerms(
    userIds: string[],
    capability: Capability,
    action: string
  ) {
    return sequentially(
      userIds.map((id) => this.checkUserPerms(id, capability, action))
    );
  }

  /**
   * Memoized on first two args only.
   */
  private checkUserPerms = _.memoize(
    async (userId: string, capability: Capability, action: string) => {
      switch (capability) {
        case "read":
          // For now, anyone can read any user.
          return;
        case "write":
        case "delete": {
          const canEdit = async () => {
            if (this.actor.type === "SuperUser") {
              return true;
            } else if (this.actor.type === "AnonUser") {
              return false;
            } else if (this.actor.type === "NormalUser") {
              return this.actor.userId === userId;
            } else if (this.actor.type === "TeamApiUser") {
              const user = await this.sudo().getUserById(userId);
              return user.owningTeamId === this.actor.teamId;
            } else {
              unreachable(this.actor);
            }
          };

          checkPermissions(
            await canEdit(),
            `${await this.describeActor()} tried to ${action} user ${
              (await this.getUserById(userId)).email
            }`
          );
          return;
        }
        default:
          return assertNever(capability);
      }
    },
    (...args) => JSON.stringify(args.slice(0, 2))
  );

  async tryGetUserById(id: string) {
    await this.checkUserPerms(id, "read", "get");
    return await this.users().findOne({
      where: { id, ...excludeDeleted() },
    });
  }

  async getUserById(id: string) {
    return ensureFound<User>(
      await this.tryGetUserById(id),
      `User with ID ${id}`
    );
  }

  async getUserByEmail(email: string) {
    this.checkSuperUser();
    email = email.toLowerCase();
    return ensureFound<User>(
      await this.users().findOne({
        where: { email, ...excludeDeleted() },
      }),
      `User with email ${email}`
    );
  }

  async tryGetUserByWhiteLabelId(teamId: TeamId, id: string) {
    const user = await this.users().findOne({
      where: { whiteLabelId: id, owningTeamId: teamId, ...excludeDeleted() },
    });

    if (user) {
      await this.checkUsersPerms([user.id], "read", "get");
    }
    return user;
  }

  async getUserByWhiteLabelId(teamId: TeamId, id: string) {
    const user = await this.tryGetUserByWhiteLabelId(teamId, id);
    return ensureFound<User>(user, `User with external ID ${id}`);
  }

  async tryGetUsersById(ids: string[]) {
    await this.checkUsersPerms(ids, "read", "get");
    const users = await sequentially(ids.map((id) => this.tryGetUserById(id)));
    return withoutNils(users);
  }

  async getUsersById(ids: string[]) {
    await this.checkUsersPerms(ids, "read", "get");
    return sequentially(ids.map((id) => this.getUserById(id)));
  }

  async listAllUsers() {
    this.checkSuperUser();
    return await this.users().find();
  }

  async isOauthUser(id: string) {
    const password = await this._getUserBcrypt(id);
    return password === "";
  }

  async appendTeamMembersMeta(
    teamId: TeamId,
    users: User[]
  ): Promise<TeamMember[]> {
    await this.checkTeamPerms(teamId, "viewer", "get members meta for");

    const lastActiveRows = await this.projectRevs()
      .createQueryBuilder("rev")
      .select("rev.createdById as id, MAX(rev.createdAt) as time")
      .innerJoin("rev.project", "p")
      .innerJoin("p.workspace", "w")
      .where(
        `w.teamId = :teamId
        and rev.deletedAt is null
        and p.deletedAt is null
        and w.deletedAt is null`
      )
      .groupBy("rev.createdById")
      .setParameter("teamId", teamId)
      .getRawMany();
    const lastActiveMap = mkIdMap(lastActiveRows);

    const projectsCreatedRows = await this.projects()
      .createQueryBuilder("p")
      .select("p.createdById as id, COUNT(*) as count")
      .innerJoin("p.workspace", "w")
      .where(
        `w.teamId = :teamId
        and p.deletedAt is null
        and w.deletedAt is null`
      )
      .groupBy("p.createdById")
      .setParameter("teamId", teamId)
      .getRawMany();
    const projectsCreatedMap = mkIdMap(projectsCreatedRows);

    return users.map((u) => ({
      type: "user",
      ...u,
      projectsCreated: Number(projectsCreatedMap.get(u.id)?.count || 0),
      lastActive: lastActiveMap.get(u.id)?.time || "",
    }));
  }

  /**
   * Only admins can list our history of pricing tiers
   * @returns
   */
  async listAllFeatureTiers(): Promise<FeatureTier[]> {
    this.checkSuperUser();
    return await this.featureTiers().find();
  }

  /**
   * Anyone can fetch our latest pricing
   */
  async listCurrentFeatureTiers(
    featureTierNames: string[]
  ): Promise<FeatureTier[]> {
    const result: FeatureTier[] = [];
    for (const name of featureTierNames) {
      const tier = await getOneOrFailIfTooMany(
        this.featureTiers()
          .createQueryBuilder("tier")
          .where((qb) => {
            const subQuery = qb
              .subQuery()
              .select("max(tier2.createdAt)")
              .from(FeatureTier, "tier2")
              .where("tier2.name = :name")
              .andWhere("tier2.deletedAt is null")
              .getQuery();
            return "tier.createdAt = " + subQuery;
          })
          .andWhere("tier.name = :name")
          .setParameter("name", name)
      );
      if (tier) {
        result.push(tier);
      }
    }
    return result;
  }

  async addFeatureTier(rawTier: Omit<ApiFeatureTier, keyof StampNewFields>) {
    this.checkSuperUser();
    const tier = this.featureTiers().create({
      ...rawTier,
      // We stamp over the `rawTier` to overwrite base fields
      ...this.stampNew(),
    });
    return await this.entMgr.save(tier);
  }

  async getFeatureTier(featureTierId: FeatureTierId, includeDeleted = false) {
    return ensureFound<FeatureTier>(
      await this.featureTiers().findOne({
        where: { id: featureTierId, ...maybeIncludeDeleted(includeDeleted) },
      }),
      `FeatureTier with ID ${featureTierId}`
    );
  }

  async tryGetUserByEmail(email: string) {
    const user = await getOneOrFailIfTooMany(
      this.users()
        .createQueryBuilder("users")
        .where(`lower(users.email) = lower(:email)`, { email })
        .andWhere("users.deletedAt is null")
    );
    if (!user) {
      return user;
    }
    await this.checkUserPerms(user.id, "read", "get");
    return user;
  }

  /**
   * Creates a new user and clones the starter project into their env.
   *
   * @param bundler Used for cloning the starter project - only done if bundler
   *   is set and starter project ID exists.
   */
  async createUser({
    orgId,
    email,
    password,
    id,
    needsTeamCreationPrompt,
    isWhiteLabel,
    whiteLabelId,
    whiteLabelInfo,
    owningTeamId,
    signUpPromotionCode,
    ...fields
  }: {
    orgId?: string;
    email: string;
    password?: string;
    id?: UserId;
    needsTeamCreationPrompt: boolean;
    isWhiteLabel?: boolean;
    whiteLabelId?: string;
    whiteLabelInfo?: User["whiteLabelInfo"];
    owningTeamId?: string;
    signUpPromotionCode?: PromotionCode;
  } & Partial<UpdatableUserFields>) {
    this.allowAnyone();
    fields = _.pick(fields, updatableUserFields);
    await checkWeakPassword(password);
    email = email.toLowerCase();
    const user = this.users().create({
      ...this.stampNew(),
      email,
      bcrypt: password ? bcrypt.hashSync(password, bcrypt.genSaltSync()) : "",
      org: orgId ? { id: orgId } : null,
      needsIntroSplash: true,
      needsSurvey: true,
      waitingEmailVerification: password ? true : false,
      needsTeamCreationPrompt,
      isWhiteLabel,
      whiteLabelId,
      whiteLabelInfo,
      owningTeamId,
      signUpPromotionCode,
      ...fields,
    });

    if (id) {
      user.id = id;
    }
    const personalTeam = this.teams().create({
      ...this.stampNew(),
      name: "Personal team",
      billingEmail: user.email,
      personalTeamOwnerId: user.id,
    });

    const personalWorkspace = this.workspaces().create({
      ...this.stampNew(),
      name: PERSONAL_WORKSPACE,
      description: PERSONAL_WORKSPACE,
      teamId: personalTeam.id,
    });

    const personalTeamPermission = this.permissions().create({
      ...this.stampNew(),
      teamId: personalTeam.id,
      userId: user.id,
      accessLevel: "owner",
    });

    await this.entMgr.save(user);
    await this.entMgr.save(personalTeam);
    await this.entMgr.save(personalWorkspace);
    await this.entMgr.save(personalTeamPermission);

    const perms = await this._changeUserEmail(user, email);
    if (perms.some((val) => val.workspaceId || val.teamId)) {
      return await this.updateUser({
        id: user.id,
        needsTeamCreationPrompt: false,
      });
    }

    if (!needsTeamCreationPrompt) {
      // Create initial team and workspace.
      const asUser = this.asUser(user.id);
      const team = await asUser.createTeam(
        `${user.firstName}'s First ${ORGANIZATION_CAP}`
      );
      await asUser.createWorkspace({
        name: `${user.firstName}'s First ${WORKSPACE_CAP}`,
        description: "",
        teamId: team.id,
      });
    }

    // This column is marked as select: false, but TypeORM's create() call
    // doesn't respect it. Manually remove it here.
    user.bcrypt = undefined;
    return user;
  }

  async updateUser({
    id,
    ...fields
  }: { id: string } & Partial<UpdatableUserFields>) {
    this.checkUserIdIsSelf(id);
    fields = _.pick(fields, ...updatableUserFields);
    const user = await this.getUserById(id);
    mergeSane(user, this.stampUpdate(), fields);
    return await this.entMgr.save(user);
  }

  async updateAdminMode({ id, disabled }: { id: string; disabled: boolean }) {
    this.checkUserIdIsSelf(id);
    const user = await this.getUserById(id);
    if (!loadConfig().adminEmails.includes(user.email)) {
      return user;
    }
    mergeSane(user, this.stampUpdate(), { adminModeDisabled: disabled });
    return await this.entMgr.save(user);
  }

  private async _changeUserEmail(user: User, email: string) {
    email = email.toLowerCase();
    user.email = email;

    // Eagerly adopt all the permissions associated with this email.
    const perms = await this._getPermissionsForRawEmail(email);
    for (const perm of perms) {
      mergeSane(perm, this.stampUpdate(), { user, email: null });
    }

    await this.entMgr.save([user, ...perms]);

    return perms;
  }

  async deleteUser(user: User, keepPasswordHash: boolean) {
    await this.checkUserPerms(user.id, "delete", "delete");
    Object.assign(user, this.stampDelete());
    if (!keepPasswordHash) {
      user.bcrypt = "";
    }
    await this.entMgr.save(user);
  }

  async createWhiteLabelUser(fields: {
    firstName: string;
    lastName: string;
    email: string;
    teamId: TeamId;
    whiteLabelId: string;
  }) {
    const user = await this.createUser({
      email: `${fields.whiteLabelId}-${new Date().getTime()}@${
        fields.teamId
      }.whitelabeled`,
      firstName: fields.firstName,
      lastName: fields.lastName,
      needsTeamCreationPrompt: false,
      needsIntroSplash: false,
      needsSurvey: false,
      source: "whitelabel",
      owningTeamId: fields.teamId,
      isWhiteLabel: true,
      whiteLabelId: fields.whiteLabelId,
      whiteLabelInfo: {
        email: fields.email,
      },
    });
    const team = await this.getTeamById(fields.teamId);
    await this.grantTeamPermissionToUser(team, user.id, "editor");
    return user;
  }

  async deleteSessionsForUser(currentSessionId: string, userId: string) {
    return this.sessions()
      .createQueryBuilder()
      .where('"id" != :currentSessionId', { currentSessionId })
      .andWhere('"id" like :userId', { userId: `${userId}-%` })
      .delete()
      .execute();
  }

  //
  // Password methods.
  //

  async updateSelfPassword(oldPassword: string, password: string) {
    const userId = this.checkNormalUser();
    await checkWeakPassword(password);
    const user = await this.getUserById(userId);
    const isOldPasswordCorrect = await this.comparePassword(
      user.id,
      oldPassword
    );
    if (!isOldPasswordCorrect) {
      throw new MismatchPasswordError();
    }
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
    user.bcrypt = hashedPassword;
    Object.assign(user, this.stampUpdate());
    await this.entMgr.save(user);
  }

  async updateUserPassword(
    user: User,
    password: string,
    allowWeakPassword = false
  ) {
    await this.checkUserPerms(user.id, "write", "change password for");
    if (!allowWeakPassword) {
      await checkWeakPassword(password);
    }
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync());
    user.bcrypt = hashedPassword;
    Object.assign(user, this.stampUpdate());
    await this.entMgr.save(user);
  }

  async clearUserPassword(userId: string) {
    await this.checkSuperUser();
    const user = await this.getUserById(userId);
    user.bcrypt = "";
    Object.assign(user, this.stampUpdate());
    await this.entMgr.save(user);
  }

  private async _getUserBcrypt(id: string) {
    const user = ensureFound<User>(
      await this.users().findOne({
        where: { id, ...excludeDeleted() },
        select: ["bcrypt", "id"],
      }),
      `User with ID ${id}`
    );

    // `User.bcrypt` normally has type `string | undefined`,
    // because it is marked `select: false`.
    // Use `!` since we explicitly selected it and the column is not nullable.
    return user.bcrypt!;
  }

  async comparePassword(
    userId: string,
    candidatePassword: string
  ): Promise<boolean> {
    this.allowAnyone();
    const _bcrypt = await this._getUserBcrypt(userId);
    return new Promise<boolean>((resolve, reject) => {
      spawn(
        bcrypt.compare(candidatePassword, _bcrypt, (err, isMatch) => {
          err ? reject(err) : resolve(isMatch);
        })
      );
    });
  }

  async createResetPasswordForUser(user: User) {
    this.allowAnyone();
    const { secret, hashSecret } = generateSecretToken();
    const newPasswordReset = this.resetPasswords().create({
      id: uuid.v4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      forUser: user,
      secret: hashSecret,
      used: false,
    });
    await this.entMgr.insert(ResetPassword, newPasswordReset);
    return secret;
  }

  async deleteResetPasswordForUser(user: User) {
    this.checkSuperUser();
    const existingPasswordReset = await this.entMgr.find(ResetPassword, {
      forUser: user,
      used: false,
      ...excludeDeleted(),
    });
    if (existingPasswordReset.length > 0) {
      const deletedAt = new Date();
      existingPasswordReset.forEach((p) => (p.deletedAt = deletedAt));
      await this.entMgr.save(existingPasswordReset);
    }
    return existingPasswordReset.length;
  }

  async getResetPassword(
    user: User,
    token: string
  ): Promise<ResetPassword | null> {
    this.checkSuperUser();
    const resets = await this.entMgr.find(ResetPassword, {
      forUser: user,
      used: false,
      ...excludeDeleted(),
    });

    for (const r of resets) {
      if (bcrypt.compareSync(token, r.secret)) {
        return r;
      }
    }
    return null;
  }

  async markResetPasswordUsed(reset: ResetPassword) {
    await this.checkSuperUser();
    reset.used = true;
    await this.entMgr.save(reset);
  }

  //
  // Email Verification Methods
  //

  async createEmailVerificationForUser(user: User) {
    this.allowAnyone();
    const { secret, hashSecret } = generateSecretToken();
    const newEmailVerification = this.emailVerifications().create({
      id: uuid.v4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      forUser: user,
      secret: hashSecret,
      used: false,
    });
    await this.entMgr.insert(EmailVerification, newEmailVerification);
    return secret;
  }

  async compareEmailVerificationToken(
    user: User,
    token: string
  ): Promise<EmailVerification | null> {
    this.checkNormalUser();
    const emailVerification = await this.entMgr.find(EmailVerification, {
      used: false,
      forUser: user,
      ...excludeDeleted(),
    });

    for (const r of emailVerification) {
      if (bcrypt.compareSync(token, r.secret)) {
        return r;
      }
    }
    return null;
  }

  async markEmailAsVerified(user: User) {
    user.waitingEmailVerification = false;
    Object.assign(user, this.stampUpdate());
    await this.entMgr.save(user);
  }

  async deleteEmailVerificationRequestForUser(user: User) {
    this.checkNormalUser();
    const existingEmailVerification = await this.entMgr.find(
      EmailVerification,
      {
        forUser: user,
        used: false,
        ...excludeDeleted(),
      }
    );
    if (existingEmailVerification.length > 0) {
      const deletedAt = new Date();
      existingEmailVerification.forEach((p) => (p.deletedAt = deletedAt));
      await this.entMgr.save(existingEmailVerification);
    }
    return existingEmailVerification.length;
  }

  //
  // Workspace methods.
  //

  private checkWorkspacePerms = (
    workspaceId: WorkspaceId,
    requireLevel: AccessLevel,
    action: string,
    includeDeleted = false
  ) =>
    this._checkResourcePerms(
      { type: "workspace", id: workspaceId },
      requireLevel,
      action,
      includeDeleted
    );

  private async checkWorkspacesPerms(
    workspaceIds: WorkspaceId[],
    requireLevel: AccessLevel,
    action: string,
    includeDeleted = false
  ) {
    return this._checkResourcesPerms(
      { type: "workspace", ids: workspaceIds },
      requireLevel,
      action,
      includeDeleted
    );
  }

  private _queryWorkspaces(
    where: FindConditions<Workspace>,
    includeDeleted = false
  ) {
    const qb = this.workspaces()
      .createQueryBuilder("w")
      .innerJoinAndSelect("w.team", "t")
      .leftJoinAndSelect("t.featureTier", "ft")
      .leftJoinAndSelect("t.parentTeam", "pt")
      .leftJoinAndSelect("pt.featureTier", "pft")
      .where(where);
    if (!includeDeleted) {
      qb.andWhere("w.deletedAt is null and t.deletedAt is null");
    }
    return qb;
  }

  private async _tryGetWorkspaceById(id: WorkspaceId, includeDeleted: boolean) {
    return this._queryWorkspaces({ id }, includeDeleted).getOne();
  }

  async getWorkspaceById(
    id: WorkspaceId,
    includeDeleted = false
  ): Promise<Workspace> {
    await this.checkWorkspacePerms(id, "viewer", "get", includeDeleted);
    return ensureFound<Workspace>(
      await this._tryGetWorkspaceById(id, includeDeleted),
      `Workspace with ID ${id}`
    );
  }

  async getWorkspacesById(ids: WorkspaceId[], includeDeleted = false) {
    await this._checkResourcesPerms(
      { type: "workspace", ids },
      "viewer",
      "get",
      includeDeleted
    );
    return this._queryWorkspaces({ id: In(ids) }, includeDeleted).getMany();
  }

  async getWorkspacesByTeams(teamIds: TeamId[]) {
    await this._checkResourcesPerms(
      { type: "team", ids: teamIds },
      "viewer",
      "get workspaces"
    );
    return await this._queryWorkspaces({
      teamId: In(teamIds),
    }).getMany();
  }

  /**
   * Get all the workspaces that I'm associated with.
   */
  async getAffiliatedWorkspaces(teamId?: TeamId, userId?: UserId) {
    userId = userId ?? this.checkNormalUser();
    let qb = this._queryWorkspaces({})
      .innerJoin(
        Permission,
        "perm",
        `
          perm.workspaceId = w.id
          or
          perm.teamId = w.teamId
          or
          perm.teamId = t.parentTeamId
        `
      )
      .andWhere(
        `
          w.deletedAt is null
          and
          perm.userId = :userId
          and
          perm.accessLevel <> 'blocked'
          and
          perm.deletedAt is null
          `,
        { userId }
      );
    if (teamId) {
      qb = qb.andWhere(`w.teamId = :teamId`).setParameters({ teamId: teamId });
    }
    return qb.getMany();
  }

  async createWorkspace({
    name,
    description,
    teamId,
  }: {
    name: string;
    description: string;
    teamId: TeamId;
  }): Promise<Workspace> {
    const userId = await this.checkNormalUser();
    await this._checkResourcesPerms(
      { type: "team", ids: [teamId] },
      "editor",
      "create workspace"
    );
    const workspace = this.workspaces().create({
      ...this.stampNew(true),
      name,
      description,
      team: { id: teamId },
    });
    await this.entMgr.save(workspace);

    await this.sudo()._assignResourceOwner(
      { type: "workspace", id: workspace.id },
      userId
    );

    return workspace;
  }

  async createWorkspaceWithId({
    id,
    name,
    description,
    teamId,
  }: {
    id: WorkspaceId;
    name: string;
    description: string;
    teamId: TeamId;
  }): Promise<Workspace> {
    this.checkSuperUser();
    const workspace = this.workspaces().create({
      ...this.stampNew(true),
      id,
      name,
      description,
      team: { id: teamId },
    });
    await this.entMgr.save(workspace);
    return workspace;
  }

  async deleteWorkspace(id: WorkspaceId) {
    return this._deleteResource({ type: "workspace", id });
  }

  async restoreWorkspace(id: WorkspaceId) {
    return this._restoreResource({ type: "workspace", id });
  }

  async updateWorkspace({
    workspaceId,
    ...fields
  }: {
    workspaceId: WorkspaceId;
  } & Partial<UpdatableWorkspaceFields>): Promise<Workspace> {
    await this.checkWorkspacePerms(workspaceId, "editor", "update");
    const ws = await this.getWorkspaceById(workspaceId);
    fields = _.pick(fields, ...updatableWorkspaceFields);
    if (fields.teamId) {
      await this.checkTeamPerms(ws.teamId, "editor", "move workspace");
      await this.checkTeamPerms(fields.teamId, "editor", "move workspace");
      fields["team"] = { id: fields.teamId };
    }
    Object.assign(ws, this.stampUpdate(), fields);
    await this.entMgr.save(ws);
    return ws;
  }

  async grantWorkspacePermissionByEmail(
    workspaceId: WorkspaceId,
    email: string,
    rawLevelToGrant: GrantableAccessLevel
  ) {
    return this.grantResourcesPermissionByEmail(
      {
        type: "workspace",
        ids: [workspaceId],
      },
      email,
      rawLevelToGrant
    );
  }

  async revokeWorkspacePermissionsByEmails(
    workspaceId: WorkspaceId,
    emails: string[],
    ignoreOwnerCheck?: boolean
  ) {
    return this.revokeResourcesPermissionsByEmail(
      { type: "workspace", ids: [workspaceId] },
      emails,
      ignoreOwnerCheck
    );
  }

  /**
   * Get the explicitly added members of the given workspaces.
   */
  async getPermissionsForWorkspaces(
    workspaceIds: WorkspaceId[],
    directOnly = false
  ) {
    return this.getPermissionsForResources(
      {
        type: "workspace",
        ids: workspaceIds,
      },
      directOnly
    );
  }

  /**
   * Get the permissions of a workspace including inherited team permissions.
   */
  async getActorAccessLevelToWorkspace(workspaceId: WorkspaceId) {
    return this._getActorAccessLevelToResourceById({
      type: "workspace",
      id: workspaceId,
    });
  }

  //
  // Project methods.
  //

  async getActorAccessLevelToProject(projectId: string) {
    return this._getActorAccessLevelToResourceById({
      type: "project",
      id: projectId,
    });
  }

  /**
   * @param addPerm Some operations may want to also go ahead and explicitly add
   * self as an explicitly permissioned user. This means e.g. project will be
   * listed in your dashboard recent projects.
   */
  private async _getActorAccessLevelToProject(
    project: Project,
    addPerm: boolean
  ): Promise<AccessLevel> {
    return await this._getActorAccessLevelToResource(project, addPerm);
  }

  /**
   * Memoized on projectId, requireLevel and includeDeleted.
   */
  checkProjectPerms = _.memoize(
    async (
      projectId: string,
      requireLevel: AccessLevel,
      action: string,
      addPerm = false,
      suggestion?: string,
      includeDeleted = false
    ) => {
      if (this.actor.type === "SuperUser") {
        return;
      }

      const project = await this.sudo().getProjectById(
        projectId,
        includeDeleted
      );

      // Having a valid project API token should give us read access.
      if (
        accessLevelRank(requireLevel) <= accessLevelRank("viewer") &&
        this.projectIdsAndTokens?.find(
          (p) =>
            p.projectId === projectId &&
            p.projectApiToken === project.projectApiToken
        )
      ) {
        return;
      }

      // Having a valid secret API token should give us write access.
      if (
        accessLevelRank(requireLevel) <= accessLevelRank("editor") &&
        this.projectIdsAndTokens?.find(
          (p) =>
            p.projectId === projectId &&
            p.projectApiToken === project.secretApiToken
        )
      ) {
        return;
      }

      const selfLevel = await this._getActorAccessLevelToProject(
        project,
        addPerm
      );
      const msg = `${await this.describeActor()} tried to ${action} project ${projectId}, but their access level ${humanLevel(
        selfLevel
      )} didn't meet required level ${humanLevel(requireLevel)}. ${
        suggestion ?? ""
      }`;

      const satisfied =
        accessLevelRank(selfLevel) >= accessLevelRank(requireLevel);
      if (!satisfied && this.projectIdsAndTokens) {
        throw new ForbiddenError(
          "Project ID and/or tokens are incorrect (and/or user has insufficient permissions)"
        );
      }
      checkPermissions(satisfied, msg);
    },
    (projectId, requireLevel, _action, _addPerm, _suggestion, includeDeleted) =>
      JSON.stringify([projectId, requireLevel, includeDeleted])
  );

  /**
   * Currently we assume that Pkg has a 1-1 relationship with Projects.
   * This, we can just pull up the projectId and check those permissions.
   * @param pkgId
   */
  checkPkgPerms = async (
    pkgId: string,
    requireLevel: AccessLevel,
    action: string,
    addPerm = false,
    suggestion?: string
  ) => {
    const pkg = ensureFound(await this.pkgs().findOne(pkgId), `Pkg ${pkgId}`);
    // The only pkg without a projectId should be "base".
    if (!pkg.projectId) {
      return;
    }
    return await this.checkProjectPerms(
      pkg.projectId,
      requireLevel,
      action,
      addPerm,
      suggestion,
      true
    );
  };

  async deleteProject(id: string, _proof: ProofSafeDelete) {
    await this._deleteResource({ type: "project", id });
    const pairs = await this.getPairsByRight("domain-project", id);
    for (const pair of pairs) {
      await this.deletePair(pair);
    }
  }

  async restoreProject(id: string) {
    return this._restoreResource({ type: "project", id });
  }

  async createProject({
    name,
    workspaceId: _workspaceId,
    orgId,
    ownerId,
    hostUrl,
    clonedFromProjectId,
    projectId,
    inviteOnly,
  }: {
    name: string;
    workspaceId?: WorkspaceId;
    orgId?: string;
    localBlobIds?: string[];
    ownerId?: string;
    hostUrl?: string | null;
    clonedFromProjectId?: string;
    projectId?: string;
    inviteOnly?: boolean;
  }) {
    this.checkNotAnonUser();
    if (_workspaceId) {
      await this.checkWorkspacePerms(
        _workspaceId,
        "editor",
        "create project in"
      );
    }

    let workspaceId = _workspaceId;
    const creatorId = isNormalUser(this.actor) ? this.actor.userId : ownerId;

    if (!workspaceId && creatorId) {
      const personalTeam = await this.teams().findOne({
        where: {
          personalTeamOwnerId: creatorId,
        },
      });

      const personalWorkspace = personalTeam
        ? await this.workspaces().findOne({
            where: {
              teamId: personalTeam.id,
            },
          })
        : undefined;

      workspaceId = personalWorkspace?.id ?? workspaceId;
    } else if (workspaceId && inviteOnly === undefined) {
      const team = await this.getTeamByWorkspaceId(workspaceId);
      inviteOnly = team ? true : undefined;
    }

    const project = this.projects().create({
      ...this.stampNew(true),
      org: orgId ? { id: orgId } : null,
      workspace: workspaceId ? { id: workspaceId } : null,
      name,
      defaultAccessLevel: "commenter",
      inviteOnly: inviteOnly ?? true,
      readableByPublic: false,
      hostUrl: hostUrl ?? null,
      projectApiToken: generateSomeApiToken(),
      clonedFromProjectId,
      ...(ownerId ? { createdBy: { id: ownerId } } : {}),
      ...(projectId ? { id: projectId } : {}),
    });

    await this.entMgr.save(project);
    const rev = await this.createFirstProjectRev(project.id);

    if (project.createdById) {
      await this.sudo()._assignResourceOwner(
        { type: "project", id: project.id },
        project.createdById
      );
    }
    return { project, rev };
  }

  async updateProjectOwner(projectId: ProjectId, userId: UserId) {
    this.checkSuperUser();
    await this._assignResourceOwner({ type: "project", id: projectId }, userId);
  }

  async updateProject(
    { id, ...fields }: { id: string } & Partial<UpdatableProjectFields>,
    regenerateSecretApiToken = false
  ) {
    fields = _.pick(fields, updatableProjectFields);
    if (
      editorOnlyUpdatableProjectFields.some((f) => fields[f] !== undefined) ||
      regenerateSecretApiToken
    ) {
      await this.checkProjectPerms(id, "editor", "update", true);
    } else {
      await this.checkProjectPerms(id, "content", "update", true);
    }

    if (regenerateSecretApiToken) {
      fields["secretApiToken"] = generateSomeApiToken();
    }

    const project = await this.getProjectById(id);
    if (fields.workspaceId || fields.workspaceId === null) {
      // If fields.workspaceId === null, project is moved out from its
      // current workspace (to user's personal drafts space).
      if (project.workspace) {
        await this.checkWorkspacePerms(
          project.workspace.id,
          "editor",
          "move project"
        );
      }
      if (fields.workspaceId) {
        await this.checkWorkspacePerms(
          fields.workspaceId,
          "editor",
          "move project"
        );
      }
      fields["workspace"] = { id: fields.workspaceId };
    }
    if ("isUserStarter" in fields && fields.workspaceId) {
      await this.checkWorkspacePerms(
        fields.workspaceId,
        "editor",
        "change workspace starters"
      );
    }
    // We use assignAllowEmpty rather than mergeAllowEmpty to disallow merging
    // the two codeSandboxInfo array
    assignAllowEmpty(project, this.stampUpdate(), fields);
    await this.entMgr.save(project);
    return await this.getProjectById(id, true);
  }

  async getProjectsByWorkspaces(
    workspaceIds: WorkspaceId[],
    includeDeleted = false
  ) {
    await this.checkWorkspacesPerms(
      workspaceIds,
      "viewer",
      "list projects in",
      includeDeleted
    );
    return this._queryProjects(
      {
        workspaceId: In(workspaceIds),
      },
      includeDeleted
    ).getMany();
  }

  async getProjectsByTeams(teamIds: TeamId[], includeDeleted = false) {
    await this.checkTeamsPerms(
      teamIds,
      "viewer",
      "list projects in",
      includeDeleted
    );
    return this._queryProjects({}, includeDeleted)
      .andWhere("w.teamId IN (:...teamIds)", { teamIds })
      .getMany();
  }

  async getAffiliatedProjects(teamId: TeamId, includeDeleted = false) {
    const userId = this.checkNormalUser();
    const qb = this._queryProjects({}, includeDeleted)
      .leftJoin(
        Permission,
        "perm",
        `
          perm.projectId = p.id
          or
          perm.workspaceId = p.workspaceId
          or
          perm.teamId = :teamId
          or
          perm.teamId = t.parentTeamId
        `
      )
      .andWhere(
        `
          w.teamId = :teamId
          and
          w.deletedAt is null
          and
          perm.userId = :userId
          and
          perm.accessLevel <> 'blocked'
          and
          perm.deletedAt is null
        `
      )
      .setParameters({ teamId, userId });
    return qb.getMany();
  }

  async listProjectsForOrg(orgId: string) {
    // TODO add permissions check when moving to new permissions system
    return await this._queryProjects({ orgId }).getMany();
  }

  async listProjectsForSelf() {
    const userId = this.checkNormalUser();
    return this.listProjectsForUser(userId);
  }

  async listProjectsForUser(userId: UserId) {
    // It is significantly faster to first fetch affliated workspaces and then
    // filter by it, than to do a giant join between permission, workspace,
    // project, and team.
    const workspaces = await this.getAffiliatedWorkspaces(undefined, userId);
    return this._queryProjects({})
      .leftJoin(Permission, "perm", "perm.projectId = p.id")
      .andWhere(
        `
          (
            p.workspaceId IN (:...workspaceIds) OR
            (
              perm.userId = :userId
              and
              perm.accessLevel <> 'blocked'
              and
              perm.deletedAt is null
            )
          )
        `,
        {
          userId,
          // We append an invalid 'x' value so we don't end up with an empty list
          // (resulting in invalid SQL).
          workspaceIds: [...workspaces.map((w) => w.id), "x"],
        }
      )
      .getMany();
  }

  async changeTeamOwner(teamId: TeamId, newOwner: string) {
    const teamOwner = await this.getTeamOwners(teamId);
    if (teamOwner.length === 0 || teamOwner[0].id === newOwner) {
      return;
    }

    const teamPerms = await this.getPermissionsForTeams([teamId]);
    const newOwnerPermission = teamPerms.find(
      (perm) => perm.userId === newOwner
    );
    const currentOwnerPermission = teamPerms.find(
      (perm) => perm.userId === teamOwner[0].id
    );
    if (!newOwnerPermission || !currentOwnerPermission) {
      return;
    }

    await this.teams()
      .createQueryBuilder()
      .update()
      .set({ createdById: newOwner })
      .where(`id = '${teamId}'`)
      .execute();
    await this.permissions()
      .createQueryBuilder()
      .update()
      .set({ accessLevel: "editor" })
      .where(`id = '${currentOwnerPermission.id}'`)
      .execute();
    await this.permissions()
      .createQueryBuilder()
      .update()
      .set({ accessLevel: "owner" })
      .where(`id = '${newOwnerPermission.id}'`)
      .execute();
  }

  async upgradePersonalTeam(teamId: TeamId) {
    const team = await this.getTeamById(teamId);

    if (!team.personalTeamOwnerId) {
      return;
    }

    const userId = team.personalTeamOwnerId;
    const user = await this.getUserById(userId);

    await this.teams()
      .createQueryBuilder()
      .update()
      .set({
        createdById: team.personalTeamOwnerId,
        personalTeamOwnerId: null,
      })
      .where(`id = '${teamId}'`)
      .execute();

    const personalTeam = this.teams().create({
      ...this.stampNew(),
      name: "Personal team",
      billingEmail: user.email,
      personalTeamOwnerId: user.id,
    });

    const personalWorkspace = this.workspaces().create({
      ...this.stampNew(),
      name: PERSONAL_WORKSPACE,
      description: PERSONAL_WORKSPACE,
      teamId: personalTeam.id,
    });

    const personalTeamPermission = this.permissions().create({
      ...this.stampNew(),
      teamId: personalTeam.id,
      userId: user.id,
      accessLevel: "owner",
    });

    await this.entMgr.save(personalTeam);
    await this.entMgr.save(personalWorkspace);
    await this.entMgr.save(personalTeamPermission);
  }

  async listTeamsForUser(userId: UserId) {
    this.checkSuperUser();
    return await this._queryTeams({}, false)
      .leftJoin(Permission, "perm", "perm.teamId = t.id")
      .where(`perm.userId = '${userId}'`)
      .getMany();
  }

  async listTeamsByFeatureTiers(featureTierIds: FeatureTierId[]) {
    this.checkSuperUser();
    return await this._queryTeams(
      {
        featureTierId: In(featureTierIds),

        // It would be nice to not need to know to check for stripeSubscriptionId
        // https://linear.app/plasmic/issue/PLA-10654
        stripeSubscriptionId: Not(IsNull()),
      },
      false
    ).getMany();
  }

  async listProjectsCreatedBy(
    createdById: string,
    onlyProjectsWithoutWorkspace = false
  ) {
    if (this.actor.type === "NormalUser") {
      checkPermissions(
        createdById === this.actor.userId,
        `${this.describeActor()} tried to get projects created by another user.`
      );
    } else {
      this.checkSuperUser();
    }
    return await this._queryProjects({
      createdById: createdById,
      ...(onlyProjectsWithoutWorkspace ? { workspaceId: IsNull() } : {}),
    }).getMany();
  }

  async listAllProjects({
    includeDeleted = false,
  }: { includeDeleted?: boolean } = {}) {
    this.checkSuperUser();
    return await this._queryProjects({}, includeDeleted).getMany();
  }

  async countAllProjects({
    includeDeleted = false,
  }: { includeDeleted?: boolean } = {}) {
    this.checkSuperUser();
    return await this._queryProjects({}, includeDeleted).getCount();
  }

  async getProjectById(id: string, includeDeleted = false) {
    await this.checkProjectPerms(
      id,
      "viewer",
      "get",
      undefined,
      undefined,
      includeDeleted
    );
    return ensureFound<Project>(
      await this.tryGetProjectById(id, includeDeleted),
      `Project with ID ${id}`
    );
  }

  async getProjectAndBranchesByIdOrNames(
    projectId: ProjectId,
    branchIdOrNamesVersioned: (BranchId | string)[]
  ) {
    const project = await this.getProjectById(projectId);
    const commitGraph = await this.getCommitGraphForProject(projectId);
    const allBranches = await this.listBranchesForProject(projectId, true);
    const versionedBranches = branchIdOrNamesVersioned.map(
      (branchIdOrNameVersioned) => {
        const [branchIdOrName, version] = branchIdOrNameVersioned.split("@");
        const maybeBranch = allBranches.find(
          (branch) =>
            branch.id === branchIdOrName || branch.name === branchIdOrName
        );
        if (maybeBranch) {
          return {
            id: maybeBranch.id,
            version: version as PkgVersionId,
          };
        }

        if (branchIdOrName === MainBranchId) {
          return {
            id: undefined,
            version: version as PkgVersionId,
          };
        }

        throw new NotFoundError("Couldn't find branch " + branchIdOrName);
      }
    );

    const versionedBranchesIncludingMain = [
      ...versionedBranches,
      ...(versionedBranches.some((b) => !b.id)
        ? []
        : [
            {
              id: undefined,
              version: undefined,
            },
          ]),
    ];

    const branchIds = withoutNils(versionedBranches.map(({ id }) => id));

    const branches = await Promise.all(
      branchIds.map((branchId) => this.getBranchById(branchId, true))
    );

    const pkgVersionsIds = uniq(
      versionedBranchesIncludingMain.map(
        ({ id: branchId, version }) =>
          version ?? commitGraph.branches[branchId ?? MainBranchId]
      )
    );

    const pkgVersions = await Promise.all(
      pkgVersionsIds.map((pkgVersionId) => this.getPkgVersionById(pkgVersionId))
    );

    const revisions = await Promise.all(
      versionedBranchesIncludingMain.map(({ id: branchId, version }) => {
        if (!version) {
          return this.getLatestProjectRev(
            projectId,
            branchId ? { branchId } : undefined
          );
        } else {
          const pkgVersion = ensure(
            pkgVersions.find((_pkgVersion) => _pkgVersion.id === version),
            `Couldn't find pkgVersion with ID ${version}`
          );
          return this.getProjectRevisionById(
            projectId,
            pkgVersion.revisionId,
            branchId
          );
        }
      })
    );

    const additionalPkgVersionsIds: string[] = [];

    versionedBranchesIncludingMain.forEach((left, i) =>
      versionedBranchesIncludingMain.slice(i + 1).forEach((right) => {
        const ancestorPkgId = getLowestCommonAncestor(
          projectId,
          commitGraph,
          left.id,
          right.id,
          left.version,
          right.version
        );
        if (
          !pkgVersionsIds.includes(ancestorPkgId) &&
          !additionalPkgVersionsIds.includes(ancestorPkgId)
        ) {
          additionalPkgVersionsIds.push(ancestorPkgId);
        }
      })
    );

    const additionalPkgVersions = await Promise.all(
      additionalPkgVersionsIds.map((pkgVersionId) =>
        this.getPkgVersionById(pkgVersionId)
      )
    );

    return {
      branches,
      pkgVersions: [...pkgVersions, ...additionalPkgVersions],
      project,
      revisions,
      commitGraph: {
        ...commitGraph,
        branches: {
          ...commitGraph.branches,
          ...fromPairs(
            versionedBranchesIncludingMain
              .filter(({ version }) => !!version)
              .map(({ id, version }) => [id ?? MainBranchId, version])
          ),
        },
      },
    };
  }

  async getProjectsById(ids: string[], includeDeleted = false) {
    await this._checkResourcesPerms(
      { type: "project", ids },
      "viewer",
      "get",
      includeDeleted
    );
    return this._queryProjects(
      {
        id: In(ids),
      },
      includeDeleted
    ).getMany();
  }

  async getPermissionsForProjects(projectIds: string[], directOnly = false) {
    return this.getPermissionsForResources(
      {
        type: "project",
        ids: projectIds,
      },
      directOnly
    );
  }

  private _queryProjects(
    where: FindConditions<Project>,
    includeDeleted = false
  ) {
    const qb = this.projects().createQueryBuilder("p");
    qb.leftJoinAndSelect("p.workspace", "w")
      .leftJoinAndSelect("w.team", "t")
      .leftJoinAndSelect("t.featureTier", "ft")
      .leftJoinAndSelect("t.parentTeam", "pt")
      .leftJoinAndSelect("pt.featureTier", "pft")
      .where(where);
    if (!includeDeleted) {
      qb.andWhere(
        "p.deletedAt is null and w.deletedAt is null and t.deletedAt is null and pt.deletedAt is null"
      );
    }
    return qb;
  }

  async checkIfProjectIdExists(id: string, includeDeleted?: boolean) {
    return !!(await this._queryProjects({ id }, includeDeleted).getOne());
  }

  async tryGetProjectById(id: string, includeDeleted: boolean) {
    await this.checkProjectPerms(
      id,
      "viewer",
      "get",
      undefined,
      undefined,
      includeDeleted
    );
    return this._queryProjects({ id }, includeDeleted).getOne();
  }

  //
  // Project revision methods.
  //

  async listAllProjectRevs() {
    this.checkSuperUser();
    return await this.projectRevs().find();
  }

  async listAllProjectRevIds() {
    this.checkSuperUser();
    return await this.projectRevs().find({ select: ["id"] });
  }

  async getProjectRevById(id: string) {
    this.checkSuperUser();
    return ensureFound(
      await this.projectRevs().findOne(id),
      `Project revision ${id}`
    );
  }

  async tryGetProjectRevById(projectId: string, revId: string) {
    await this.checkProjectPerms(projectId, "viewer", "get");
    return await this.projectRevs().findOne({ id: revId });
  }

  async listProjectRevs(projectId: string) {
    await this.checkProjectPerms(projectId, "viewer", "get");
    return await this.projectRevs().find({ where: { projectId } });
  }

  async listLatestProjectAndBranchRevisions(
    opts: { includeDeletedProjects?: boolean } = {}
  ): Promise<
    {
      projectId: string;
      id: string | null;
      branchId: BranchId | null;
      revision: number | null;
    }[]
  > {
    this.checkSuperUser();
    return await this.getEntMgr().query(`
      WITH
        project_max_rev AS (
          SELECT "projectId", "branchId", MAX(revision) AS revision
          FROM project_revision
          WHERE "deletedAt" IS NULL
          GROUP BY "projectId", "branchId"
        )
        SELECT p.id AS "projectId", m."branchId" as "branchId", r.id AS "id", m.revision AS "revision"
        FROM project p
        LEFT OUTER JOIN project_max_rev m ON (p.id=m."projectId")
        LEFT OUTER JOIN project_revision r ON
          (p.id=r."projectId"
          AND (
            m."branchId" = r."branchId" OR
            (m."branchId" IS NULL AND r."branchId" IS NULL)
          )
          AND m.revision=r.revision)
        ${opts.includeDeletedProjects ? "" : `WHERE p."deletedAt" IS NULL`}
    `);
  }

  // TODO allow saving revisions with comments.
  async saveProjectRev({
    projectId,
    branchId,
    data,
    revisionNum,
  }: {
    projectId: string;
    branchId?: BranchId;
    data: string;
    revisionNum: number;
  }) {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "content",
      "save",
      true
    );
    const latest = await this.getLatestProjectRev(projectId, {
      branchId,
      revisionNumOnly: true,
    });
    if (revisionNum !== latest.revision + 1) {
      throw new ProjectRevisionError(
        `Tried saving revision ${revisionNum}, but expecting ${
          latest.revision + 1
        } since latest saved revision is ${latest.revision}`
      );
    }
    const revision = this.projectRevs().create({
      ...this.stampNew(),
      project: { id: projectId },
      data,
      dataLength: data.length,
      revision: revisionNum,
      branchId,
    });
    try {
      await this.entMgr.save(revision);
    } catch (err) {
      // We might run into this if two saves happen at the same time
      if (
        err instanceof Error &&
        err.message.includes("duplicate key value violates unique constraint")
      ) {
        throw new ProjectRevisionError(
          `Concurrent saves to revision ${revisionNum}`
        );
      }
      throw err;
    }

    // Update-stamp the project itself as well, since clients typically query the
    // Project to see updatedAt/updatedBy.
    await this.updateProject({ id: projectId });
    return revision;
  }

  async permanentlyDeleteProjectRev({
    projectId,
    revisionNum,
  }: {
    projectId: string;
    revisionNum: number;
  }) {
    await this.checkProjectPerms(projectId, "editor", "delete project");
    const rev = await this.getProjectRevision(projectId, revisionNum);
    return await this.projectRevs().delete(
      ensure(rev, "you can't delete a project rev that doesn't exist").id
    );
  }

  /**
   * Creates a new revision with the same data as the argument `revisionNum`.
   */
  async revertProjectRev(projectId: string, revisionNum: number) {
    await this.checkProjectPerms(
      projectId,
      "editor",
      "revert project revision"
    );
    const rev = await this.getProjectRevision(projectId, revisionNum);
    const latest = await this.getLatestProjectRev(projectId);
    const newRev = await this.saveProjectRev({
      projectId,
      data: rev.data,
      revisionNum: latest.revision + 1,
    });
    return newRev;
  }

  /**
   * Overwrites a ProjectRev's data; intended for migration only.  You
   * probably should use saveProjectRev() instead.
   */
  async updateProjectRev({
    projectId,
    data,
    revisionNum,
    branchId,
  }: {
    projectId: string;
    data: string;
    revisionNum: number;
    branchId: BranchId | undefined;
  }) {
    await this.checkProjectPerms(projectId, "content", "save", true);
    const rev = await this.getProjectRevision(projectId, revisionNum, branchId);
    mergeSane(rev, this.stampUpdate(), { data });
    return await this.projectRevs().save(rev);
  }

  async createFirstProjectRev(projectId: ProjectId) {
    const revision = this.entMgr.create(ProjectRevision, {
      ...this.stampNew(),
      revision: 1,
      project: { id: projectId },
      // This is a placeholder.  The first client to load this placeholder will save back a valid initial
      // project.
      data: "{}",
    });

    await this.entMgr.save(revision);

    return revision;
  }

  async getPreviousPkgId(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    pkgId: string
  ) {
    const graph = await this.getCommitGraphForProject(projectId as ProjectId);
    const branchHead = graph.branches[branchId ?? MainBranchId];

    // The branch head might not be the latest version in this branch, if the
    // user reverted to a previous version. So we get all branch versions.
    const previousVersions: Pick<PkgVersion, "id" | "version">[] =
      await this.pkgVersions()
        .createQueryBuilder()
        .select("id, version")
        .where(
          `"pkgId" = :pkgId AND
          (
            (:branchId::text is null AND "branchId" is null)
            OR "branchId" = :branchId::text
            ${branchHead ? `OR "id" = :branchHead::text` : ""}
          )`,
          { pkgId: pkgId, branchId, ...(branchHead ? { branchHead } : {}) }
        )
        .getRawMany();

    const { id: prevPkgVersionId } = previousVersions.reduce<{
      id?: PkgVersionId;
      version?: string;
    }>(({ id: id1, version: version1 }, { id: id2, version: version2 }) => {
      if (!version1 || (version2 && semver.gt(version2, version1))) {
        return { id: id2, version: version2 };
      } else {
        return { id: id1, version: version1 };
      }
    }, {});
    return prevPkgVersionId;
  }

  async computeNextProjectVersion(
    projectId: ProjectId,
    revisionNum?: number,
    branchId?: BranchId
  ) {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "content",
      "publish",
      true
    );
    const devflags = await getDevFlagsMergedWithOverrides(this);
    if (!devflags.serverPublishProjectIds.includes(projectId)) {
      throw new UnauthorizedError("Access denied");
    }

    const pkg = await this.getPkgByProjectId(projectId);
    const rev = await (revisionNum
      ? this.getProjectRevision(projectId, revisionNum, branchId)
      : this.getLatestProjectRev(projectId, { branchId }));
    if (pkg) {
      const prevPkgVersionId = await this.getPreviousPkgId(
        projectId as ProjectId,
        branchId,
        pkg.id
      );
      if (prevPkgVersionId) {
        const bundler = new Bundler();
        const publishedSite = await unbundleProjectFromData(this, bundler, rev);
        const prevPkgVersion = await this.getPkgVersionById(prevPkgVersionId);
        const prevUnbundled = await unbundlePkgVersion(
          this,
          bundler,
          prevPkgVersion
        );
        const changeLog = compareSites(prevUnbundled.site, publishedSite);
        const releaseType = calculateSemVer(changeLog);
        const version = ensureString(
          semver.inc(prevPkgVersion.version, releaseType)
        );
        return { changeLog, releaseType, version };
      }
    }
    return {
      version: INITIAL_VERSION_NUMBER,
      changeLog: [],
      releaseType: undefined,
    };
  }

  async publishProject(
    projectId: string,
    version: string | undefined,
    tags: string[],
    description: string,
    revisionNum?: number,
    hostLessPackage?: boolean,
    branchId?: BranchId,
    secondMergeParentPkgVersionId?: PkgVersionId,
    conflictPickMap?: DirectConflictPickMap
  ) {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "content",
      "save",
      true
    );
    const project = await this.getProjectById(projectId);
    const rev = await (revisionNum
      ? this.getProjectRevision(projectId, revisionNum, branchId)
      : this.getLatestProjectRev(projectId, { branchId }));
    const maybePkg = await this.getPkgByProjectId(projectId);
    const pkg = maybePkg ?? (await this.createPkgByProjectId(projectId));

    // Sync the pkg and project name
    if (pkg.name !== project.name) {
      pkg.name = project.name;
      await this.entMgr.save(pkg);
    }

    const bundler = new Bundler();
    const publishedSite = await unbundleProjectFromData(this, bundler, rev);
    const usedSiteFeatures: SiteFeature[] = [];

    if (
      publishedSite.splits.filter(
        (split) => split.status === SplitStatus.Running
      ).length > 0
    ) {
      usedSiteFeatures.push("split");
    }

    if (!version) {
      const prevPkgVersionId = await this.getPreviousPkgId(
        projectId as ProjectId,
        branchId,
        pkg.id
      );

      if (prevPkgVersionId) {
        const prevPkgVersion = await this.getPkgVersionById(prevPkgVersionId);
        const prevUnbundled = await unbundlePkgVersion(
          this,
          bundler,
          prevPkgVersion
        );
        const releaseType = calculateSemVer(
          compareSites(prevUnbundled.site, publishedSite)
        );
        version = ensureString(semver.inc(prevPkgVersion.version, releaseType));
      } else {
        // No previous version - we are making the first commit!
        version = INITIAL_VERSION_NUMBER;
      }
    }

    const dep = new ProjectDependency({
      uuid: mkShortId(),
      pkgId: pkg.id,
      projectId,
      version,
      name: pkg.name,
      site: publishedSite,
    });

    // Bundling with projectId because we don't want xrefs to projectId
    // This same bundle should be unbundled with PkgVersion.id
    const depBundle = bundler.bundle(
      dep,
      projectId,
      await getLastBundleVersion()
    );

    // Create the PkgVersion
    const pkgVersion = this.pkgVersions().create({
      ...this.stampNew(),
      pkg,
      version,
      model: JSON.stringify(depBundle),
      tags,
      description,
      hostUrl: hostLessPackage ? null : project.hostUrl,
      revisionId: rev.id,
      isPrefilled: false,
      branchId,
      conflictPickMap: conflictPickMap ? JSON.stringify(conflictPickMap) : null,
    });

    await this.maybeUpdateCommitGraphForProject(projectId as ProjectId, (g) => {
      const branchSpec = branchId ?? MainBranchId;
      g.parents[pkgVersion.id] = withoutNils([
        g.branches[branchSpec],
        secondMergeParentPkgVersionId,
      ]);
      g.branches[branchSpec] = pkgVersion.id;
    });

    await this.entMgr.save(pkgVersion);

    const devflags = mergeSane(
      {},
      DEVFLAGS,
      JSON.parse((await this.tryGetDevFlagOverrides())?.data ?? "{}")
    ) as typeof DEVFLAGS;

    if (
      devflags.hostLessWorkspaceId &&
      project.workspaceId === devflags.hostLessWorkspaceId
    ) {
      await this.bumpHostlessVersion();
    }

    return {
      pkgVersion,
      usedSiteFeatures,
    };
  }

  private async checkProjectBranchPerms(
    { projectId, branchId }: ProjectAndBranchId,
    requireLevel: AccessLevel,
    action: string,
    addPerm = false
  ) {
    await this.checkProjectPerms(projectId, requireLevel, action, addPerm);
    if (branchId) {
      await this.checkBranchPerms(branchId, requireLevel, action, addPerm);
    }
  }

  /**
   * Since this is for actually loading/opening a project, we will explicitly
   * add a permission for the user trying to access.
   */
  async getLatestProjectRev(
    projectId: string,
    {
      noAddPerm = false,
      branchId,
      revisionNumOnly,
    }: {
      noAddPerm?: boolean;
      branchId?: BranchId;
      revisionNumOnly?: boolean;
    } = {}
  ) {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "viewer",
      "get latest revision for",
      !noAddPerm
    );
    const qb = this.projectRevs()
      .createQueryBuilder("rev")
      .where("rev.project = :projectId")
      .andWhere("rev.deletedAt IS NULL");
    whereEqOrNull(qb, "rev.branch", { branchId }, true);
    qb.setParameter("projectId", projectId);
    qb.orderBy("rev.revision", "DESC").limit(1);
    // This is done to avoid loading the entire data of a project revision.
    qb.select(revisionNumOnly ? "rev.revision" : "rev");
    return ensureFound<ProjectRevision>(
      await getOneOrFailIfTooMany(qb.printSql()),
      `Project with ID ${projectId} branch ${branchId}`
    );
  }

  async getLatestProjectRevNumber(
    projectId: string,
    { branchId }: { branchId?: BranchId } = {}
  ) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get latest revision for",
      false
    );
    const res = await this.projectRevs()
      .createQueryBuilder("rev")
      .select("max(rev.revision) as maxrev")
      .where("rev.projectId = :projectId")
      .andWhere(
        "(:branchId::text is null and rev.branchId is null or rev.branchId = :branchId::text)"
      )
      .andWhere("rev.deletedAt is null")
      .setParameter("projectId", projectId)
      .setParameter("branchId", branchId)
      .getRawOne();

    return res.maxrev as number;
  }

  async getPreviousProjectRev(
    current: ProjectRevision | PkgVersion
  ): Promise<ProjectRevision | undefined> {
    this.checkSuperUser();
    let projectId: string | undefined = undefined;
    if (current instanceof ProjectRevision) {
      projectId = current.projectId;
    } else {
      const pkg = await this.getPkgById(current.pkgId);
      projectId = pkg.projectId;
    }
    if (!projectId) {
      return undefined;
    }

    return getOneOrFailIfTooMany(
      await this.projectRevs()
        .createQueryBuilder("rev")
        .where("rev.projectId = :projectId")
        .andWhere("rev.createdAt < :createdAt")
        .setParameter("projectId", projectId)
        .setParameter("createdAt", current.createdAt)
        .orderBy("rev.createdAt", "DESC")
        .limit(1)
    );
  }

  async tryGetLatestRevisionSynced(projectId: string) {
    return getOneOrFailIfTooMany(
      this.projectSyncMetadata()
        .createQueryBuilder("projectSync")
        .where((qb) => {
          const subQuery = qb
            .subQuery()
            .select("max(projectSync2.revision)")
            .from(ProjectSyncMetadata, "projectSync2")
            .where("projectSync2.projectId = :projectId")
            .getQuery();
          return "projectSync.revision = " + subQuery;
        })
        .andWhere("projectSync.projectId = :projectId")
        .setParameter("projectId", projectId)
        .printSql()
    );
  }

  async getProjectSyncMetadata(projectId: string, revisionNum: number) {
    return ensureFound<ProjectSyncMetadata>(
      await this.tryGetProjectSyncMetadata(projectId, revisionNum),
      `Project revision with projectId ${projectId} and revision ${revisionNum}`
    );
  }

  async tryGetProjectSyncMetadata(projectId: string, revisionNum: number) {
    await this.checkProjectPerms(projectId, "viewer", "get revision for");
    return getOneOrFailIfTooMany(
      this.projectSyncMetadata()
        .createQueryBuilder()
        .where(`"projectId" = :projectId AND revision = :revision`)
        .setParameter("projectId", projectId)
        .setParameter("revision", revisionNum)
        .printSql()
    );
  }

  async createProjectSyncMetadata(
    projectId: string,
    revision: number,
    projectRevId: string,
    data: string
  ) {
    this.allowAnyone();
    const projectSyncMetadata = this.projectSyncMetadata().create({
      ...this.stampNew(true),
      projectId,
      revision,
      projectRevId,
      data,
    });
    return await this.projectSyncMetadata()
      .createQueryBuilder()
      .insert()
      .values(projectSyncMetadata)
      .setParameter("data", data)
      .execute();
  }

  async updateProjectSyncMetadata(
    projectId: string,
    revision: number,
    projectRevId: string,
    data: string
  ) {
    this.allowAnyone();
    return await this.projectSyncMetadata()
      .createQueryBuilder()
      .update()
      .set({ data: data })
      .where(`"projectRevId" = :projectRevId`)
      .setParameter("projectRevId", projectRevId)
      .execute();
  }

  async getProjectRevisionById(
    projectId: string,
    revisionId: string,
    branchId?: string
  ) {
    await this.checkProjectPerms(projectId, "viewer", "get revision for", true);
    return ensureFound<ProjectRevision>(
      await getOneOrFailIfTooMany(
        this.projectRevs()
          .createQueryBuilder("rev")
          .where(
            `id=:revisionId AND "projectId"=:projectId AND (:branchId::text is null AND "branchId" is null OR "branchId" = :branchId::text)`,
            {
              revisionId,
              projectId,
              branchId,
            }
          )
          .printSql()
      ),
      `Project revision with id ${projectId} and revision id ${revisionId}`
    );
  }

  async getProjectRevision(
    projectId: string,
    revisionNum: number,
    branchId?: BranchId
  ) {
    await this.checkProjectPerms(projectId, "viewer", "get revision for", true);
    return ensureFound<ProjectRevision>(
      await getOneOrFailIfTooMany(
        this.projectRevs()
          .createQueryBuilder("rev")
          .where(
            `"projectId" = :projectId AND revision=:revisionNum AND (:branchId::text is null AND "branchId" is null OR "branchId" = :branchId::text)`,
            {
              projectId,
              branchId,
              revisionNum,
            }
          )
          .printSql()
      ),
      `Project revision with id ${projectId}, branch ID ${branchId}, and revision ${revisionNum}`
    );
  }

  async deleteRevision(rev: ProjectRevision) {
    this.checkSuperUser();
    // XXX: ensure not already deleted?
    Object.assign(rev, this.stampDelete());
    await this.entMgr.save(rev);
  }

  /**
   * We do not add permission for the current user. E.g. the project may just be
   * a template project that is being cloned using the Get Started section of
   * the dashboard. Don't want the template projects showing up in the user's
   * dashboard's recent files.
   */
  async cloneProject(
    projectId: ProjectId,
    bundler: Bundler,
    opts: {
      name?: string;
      ownerId?: string;
      workspaceId?: WorkspaceId;
      revisionNum?: number;
      branchName?: string;
      ownerEmail?: string;
    }
  ) {
    await this.checkProjectPerms(projectId, "viewer", "clone");
    if (opts.ownerId) {
      // Only super user can specify owner id
      this.checkSuperUser();
    }
    const fromProjectInfo = await this.getProjectById(projectId);
    const fromProjectBranch = opts.branchName
      ? await this.getProjectBranchByName(projectId, opts.branchName)
      : undefined;
    const fromProjectRev = !opts?.revisionNum
      ? await this.getLatestProjectRev(projectId, {
          noAddPerm: true,
          branchId: fromProjectBranch?.id,
        })
      : await this.getProjectRevision(
          projectId,
          opts.revisionNum,
          fromProjectBranch?.id
        );

    const nameSuffixDetails = withoutNils([
      opts?.branchName,
      opts?.revisionNum,
    ]);
    const nameSuffix =
      nameSuffixDetails.length > 0 ? ` (${nameSuffixDetails.join(", ")})` : "";
    return await this.cloneSiteAsNewProject(
      fromProjectInfo,
      fromProjectRev,
      bundler,
      {
        ...opts,
        name: opts.name ?? `Copy of ${fromProjectInfo.name}${nameSuffix}`,
        ...(fromProjectBranch
          ? { hostUrl: fromProjectBranch.hostUrl ?? null }
          : {}),
      }
    );
  }

  async clonePublishedTemplate(
    projectId: string,
    bundler: Bundler,
    opts: {
      name?: string;
      ownerId?: string;
      workspaceId?: WorkspaceId;
      hostUrl?: string;
      ownerEmail?: string;
    }
  ) {
    await this.checkProjectPerms(projectId, "viewer", "clone");
    if (opts.ownerId) {
      // Only super user can specify owner id
      this.checkSuperUser();
    }
    const fromProject = await this.getProjectById(projectId);
    const fromPkg = await this.getPkgByProjectId(projectId);
    if (!fromPkg) {
      throw new NotFoundError(`Unknown template project id ${projectId}`);
    }
    const fromPkgVersion = await this.tryGetPkgVersion(fromPkg.id);
    if (!fromPkgVersion) {
      throw new NotFoundError(
        `Template project id ${projectId} does not have a published version to clone`
      );
    }

    return await this.cloneSiteAsNewProject(
      fromProject,
      fromPkgVersion,
      bundler,
      {
        ...opts,
        name: opts.name ?? fromProject.name,
      }
    );
  }

  private async cloneSiteAsNewProject(
    fromProject: Project,
    fromData: ProjectRevision | PkgVersion,
    bundler: Bundler,
    opts: {
      name: string;
      ownerId?: string;
      workspaceId?: WorkspaceId;
      hostUrl?: string | null;
      ownerEmail?: string;
    }
  ) {
    const { name, ownerId, workspaceId, hostUrl } = opts;

    const fromSite =
      fromData instanceof ProjectRevision
        ? await unbundleProjectFromData(this, bundler, fromData)
        : (await unbundlePkgVersion(this, bundler, fromData)).site;
    const clonedSite = cloneSite(fromSite);

    const { project, rev } = await this.createProject({
      name,
      workspaceId,
      ownerId,
      hostUrl: hostUrl !== undefined ? hostUrl : fromProject.hostUrl,
      clonedFromProjectId: fromProject.id,
    });
    // Get the workspaceId from the project as the project may have went to the playground workspace
    const projectWorkspaceId = project.workspaceId;

    const fromAppAuthConfig = await this.getAppAuthConfig(fromProject.id, true);
    let oldToNewSourceIds: Record<string, string> = {};
    let oldToNewRoleIds: Record<string, string> = {};
    let reevaluateOpIds = false;

    if (fromAppAuthConfig) {
      if (projectWorkspaceId) {
        const workspace = await this.getWorkspaceById(projectWorkspaceId);
        // The current user may not have access to the workspace/team of the project being cloned
        // So we look into the workspace where the project is being cloned into
        const teamProjects = await this.getProjectsByTeams([workspace.teamId]);
        const isInTheSameTeam = teamProjects.some(
          (p) => p.id === fromProject.id
        );
        if (isInTheSameTeam) {
          // If the project is being cloned into the same team, we reuse the directory
          oldToNewRoleIds = (
            await this.createAppAuthConfigFromProject({
              fromProjectId: fromProject.id,
              toProjectId: project.id,
              toDirectoryId: fromAppAuthConfig.directoryId,
              oldToNewDirectoryGroupIds: {},
              keepGroupRefs: true,
            })
          ).oldToNewRoleIds;

          const fixResult = fixAppAuthRefs(clonedSite, oldToNewRoleIds);

          if (fixResult.reevaluateOpIds) {
            reevaluateOpIds = true;
          }
        } else {
          const endUserDirectory = await this.createEndUserDirectory(
            workspace.teamId,
            name // re using project name
          );

          const oldToNewDirectoryGroupIds =
            await this.createDirectoryGroupsFromDirectory(
              fromAppAuthConfig.directoryId,
              endUserDirectory.id
            );

          // We won't copy the people that belong to the directory groups
          // so that we don't start any project from template with people already in it

          oldToNewRoleIds = (
            await this.createAppAuthConfigFromProject({
              fromProjectId: fromProject.id,
              toProjectId: project.id,
              toDirectoryId: endUserDirectory.id,
              oldToNewDirectoryGroupIds,
              keepGroupRefs: false,
            })
          ).oldToNewRoleIds;

          const fixResult = fixAppAuthRefs(clonedSite, oldToNewRoleIds);

          if (fixResult.reevaluateOpIds) {
            reevaluateOpIds = true;
          }
        }
      } else {
        // If the current project is not going to be in a workspace, we clean up the app auth config
        const fixResult = fixAppAuthRefs(clonedSite, {});

        if (fixResult.reevaluateOpIds) {
          reevaluateOpIds = true;
        }
      }
    }

    if (projectWorkspaceId) {
      oldToNewSourceIds = (
        await this.cloneTutorialDbsFromProject(clonedSite, projectWorkspaceId)
      ).oldToNewSourceIds;
      if (_.keys(oldToNewSourceIds).length > 0) {
        reevaluateOpIds = true;
      }
    }

    // reevaluateOpIds is only used for opIds present in the model, so we check user properties
    // separately
    if (fromAppAuthConfig) {
      await reevaluateAppAuthUserPropsOpId(
        this,
        fromProject.id,
        project.id,
        oldToNewSourceIds,
        oldToNewRoleIds
      );
    }

    if (reevaluateOpIds) {
      await reevaluateDataSourceExprOpIds(
        this,
        clonedSite,
        oldToNewSourceIds,
        oldToNewRoleIds
      );
    }

    // By now, cloned site already has the new source ids for the new project (including cloned tutorial dbs)
    const sourceIds = getAllOpExprSourceIdsUsedInSite(clonedSite);
    // Enable each source id independently, so that if one fails, the others still get enabled
    for (const sourceId of sourceIds) {
      try {
        await this.allowProjectToDataSources(project.id, [
          sourceId,
        ] as DataSourceId[]);
      } catch (err) {
        // This may fail the clone if the user doesn't have access to the sourceIds, which is fine
        // the user will have a cloned version but won't be able to issue new opIds, the ones already
        // in the model will still work, but it will check for permissions in the data source too
        console.error(
          `Failed to allow project ${project.id} to data sources ${sourceId}`,
          err
        );
      }
    }

    const newBundle = bundler.bundle(
      clonedSite,
      "",
      await getLastBundleVersion()
    );

    const fromBundleId =
      fromData instanceof ProjectRevision ? fromData.projectId : fromData.id;

    if (fromBundleId && newBundle.deps.includes(fromBundleId)) {
      fs.writeFileSync(
        `/tmp/corrupt-${fromBundleId}.json`,
        JSON.stringify(newBundle, undefined, 2)
      );
      fs.writeFileSync(
        `/tmp/corrupt-from-${fromBundleId}.json`,
        JSON.stringify(
          getBundle(fromData, await getLastBundleVersion()),
          undefined,
          2
        )
      );
      if (global && !(global as any).badClone) {
        (global as any).badClone = { fromSite, clonedSite, bundler };
      }
      throw new Error(
        `Unexpected dependency to fromProject during cloning ${fromProject.id}`
      );
    }

    await this.saveProjectRev({
      projectId: project.id,
      data: JSON.stringify(newBundle),
      revisionNum: rev.revision + 1,
    });
    return project;
  }

  //
  // Partial revisions
  //

  async savePartialRevision({
    projectId,
    data,
    deletedIids,
    revisionNum,
    branchId,
    projectRevisionId,
    modifiedComponentIids,
  }: {
    projectId: string;
    data: string;
    deletedIids: string;
    revisionNum: number;
    branchId?: BranchId;
    projectRevisionId: string;
    modifiedComponentIids: string[];
  }) {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "content",
      "save",
      true
    );
    const partialRev = this.partialRevCache().create({
      ...this.stampNew(),
      projectId,
      data,
      deletedIids,
      revision: revisionNum,
      projectRevisionId,
      branchId: branchId ?? null,
      modifiedComponentIids,
    });
    await this.entMgr.save(partialRev);
    return partialRev;
  }

  async getPartialRevsFromRevisionNumber(
    projectId: string,
    fromRev: number,
    branchId?: BranchId
  ) {
    await this.checkProjectPerms(projectId, "viewer", "get", true);
    const tenMinAgo = new Date();
    // Only load saves from the last 10min to avoid expensive work
    tenMinAgo.setMinutes(tenMinAgo.getMinutes() - 10);
    return this.partialRevCache().find({
      where: {
        projectId,
        branchId: branchId ?? null,
        ...excludeDeleted(),
        revision: MoreThan(fromRev),
        updatedAt: MoreThan(tenMinAgo),
      },
    });
  }

  async clearPartialRevisionsCacheForProject(
    projectId: string,
    branchId?: BranchId
  ) {
    await this.checkProjectPerms(projectId, "content", "edit", true);
    return this.partialRevCache().update(
      { projectId, branchId: branchId ?? null },
      this.stampDelete()
    );
  }

  async prunePartialRevisionsCache() {
    // Keep the partial revisions for 24h so we can debug
    return this.getEntMgr().query(`
      DELETE FROM partial_revision_cache
      WHERE "updatedAt" < NOW() - INTERVAL '24 HOURS'
    `);
  }

  //
  // Package methods.
  //

  async createSysPkg(name: string, projectId?: string, pkgId?: string) {
    this.allowAnyone();
    const pkg = this.pkgs().create({
      ...this.stampNew(),
      name,
      sysname: name,
      projectId,
      ...(pkgId ? { id: pkgId } : {}),
    });
    await this.pkgs().save(pkg);
    return pkg;
  }

  /**
   * Idempotent call to create a Pkg.
   * Creates it if it doesn't exist.
   * If it does exist, update it to be current (e.g. syncing project name)
   **/
  async createPkgByProjectId(projectId: string) {
    await this.checkProjectPerms(projectId, "content", "save");

    const project = await this.getProjectById(projectId);
    // Idempotent Pkg creation
    const maybePkg = await this.getPkgByProjectId(projectId);
    const pkg = maybePkg
      ? maybePkg
      : this.pkgs().create({
          ...this.stampNew(),
          project,
          name: project.name,
        });
    // Sync the project name into Pkg
    _.merge(pkg, { name: project.name });
    await this.pkgs().save(pkg);
    return ensureFound<Pkg>(pkg, `Pkg for projectId=${projectId}`);
  }

  async listAllPkgs() {
    this.checkSuperUser();
    return this.pkgs().find();
  }

  async listAllPkgVersions() {
    this.checkSuperUser();
    return this.pkgVersions().find();
  }

  async listAllPkgVersionIds() {
    this.checkSuperUser();
    return this.pkgVersions().find({
      select: ["id"],
      where: excludeDeleted(),
    });
  }

  async getPkgVersionById(id: string): Promise<PkgVersion> {
    const pkgVersion = ensureFound(
      await this.pkgVersions().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Pkg Version ${id}`
    );
    await this.checkPkgPerms(pkgVersion.pkgId, "viewer", "get");
    return pkgVersion;
  }

  async getPkgById(id: string) {
    await this.checkPkgPerms(id, "viewer", "get");
    return ensureFound(await this.pkgs().findOne(id), `Pkg ${id}`);
  }

  async getPkgByProjectId(projectId: string) {
    await this.checkProjectPerms(projectId, "viewer", "get");
    return await this.pkgs().findOne({
      where: {
        projectId,
      },
    });
  }

  /**
   * Get a specific PkgVersion that contains the given tag (if defined).
   * If a versionRange is not specified, return the latest PkgVersion
   * @param pkgId
   * @param versionRange
   * @param tag
   */
  async getPkgVersion(
    pkgId: string,
    versionRange?: string,
    tag?: string,
    opts?: { prefilledOnly?: boolean; branchId?: BranchId }
  ) {
    return ensureFound<PkgVersion>(
      await this.tryGetPkgVersion(pkgId, versionRange, tag, opts),
      `PkgVersion for pkgId=${pkgId}, branchId=${opts?.branchId}, version=${
        versionRange ? versionRange : "latest"
      }${tag ? ", tag=" + tag : ""}`
    );
  }
  async tryGetPkgVersion(
    pkgId: string,
    versionRange?: string,
    tag?: string,
    {
      prefilledOnly = false,
      branchId,
    }: { prefilledOnly?: boolean; branchId?: BranchId } = {}
  ) {
    await this.checkPkgPerms(pkgId, "viewer", "get");
    if (branchId) {
      await this.checkBranchPerms(
        branchId,
        "viewer",
        "get pkg version",
        false,
        true
      );
    }

    const pkg = await this.getPkgById(pkgId);

    // See if the tag name is actually a branch name.
    if (tag) {
      const branches = await this.listBranchesForProject(pkg.projectId);
      const matchingBranch = branches.find((branch) => branch.name === tag);
      if (matchingBranch) {
        branchId = matchingBranch.id;
        tag = undefined;
        await this.checkBranchPerms(branchId, "viewer", "get pkg version");
      }
    }

    const range = versionRange ?? "latest";
    if (!semver.validRange(range)) {
      throw new BadRequestError(`version range ${range} is not valid`);
    }
    console.log(
      `Looking for pkgVersion for pkgId=${pkgId}, branchId=${branchId}, version=${range}${
        tag ? ", tag=" + tag : ""
      }`
    );

    if (branchId && range === "latest") {
      const graph = await this.getCommitGraphForProject(pkg.projectId);
      const chain = getCommitChainFromBranch(graph, branchId);
      return await this.getPkgVersionById(chain[0]);
    }

    // Older versions may not fit strict semantic versions, requires coercion
    const availablePkgVersionsQuery = this.pkgVersions()
      .createQueryBuilder()
      .select("version")
      .where(`"pkgId" = :pkgId`, { pkgId })
      .andWhere(
        `(:branchId::text is null AND "branchId" is null OR "branchId" = :branchId::text)`,
        { branchId }
      );
    if (tag) {
      availablePkgVersionsQuery.andWhere(`:tag = ANY ("tags")`, { tag });
    }
    if (prefilledOnly) {
      availablePkgVersionsQuery.andWhere(
        `COALESCE("isPrefilled", TRUE) IS TRUE`
      );
    }
    const availablePkgVersions = await availablePkgVersionsQuery.getRawMany();
    const availableVersions = withoutNils(
      availablePkgVersions.map((v) => v.version)
    );
    const coercedAvailableVersions = withoutNils(
      availableVersions.map((v) => semver.coerce(v))
    );
    // This will filter out any versions that cannot be coerced into semver
    const strictVersion = semver.maxSatisfying(coercedAvailableVersions, range);
    // Just find the first fuzzy version that matches
    const version = availableVersions.find(
      (v) => semver.coerce(v) === strictVersion
    );
    if (!strictVersion || !version) {
      console.warn(
        `No matching versions for pkgId=${pkgId} branchId=${branchId} version=${range}${
          tag ? ", tag=" + tag : ""
        }`
      );
      return;
    }

    return getOneOrFailIfTooMany(
      this.pkgVersions()
        .createQueryBuilder("pkgVersion")
        .leftJoinAndSelect("pkgVersion.pkg", "pkg")
        .where("pkgVersion.pkgId = :pkgId", { pkgId })
        .andWhere(
          "(:branchId::text is null AND pkgVersion.branchId is null OR pkgVersion.branchId = :branchId::text)",
          { branchId }
        )
        .andWhere("pkgVersion.version = :version", { version })
        .andWhere("pkgVersion.deletedAt is null")
        .printSql()
    );
  }

  /**
   * Unbundles a site for a given projectId and versionRangeOrTag.
   * - If versionRangeOrTag is "latest" or undefined, returns the latest
   * revision
   *   - NOTE: not the latest PkgVersion
   * - If versionRangeOrTag is a valid semver range, return the latest
   * PkgVersion that satisfies that range
   * - If versionRangeOrTag is not a valid semver range, assume it's a tag and
   * try to get the latest version that cantains the tag
   * @param bundler
   * @param projectId
   * @param versionRangeOrTag
   */
  async tryGetPkgVersionByProjectVersionOrTag(
    bundler: Bundler,
    projectId: string,
    versionRangeOrTag?: string,
    withModel?: boolean
  ): Promise<{
    version: string;
    pkgVersion: PkgVersion | undefined;
    site: Site;
    model?: string;
    unbundledAs: string;
    revisionNumber: number;
    revisionId: string;
  }> {
    await this.checkProjectPerms(projectId, "viewer", "get");

    // If versionRangeOfTag is a tag, maybe it's a branch name
    const branches = await this.listBranchesForProject(projectId as ProjectId);
    const maybeBranch = branches.find(
      (branch) => branch.name === versionRangeOrTag
    );

    const versionOrTag = versionRangeOrTag ?? "latest";

    // If versionRangeOrTag is a branch name, then we want to get the "latest" of that branch
    if (semver.isLatest(versionOrTag) || maybeBranch) {
      // Only get the PkgVersion for valid non-"latest" version ranges, otherwise use the latest Revision
      const projectRev = await this.getLatestProjectRev(projectId, {
        branchId: maybeBranch?.id,
      });
      const bundle = await getMigratedBundle(projectRev);
      return {
        version: versionOrTag,
        pkgVersion: undefined,
        site: await unbundleProjectFromBundle(this, bundler, {
          projectId,
          bundle,
        }),
        model: withModel ? JSON.stringify(bundle) : undefined,
        unbundledAs: projectRev.projectId,
        revisionNumber: projectRev.revision,
        revisionId: projectRev.id,
      };
    } else {
      const pkg = await this.getPkgByProjectId(projectId);
      assert(!!pkg, "Pkg must exist");
      // If versionOrTag is not a valid version range, assume it's a tag
      const pkgVersion = ensure(
        semver.validRange(versionOrTag)
          ? await this.getPkgVersion(pkg.id, versionOrTag, undefined)
          : await this.getPkgVersion(pkg.id, undefined, versionOrTag),
        "The pkg must have an pkg version"
      );
      // Load the projectRev to look up the revision number and id, but note
      // that projectRev.data may be a very outdated bundle, so careful not
      // to unbundle it!
      const projectRev = await this.tryGetProjectRevById(
        pkg.projectId,
        pkgVersion.revisionId
      );

      const bundle = await getMigratedBundle(pkgVersion);
      return {
        version: pkgVersion.version,
        pkgVersion,
        site: (
          await unbundlePkgVersionFromBundle(this, bundler, pkgVersion, bundle)
        ).site,
        model: withModel ? JSON.stringify(bundle) : undefined,
        unbundledAs: pkgVersion.id,
        revisionNumber: projectRev?.revision ?? -1,
        revisionId: pkgVersion.revisionId,
      };
    }
  }

  async getPlumePkg() {
    return findExactlyOne(this.pkgs(), {
      where: {
        sysname: "plume",
      },
    });
  }

  async getPlumePkgVersionStrings() {
    const pkg = await this.getPlumePkg();
    return await this.getPkgVersionStrings(pkg.id);
  }

  async getPkgVersionStrings(pkgId: string) {
    const versions = await this.pkgVersions()
      .createQueryBuilder()
      .select(["version"])
      .where('"pkgId" = :pkgId')
      .setParameter("pkgId", pkgId)
      .getRawMany();
    return versions.map((v) => v.version);
  }

  async getLatestPlumePkgVersion() {
    const pkg = await this.getPlumePkg();
    return ensure(
      await this.getPkgVersion(pkg.id),
      "The plume pkg version must exist"
    );
  }

  async getPlumePkgVersion() {
    const pkg = await this.getPlumePkg();
    return ensure(
      await this.getPkgVersion(pkg.id, REAL_PLUME_VERSION),
      "The plume pkg version must exist"
    );
  }

  async insertPkgVersion(
    pkgId: string,
    version: string,
    model: string,
    tags: string[],
    description: string,
    revisionNum: number,
    branchId?: BranchId,
    id?: string
  ) {
    await this.checkPkgPerms(pkgId, "content", "publish");

    const pkg = await this.getPkgById(pkgId);
    const pkgVersion = this.pkgVersions().create({
      ...this.stampNew(),
      pkg,
      version,
      model,
      modelLength: model.length,
      tags,
      description,
      ...(id ? { id } : {}),
      ...(branchId ? { branchId } : {}),
    });

    const project = await this.getProjectById(pkg.projectId);
    _.merge(pkgVersion, { hostUrl: project.hostUrl });
    const revision = await this.getProjectRevision(pkg.projectId, revisionNum);
    _.merge(pkgVersion, { project, revisionId: revision.id });

    await this.entMgr.save(pkgVersion);
    return pkgVersion;
  }

  /**
   * Overwrites the content of a PkgVersion.
   * Note: This is primarily intended for migrations; you probably want to use
   * insertPkgVersion instead!
   * - If the user is triggering this, be sure to limit what can be modified
   */
  async updatePkgVersion(
    pkgId: string,
    version: string,
    branchId: BranchId | null,
    toMerge: Partial<PkgVersion>
  ): Promise<PkgVersion> {
    await this.checkPkgPerms(pkgId, "content", "publish");

    const pkgVersion = await findExactlyOne(this.pkgVersions(), {
      where: { pkgId, version, branchId: branchId ?? IsNull() },
    });
    mergeSane(pkgVersion, this.stampUpdate(), toMerge);
    await this.entMgr.save(pkgVersion);
    return pkgVersion;
  }

  /** Sorts in ascending order */
  async listPkgVersions(
    pkgId: string,
    opts: {
      includeData?: boolean;
      branchId?: BranchId;
      unfiltered?: boolean;
    } = {}
  ) {
    await this.checkPkgPerms(pkgId, "viewer", "get");
    const { branchId, unfiltered } = opts;
    return (await this.listPkgVersionsRaw(pkgId, opts))
      .filter((pkgVersion) => unfiltered || pkgVersion.branchId == branchId)
      .sort((a, b) => (semver.gt(a.version, b.version) ? -1 : +1));
  }

  private async listPkgVersionsRaw(
    pkgId: string,
    opts: { includeData?: boolean; branchId?: BranchId } = {}
  ) {
    await this.checkPkgPerms(pkgId, "viewer", "get");
    const columns = this.entMgr.connection
      .getMetadata(PkgVersion)
      .columns.map((c) => `pkgVersion.${c.databaseName}`);

    if (!opts.includeData) {
      removeFromArray(columns, "pkgVersion.model");
    }

    const qb = this.pkgVersions()
      .createQueryBuilder("pkgVersion")
      .select(columns)
      .leftJoinAndSelect("pkgVersion.pkg", "pkg")
      .leftJoinAndSelect("pkgVersion.branch", "branch")
      .where("pkgVersion.pkgId = :pkgId", { pkgId })
      .andWhere("pkgVersion.deletedAt is null");
    return await qb.printSql().getMany();
  }

  //
  // Project webhooks.
  //

  async createProjectWebhook({
    projectId,
    method,
    url,
    headers,
    payload,
  }: {
    projectId: string;
    method: string;
    url: string;
    headers: Array<WebhookHeader>;
    payload: string;
  }) {
    await this.checkProjectPerms(projectId, "designer", "create webhook");
    const webhook = this.entMgr.create(ProjectWebhook, {
      ...this.stampNew(),
      project: { id: projectId },
      method,
      url,
      headers,
      payload,
    });
    await this.entMgr.save(webhook);
    return webhook;
  }

  private async getProjectWebhookById(id: string) {
    return ensureFound<ProjectWebhook>(
      await this.projectWebhooks().findOne({
        where: { id },
      }),
      `Webhook with ID ${id}`
    );
  }

  async updateProjectWebhook({
    id,
    ...fields
  }: { id: string } & Partial<UpdatableWebhookFields>) {
    const webhook = await this.getProjectWebhookById(id);
    await this.checkProjectPerms(
      webhook.projectId,
      "designer",
      "update webhook"
    );
    fields = _.pick(fields, updatableWebhookFields);

    mergeSane(webhook, this.stampUpdate(), fields);

    // Overwrite headers because mergeAllowEmpty behavior for that array is
    // not what we want.
    if (fields.headers) {
      webhook.headers = fields.headers;
    }

    await this.entMgr.save(webhook);
    return webhook;
  }

  async permanentlyDeleteProjectWebhook(id: string) {
    const webhook = await this.getProjectWebhookById(id);
    await this.checkProjectPerms(
      webhook.projectId,
      "designer",
      "delete webhook"
    );
    return await this.projectWebhooks().delete(webhook.id);
  }

  async listProjectWebhooks(projectId: string) {
    await this.checkProjectPerms(projectId, "content", "list webhooks");
    const webhooks = await this.projectWebhooks().find({
      where: { projectId },
      order: {
        createdAt: "ASC",
      },
    });
    return webhooks;
  }

  async createProjectWebhookEvent({
    projectId,
    method,
    url,
    status,
    response,
  }: {
    projectId: string;
    method: string;
    url: string;
    status: number;
    response: string;
  }) {
    const event = this.entMgr.create(ProjectWebhookEvent, {
      ...this.stampNew(),
      project: { id: projectId },
      method,
      url,
      status,
      response,
    });
    await this.entMgr.save(event);
    return event;
  }

  async listLastProjectWebhookEvents(projectId: string, limit: number) {
    await this.checkProjectPerms(projectId, "content", "view webhook logs");
    const events = await this.projectWebhookEvents().find({
      where: { projectId },
      order: {
        createdAt: "DESC",
      },
      take: limit,
    });
    return events;
  }

  //
  // Project repositories.
  //

  async getProjectRepositoryById(id: string, includeDeleted = false) {
    const repository = ensureFound<ProjectRepository>(
      await this.projectRepositories().findOne({
        where: { id, ...maybeIncludeDeleted(includeDeleted) },
        relations: ["project"],
      }),
      `Project repository with ID ${id}`
    );
    await this.checkProjectPerms(
      repository.projectId,
      "content",
      "get project repository"
    );
    return repository;
  }

  async listProjectRepositories(projectId: string) {
    await this.checkProjectPerms(
      projectId,
      "content",
      "get project repositories"
    );
    const repositories = await this.projectRepositories().find({
      where: { projectId, ...excludeDeleted() },
      relations: ["project"],
    });
    return repositories;
  }

  async createProjectRepository(fields: {
    projectId: string;
    installationId: number;
    repository: string;
    directory: string;
    defaultAction: GitSyncAction;
    defaultBranch: string;
    platform: GitSyncPlatform;
    scheme: GitSyncScheme;
    language: GitSyncLanguage;
    cachedCname?: string;
    publish: boolean;
    createdByPlasmic: boolean;
  }) {
    this.checkNormalUser();

    await this.checkProjectPerms(
      fields.projectId,
      "editor",
      "add project repository"
    );

    const repository = this.entMgr.create(ProjectRepository, {
      ...this.stampNew(),
      project: { id: fields.projectId },
      user: {
        id: ensure(
          this.tryGetNormalActorId(),
          "All normal users should have an actor id"
        ),
      },
      ..._.pick(
        fields,
        "installationId",
        "repository",
        "directory",
        "defaultAction",
        "defaultBranch",
        "platform",
        "scheme",
        "language",
        "cachedCname",
        "publish",
        "createdByPlasmic"
      ),
    });
    await this.entMgr.save(repository);
    return repository;
  }

  async updateProjectRepository({
    id,
    ...fields
  }: {
    id: string;
    cachedCname?: string;
  }) {
    fields = _.pick(fields, updatableProjectRepositoryFields);
    const pr = await this.getProjectRepositoryById(id);
    assignAllowEmpty(pr, this.stampUpdate(), fields);
    return await this.entMgr.save(pr);
  }

  async deleteProjectRepository(id: string) {
    const repository = await this.getProjectRepositoryById(id);
    await this.checkProjectPerms(
      repository.projectId,
      "editor",
      "delete project repository"
    );
    Object.assign(repository, this.stampDelete());
    await this.entMgr.save(repository);
  }

  async permanentlyDeleteProjectRepository(repository: ProjectRepository) {
    await this.checkProjectPerms(
      repository.projectId,
      "editor",
      "delete project repository"
    );
    return await this.projectRepositories().delete(repository.id);
  }

  //
  // Bundle backups.
  //

  async saveBundleBackups(
    migrationName: string,
    projectIdsAndPkgVersionIds?: Set<string>
  ) {
    this.checkSuperUser();
    assert(!migrationName.includes("'"), "Migration name can't have '");

    let revs = await this.projectRevs()
      .createQueryBuilder("rev")
      .select(["rev.id", "rev.projectId", "rev.branchId"])
      .innerJoin(
        (qb) => {
          const subQuery = qb
            .subQuery()
            .select([
              "sub.projectId AS projectId",
              "sub.branchId AS branchId",
              "MAX(sub.revision) AS revision",
            ])
            .from(ProjectRevision, "sub")
            .leftJoin(Project, "project", "project.id = sub.projectId")
            .where("sub.deletedAt IS NULL")
            .andWhere("project.deletedAt IS NULL")
            .groupBy("sub.projectId")
            .addGroupBy("sub.branchId");
          return subQuery;
        },
        "num",
        "rev.projectId = num.projectId AND rev.revision = num.revision AND rev.branchId = num.branchId"
      )
      .getMany();
    if (projectIdsAndPkgVersionIds && projectIdsAndPkgVersionIds.size > 0) {
      revs = revs.filter((rev) =>
        projectIdsAndPkgVersionIds.has(rev.projectId)
      );
    }
    await this.bundleBackups()
      .createQueryBuilder()
      .insert()
      .values(
        revs.map((rev) => ({
          ...this.stampNew(),
          migrationName,
          rowType: "ProjectRevision",
          projectRevisionId: rev.id,
          projectId: rev.projectId,
          branchId: rev.branchId,
          data: () =>
            `(SELECT data FROM project_revision WHERE id = '${rev.id}')`,
        }))
      )
      .execute();

    let pkgvs = await this.listAllPkgVersionIds();
    if (projectIdsAndPkgVersionIds && projectIdsAndPkgVersionIds.size > 0) {
      pkgvs = pkgvs.filter((pkgVersion) =>
        projectIdsAndPkgVersionIds.has(pkgVersion.id)
      );
    }
    await this.bundleBackups()
      .createQueryBuilder()
      .insert()
      .values(
        pkgvs.map((pkgv) => ({
          ...this.stampNew(),
          migrationName,
          rowType: "PkgVersion",
          pkgVersionId: pkgv.id,
          data: () => `(SELECT model FROM pkg_version WHERE id = '${pkgv.id}')`,
        }))
      )
      .execute();
  }

  async restoreBundleBackups(migrationName: string) {
    this.checkSuperUser();
    assert(!migrationName.includes("'"), "Migration name can't have '");

    const revBkps = await this.bundleBackups().find({
      select: ["projectRevisionId"],
      where: {
        migrationName,
        rowType: "ProjectRevision",
        ...excludeDeleted(),
      },
    });
    await this.projectRevs()
      .createQueryBuilder()
      .update()
      .set({
        data: () =>
          `(SELECT data FROM bundle_backup
            WHERE "migrationName" = '${migrationName}'
            AND "deletedAt" IS NULL
            AND "projectRevisionId" = "project_revision"."id"
            ORDER BY "bundle_backup"."createdAt" DESC
            LIMIT 1)`,
      })
      .whereInIds(revBkps.map((bb) => bb.projectRevisionId))
      .execute();

    const pkgvBkps = await this.bundleBackups().find({
      select: ["pkgVersionId"],
      where: { migrationName, rowType: "PkgVersion" },
    });
    await this.pkgVersions()
      .createQueryBuilder()
      .update()
      .set({
        model: () =>
          `(SELECT data FROM bundle_backup
            WHERE "migrationName" = '${migrationName}'
            AND "deletedAt" IS NULL
            AND "pkgVersionId" = "pkg_version"."id"
            ORDER BY "bundle_backup"."createdAt" DESC
            LIMIT 1)`,
      })
      .whereInIds(pkgvBkps.map((bb) => bb.pkgVersionId))
      .execute();

    await this.bundleBackups()
      .createQueryBuilder()
      .update()
      .set(this.stampDelete())
      .where('"migrationName" = :migrationName', { migrationName })
      .andWhere("deletedAt IS NULL")
      .execute();
  }

  async saveBundleBackupForEntity(
    migrationName: string,
    entity: PkgVersion | ProjectRevision,
    data: string
  ) {
    const insertData: Record<string, string> = {};
    if (entity instanceof PkgVersion) {
      insertData.rowType = "PkgVersion";
      insertData.pkgVersionId = entity.id;
    }
    if (entity instanceof ProjectRevision) {
      insertData.rowType = "ProjectRevision";
      insertData.projectRevisionId = entity.id;
      insertData.projectId = entity.projectId;
    }

    await this.bundleBackups()
      .createQueryBuilder()
      .insert()
      .values([
        {
          ...this.stampNew(),
          ...insertData,
          migrationName,
          data,
        },
      ])
      .execute();
  }

  async getBundleBackupForEntity(
    entity: PkgVersion | ProjectRevision,
    backupName: string
  ) {
    let query = this.bundleBackups()
      .createQueryBuilder()
      .limit(1)
      .orderBy('"createdAt"', "DESC")
      .where('"deletedAt" is null and "migrationName" = :backupName', {
        backupName,
      });

    if (entity instanceof PkgVersion) {
      query = query.andWhere('"pkgVersionId" = :pkgVersionId', {
        pkgVersionId: entity.id,
      });
    }
    if (entity instanceof ProjectRevision) {
      query = query.andWhere('"projectId" = :projectId', {
        projectId: entity.projectId,
      });
    }
    return getOneOrFailIfTooMany(query);
  }

  async getEntityIdsFromBundleBackupsByMigration(migrationName: string) {
    return [
      ...(await this.bundleBackups()
        .find({
          where: {
            deletedAt: IsNull(),
            rowType: "ProjectRevision",
            migrationName,
          },
          select: ["projectId"],
        })
        .then((backups) =>
          uniq(backups.map((backup) => backup.projectId)).map((projectId) => ({
            projectId,
            pkgVersionId: undefined,
          }))
        )),
      ...(await this.bundleBackups()
        .find({
          where: {
            deletedAt: IsNull(),
            rowType: "PkgVersion",
            migrationName,
          },
          select: ["pkgVersionId"],
        })
        .then((backups) =>
          uniq(backups.map((backup) => backup.pkgVersionId)).map(
            (pkgVersionId) => ({
              projectId: undefined,
              pkgVersionId,
            })
          )
        )),
    ];
  }

  pruneOldBundleBackups() {
    return this.getEntMgr().query(`
      DELETE FROM bundle_backup
      WHERE
        "createdAt" < NOW() - INTERVAL '15 DAYS' AND
        "updatedAt" < NOW() - INTERVAL '15 DAYS'
    `);
  }

  //
  // Token methods.
  //

  async tryGetOauthToken(userId: string, provider: OauthTokenProvider) {
    this.checkSuperUser();
    return this.oauthTokens().findOne({
      where: { user: { id: userId }, provider },
    });
  }

  async getOauthTokenById(id: string) {
    this.checkSuperUser();
    return this.oauthTokens().findOne(id);
  }

  async refreshOauthTokenById(id: string, token: TokenData) {
    this.checkSuperUser();
    return this.oauthTokens().update(id, {
      token: token,
      updatedAt: new Date(),
    });
  }

  async getUserTokenProviders() {
    const userId = this.checkNormalUser();
    return this.oauthTokens().find({
      select: ["id", "provider"],
      where: { user: { id: userId } },
    });
  }

  async upsertOauthToken(
    userId: string,
    provider: OauthTokenProvider,
    token: TokenData,
    userInfo: {},
    ssoConfigId?: SsoConfigId
  ) {
    this.checkSuperUser();
    return await this.upsertOauthTokenBase(
      this.tryGetOauthToken(userId, provider),
      this.oauthTokens(),
      { user: { id: userId } },
      provider,
      userInfo,
      token,
      ssoConfigId
    );
  }

  private async upsertOauthTokenBase<T extends OauthTokenBase>(
    tryGetTokenPromise: Promise<T | undefined>,
    tokensRepo: Repository<T>,
    extraFields: DeepPartial<T>,
    provider: OauthTokenProvider,
    userInfo: {},
    token: TokenData,
    ssoConfigId?: SsoConfigId
  ) {
    const oauthToken =
      (await tryGetTokenPromise) ||
      tokensRepo.create({
        ...this.stampNew(),
        ...extraFields,
        provider,
        userInfo,
        token,
        ssoConfigId,
      });
    oauthToken.token = token;
    oauthToken.userInfo = userInfo;
    oauthToken.ssoConfigId = ssoConfigId ?? null;
    await this.entMgr.save(oauthToken);
    return oauthToken;
  }

  //
  // SSO
  //
  async getSsoConfigByDomain(domain: string) {
    // Explicitly not checking permission, as this is used in login flow
    return await this.ssoConfigs().findOne({
      where: {
        domains: Includes(domain),
      },
    });
  }

  async getSsoConfigByTenantId(tenantId: string) {
    // Explicitly not checking permission, as this is used in login flow
    return await this.ssoConfigs().findOne({
      where: {
        tenantId,
      },
    });
  }

  async getSsoConfigByTeam(teamId: TeamId) {
    await this.checkTeamPerms(teamId, "viewer", "read");
    return await this.ssoConfigs().findOne({
      where: { teamId },
    });
  }

  async upsertSsoConfig(opts: {
    teamId: TeamId;
    domains: string[];
    ssoType: "oidc";
    provider: KnownProvider;
    config: any;
    whitelabelConfig: any;
  }) {
    await this.checkTeamPerms(opts.teamId, "owner", "write");
    let sso = await this.getSsoConfigByTeam(opts.teamId);
    if (sso) {
      assignAllowEmpty(sso, this.stampUpdate(), {
        domains: opts.domains,
        ssoType: opts.ssoType,
        provider: opts.provider,
        config: opts.config,
        whitelabelConfig: opts.whitelabelConfig,
      });
    } else {
      sso = this.ssoConfigs().create({
        ...this.stampNew(),
        teamId: opts.teamId,
        domains: opts.domains,
        ssoType: opts.ssoType,
        provider: opts.provider,
        tenantId: generateId(),
        config: opts.config,
        whitelabelConfig: opts.whitelabelConfig,
      });
    }
    await this.entMgr.save(sso);
    return sso;
  }

  //
  // Permission methods.
  //
  // And general "resource" methods. (Teams and workspaces and projects.)
  //

  private async getPermissionsForResources(
    taggedResourceIds: TaggedResourceIds,
    directOnly: boolean,
    whereClause?: FindConditions<Permission>
  ): Promise<Permission[]> {
    await this._checkResourcesPerms(
      taggedResourceIds,
      "viewer",
      "list permissions for"
    );

    const resourceIds = [...taggedResourceIds.ids];

    if (resourceIds.length === 0) {
      return [];
    }

    if (this.actor.type === "AnonUser") {
      return this.permissions()
        .createQueryBuilder("perm")
        .leftJoinAndSelect("perm.user", "u")
        .where({
          [taggedResourceIds.type]: { id: In(resourceIds) },
          ...excludeDeleted(),
          ...(whereClause ? whereClause : {}),
        })
        .getMany();
    }

    const userId =
      this.actor.type === "SuperUser" ? undefined : this.checkNormalUser();

    if (taggedResourceIds.type === "team") {
      resourceIds.push(
        ...(await await this.getParentTeamIds(resourceIds as TeamId[]))
      );
    }

    let qb = this.permissions()
      .createQueryBuilder("perm")
      .leftJoinAndSelect("perm.user", "u")
      .where({
        [taggedResourceIds.type]: { id: In(resourceIds) },
        ...excludeDeleted(),
        ...(whereClause ? whereClause : {}),
      });

    if (!directOnly) {
      if (taggedResourceIds.type === "project") {
        let workspaceQb = this.entMgr
          .createQueryBuilder()
          .select("p.workspaceId", "workspaceId")
          .from(Project, "p")
          .innerJoin("p.workspace", "w")
          .where(`p.id IN (:...ids)`, { ids: resourceIds });
        if (userId) {
          workspaceQb = workspaceQb
            .innerJoin(
              Permission,
              "subperm",
              `subperm.workspaceId = p.workspaceId or subperm.teamId = w.teamId`
            )
            .andWhere(
              `
                subperm.userId = :userId
                and subperm.accessLevel <> 'blocked'
                and subperm.deletedAt is null
              `,
              { userId }
            );
        }
        // We check using an IN check with fetched workspaceIds, instead
        // of using a subquery, because postgres query planner does a
        // bad job of estimating how selective these joined subqueries
        // will be and uses a sequential scan instead of index scans.
        const workspaceIds = (
          await workspaceQb.setParameters(qb.getParameters()).getRawMany()
        ).map((r) => r.workspaceId);
        if (workspaceIds.length > 0) {
          qb = qb
            .orWhere(
              `perm.deletedAt is null and perm.workspaceId in (:...workspaceIds)`
            )
            .setParameter("workspaceIds", workspaceIds);
        }

        let teamQb = this.entMgr
          .createQueryBuilder()
          .select("t.id", "teamId")
          .addSelect("t.parentTeamId", "parentTeamId")
          .from(Project, "p")
          .innerJoin("p.workspace", "w")
          .innerJoin("w.team", "t")
          .where(`p.id IN (:...ids)`, { ids: resourceIds });
        if (userId) {
          teamQb = teamQb
            .innerJoin(
              Permission,
              "subperm",
              `subperm.teamId = t.id or subperm.teamId = t.parentTeamId`
            )
            .andWhere(
              `
                subperm.userId = :userId
                and subperm.accessLevel <> 'blocked'
                and subperm.deletedAt is null
              `,
              { userId }
            );
        }
        const teamIds = withoutNils(
          (await teamQb.setParameters(qb.getParameters()).getRawMany()).flatMap(
            (r) => [r.teamId, r.parentTeamId]
          )
        );
        if (teamIds.length > 0) {
          qb = qb
            .orWhere(`perm.deletedAt is null and perm.teamId in (:...teamId)`)
            .setParameter("teamId", teamIds);
        }
      } else if (taggedResourceIds.type === "workspace") {
        let teamQb = this.entMgr
          .createQueryBuilder()
          .select("t.id", "teamId")
          .addSelect("t.parentTeamId", "parentTeamId")
          .from(Workspace, "w")
          .innerJoin("w.team", "t")
          .where(`w.id IN (:...ids)`, { ids: resourceIds });
        if (userId) {
          teamQb = teamQb
            .innerJoin(
              Permission,
              "subperm",
              `subperm.teamId = t.id or subperm.teamId = t.parentTeamId`
            )
            .andWhere(
              `
                subperm.userId = :userId
                and subperm.accessLevel <> 'blocked'
                and subperm.deletedAt is null
              `,
              { userId }
            );
        }
        const result = await teamQb
          .setParameters(qb.getParameters())
          .getRawMany();
        const teamIds = withoutNils(
          result.flatMap((r) => [r.teamId, r.parentTeamId])
        );
        if (teamIds.length > 0) {
          qb = qb
            .orWhere(`perm.deletedAt is null and perm.teamId in (:...teamId)`)
            .setParameter("teamId", teamIds);
        }
      }
    }
    return qb.getMany();
  }

  private async _assignResourceOwner(
    taggedResourceId: TaggedResourceId,
    userId: UserId
  ) {
    this.checkSuperUser();
    const user = await this.getUserById(userId);
    const perms = await this.getPermissionsForResources(
      pluralizeResourceId(taggedResourceId),
      true
    );

    // There should only be one owner, so remove existing owner
    const ownerPerms = perms.filter((perm) => perm.accessLevel === "owner");
    if (ownerPerms.some((owner) => owner.userId === userId)) {
      // already done!
      return;
    }
    for (const ownerPerm of ownerPerms) {
      mergeSane(ownerPerm, this.stampDelete());
    }
    await this.entMgr.save(ownerPerms);

    // Finally grant permission to new owner
    await this.grantResourcesPermissionByEmail(
      pluralizeResourceId(taggedResourceId),
      user.email,
      {
        force: "owner",
      }
    );
  }

  private async _getResourcesById(
    taggedResourceIds: TaggedResourceIds,
    includeDeleted?: boolean
  ) {
    return taggedResourceIds.type === "project"
      ? await this.getProjectsById(taggedResourceIds.ids, includeDeleted)
      : taggedResourceIds.type === "workspace"
      ? await this.getWorkspacesById(taggedResourceIds.ids, includeDeleted)
      : await this.getTeamsById(taggedResourceIds.ids, includeDeleted);
  }

  /**
   * Returns the accessLevel, owner if superuser, or blocked if no permission
   * was found.
   */
  private async _getActorAccessLevelToResource(
    resource: Resource,
    addPerm = false
  ): Promise<AccessLevel> {
    const resourceType: ResourceType =
      resource instanceof Team
        ? "team"
        : resource instanceof Workspace
        ? "workspace"
        : "project";
    const levels = await this._getActorAccessLevelToResources(
      pluralizeResourceId(createTaggedResourceId(resourceType, resource.id)),
      addPerm
    );
    return ensure(
      levels[resource.id],
      `Must have access level to given resource.`
    );
  }

  private async _getActorAccessLevelToResources(
    taggedResourceIds: TaggedResourceIds,
    addPerms = false
  ): Promise<Record<string, AccessLevel>> {
    if (this.actor.type === "SuperUser") {
      return Object.fromEntries(
        taggedResourceIds.ids.map((id: ResourceId) => [id, "owner"])
      );
    }

    const levels: Record<string, AccessLevel> = Object.fromEntries(
      taggedResourceIds.ids.map((id: ResourceId) => [id, "blocked"])
    );

    const resources = await this.sudo()._getResourcesById(
      taggedResourceIds,
      true
    );

    if (taggedResourceIds.type === "project") {
      const projects = resources as Project[];
      for (const project of projects) {
        if (this.actor.type !== "AnonUser" && !project.inviteOnly) {
          // When using "admin login-as", do not grant default access
          // level if the logged-in-as person doesn't have access.
          // This avoids accidentally adding access to the person we
          // logged in as.
          levels[project.id] = project.defaultAccessLevel;
        } else if (project.readableByPublic) {
          levels[project.id] = "viewer";
        } else if (
          this.projectIdsAndTokens?.find(
            (p) =>
              p.projectId === project.id &&
              p.projectApiToken === project.projectApiToken
          )
        ) {
          levels[project.id] = "viewer";
        } else if (
          this.projectIdsAndTokens?.find(
            (p) =>
              p.projectId === project.id &&
              p.projectApiToken === project.secretApiToken
          )
        ) {
          levels[project.id] = "editor";
        }
      }
    }

    if (this.actor.type === "NormalUser") {
      const userId = this.checkNormalUser();
      const user = await this.getUserById(userId);
      const isAdmin = isAdminTeamEmail(user.email, DEVFLAGS);

      const allPerms = (
        await this.sudo().getPermissionsForResources(taggedResourceIds, false)
      ).filter((p) => p.userId === userId);

      for (const resource of resources) {
        const resourcePerms =
          taggedResourceIds.type === "team"
            ? allPerms.filter(
                (p) =>
                  p.teamId === resource.id ||
                  p.teamId === (resource as Team).parentTeamId
              )
            : taggedResourceIds.type === "workspace"
            ? allPerms.filter(
                (p) =>
                  p.workspaceId === resource.id ||
                  p.teamId === (resource as Workspace).team.id ||
                  p.teamId === (resource as Workspace).team.parentTeamId
              )
            : allPerms.filter(
                (p) =>
                  p.projectId === resource.id ||
                  p.workspaceId === (resource as Project).workspace?.id ||
                  p.teamId === (resource as Project).workspace?.team.id ||
                  p.teamId ===
                    (resource as Project).workspace?.team.parentTeamId
              );

        const maxFromPerms = _.maxBy(
          resourcePerms.map((p) => p.accessLevel),
          (lvl) => accessLevelRank(lvl)
        );
        if (
          taggedResourceIds.type === "project" &&
          addPerms &&
          !isAdmin &&
          // Don't automatically update permission if acting as spy
          !this.actor.isSpy &&
          (!maxFromPerms ||
            accessLevelRank(levels[resource.id]) >
              accessLevelRank(maxFromPerms))
        ) {
          // Persist permission upgrade.
          const perm =
            resourcePerms.find((p) => p.projectId === resource.id) ||
            this.permissions().create({
              ...this.stampNew(),
              user: { id: userId },
              project: resource as Project,
            });
          perm.accessLevel = levels[resource.id];
          await this.entMgr.save(perm);
        }

        levels[resource.id] = ensure(
          _.maxBy(
            [
              levels[resource.id],
              ...(maxFromPerms ? [maxFromPerms] : []),
              ...(isAdmin ? ["editor" as AccessLevel] : []),
            ],
            (lvl) => accessLevelRank(lvl)
          ),
          "List of access levels must be nonempty and have a max"
        );
      }
    } else if (this.actor.type === "TeamApiUser") {
      const teamId = this.checkTeamApiUser();
      for (const resource of resources) {
        if (resource instanceof Team) {
          levels[resource.id] = resource.id === teamId ? "owner" : "blocked";
        } else if (resource instanceof Workspace) {
          levels[resource.id] =
            resource.teamId === teamId ? "owner" : "blocked";
        } else if (resource instanceof Project) {
          if (!resource.workspaceId) {
            levels[resource.id] = "blocked";
          } else {
            const workspace =
              resource.workspace ??
              (await this.getWorkspaceById(resource.workspaceId));
            levels[resource.id] =
              workspace.teamId === teamId ? "owner" : "blocked";
          }
        }
      }
    }

    return levels;
  }

  private async _getActorAccessLevelToResourceById(
    taggedResourceId: TaggedResourceId
  ) {
    const resource = await this._getResourceById(taggedResourceId);
    const selfLevel = await this._getActorAccessLevelToResource(resource);
    return selfLevel;
  }

  /**
   * Memoized on taggedResourceId, requireLevel and includeDeleted.
   */
  private _checkResourcePerms = _.memoize(
    async (
      taggedResourceId: TaggedResourceId,
      requireLevel: AccessLevel,
      action: string,
      includeDeleted = false
    ) => {
      return await this._checkResourcesPerms(
        pluralizeResourceId(taggedResourceId),
        requireLevel,
        action,
        includeDeleted
      );
    },
    (taggedResourceId, requireLevel, _action, includeDeleted) =>
      JSON.stringify([taggedResourceId, requireLevel, includeDeleted])
  );

  private async _checkResourcesPerms(
    taggedResourceIds: TaggedResourceIds,
    requireLevel: AccessLevel,
    action: string,
    _includeDeleted = false
  ) {
    const levels = await this._getActorAccessLevelToResources(
      taggedResourceIds
    );

    const actor = await this.describeActor();
    for (const id of taggedResourceIds.ids) {
      checkPermissions(
        !!levels[id] &&
          accessLevelRank(levels[id]) >= accessLevelRank(requireLevel),
        `${actor} tried to ${action} ${
          taggedResourceIds.type === "team"
            ? ORGANIZATION_LOWER
            : taggedResourceIds.type
        } ${id}, but their access level ${humanLevel(
          levels[id]
        )} didn't meet required level ${humanLevel(requireLevel)}.`
      );
    }
  }

  async getPermissionsForProject(projectId: string): Promise<Permission[]> {
    return this.getPermissionsForProjects([projectId]);
  }

  private async _getPermissionsForRawEmail(email: string) {
    return this.permissions()
      .createQueryBuilder("permissions")
      .where(`lower(permissions.email) = lower(:email)`, { email })
      .andWhere("permissions.deletedAt is null")
      .getMany();
  }

  async revokeProjectPermissionsByEmails(
    projectId: string,
    emails: string[],
    ignoreOwnerCheck?: boolean
  ) {
    await this.revokeResourcesPermissionsByEmail(
      { type: "project", ids: [projectId] },
      emails,
      ignoreOwnerCheck
    );
  }

  async revokeResourcesPermissionsByEmail(
    taggedResourceIds: TaggedResourceIds,
    emails: string[],
    ignoreOwnerCheck?: boolean
  ) {
    await this._checkResourcesPerms(
      taggedResourceIds,
      "editor",
      "revoke permission on"
    );
    const emailSet = new Set(emails.map((e) => e.toLowerCase()));
    const perms = await this.getPermissionsForResources(
      taggedResourceIds,
      true
    );
    for (const perm of perms) {
      if (
        (perm.user && emailSet.has(perm.user.email.toLowerCase())) ||
        (perm.email && emailSet.has(perm.email.toLowerCase()))
      ) {
        // If `ignoreOwnerCheck` is not set, don't allow revoking owner
        // permission.
        if (!ignoreOwnerCheck && perm.accessLevel === "owner") {
          throw new BadRequestError("Cannot revoke permission from owner");
        }
        mergeSane(perm, this.stampDelete());
      }
    }
    await this.entMgr.save(perms);
  }

  async grantProjectPermissionByEmail(
    projectId: string,
    email: string,
    rawLevelToGrant: GrantableAccessLevel
  ) {
    return await this.grantResourcesPermissionByEmail(
      {
        type: "project",
        ids: [projectId],
      },
      email,
      rawLevelToGrant
    );
  }

  private async _getResourceById(
    taggedResourceId: TaggedResourceId,
    includeDeleted = false
  ): Promise<Resource> {
    switch (taggedResourceId.type) {
      case "team":
        return this.getTeamById(taggedResourceId.id, includeDeleted);
      case "workspace":
        return this.getWorkspaceById(taggedResourceId.id, includeDeleted);
      case "project":
        return this.getProjectById(taggedResourceId.id, includeDeleted);
    }
  }

  async _deleteResource(taggedResourceId: TaggedResourceId): Promise<void> {
    await this._checkResourcePerms(taggedResourceId, "owner", "delete");
    const resource = await this._getResourceById(taggedResourceId);
    Object.assign(resource, this.stampDelete());
    await this.entMgr.save(resource);
  }

  async _restoreResource(taggedResourceId: TaggedResourceId): Promise<void> {
    await this._checkResourcePerms(taggedResourceId, "owner", "restore", true);
    const resource = await this._getResourceById(taggedResourceId, true);
    Object.assign(resource, this.stampUndelete());
    await this.entMgr.save(resource);
  }

  private async grantTeamPermissionToUser(
    team: Team,
    userId: UserId,
    levelToGrant: GrantableAccessLevel
  ) {
    checkPermissions(
      this.actor.type !== "AnonUser",
      `Cannot add anon user to team`
    );
    if (this.actor.type === "NormalUser") {
      checkPermissions(
        userId === this.actor.userId,
        `Can only add self to team`
      );
    } else if (this.actor.type === "TeamApiUser") {
      const user_ = await this.sudo().getUserById(userId);
      checkPermissions(
        user_.owningTeamId === team.id,
        `Can only add users owned by team to team`
      );
    } else if (this.actor.type === "SuperUser") {
      // All good
    } else {
      unreachable(this.actor);
    }

    const user = await this.getUserById(userId);
    const existingPerm = await this.permissions().findOne({
      where: {
        team,
        user,
        ...excludeDeleted(),
      },
    });
    if (
      !existingPerm ||
      accessLevelRank(levelToGrant) > accessLevelRank(existingPerm.accessLevel)
    ) {
      const perm =
        existingPerm ||
        this.permissions().create({
          ...this.stampNew(),
          user,
          team,
        });
      perm.accessLevel = levelToGrant;
      await this.entMgr.save(perm);
    }
  }

  async grantTeamPermissionToSelf(
    team: Team,
    levelToGrant: GrantableAccessLevel
  ) {
    const userId = this.checkNormalUser();
    return await this.grantTeamPermissionToUser(team, userId, levelToGrant);
  }

  async grantResourcesPermissionByEmail(
    taggedResourceIds: TaggedResourceIds,
    email: string,
    rawLevelToGrant: GrantableAccessLevel | ForcedAccessLevel,
    grantExistingUsersOnly?: boolean
  ) {
    await this._checkResourcesPerms(
      taggedResourceIds,
      "commenter",
      "grant permission"
    );

    email = email.toLowerCase();

    const levelToGrant = isForcedAccessLevel(rawLevelToGrant)
      ? rawLevelToGrant.force
      : ensureGrantableAccessLevel(rawLevelToGrant);
    return this.grantResourcesPermission(
      taggedResourceIds,
      email,
      levelToGrant,
      grantExistingUsersOnly
    );
  }

  private async grantResourcesPermission(
    taggedResourceIds: TaggedResourceIds,
    email: string,
    levelToGrant: AccessLevel,
    grantExistingUsersOnly?: boolean
  ) {
    const user = await this.tryGetUserByEmail(email);
    if (!user && grantExistingUsersOnly) {
      throw new GrantUserNotFoundError();
    }
    const existingPerms = await this.getPermissionsForResources(
      taggedResourceIds,
      true,
      user ? { user } : { email }
    );

    const resourcesAccessLevel = await this._getActorAccessLevelToResources(
      taggedResourceIds
    );
    await this.checkGrantAccessPermission(
      taggedResourceIds.type,
      user,
      email,
      levelToGrant,
      existingPerms,
      resourcesAccessLevel
    );

    let createdPerm = false;

    const addedResourceSet = new Set<string>();

    if (existingPerms.length > 0) {
      existingPerms.forEach(async (perm) => {
        const resourceId = ensureResourceIdFromPermission(perm);
        addedResourceSet.add(resourceId);
        const selfLevel = resourcesAccessLevel[resourceId];
        checkPermissions(
          accessLevelRank(perm.accessLevel) <= accessLevelRank(selfLevel),
          `${await this.describeActor()} with access level tried to set permissions for ${email} who already has ${
            perm.accessLevel
          } on ${taggedResourceIds.type} ${resourceId}`
        );
      });
      existingPerms.forEach((perm) =>
        mergeSane(perm, this.stampUpdate(), {
          accessLevel: levelToGrant,
        })
      );
      await this.entMgr.save(existingPerms);
      createdPerm = true;
    }
    const perms = taggedResourceIds.ids
      .filter((id) => !addedResourceSet.has(id))
      .map((id) => {
        return this.permissions().create({
          ...this.stampNew(),
          ...(user ? { user } : { email }),
          [taggedResourceIds.type]: { id: id },
          accessLevel: levelToGrant,
        });
      });
    await this.entMgr.save(perms);

    return { created: createdPerm };
  }

  /**
   * Do not allow the grant to happen if:
   * 1. The user to be granted already is the owner of the resource
   * 2. The user granting has a lower access level than the granted access level
   */
  private async checkGrantAccessPermission(
    resourceType: string,
    user: User | undefined,
    email: string,
    levelToGrant: AccessLevel,
    permissions: Permission[],
    resourcesAccessLevel: Record<string, AccessLevel>
  ) {
    const actor = await this.describeActor();
    const ownerPerms = user
      ? permissions.filter(
          (perm) => perm.userId === user.id && perm.accessLevel === "owner"
        )
      : [];
    checkPermissions(
      ownerPerms.length === 0,
      ownerPerms
        .map(
          (perm) =>
            `${actor} tried to set permissions for ${email} who is an owner on ${resourceType} ${ensureResourceIdFromPermission(
              perm
            )}`
        )
        .join("\n")
    );

    const wrongAccessLevelEntries = Object.entries(resourcesAccessLevel).filter(
      ([_id, selfLevel]) =>
        accessLevelRank(selfLevel) < accessLevelRank(levelToGrant)
    );
    checkPermissions(
      wrongAccessLevelEntries.length === 0,
      wrongAccessLevelEntries
        .map(
          ([id, selfLevel]) =>
            `${actor} with access level ${selfLevel} tried to grant higher level ${levelToGrant} to ${email} on ${resourceType} ${id}`
        )
        .join("\n")
    );
  }

  /**
   * Equivalent to removing this project from the current user's dashboard view.
   */
  async removeSelfPerm(projectId: string) {
    this.checkNormalUser();

    const perm = ensureFound<Permission>(
      await this.permissions().findOne({
        where: {
          projectId,
          userId: ensure(
            this.tryGetNormalActorId(),
            "Must have an user id to remove self perm"
          ),
          ...maybeIncludeDeleted(false),
        },
      }),
      `Permission for user ${this.tryGetNormalActorId()} to access project ${projectId}`
    );

    Object.assign(perm, this.stampDelete());
    await this.entMgr.save(perm);
  }

  async useCopilotAndCheckRateLimit() {
    if (this.actor.type === "SuperUser") {
      return;
    }
    const COPILOT_DAILY_RATE_LIMIT = 100;
    this.checkNormalUser();
    const userId = ensure(this.tryGetNormalActorId(), "Must have an user id");
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const todayCount = await this.copilotUsages().count({
      createdById: userId,
      createdAt: MoreThan(yesterday),
      ...maybeIncludeDeleted(false),
    });
    if (todayCount >= COPILOT_DAILY_RATE_LIMIT) {
      throw new CopilotRateLimitExceededError();
    }
    await this.copilotUsages().save(
      this.copilotUsages().create({
        ...this.stampNew(),
      })
    );
  }

  async createCopilotInteraction({
    model,
    projectId,
    request,
    response,
    userPrompt,
  }: {
    projectId: ProjectId;
    userPrompt: string;
    response: string;
    model: "gpt" | "claude";
    request: CreateChatCompletionRequest;
  }) {
    await this.checkProjectPerms(projectId, "content", "run copilot");
    const copilotInteraction = this.copilotInteractions().create({
      ...this.stampNew(),
      fullPromptSnapshot: JSON.stringify(request),
      model,
      projectId,
      response,
      userPrompt,
    });
    await this.copilotInteractions().save(copilotInteraction);
    return copilotInteraction;
  }

  async saveCopilotFeedback({
    copilotInteractionId,
    projectId,
    feedback,
    feedbackDescription,
  }: {
    copilotInteractionId: CopilotInteractionId;
    projectId: string;
    feedback: boolean;
    feedbackDescription?: string | null;
  }) {
    await this.checkProjectPerms(projectId, "content", "save copilot feedback");

    const copilotInteraction = await findExactlyOne(
      this.copilotInteractions(),
      {
        where: { projectId, id: copilotInteractionId },
      }
    );
    mergeSane(copilotInteraction, this.stampUpdate(), {
      feedback,
      feedbackDescription,
    });
    await this.entMgr.save(copilotInteraction);
    return copilotInteraction;
  }

  async queryCopilotFeedback({
    pageSize,
    pageIndex,
    query,
  }: {
    pageSize: number;
    pageIndex: number;
    query?: string;
  }): Promise<QueryCopilotFeedbackResponse> {
    this.checkSuperUser();
    const data = await this.getEntMgr().query(`
      WITH all_data AS (
        SELECT c.*, u.email as "createdByEmail"
        FROM copilot_interaction c
        INNER JOIN public.user u
        ON c."createdById" = u.id
        WHERE
          c.feedback IS NOT NULL
          ${
            query
              ? `AND (u.email = '${query}' OR c."projectId" = '${query}')`
              : ``
          }
      )
      SELECT *
      FROM (
        TABLE all_data
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize}
        OFFSET ${pageIndex * pageSize}
      ) sub
      RIGHT JOIN (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE feedback) AS "totalLikes",
          COUNT(*) FILTER (WHERE NOT feedback) AS "totalDislikes"
        FROM all_data
      ) r ON TRUE
    `);
    return {
      feedback: data[0].id ? data : [],
      total: data[0].total,
      totalLikes: data[0].totalLikes,
      totalDislikes: data[0].totalDislikes,
    };
  }

  //
  // Personal API tokens.
  //

  async createPersonalApiToken(userId?: string) {
    userId = this.checkUserIdIsSelf(userId);
    this.allowAnyone();
    const token = generateSomeApiToken();

    const apiToken = this.personalApiTokens().create({
      ...this.stampNew(),
      token: token,
      userId,
    });
    await this.entMgr.save(apiToken);
    return apiToken;
  }

  async getPersonalApiToken(token: string) {
    if (this.actor.type === "AnonUser") {
      return undefined;
    }

    const apiToken = await this.personalApiTokens().findOne({
      where: { token },
    });
    if (!apiToken) {
      return undefined;
    }

    if (
      this.actor.type === "SuperUser" ||
      (this.actor.type == "NormalUser" && this.actor.userId === apiToken.userId)
    ) {
      return apiToken;
    }

    return undefined;
  }

  async listPersonalApiTokens(userId?: string) {
    userId = this.checkUserIdIsSelf(userId);
    const apiTokens = await this.personalApiTokens().find({
      where: { userId },
    });
    return apiTokens.filter((t) => !t.deletedAt);
  }

  async revokePersonalApiToken(token: string) {
    const apiToken = await this.getPersonalApiToken(token);
    if (!apiToken) {
      throw new NotFoundError("Cannot find token " + token);
    }
    if (apiToken) {
      mergeSane(apiToken, this.stampUpdate(), { deletedAt: new Date() });
      await this.personalApiTokens().save(apiToken);
    }
  }

  checkUserIdIsSelf(userId?: string) {
    if (this.actor.type === "NormalUser") {
      if (userId && userId !== this.actor.userId) {
        throw new ForbiddenError("Can only do this for self.");
      }
      userId = this.actor.userId;
    }
    if (this.actor.type === "SuperUser" && !userId) {
      throw new Error("Super user must specify userId to use");
    }
    return ensure(userId, "User id should exist");
  }

  isUserIdSelf(userId?: string) {
    if (this.actor.type === "NormalUser") {
      if (userId && userId !== this.actor.userId) {
        return false;
      }
      userId = this.actor.userId;
    }
    if (this.actor.type === "SuperUser" && !userId) {
      return false;
    }
    return userId != null;
  }

  //
  // Team API tokens.
  //

  async createTeamApiToken(teamId: TeamId) {
    await this.checkTeamPerms(teamId, "editor", "create team tokens");
    const token = generateSomeApiToken();

    const apiToken = this.teamApiTokens().create({
      ...this.stampNew(),
      token: token,
      teamId,
    });
    await this.entMgr.save(apiToken);
    return apiToken;
  }

  async getTeamApiToken(token: string) {
    if (this.actor.type === "AnonUser") {
      return undefined;
    }

    const apiToken = await this.teamApiTokens().findOne({
      where: { token, deletedAt: IsNull() },
    });
    if (!apiToken) {
      return undefined;
    }

    try {
      await this.checkTeamPerms(apiToken.teamId, "editor", "get team token");
    } catch {
      return undefined;
    }

    return apiToken;
  }

  async listTeamApiTokens(teamId: TeamId) {
    await this.checkTeamPerms(teamId, "editor", "list team tokens");
    const apiTokens = await this.teamApiTokens().find({
      where: { teamId },
    });
    return apiTokens.filter((t) => !t.deletedAt);
  }

  async revokeTeamApiToken(token: string) {
    const apiToken = await this.getTeamApiToken(token);
    if (!apiToken) {
      throw new NotFoundError("Cannot find token " + token);
    }
    if (apiToken) {
      mergeSane(apiToken, this.stampUpdate(), { deletedAt: new Date() });
      await this.teamApiTokens().save(apiToken);
    }
  }

  async createTemporaryTeamApiToken() {
    if (!this.teamApiToken) {
      throw new ForbiddenError("Missing team API token");
    }
    const apiToken = await findExactlyOne(this.teamApiTokens(), {
      where: { token: this.teamApiToken, deletedAt: IsNull() },
    });
    const temporaryToken = generateSomeApiToken();

    const tempApiToken = this.temporaryTeamApiTokens().create({
      ...this.stampNew(),
      token: temporaryToken,
      teamId: apiToken.teamId,
      fromTeamTokenId: this.teamApiToken,
    });
    await this.entMgr.save(tempApiToken);
    return tempApiToken;
  }

  async revokeTemporaryTeamApiToken() {
    if (!this.temporaryTeamApiToken) {
      throw new UnauthorizedError("Missing API token");
    }
    const tempToken = await findExactlyOne(this.temporaryTeamApiTokens(), {
      where: {
        token: this.temporaryTeamApiToken,
        deletedAt: IsNull(),
      },
    });
    mergeSane(tempToken, this.stampUpdate(), { deletedAt: new Date() });
    await this.temporaryTeamApiTokens().save(tempToken);
  }

  //
  // Trusted hosts
  //

  async getTrustedHostById(id: string) {
    return ensureFound(
      await this.trustedHosts().findOne(id),
      `TrustedHost with ID ${id}`
    );
  }

  async listTrustedHostsForSelf() {
    if (this.actor.type !== "NormalUser") {
      return [];
    }
    const userId = this.checkNormalUser();
    return this.trustedHosts().find({ where: { ...excludeDeleted(), userId } });
  }

  async addTrustedHost(url: string) {
    url = url.trim();
    const userId = this.checkNormalUser();
    const existingTrustedHost = await this.trustedHosts().findOne({
      where: {
        userId,
        hostUrl: url,
        ...excludeDeleted(),
      },
    });
    if (existingTrustedHost) {
      // Host is already whitelisted!
      return;
    }
    const trustedHost = this.trustedHosts().create({
      ...this.stampNew(),
      userId,
      hostUrl: url,
    });
    await this.trustedHosts().save(trustedHost);
  }

  async deleteTrustedHost(trustedHostId: string) {
    const trustedHost = await this.getTrustedHostById(trustedHostId);
    const _user = await this.getUserById(trustedHost.userId);
    checkPermissions(
      this.actor.type === "SuperUser" ||
        trustedHost.userId === this.checkNormalUser(),
      `${await this.describeActor()} tried to edit trusted hosts list of another user`
    );
    Object.assign(trustedHost, this.stampDelete());
    await this.entMgr.save(trustedHost);
  }

  //
  // SignUpAttempt
  //

  async logSignUpAttempt(email: string) {
    this.checkSuperUser();
    email = email.toLowerCase();
    const attempt = this.signUpAttempts().create({
      ...this.stampNew(),
      email,
    });
    await this.entMgr.save(attempt);
  }

  //
  // DevFlagOverrides
  //

  async tryGetDevFlagOverrides() {
    return await this.devFlagOverrides().findOne({
      order: {
        createdAt: "DESC",
      },
    });
  }

  /**
   * Takes a JSON string.
   */
  async setDevFlagOverrides(data: string) {
    const overrides = this.devFlagOverrides().create({
      ...this.stampNew(),
      data,
    });
    await this.entMgr.save(overrides);
  }

  async getDevFlagVersions() {
    return await this.devFlagOverrides().find({
      order: {
        createdAt: "DESC",
      },
      take: 10,
      relations: ["createdBy"],
    });
  }

  async validateOrGetProjectApiToken(
    projectId: string,
    projectApiToken?: string
  ): Promise<string> {
    const project = await this.sudo().getProjectById(projectId);
    // If the client didn't already have a (still-valid) token, we are willing
    // to share the token if the user permissions are good.
    if (!projectApiToken || project.projectApiToken !== projectApiToken) {
      await this.checkProjectPerms(
        projectId,
        "viewer",
        "get own permissions for"
      );
    }
    if (!project.projectApiToken) {
      project.projectApiToken = generateSomeApiToken();
      await this.entMgr.save(project);
    }
    return project.projectApiToken;
  }

  async showHostingBadgeForProject(projectId: ProjectId): Promise<boolean> {
    const project = await this.getProjectById(projectId);
    return !project.extraData?.hideHostingBadge;
  }

  async updateProjectExtraData(
    projectId: ProjectId,
    extraData: Partial<Project["extraData"]>
  ) {
    await this.checkProjectPerms(projectId, "editor", "update extra data");
    const project = await this.getProjectById(projectId);
    await this.updateProject({
      id: projectId,
      extraData: {
        ...(project.extraData ?? {}),
        ...extraData,
      },
    });
  }

  async getRecentLoaderPublishments(
    projectId: string,
    opts?: { minLoaderVersion?: number }
  ) {
    const minLoaderVersion = opts?.minLoaderVersion;
    let loaderPublishments = await this.loaderPublishments().find({
      where: {
        projectId,
      },
      order: {
        updatedAt: "DESC",
      },
    });
    if (loaderPublishments.length > 0) {
      // If there's at least one, then we only look at additional
      // publishments from within 3 days from the latest publishment.
      // We're trying to quickly age out stale uses of loader version, etc.
      const latest = loaderPublishments[0];
      loaderPublishments = [
        latest,
        ...loaderPublishments
          .slice(1)
          .filter(
            (p) =>
              moment(latest.updatedAt).diff(moment(p.updatedAt), "days") < 3
          ),
      ];
    }
    if (minLoaderVersion) {
      loaderPublishments = loaderPublishments.filter(
        (p) => p.loaderVersion >= minLoaderVersion
      );
    }
    return loaderPublishments;
  }

  async getProjectApiTokens(projectIds: string[]) {
    if (projectIds.length === 0) {
      return {};
    }

    const projectIdAndTokens = await this.projects()
      .createQueryBuilder()
      .select("id")
      .addSelect(`"projectApiToken"`)
      .where(`id IN (:...projectIds)`, { projectIds })
      .getRawMany<{ id: string; projectApiToken: string }>();

    return fromPairs(projectIdAndTokens.map((p) => [p.id, p.projectApiToken]));
  }

  async upsertLoaderPublishmentEntities(opts: {
    projectIds: string[];
    platform: string;
    loaderVersion: number | undefined;
    browserOnly: boolean | undefined;
    i18nKeyScheme: LocalizationKeyScheme | undefined;
    i18nTagPrefix: string | undefined;
    appDir: boolean | undefined;
  }) {
    const {
      projectIds,
      platform,
      loaderVersion,
      browserOnly,
      i18nKeyScheme,
      i18nTagPrefix,
      appDir,
    } = opts;
    const repository = this.loaderPublishments();
    const loaderPublishments = await Promise.all(
      projectIds.map(async (projectId) => {
        const publishment =
          (await repository.findOne({
            where: {
              platform,
              projectId,
              projectIds,
              loaderVersion,
              browserOnly,
              i18nKeyScheme: i18nKeyScheme ?? null,
              i18nTagPrefix: i18nTagPrefix ?? null,
              appDir: appDir ? true : null,
            },
          })) ||
          repository.create({
            ...this.stampNew(),
            projectId,
            projectIds,
            platform,
            loaderVersion,
            browserOnly,
            i18nKeyScheme: i18nKeyScheme ?? null,
            i18nTagPrefix: i18nTagPrefix ?? null,
            appDir: appDir ? true : null,
          });
        return {
          ...publishment,
          ...this.stampUpdate(),
        };
      })
    );
    await this.loaderPublishments().save(loaderPublishments);
    return loaderPublishments;
  }

  //
  // Generic key values
  //

  async tryGetKeyValue(namespace: KeyValueNamespace, key: string) {
    return await this.keyValues().findOne({
      where: { namespace, key, ...excludeDeleted() },
    });
  }

  private async getAllValuesForKey(namespace: KeyValueNamespace, key: string) {
    return (await this.getAllKeyValuesForKey(namespace, key)).map(
      (kv) => kv.value
    );
  }

  private async getAllKeyValuesForKey(
    namespace: KeyValueNamespace,
    key: string
  ) {
    return await this.keyValues().find({
      where: { namespace, key, ...excludeDeleted() },
    });
  }

  async setKeyValue(namespace: KeyValueNamespace, key: string, value: string) {
    const keyValue =
      (await this.tryGetKeyValue(namespace, key)) ??
      this.keyValues().create({
        ...this.stampNew(),
        namespace,
        key,
        value,
      });
    mergeSane(keyValue, this.stampUpdate(), { value });
    await this.entMgr.save([keyValue]);
  }

  async deleteKeyValue(namespace: KeyValueNamespace, key: string) {
    const keyValue = ensure(
      await this.tryGetKeyValue(namespace, key),
      "You can't delete a key value that doesn't exist"
    );
    mergeSane(keyValue, this.stampDelete());
    await this.entMgr.save([keyValue]);
  }

  //
  // Generic pairs
  //

  private async getPairsByLeft(namespace: PairNamespace, left: string) {
    return await this.pairs().find({
      where: { namespace, left, ...excludeDeleted() },
    });
  }

  private async getPairsByRight(namespace: PairNamespace, right: string) {
    return await this.pairs().find({
      where: { namespace, right, ...excludeDeleted() },
    });
  }

  private async tryGetPair(
    namespace: PairNamespace,
    left: string,
    right: string
  ) {
    return this.pairs().findOne({
      where: { namespace, left, right, ...excludeDeleted() },
    });
  }

  private async upsertPair(
    namespace: PairNamespace,
    left: string,
    right: string
  ) {
    const pair =
      (await this.tryGetPair(namespace, left, right)) ??
      this.pairs().create({
        ...this.stampNew(),
        namespace,
        left,
        right,
      });
    mergeSane(pair, this.stampUpdate(), { right });
    await this.entMgr.save([pair]);
  }

  private async deletePair(pair: GenericPair) {
    mergeSane(pair, this.stampDelete());
    await this.entMgr.save([pair]);
  }

  async getHostlessVersion() {
    this.allowAnyone();
    let hostlessVersion = await this.hostlessVersions().findOne({
      ...excludeDeleted(),
      order: {
        versionCount: "DESC",
      },
    });
    if (!hostlessVersion) {
      hostlessVersion = this.hostlessVersions().create({
        ...this.stampNew(true),
        versionCount: 1,
      });
      await this.hostlessVersions().save(hostlessVersion);
    }
    return hostlessVersion;
  }

  async bumpHostlessVersion() {
    const hostlessVersion = await this.getHostlessVersion();
    hostlessVersion.versionCount = hostlessVersion.versionCount + 1;
    Object.assign(hostlessVersion, this.stampUpdate());
    await this.hostlessVersions().save(hostlessVersion);
  }

  /**
   * extends projectIdsAndTokens with the projectApiToken of @pkgVersionId
   * if the dbMgr was not initialized with projectIdsAndTokens the function
   * will not initialize it
   */
  async extendProjectIdAndTokens(pkgVersionId: string) {
    if (!this.projectIdsAndTokens) {
      return;
    }

    const pkgVersion = await findExactlyOne(this.pkgVersions(), {
      id: pkgVersionId,
      ...excludeDeleted(),
    });
    const pkg = await findExactlyOne(this.pkgs(), { id: pkgVersion.pkgId });

    const { projectId } = pkg;
    if (!projectId) {
      return;
    }

    const hasToken = this.projectIdsAndTokens.some(
      (p) => p.projectId === projectId
    );
    if (!hasToken) {
      const projectApiToken = await this.sudo().validateOrGetProjectApiToken(
        projectId
      );
      this.projectIdsAndTokens.push({
        projectId,
        projectApiToken,
      });
    }
  }

  async getWorkspaceDataSources(workspaceId: WorkspaceId) {
    await this.checkWorkspacePerms(workspaceId, "viewer", "get data sources");
    return await this.dataSources().find({
      workspaceId,
      deletedAt: IsNull(),
    });
  }

  async getWorkspaceTutorialDataSources(workspaceId: WorkspaceId) {
    // We don't check permissions here because we don't want to require permissions
    // to view the tutorial data sources. That could throw errors by sharing the project.
    return await this.dataSources().find({
      // Don't select credentials to reduce processing time, involved in decrypting it
      select: [
        "id",
        "name",
        "workspaceId",
        "source",
        "settings",
        "createdById",
      ],
      where: {
        workspaceId,
        source: "tutorialdb",
        deletedAt: IsNull(),
      },
    });
  }

  async checkDataSourceEditPerms(dataSource: DataSource) {
    const owner = dataSource.createdById;
    const actor = await this.describeActor();
    if (this.actor.type === "SuperUser") {
      return;
    }

    const canEdit = async () => {
      if (this.actor.type === "SuperUser") {
        return true;
      } else if (this.actor.type === "AnonUser") {
        return false;
      } else if (this.actor.type === "NormalUser") {
        return this.actor.userId === owner;
      } else if (this.actor.type === "TeamApiUser") {
        const workspace = await this.getWorkspaceById(dataSource.workspaceId);
        return workspace.teamId === this.actor.teamId;
      } else {
        unreachable(this.actor);
      }
    };

    checkPermissions(
      await canEdit(),
      `${actor} tried to edit dataSource ${dataSource.id}, but they weren't owners.`
    );
  }

  /**
   * @param opts.skipPermissionCheck should only happen from routes
   *   that are open to public, like executing a data source operation,
   *   where we don't need to do _ownership_ checks (but there should
   *   still be other permission checks to make sure the operation is
   *   permitted)
   * @returns
   */
  async getDataSourceById(
    dataSourceId: string,
    opts?: {
      columns?: (keyof DataSource)[];
      skipPermissionCheck?: boolean;
    }
  ) {
    const source = ensureFound(
      await this.dataSources().findOne({
        select: opts?.columns
          ? uniq([
              ...(opts?.columns ?? []),
              "workspaceId",
            ] as (keyof DataSource)[])
          : undefined,
        where: {
          id: dataSourceId,
          deletedAt: IsNull(),
        },
      }),
      `Data source ${dataSourceId}`
    );
    if (!opts?.skipPermissionCheck) {
      await this.checkWorkspacePerms(
        source.workspaceId,
        "viewer",
        "get data sources"
      );
    }
    return source;
  }

  async createUnsavedDataSource(
    workspaceId: WorkspaceId,
    opts: {
      name: string;
      credentials: Record<string, any>;
      source: DataSourceType;
      settings: Record<string, any>;
    }
  ) {
    await this.checkWorkspacePerms(workspaceId, "editor", "create data source");
    const dataSource = this.dataSources().create({
      ...this.stampNew(true),
      workspaceId,
      name: opts.name,
      credentials: opts.credentials ?? {},
      source: opts.source,
      settings: opts.settings ?? {},
    });
    return dataSource;
  }

  async createDataSource(
    workspaceId: WorkspaceId,
    opts: {
      name: string;
      credentials: Record<string, any>;
      source: DataSourceType;
      settings: Record<string, any>;
    }
  ) {
    await this.checkWorkspacePerms(workspaceId, "editor", "create data source");
    const dataSource = await this.createUnsavedDataSource(workspaceId, opts);
    await this.dataSources().save(dataSource);
    return dataSource;
  }

  async updateDataSource(
    id: string,
    opts: {
      name?: string;
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
      workspaceId?: WorkspaceId;
    }
  ) {
    const dataSource = ensureFound(
      await this.dataSources().findOne({
        id,
        deletedAt: IsNull(),
      }),
      `Data source ${id}`
    );
    await this.checkDataSourceEditPerms(dataSource);
    await this.checkWorkspacePerms(
      dataSource.workspaceId,
      "editor",
      "update data source"
    );
    if (opts.name) {
      dataSource.name = opts.name;
    }
    if (opts.credentials) {
      dataSource.credentials = {
        ...dataSource.credentials,
        ...opts.credentials,
      };
    }
    if (opts.settings) {
      dataSource.settings = opts.settings;
    }
    if (opts.workspaceId) {
      await this.checkWorkspacePerms(
        opts.workspaceId,
        "editor",
        "move data source"
      );
      dataSource.workspaceId = opts.workspaceId;
    }
    await this.dataSources().save(dataSource);
    return dataSource;
  }

  async deleteDataSource(id: string) {
    const dataSource = ensureFound(
      await this.dataSources().findOne({
        id,
        deletedAt: IsNull(),
      }),
      `Data source ${id}`
    );
    await this.checkDataSourceEditPerms(dataSource);
    await this.checkWorkspacePerms(
      dataSource.workspaceId,
      "editor",
      "delete data source"
    );
    Object.assign(dataSource, this.stampDelete());
    await this.dataSources().save(dataSource);
    return dataSource;
  }

  async checkDataSourceIssueOpIdPerms(id: string) {
    const dataSource = await this.getDataSourceById(id, {
      columns: ["workspaceId"],
    });
    await this.checkWorkspacePerms(
      dataSource.workspaceId,
      "editor",
      "issue data source operation"
    );
  }

  async createDataSourceOperation(
    dataOp: OperationTemplate,
    dataSourceId: string
  ) {
    await this.checkDataSourceIssueOpIdPerms(dataSourceId);
    const source = await this.getDataSourceById(dataSourceId, {
      columns: ["source"],
    });
    const sourceMeta = getDataSourceMeta(source.source);
    const normed = normalizeOperationTemplate(sourceMeta, dataOp);
    const dataSourceOp = this.dataSourceOperations().create({
      ...this.stampNew(),
      dataSource: { id: dataSourceId },
      operationInfo: normed,
    });
    await this.dataSourceOperations().save(dataSourceOp);
    return dataSourceOp;
  }

  async getDataSourceOperation(id: string) {
    return this.dataSourceOperations().findOne(id);
  }

  async existsDataSourceOperation(
    dataOp: OperationTemplate,
    dataSourceId: string
  ) {
    await this.checkDataSourceIssueOpIdPerms(dataSourceId);
    const source = await this.getDataSourceById(dataSourceId, {
      columns: ["source"],
    });
    const sourceMeta = getDataSourceMeta(source.source);
    const normed = normalizeOperationTemplate(sourceMeta, dataOp);
    return this.dataSourceOperations().findOne({
      where: {
        dataSourceId: dataSourceId,
        operationInfo: normed,
      },
    });
  }

  async listCmsDatabases(workspaceId: WorkspaceId) {
    await this.checkWorkspacePerms(workspaceId, "viewer", "list CMS databases");
    return await this.cmsDatabases().find({
      where: {
        workspaceId,
        ...excludeDeleted(),
      },
    });
  }

  async getCmsDatabaseById(
    databaseId: CmsDatabaseId,
    includeDeleted = false
  ): Promise<CmsDatabase> {
    await this.checkCmsDatabasePerms(databaseId, "viewer");
    const database = ensureFound(
      await this.cmsDatabases().findOne({
        id: databaseId,
        ...(!includeDeleted && excludeDeleted()),
      }),
      `Database with id ${databaseId}`
    );
    return database;
  }

  async getCmsDatabaseAndSecretTokenById(
    databaseId: CmsDatabaseId
  ): Promise<CmsDatabase> {
    await this.checkCmsDatabasePerms(databaseId, "content");
    const database = ensureFound(
      await this.cmsDatabases()
        .createQueryBuilder()
        .where(`"id" = :id`, { id: databaseId, ...excludeDeleted() })
        .addSelect("CmsDatabase.secretToken")
        .getOne(),
      `Database with id ${databaseId}`
    );
    return database;
  }

  async updateCmsDatabaseById(
    databaseId: CmsDatabaseId,
    fields: Partial<UpdatableCmsDatabaseFields>,
    includeDeleted = false
  ): Promise<CmsDatabase> {
    await this.checkCmsDatabasePerms(databaseId, "editor");
    const database = await this.getCmsDatabaseById(databaseId, includeDeleted);
    fields = _.pick(fields, updatableCmsDatabaseFields);

    // If workspaceId is given, we must ensure that the user has editor
    // permission in both the old and the new workspace.
    if (fields.workspaceId) {
      await this.checkWorkspacePerms(
        database.workspaceId,
        "editor",
        "move cms"
      );
      await this.checkWorkspacePerms(fields.workspaceId, "editor", "move cms");
      fields["workspace"] = { id: fields.workspaceId };
    }

    Object.assign(database, this.stampUpdate(), fields);
    await this.entMgr.save(database);
    return database;
  }

  async deleteCmsDatabase(databaseId: CmsDatabaseId) {
    await this.checkCmsDatabasePerms(databaseId, "editor");
    const database = await this.getCmsDatabaseById(databaseId);
    Object.assign(database, this.stampDelete());
    // TODO: Delete tables and rows ??
    await this.entMgr.save(database);
  }

  async createCmsDatabase(opts: {
    name: string;
    workspaceId: WorkspaceId;
  }): Promise<CmsDatabase> {
    await this.checkWorkspacePerms(
      opts.workspaceId,
      "editor",
      "create CMS database"
    );
    const db = this.cmsDatabases().create({
      ...this.stampNew(true),
      name: opts.name,
      workspaceId: opts.workspaceId,
      extraData: { locales: [] },
      publicToken: generateSomeApiToken(),
      secretToken: generateSomeApiToken(),
    });
    await this.entMgr.save(db);
    return db;
  }

  async cloneCmsDatabase(databaseId: CmsDatabaseId, databaseName?: string) {
    await this.checkCmsDatabasePerms(databaseId, "editor");

    const existingDb = await this.getCmsDatabaseById(databaseId);
    const newDb = await this.createCmsDatabase({
      name: databaseName || `Copy of ${existingDb.name}`,
      workspaceId: existingDb.workspaceId,
    });

    const tableIdMap = new Map<CmsTableId, CmsTableId>();
    const existingTables = await this.listCmsTables(databaseId);
    for (const table of existingTables) {
      const newTable = await this.createCmsTable({
        databaseId: newDb.id,
        identifier: table.identifier,
        name: table.name,
        description: table.description,
      });
      tableIdMap.set(table.id, newTable.id);
    }

    for (const table of existingTables) {
      const schemaFields = traverseSchemaFields(
        table.schema.fields,
        (field) => {
          if (field.type === "ref") {
            field.tableId = tableIdMap.get(field.tableId)!;
          }
        }
      );

      await this.updateCmsTable(tableIdMap.get(table.id)!, {
        schema: {
          fields: schemaFields,
        },
      });
    }

    return newDb;
  }

  async listCmsTables(
    databaseId: CmsDatabaseId,
    includeArchived: boolean = false
  ) {
    await this.checkCmsDatabasePerms(databaseId, "viewer");
    let cmsTablesQuery = this.cmsTables()
      .createQueryBuilder()
      .where(`"databaseId" = :databaseId AND "deletedAt" IS NULL`, {
        databaseId,
      });
    if (!includeArchived) {
      cmsTablesQuery = cmsTablesQuery.andWhere(`"isArchived" IS NOT TRUE`);
    }
    return cmsTablesQuery.getMany();
  }

  async createCmsTable(opts: {
    identifier: string;
    name: string;
    databaseId: CmsDatabaseId;
    schema?: CmsTableSchema;
    description?: string | null;
  }): Promise<CmsTable> {
    await this.checkCmsDatabasePerms(opts.databaseId, "editor");
    const table = this.cmsTables().create({
      ...this.stampNew(true),
      name: opts.name,
      identifier: toVarName(opts.identifier),
      description: opts.description,
      databaseId: opts.databaseId,
      schema: opts.schema
        ? normalizeTableSchema(opts.schema)
        : {
            fields: [],
          },
    });
    await this.entMgr.save(table);
    return table;
  }

  async getCmsTableByIdentifier(dbId: CmsDatabaseId, identifier: string) {
    await this.checkCmsDatabasePerms(dbId, "viewer");
    return ensureFound(
      await this.cmsTables()
        .createQueryBuilder("t")
        .innerJoin("t.database", "d")
        .where(
          "d.deletedAt is null AND t.deletedAt is null AND d.id = :dbId AND t.identifier = :identifier"
        )
        .setParameters({ dbId, identifier })
        .getOne(),
      `Table for database ${dbId} and identifier ${identifier}`
    );
  }

  async getCmsTableById(id: CmsTableId) {
    const table = ensureFound(
      await this.cmsTables().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Table with id ${id}`
    );
    await this.checkCmsDatabasePerms(table.databaseId, "viewer");
    return table;
  }

  async deleteCmsTable(id: CmsTableId) {
    const table = ensureFound(
      await this.cmsTables().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Table with id ${id}`
    );
    await this.checkCmsDatabasePerms(table.databaseId, "editor");
    Object.assign(table, this.stampDelete());
    // TODO: Delete rows ??
    await this.entMgr.save(table);
  }

  async updateCmsTable(
    tableId: CmsTableId,
    opts: {
      name?: string;
      schema?: CmsTableSchema;
      description?: string | null;
      settings?: CmsTableSettings | null;
      isArchived?: boolean | null;
    }
  ) {
    const { name, schema, description, settings, isArchived } = opts;
    const table = await this.getCmsTableById(tableId);
    await this.checkCmsDatabasePerms(table.databaseId, "editor");
    if (name && table.name !== name) {
      table.name = name;
    }
    if (description !== undefined && table.description !== description) {
      table.description = description;
    }
    if (schema) {
      table.schema = normalizeTableSchema(schema);
    }
    if (settings) {
      table.settings = settings;
    }
    if (isArchived !== undefined) {
      table.isArchived = isArchived;
    }
    Object.assign(table, this.stampUpdate());
    await this.entMgr.save(table);
    return table;
  }

  async createCmsRow(
    tableId: CmsTableId,
    opts: {
      identifier?: string;
      data?: Dict<Dict<unknown>> | null;
      draftData?: Dict<Dict<unknown>> | null;
    }
  ) {
    const [row] = await this.createCmsRows(tableId, [opts]);
    return row;
  }

  /**
   * This supplies the defaults for data only if data is non-null. And supplies
   * the default for draft data if draft-data is non-null or if both data and
   * draft-data are null.
   */
  async createCmsRows(
    tableId: CmsTableId,
    rowInputs: {
      identifier?: string;
      data?: Dict<Dict<unknown>> | null;
      draftData?: Dict<Dict<unknown>> | null;
    }[]
  ) {
    const table = await this.getCmsTableById(tableId);
    await this.checkCmsDatabasePerms(table.databaseId, "content");

    const database = await this.getCmsDatabaseById(table.databaseId);
    const locales = ["", ...database.extraData.locales];

    const defaults = Object.fromEntries(
      locales.map((locale) =>
        tuple(
          locale,
          Object.fromEntries(
            table.schema.fields.map((field) =>
              tuple(field.identifier, field.defaultValueByLocale[locale])
            )
          )
        )
      )
    );

    const rows = rowInputs.map((opts) => {
      const data: Dict<Dict<unknown>> | null = opts.data
        ? L.merge({}, defaults, pickKnownFieldsByLocale(table, opts.data))
        : null;
      const draftData: Dict<Dict<unknown>> | null =
        opts.draftData || !opts.data
          ? L.merge(
              {},
              defaults,
              pickKnownFieldsByLocale(table, opts.draftData || {})
            )
          : null;

      // TODO: Verify that data is valid per field type!!
      const row = this.cmsRows().create({
        ...this.stampNew(true),
        tableId: tableId,
        identifier: opts.identifier,
        rank: "",
        data,
        draftData,
        revision: 0,
      });

      return row;
    });

    return await this.entMgr.save(rows);
  }

  async getCmsRowById(id: CmsRowId) {
    // This returns draft data, therefore requires at least content permission
    await this.checkCmsRowPerms(id, "content");
    return ensureFound(
      await this.cmsRows().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Row with id ${id}`
    );
  }

  async updateCmsRow(
    rowId: CmsRowId,
    opts: {
      rank?: string;
      identifier?: string;
      data?: Dict<Dict<unknown>>;
      draftData?: Dict<Dict<unknown>> | null;
      revision?: number;
      noMerge?: boolean;
    }
  ) {
    const row = await this.getCmsRowById(rowId);
    const table = await this.getCmsTableById(row.tableId);
    await this.checkCmsDatabasePerms(table.databaseId, "content");
    if (opts.rank) {
      row.rank = opts.rank;
    }
    if (opts.identifier !== undefined) {
      row.identifier = opts.identifier;
    }
    if (opts.revision != null && opts.revision !== (row.revision ?? 0)) {
      console.log(`Got revision ${opts.revision} but expected ${row.revision}`);
      throw new BadRequestError(
        `This CMS row has been updated in the meanwhile`
      );
    }
    const mergedData = (
      existing: Record<string, any> | null,
      update: Record<string, any> | null | undefined
    ) => {
      if (update == null) {
        return null;
      }
      if (opts.noMerge) {
        return update;
      }
      // We specify a customizer that overwrites entire arrays, otherwise with the default merge, there's no way to truncate arrays.
      // If you really want to make specific deep updates in the array, you can always rely on objects rather than arrays, e.g. updating the 2nd element of an array, you can pass in {1: ...} rather than an array.
      return L.mergeWith(
        {},
        existing,
        pickKnownFieldsByLocale(table, update),
        (dstValue, srcValue) => {
          if (Array.isArray(srcValue)) {
            return srcValue;
          }
          return undefined;
        }
      );
    };

    if ("data" in opts) {
      row.data = mergedData(row.data, opts.data);
    }
    if ("draftData" in opts) {
      /* on publish, we set draft data to null, and then we should use
      the existing published data to merge, avoiding removing existing fields */
      row.draftData = mergedData(row.draftData ?? row.data, opts.draftData);
    }
    Object.assign(row, this.stampUpdate());
    row.revision = (row.revision ?? 0) + 1;

    const draftRevision = opts.draftData
      ? this.cmsRowRevisions().create({
          ...this.stampNew(true),
          rowId: rowId,
          data: ensure(
            row.draftData,
            "All cms rows must have the draftData dictionary"
          ),
          isPublished: false,
        })
      : undefined;

    const publishedRevision = opts.data
      ? this.cmsRowRevisions().create({
          ...this.stampNew(true),
          rowId: rowId,
          data: ensure(row.data, "All cms rows must have the data dictionary"),
          isPublished: true,
        })
      : undefined;

    await this.entMgr.save(
      withoutNils([row, draftRevision, publishedRevision])
    );

    return row;
  }

  async listCmsRowRevisionsByRowId(rowId: CmsRowId) {
    await this.checkCmsRowPerms(rowId, "viewer");
    return this.cmsRowRevisions().find({
      where: {
        rowId,
        ...excludeDeleted(),
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  async getCmsRowRevisionById(id: CmsRowRevisionId) {
    await this.checkCmsRowRevisionPerms(id, "viewer");
    return ensureFound(
      await this.cmsRowRevisions().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Row revision with id ${id}`
    );
  }

  async publishCmsRow(rowId: CmsRowId) {
    await this.checkCmsRowPerms(rowId, "content");
    const row = await this.getCmsRowById(rowId);
    if (row.draftData) {
      row.data = row.draftData;
      row.draftData = null;
    }
    return await this.entMgr.save(row);
  }

  async deleteCmsRow(rowId: CmsRowId) {
    await this.checkCmsRowPerms(rowId, "content");
    const row = await this.getCmsRowById(rowId);
    Object.assign(row, this.stampDelete());
    await this.entMgr.save(row);
  }

  // TODO We are always querying just the default locale.
  async queryCmsRows(
    tableId: CmsTableId,
    query: ApiCmsQuery,
    opts: { useDraft?: boolean } = {}
  ) {
    const table = await this.getCmsTableById(tableId);
    await this.checkCmsDatabasePerms(
      table.databaseId,
      opts.useDraft ? "content" : "viewer"
    );

    const fieldToMeta = Object.fromEntries(
      table.schema.fields.map((f) => [f.identifier, f])
    );
    let builder = this.cmsRows()
      .createQueryBuilder("r")
      .where("r.tableId = :tableId", { tableId })
      .andWhere("r.deletedAt IS NULL");

    if (!opts.useDraft) {
      // only allow published rows
      builder = builder.andWhere("r.data IS NOT NULL");
    }

    if (query.where) {
      const { condition, params: valParams } = makeSqlCondition(
        table,
        query.where,
        opts
      );
      builder = builder.andWhere(condition);
      builder = builder.setParameters(valParams);
    }

    builder = builder.limit(query.limit ?? 100);

    if (query.offset) {
      builder = builder.offset(query.offset);
    }

    if (query.order) {
      for (const order of query.order) {
        const field = typeof order === "string" ? order : order.field;
        if (field in fieldToMeta) {
          const dir =
            typeof order === "string"
              ? "ASC"
              : order.dir === "asc"
              ? "ASC"
              : "DESC";
          builder = builder.addOrderBy(
            makeTypedFieldSql(fieldToMeta[field], opts),
            dir
          );
        }
      }
    } else {
      // Sort latest first
      builder = builder.addOrderBy("r.createdAt", "DESC");
    }

    return await builder.getMany();
  }

  async countCmsRows(
    tableId: CmsTableId,
    query: Pick<ApiCmsQuery, "where">,
    opts: { useDraft?: boolean } = {}
  ) {
    const table = await this.getCmsTableById(tableId);
    await this.checkCmsDatabasePerms(
      table.databaseId,
      opts.useDraft ? "content" : "viewer"
    );
    let builder = this.cmsRows()
      .createQueryBuilder("r")
      .where("r.tableId = :tableId", { tableId })
      .andWhere("r.deletedAt IS NULL");

    if (!opts.useDraft) {
      // only allow published rows
      builder = builder.andWhere("r.data IS NOT NULL");
    }

    if (query.where) {
      const { condition, params: valParams } = makeSqlCondition(
        table,
        query.where,
        opts
      );
      builder = builder.andWhere(condition);
      builder = builder.setParameters(valParams);
    }

    return await builder.getCount();
  }

  private async checkCmsRowPerms(rowId: CmsRowId, accessLevel: AccessLevel) {
    const table = ensureFound(
      await this.cmsTables()
        .createQueryBuilder("t")
        .innerJoin(CmsRow, "r", "r.tableId = t.id")
        .andWhere("r.id = :rowId", { rowId })
        .getOne(),
      `Table for row with id ${rowId}`
    );
    await this.checkCmsDatabasePerms(table.databaseId, accessLevel);
  }

  private async checkCmsRowRevisionPerms(
    revId: CmsRowRevisionId,
    accessLevel: AccessLevel
  ) {
    const table = ensureFound(
      await this.cmsTables()
        .createQueryBuilder("t")
        .innerJoin(CmsRow, "r", "r.tableId = t.id")
        .innerJoin(CmsRowRevision, "rev", "rev.rowId = r.id")
        .andWhere("rev.id = :revId", { revId })
        .getOne(),
      `Table for row revision with id ${revId}`
    );
    await this.checkCmsDatabasePerms(table.databaseId, accessLevel);
  }

  private async checkCmsDatabasePerms(
    databaseId: CmsDatabaseId,
    accessLevel: AccessLevel
  ) {
    const database = ensureFound(
      await this.cmsDatabases()
        .createQueryBuilder()
        .where(`"id" = :id`, { id: databaseId, ...excludeDeleted() })
        .addSelect("CmsDatabase.secretToken")
        .getOne(),
      `Database with id ${databaseId}`
    );
    // Make sure the workspace hasn't been deleted
    ensureFound(
      await this.workspaces().findOne({
        id: database.workspaceId,
        ...excludeDeleted(),
      }),
      `Workspace for database ${databaseId}`
    );
    if (this.cmsIdsAndTokens) {
      if (
        this.cmsIdsAndTokens.find(
          (p) => p.databaseId === databaseId && p.token === database.secretToken
        )
      ) {
        // With the secret token, have the same permissions as an content creator
        if (accessLevelRank(accessLevel) > accessLevelRank("content")) {
          throw new ForbiddenError(
            `Cannot access database as a ${humanLevel(accessLevel)}`
          );
        }
        return;
      }
      if (
        this.cmsIdsAndTokens.find(
          (p) => p.databaseId === databaseId && p.token === database.publicToken
        )
      ) {
        // With the public token, can only read from the database
        if (accessLevelRank(accessLevel) > accessLevelRank("viewer")) {
          throw new ForbiddenError(
            `Cannot access database as a ${humanLevel(accessLevel)}`
          );
        }
        return;
      }
      throw new ForbiddenError(
        `Tried accessing database with id ${databaseId} without the correct token`
      );
    }

    // Else, you must be on the team that database is on for now
    await this.checkWorkspacePerms(database.workspaceId, accessLevel, "access");
  }

  public async createProjectAndSaveRev({
    site,
    bundler,
    name,
    workspaceId,
    ownerEmail,
  }: {
    site: Site;
    bundler: Bundler;
    name: string;
    workspaceId?: WorkspaceId;
    ownerEmail?: string;
  }) {
    const { project, rev } = await this.createProject({
      name: name,
      workspaceId,
    });
    const rev2 = await this.saveProjectRev({
      projectId: project.id,
      data: JSON.stringify(
        bundler.bundle(site, project.id, await getLastBundleVersion())
      ),
      revisionNum: rev.revision + 1,
    });
    return {
      project,
      rev: rev2,
    };
  }

  public async createHostLessProject(
    hostLessPackageInfo: HostLessPackageInfo,
    bundler: Bundler
  ) {
    const site = await createSiteForHostlessProject(hostLessPackageInfo);

    const { project, rev } = await this.createProjectAndSaveRev({
      site,
      bundler,
      name: hostLessPackageInfo.name,
    });

    const { pkgVersion } = await this.publishProject(
      project.id,
      "0.0.1",
      [],
      "",
      rev.revision,
      true
    );

    return unbundlePkgVersion(this, bundler, pkgVersion);
  }

  //
  // Hosting
  //

  async tryGetProjectIdForDomain(
    domain: string
  ): Promise<ProjectId | undefined> {
    return maybeOne(await this.getPairsByLeft("domain-project", domain))
      ?.right as ProjectId;
  }

  async setDomainsForProject(domains: string[], projectId: ProjectId) {
    await this.checkProjectPerms(
      projectId,
      "editor",
      "set domains",
      undefined,
      undefined,
      false
    );
    const pairs = await this.getPairsByRight("domain-project", projectId);
    for (const pair of pairs) {
      await this.deletePair(pair);
    }
    // const oldDomains = await this.getDomainsForProject();
    // for (const oldDomain of oldDomains) {
    //   await this.deletePair()
    // }
    for (const domain of domains) {
      await this.upsertPair("domain-project", domain, projectId);
    }
  }

  async getDomainsForProject(projectId: ProjectId) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get domains",
      undefined,
      undefined,
      false
    );
    const pairs = await this.getPairsByRight("domain-project", projectId);
    return pairs.map((p) => p.left);
  }

  async recordHostingHit(site: string, path: string, hit: boolean) {
    this.allowAnyone();
    const hit_ = this.keyValues().create({
      ...this.stampNew(),
      namespace: "hosting-hit",
      key: site,
      value: JSON.stringify({
        path,
        hit,
      }),
    });
    await this.entMgr.save(hit_);
  }

  async getAllRecordedHitsForSite(site: string) {
    this.allowAnyone();
    const hits = await this.getAllKeyValuesForKey("hosting-hit", site);
    return {
      hits: hits.map((hit) => JSON.parse(hit.value) as HostingHit),
      keyVals: hits,
    };
  }

  async purgeHitsForSite(keyValIds: GenericKeyValueId[]) {
    // TODO This should probably be more locked down.
    this.allowAnyone();
    await this.keyValues().delete({
      id: In(keyValIds),
    });
  }

  //
  // Branches
  //

  async getCommitGraphForProject(projectId: ProjectId): Promise<CommitGraph> {
    let graph = mkCommitGraph();
    await this.maybeUpdateCommitGraphForProject(
      projectId,
      (g) => (graph = jsonClone(g))
    );
    return graph;
  }

  async maybeUpdateCommitGraphForProject(
    projectId: ProjectId,
    updater: (commitGraph: Draft<CommitGraph>) => void
  ) {
    const project = await this.getProjectById(projectId, undefined);
    let changed = false;
    const curDraft = createDraft(project.extraData ?? {});
    await (async (draft) => {
      if (!draft.commitGraph) {
        draft.commitGraph = mkCommitGraph();
      }
      if (!safeHas(draft.commitGraph.branches, MainBranchId)) {
        const pkg = await this.getPkgByProjectId(projectId);
        if (pkg) {
          const allPkgVersions = (
            await this.listPkgVersionsRaw(pkg.id, { includeData: false })
          ).sort((a, b) => compareVersionNumbers(a.version, b.version));
          if (allPkgVersions.length > 0) {
            draft.commitGraph.branches[MainBranchId] = allPkgVersions[0].id;
            for (const [pv, parent] of pairwise(allPkgVersions)) {
              draft.commitGraph.parents[pv.id] = [parent.id];
            }
            draft.commitGraph.parents[last(allPkgVersions).id] = [];
          }
        }
      }
      const initialDag = JSON.stringify(draft.commitGraph);
      updater(draft.commitGraph);
      changed = JSON.stringify(draft.commitGraph) !== initialDag;
    })(curDraft);
    project.extraData = finishDraft(curDraft);
    if (changed) {
      await this.entMgr.save(project);
    }
  }

  async createBranch(
    projectId: ProjectId,
    { name, pkgVersion }: { name: string; pkgVersion: PkgVersion }
  ): Promise<Branch> {
    await this.checkProjectPerms(projectId, "editor", "create branch", true);

    const allBranches = await this.listBranchesForProject(projectId);
    checkBranchFields({ name }, allBranches);

    const branch = this.branches().create({
      ...this.stampNew(true),
      name,
      status: "active",
      projectId,
      hostUrl: pkgVersion.hostUrl,
    });
    await this.maybeUpdateCommitGraphForProject(projectId, (dag) => {
      dag.branches[branch.id] = pkgVersion.id;
    });
    await this.entMgr.save(branch);
    const bundler = new Bundler();
    // We have to take care to use the same Bundler, and also to re-bundle with the same ID that we unbundled with, so that we don't accidentally
    // bundle the entire thing as an external dependency!
    const { site } = await unbundlePkgVersion(this, bundler, pkgVersion);
    const rev = this.entMgr.create(ProjectRevision, {
      ...this.stampNew(),
      revision: 1,
      project: { id: projectId },
      branch: { id: branch.id },
      data: JSON.stringify(
        bundler.bundle(site, pkgVersion.id, await getLastBundleVersion())
      ),
    });
    await this.entMgr.save(rev);
    return branch;
  }

  async cloneBranch(
    sourceBranchId: BranchId,
    { name }: { name: string }
  ): Promise<Branch> {
    await this.checkBranchPerms(sourceBranchId, "viewer", "clone branch", true);
    const sourceBranch = await this.getBranchById(sourceBranchId);
    const projectId = sourceBranch.projectId;
    await this.checkProjectPerms(projectId, "editor", "create branch", true);
    const graph = await this.getCommitGraphForProject(projectId);
    const pkgVersionId = graph.branches[sourceBranchId];
    const pkgVersion = await this.getPkgVersionById(pkgVersionId);
    const newBranch = await this.createBranch(projectId, {
      name,
      pkgVersion,
    });
    return newBranch;
  }

  async createBranchFromLatestPkgVersion(
    projectId: ProjectId,
    { name }: { name: string }
  ): Promise<Branch> {
    const pkg = ensure(
      await this.getPkgByProjectId(projectId),
      `commits must exist in order to create a branch for project ${projectId}`
    );
    const pkgVersion = await this.getPkgVersion(pkg.id);
    return this.createBranch(projectId, {
      name,
      pkgVersion,
    });
  }

  private async checkBranchPerms(
    branchId: BranchId,
    requireLevel: AccessLevel,
    action: string,
    addPerm = false,
    includeDeleted = false
  ) {
    // Ensure sudo can skip
    if (this.actor.type === "SuperUser") {
      return;
    }

    // Ensure it exists
    const branch = await this.sudo().getBranchById(branchId, includeDeleted);

    // For now, permissions are just the same as the project ones
    const project = await this.getProjectById(branch.projectId);
    await this.checkProjectPerms(project.id, requireLevel, action, addPerm);
  }

  async updateBranch(
    branchId: BranchId,
    fields: Partial<UpdatableBranchFields>
  ) {
    await this.checkBranchPerms(branchId, "content", "update", true);
    const branch = await this.getBranchById(branchId);
    const allBranches = await this.listBranchesForProject(branch.projectId);
    checkBranchFields(
      fields,
      allBranches.filter((b) => b.id !== branchId)
    );
    fields = _.pick(fields, updatableBranchFields);
    Object.assign(branch, this.stampUpdate(), fields);
    await this.entMgr.save(branch);
    return branch;
  }

  async getBranchById(
    branchId: BranchId,
    includeDeleted = false
  ): Promise<Branch> {
    await this.checkBranchPerms(
      branchId,
      "viewer",
      "get branch data",
      true,
      includeDeleted
    );
    return ensureFound<Branch>(
      await this.branches().findOne({
        where: { id: branchId, ...maybeIncludeDeleted(includeDeleted) },
      }),
      `Branch with ID ${branchId}`
    );
  }

  async getProjectBranchByName(
    projectId: ProjectId,
    branchName: string
  ): Promise<Branch> {
    await this.checkProjectPerms(projectId, "viewer", "get branch data", true);
    return ensureFound<Branch>(
      await this.branches().findOne({
        where: {
          projectId,
          name: branchName,
          ...excludeDeleted(),
        },
      }),
      `Branch with name "${branchName}"`
    );
  }

  async listBranchesForProject(
    projectId: ProjectId,
    includeDeleted = false
  ): Promise<Branch[]> {
    await this.checkProjectPerms(projectId, "viewer", "list branches", true);
    return this.branches().find({
      projectId,
      ...maybeIncludeDeleted(includeDeleted),
    });
  }

  async setMainBranchProtection(projectId: ProjectId, protected_: boolean) {
    await this.checkProjectPerms(
      projectId,
      "editor",
      "change main branch protection"
    );

    const project = await this.getProjectById(projectId);
    await this.updateProject({
      id: projectId,
      isMainBranchProtected: protected_,
    });
  }

  async deleteBranch(branchId: BranchId): Promise<void> {
    await this.checkBranchPerms(branchId, "editor", "delete branch", true);
    const branch = await this.getBranchById(branchId);
    Object.assign(branch, this.stampDelete());
    await this.entMgr.save(branch);
  }

  async previewMergeBranch(args: MergeArgs): Promise<MergeResult> {
    return this._tryMergeBranch(args, { mode: "preview" });
  }

  async tryMergeBranch(args: MergeArgs): Promise<MergeResult> {
    return this._tryMergeBranch(args, { mode: "try" });
  }

  // We never care about doing things real git does, such as fast-forwards (reusing commits).
  // We always blindly create new commits.
  private async _tryMergeBranch(
    {
      fromBranchId: from,
      toBranchId: to,
      resolution,
      autoCommitOnToBranch = false,
      excludeMergeStepFromResult = false,
    }: MergeArgs,
    { mode }: { mode: "preview" | "try" }
  ): Promise<MergeResult> {
    check(from !== to, "Cannot merge a branch into itself");

    const tryGetProjectId = async (maybeBranchId: BranchId | MainBranchId) => {
      if (!isMainBranchId(maybeBranchId)) {
        const branch = await this.getBranchById(maybeBranchId);
        return branch.projectId;
      } else {
        return undefined;
      }
    };

    // At least one of these has to be a BranchId to find the corresponding Project.
    const projectIds = withoutNils([
      await tryGetProjectId(from),
      await tryGetProjectId(to),
    ]);
    check(
      new Set(projectIds).size === 1,
      `Can only merge branches from the same project, but merging branch  ${from} to ${to} spans projects ${projectIds}`
    );
    const [projectId] = projectIds;

    const project = await this.getProjectById(projectId);
    const fromBranchId = isMainBranchId(from) ? undefined : from;
    const toBranchId = isMainBranchId(to) ? undefined : to;

    if (fromBranchId) {
      await this.checkBranchPerms(
        fromBranchId,
        "viewer",
        "read for merge",
        true
      );
    }
    if (toBranchId) {
      await this.checkBranchPerms(
        toBranchId,
        "content",
        "write for merge",
        true
      );
    }

    const latestFromRev = await this.getLatestProjectRev(projectId, {
      branchId: fromBranchId,
    });
    const latestToRev = await this.getLatestProjectRev(projectId, {
      branchId: toBranchId,
    });
    const bundler = new Bundler();
    const latestToSite = await unbundleProjectFromData(
      this,
      bundler,
      latestToRev,
      `to-${projectId}`
    );
    const latestFromSite = await unbundleProjectFromData(
      this,
      bundler,
      latestFromRev,
      `from-${projectId}`
    );

    const graph = await this.getCommitGraphForProject(projectId);

    const lowestCommonAncestor = getLowestCommonAncestor(
      projectId,
      graph,
      fromBranchId,
      toBranchId
    );

    if (!lowestCommonAncestor) {
      throw new Error("branches must have a lowest common ancestor");
    }

    const pkg = ensure(
      await this.getPkgByProjectId(projectId),
      `Attempting to merge branches for project ${projectId}, so a pkg must have been created, but none found`
    );
    const ancestorPkgVersion = await this.getPkgVersionById(
      lowestCommonAncestor
    );
    const latestToPkgVersion = await this.getPkgVersion(
      pkg.id,
      undefined,
      undefined,
      {
        branchId: toBranchId,
      }
    );
    const latestFromPkgVersion = await this.getPkgVersion(
      pkg.id,
      undefined,
      undefined,
      {
        branchId: fromBranchId,
      }
    );

    // Check that there are no outstanding changes in destination
    const { site: latestToPkgVersionSite } = await unbundlePkgVersion(
      this,
      bundler,
      latestToPkgVersion
    );
    const { site: latestFromPkgVersionSite } = await unbundlePkgVersion(
      this,
      bundler,
      latestFromPkgVersion
    );

    const extras = {
      ancestorPkgVersionId: ancestorPkgVersion.id,
      ancestorPkgVersionString: ancestorPkgVersion.version,
      ancestorPkgVersionBranchId: ancestorPkgVersion.branchId,
      fromPkgVersionId: latestFromPkgVersion.id,
      fromPkgVersionString: latestFromPkgVersion.version,
      toPkgVersionId: latestToPkgVersion.id,
      toPkgVersionString: latestToPkgVersion.version,
      pkgId: pkg.id,
      fromHasOutstandingChanges:
        JSON.stringify(withoutUids(latestFromSite)) !==
        JSON.stringify(withoutUids(latestFromPkgVersionSite)),
      toHasOutstandingChanges:
        JSON.stringify(withoutUids(latestToSite)) !==
        JSON.stringify(withoutUids(latestToPkgVersionSite)),
    };

    const fromHostUrl = fromBranchId
      ? (await this.getBranchById(fromBranchId)).hostUrl
      : project.hostUrl;
    const toHostUrl = toBranchId
      ? (await this.getBranchById(toBranchId)).hostUrl
      : project.hostUrl;

    if (
      (fromHostUrl && new URL(fromHostUrl).href) !==
      (toHostUrl && new URL(toHostUrl).href)
    ) {
      return {
        status: "app host mismatch",
        fromHostUrl,
        toHostUrl,
        ...extras,
      };
    }

    if (extras.toHasOutstandingChanges && !autoCommitOnToBranch) {
      return {
        status: "uncommitted changes on destination branch",
        ...extras,
      };
    }

    const { site: ancestorSite } = await unbundlePkgVersion(
      this,
      bundler,
      ancestorPkgVersion
    );

    let result: MergeResult;
    let mergeStepRaw: MergeStep | undefined = undefined;
    const mergedUuid = mkUuid();
    const mergedSite = (
      bundler.unbundle(
        JSON.parse(ancestorPkgVersion.model),
        mergedUuid
      ) as ProjectDependency
    ).site;
    if (!resolution) {
      mergeStepRaw = tryMerge(
        ancestorSite,
        latestFromSite,
        latestToSite,
        mergedSite,
        bundler,
        undefined
      );
      const canMerge = mergeStepRaw.status === "merged";
      const mergeStep = excludeMergeStepFromResult ? undefined : mergeStepRaw;

      if (!canMerge) {
        return {
          status: "has conflicts",
          parentToPkgVersionId: latestToPkgVersion.id,
          fromRevisionNum: latestFromRev.revision,
          toRevisionNum: latestToRev.revision,
          mergeStep,
          ...extras,
        };
      }

      result = {
        status: "can be merged",
        mergeStep,
        ...extras,
      };

      if (mode === "preview") {
        return result;
      }
    } else {
      const { expectedFromRevisionNum, expectedToRevisionNum } = resolution;

      // Prepare to create a commit

      // User has made some resolutions, so we blindly save whatever they want as the merge result
      // But we only want to do this blind write if nothing has changed since they started the merge!
      // This includes that both:
      // (1) Nobody has made edits to the source branch (or if they did, that nothing actually changed)
      if (
        expectedFromRevisionNum !== latestFromRev.revision &&
        (
          await this.getProjectRevision(
            projectId,
            expectedFromRevisionNum,
            fromBranchId
          )
        ).data !== latestFromRev.data
      ) {
        return {
          status: "concurrent source branch changes during merge",
          ...extras,
        };
      }

      // And (2) the destination branch also has not changed.
      if (
        expectedToRevisionNum !== latestToRev.revision &&
        (
          await this.getProjectRevision(
            projectId,
            expectedToRevisionNum,
            toBranchId
          )
        ).data !== latestToRev.data
      ) {
        return {
          status: "concurrent destination branch changes during merge",
          ...extras,
        };
      }

      assert(
        xor(!!resolution.resolvedSite, !!resolution.picks),
        "tryMergeBranch: expecting either resolvedSite or picks"
      );

      if (resolution.picks) {
        mergeStepRaw = tryMerge(
          ancestorSite,
          latestFromSite,
          latestToSite,
          mergedSite,
          bundler,
          resolution.picks
        );
        assert(
          mergeStepRaw.status === "merged",
          "tryMergeBranch: expecting tryMerge with picks to result in a fully merged site with no further resolutions needed"
        );
      }

      result = {
        status: "resolution accepted",
        ...extras,
      };

      if (mode === "preview") {
        return result;
      }
    }

    // Auto-commit if there are outstanding changes in source
    const finalFromCommit: PkgVersion = !extras.fromHasOutstandingChanges
      ? latestFromPkgVersion
      : (
          await this.publishProject(
            projectId,
            // TODO compute the semantic version bump
            undefined,
            [],
            "Auto-generated commit pre-merge",
            undefined,
            undefined,
            fromBranchId
          )
        ).pkgVersion;

    // Auto-commit if there are outstanding changes in destination and option is enabled
    if (extras.toHasOutstandingChanges && autoCommitOnToBranch) {
      await this.publishProject(
        projectId,
        // TODO compute the semantic version bump
        undefined,
        [],
        "Auto-generated commit pre-merge",
        undefined,
        undefined,
        toBranchId
      );
    }

    // Make the merge commit.
    // Note that we do not want to make this on the source branch. Its terminal commit should be the one pre-merge - it
    // shouldn't ever be part of the destination branch (or you won't know which ancestor path is the source vs destination)!
    if (resolution) {
      // Make the final resolved revision (so that this can become the merge commit).
      // Either we use the given resolvedSite if available,
      // or we use mergedSite which should have been produced earlier using `picks`.
      await this.saveProjectRev({
        projectId: projectId,
        data: resolution.resolvedSite
          ? L.isString(resolution.resolvedSite)
            ? resolution.resolvedSite
            : JSON.stringify(
                bundler.bundle(
                  resolution.resolvedSite,
                  projectId,
                  await getLastBundleVersion()
                )
              )
          : JSON.stringify(
              bundler.bundle(
                mergedSite,
                mergedUuid,
                await getLastBundleVersion()
              )
            ),
        revisionNum: latestToRev.revision + 1,
        branchId: toBranchId,
      });
    } else {
      assert(
        result.status === "can be merged" &&
          mergeStepRaw &&
          mergeStepRaw.status === "merged",
        "Should be merge-able by this point"
      );
      await this.saveProjectRev({
        projectId,
        data: JSON.stringify(
          bundler.bundle(
            mergeStepRaw.mergedSite,
            // Make sure to bundle with the correct mergedUuid,
            // since the mergedSite was originally unbundled with that.
            mergedUuid,
            await getLastBundleVersion()
          )
        ),
        revisionNum: latestToRev.revision + 1,
        branchId: toBranchId,
      });
    }

    await this.publishProject(
      projectId,
      // TODO compute the semantic version bump
      undefined,
      [],
      "Auto-generated commit post-merge",
      undefined,
      undefined,
      toBranchId,
      finalFromCommit.id,
      resolution?.picks
    );

    if (fromBranchId) {
      await this.updateBranch(fromBranchId, {
        status: "merged",
      });
    }

    return result;
  }

  async getWorkspaceToken(workspaceId: WorkspaceId): Promise<string> {
    await this.checkWorkspacePerms(
      workspaceId,
      "viewer",
      "get workspace token"
    );

    let workspaceApiToken = await this.workspaceApiTokens().findOne({
      workspaceId,
      ...excludeDeleted(),
    });

    if (!workspaceApiToken) {
      const token = generateSomeApiToken();
      workspaceApiToken = this.workspaceApiTokens().create({
        ...this.stampNew(),
        workspaceId,
        token,
      });
      await this.workspaceApiTokens().save(workspaceApiToken);
    }

    return workspaceApiToken.token;
  }

  async listWorkspaceUsers(workspaceId: WorkspaceId) {
    await this.checkWorkspacePerms(workspaceId, "viewer", "list users");
    return this.workspaceUsers().find({
      workspaceId,
      ...excludeDeleted(),
    });
  }

  async editWorkspaceUser(
    workspaceId: WorkspaceId,
    userId: string,
    roles: string[],
    properties: any
  ) {
    await this.checkWorkspacePerms(workspaceId, "editor", "edit user");
    const workspaceUser = await findExactlyOne(this.workspaceUsers(), {
      id: userId,
    });
    workspaceUser.roles = roles;
    workspaceUser.properties = properties;
    await this.workspaceUsers().save(workspaceUser);
    return workspaceUser;
  }

  async createWorkspaceAuthConfig(
    workspaceId: WorkspaceId,
    provider: string | undefined,
    config: any
  ) {
    await this.checkWorkspacePerms(workspaceId, "editor", "create auth config");
    const workspaceAuthConfig = this.workspaceAuthConfigs().create({
      ...this.stampNew(),
      workspaceId,
      provider,
      config,
    });
    await this.workspaceAuthConfigs().save(workspaceAuthConfig);
    return workspaceAuthConfig;
  }

  async getWorkspaceAuthConfig(workspaceId: WorkspaceId) {
    await this.checkWorkspacePerms(workspaceId, "viewer", "get auth config");
    return this.workspaceAuthConfigs().findOne({
      workspaceId,
      ...excludeDeleted(),
    });
  }

  async createEndUserDirectory(teamId: TeamId, name?: string) {
    await this.checkTeamPerms(teamId, "editor", "create end user directory");
    const endUserDirectory = this.endUserDirectories().create({
      ...this.stampNew(),
      teamId,
      name,
      token: generateSomeApiToken(),
      config: {},
    });
    await this.endUserDirectories().save(endUserDirectory);
    return endUserDirectory;
  }

  async getEndUserDirectory(endUserDirectoryId: string) {
    const endUserDirectory = await findExactlyOne(this.endUserDirectories(), {
      id: endUserDirectoryId,
    });
    await this.checkTeamPerms(
      endUserDirectory.teamId,
      "viewer",
      "get end user directory"
    );
    return endUserDirectory;
  }

  async getEndUserDirectoryApps(endUserDirectoryId: string) {
    const endUserDirectory = await findExactlyOne(this.endUserDirectories(), {
      id: endUserDirectoryId,
    });
    await this.checkTeamPerms(
      endUserDirectory.teamId,
      "viewer",
      "get end user directory apps"
    );
    const appConfigs = await this.appAuthConfigs().find({
      where: {
        directoryId: endUserDirectoryId,
        ...excludeDeleted(),
      },
      relations: ["project"],
    });
    return withoutNils(appConfigs.map((appConfig) => appConfig.project));
  }

  async updateEndUserDirectory(
    endUserDirectoryId: string,
    changes: Pick<EndUserDirectory, "name">
  ) {
    const endUserDirectory = await findExactlyOne(this.endUserDirectories(), {
      id: endUserDirectoryId,
    });
    await this.checkTeamPerms(
      endUserDirectory.teamId,
      "editor",
      "update end user directory"
    );
    const result = await this.endUserDirectories().save({
      ...endUserDirectory,
      ...changes,
    });
    return result;
  }

  async deleteEndUserDirectory(endUserDirectoryId: string) {
    const endUserDirectory = await findExactlyOne(this.endUserDirectories(), {
      id: endUserDirectoryId,
    });
    await this.checkTeamPerms(
      endUserDirectory.teamId,
      "editor",
      "delete end user directory"
    );
    const apps = await this.getEndUserDirectoryApps(endUserDirectoryId);
    if (apps.length > 0) {
      throw new Error(
        `Cannot delete end user directory ${endUserDirectoryId} because it has apps associated with it`
      );
    }
    await this.endUserDirectories().save({
      ...endUserDirectory,
      ...this.stampDelete(),
    });
  }

  async upsertAppAuthConfig(
    projectId: ProjectId,
    config: Partial<AppAuthConfig>,
    skipPermissionCheck = false
  ) {
    if (!skipPermissionCheck) {
      await this.checkProjectPerms(
        projectId,
        "editor",
        "upsert app auth config"
      );
    }
    let appAuthConfig = await this.appAuthConfigs().findOne({
      projectId,
      ...excludeDeleted(),
    });
    if (!appAuthConfig) {
      appAuthConfig = this.appAuthConfigs().create({
        ...this.stampNew(),
        projectId,
        ...config,
        token: generateSomeApiToken(),
      });

      // Apps will be private by default as `registeredRoleId` isn't set

      // Create anonymous Viewer role first to enforce the lowest order
      await this.createAppRole(projectId, "Anonymous");

      // Create default Normal User role
      await this.createAppRole(projectId, "Normal User");

      // Create default Admin role
      await this.createAppRole(projectId, "Admin");
    } else {
      appAuthConfig = this.appAuthConfigs().create({
        ...appAuthConfig,
        ...config,
      });
    }
    await this.appAuthConfigs().save(appAuthConfig);
    return findExactlyOne(this.appAuthConfigs(), {
      projectId,
      ...excludeDeleted(),
    });
  }

  async getAppAuthConfigForToken(token: string) {
    await this.checkSuperUser();
    const appAuthConfig = await this.appAuthConfigs().findOne({
      token,
      ...excludeDeleted(),
    });
    return appAuthConfig;
  }

  async deleteAppAuthConfig(projectId: ProjectId) {
    await this.checkProjectPerms(projectId, "editor", "delete app auth config");
    const appAuthConfig = await findExactlyOne(this.appAuthConfigs(), {
      projectId,
      ...excludeDeleted(),
    });
    await this.appAuthConfigs().save({
      ...appAuthConfig,
      ...this.stampDelete(),
    });
  }

  async disableAppAuthConfig(projectId: ProjectId) {
    await this.checkProjectPerms(
      projectId,
      "editor",
      "disable app auth config"
    );
    const appAccessRules = await this.listAppAccessRules(projectId);
    await this.appEndUserAccess().save(
      appAccessRules.map((appAccessRule) => ({
        ...appAccessRule,
        ...this.stampDelete(),
      }))
    );

    await this.deleteAppAuthConfig(projectId);

    const appRoles = await this.listAppRoles(projectId);
    await this.appRoles().save(
      appRoles.map((appRole) => ({
        ...appRole,
        ...this.stampDelete(),
      }))
    );
  }

  async getPublicAppAuthConfig(
    projectId: string
  ): Promise<
    | Pick<
        AppAuthConfig,
        | "id"
        | "provider"
        | "directoryId"
        | "registeredRole"
        | "registeredRoleId"
      >
    | undefined
  > {
    return this.appAuthConfigs().findOne({
      select: [
        "id",
        "provider",
        "projectId",
        "directoryId",
        "registeredRoleId",
      ],
      where: {
        projectId,
        ...excludeDeleted(),
      },
      relations: ["registeredRole"],
    });
  }

  async getAppAuthConfig(projectId: string, skipPermissionCheck = false) {
    if (!skipPermissionCheck) {
      // Only editor should read full app auth config as it contains token associated with
      // config
      await this.checkProjectPerms(projectId, "editor", "get app auth config");
    }
    // This is expected to not fail if the app auth config does not exist
    return this.appAuthConfigs().findOne({
      where: {
        projectId,
        ...excludeDeleted(),
      },
      relations: ["registeredRole"],
    });
  }

  async upsertEndUser(
    directoryId: string,
    identifier: EndUserIdentifier,
    userId: UserId | undefined = undefined,
    properties: Record<string, any> = {}
  ) {
    let endUser = await this.endUsers().findOne({
      directoryId,
      ...(identifier.email ? { email: identifier.email } : {}),
      ...(identifier.externalId ? { externalId: identifier.externalId } : {}),
      ...excludeDeleted(),
    });
    if (!endUser) {
      endUser = this.endUsers().create({
        ...this.stampNew(),
        directoryId,
        userId,
        ...identifier,
        properties,
      });
    }
    if (userId) {
      endUser.userId = userId;
    }
    endUser.properties = properties;
    await this.endUsers().save(endUser);
    return endUser;
  }

  async getUserDirectoryByToken(token: string) {
    const endUserDirectory = await findExactlyOne(this.endUserDirectories(), {
      token,
      ...excludeDeleted(),
    });
    return endUserDirectory;
  }

  async existsIssuedCode(code: string): Promise<boolean> {
    const exists = await this.issuedCodes().findOne({
      code,
      ...excludeDeleted(),
    });
    return !!exists;
  }

  async insertIssuedCode(code: string) {
    const issuedCode = this.issuedCodes().create({
      ...this.stampNew(),
      code,
    });
    await this.issuedCodes().save(issuedCode);
    return issuedCode;
  }

  async getDirectoryUsers(directoryId: string) {
    await this.checkDirectoryPerms(
      directoryId,
      "viewer",
      "get directory users"
    );
    // Verify that the user has access to the directory/team
    return this.endUsers().find({
      directoryId,
      ...excludeDeleted(),
    });
  }

  async listTeamEndUserDirectories(teamId: TeamId) {
    await this.checkTeamPerms(teamId, "viewer", "list end user directories");
    return this.endUserDirectories().find({
      teamId,
      ...excludeDeleted(),
    });
  }

  async getAppDefaultRole(projectId: string) {
    await this.checkProjectPerms(projectId, "viewer", "get app default role");
    const appRole = await findExactlyOne(this.appRoles(), {
      projectId,
      order: 1, // Default role is the lowest role besides anonymous
      ...excludeDeleted(),
    });
    return appRole;
  }

  async getAppRole(projectId: string, roleId: string) {
    await this.checkProjectPerms(projectId, "viewer", "get app role");
    const appRole = await this.appRoles().findOne({
      projectId,
      id: roleId,
      ...excludeDeleted(),
    });
    return appRole;
  }

  async listAppRoles(projectId: string, skipPermissionCheck = false) {
    if (!skipPermissionCheck) {
      await this.checkProjectPerms(projectId, "viewer", "get app roles");
    }
    return this.appRoles().find({
      where: {
        projectId,
        ...excludeDeleted(),
      },
      order: {
        order: "DESC",
      },
    });
  }

  async changeAppRolesOrder(
    projectId: string,
    newOrders: Record<string, number>
  ) {
    await this.checkProjectPerms(projectId, "editor", "change app roles order");
    const appRoles = await this.listAppRoles(projectId);
    appRoles.forEach((appRole) => {
      // Skip any changes to anonymous role
      if (appRole.order === 0) {
        return;
      }
      if (newOrders[appRole.id]) {
        appRole.order = newOrders[appRole.id];
      }
    });
    await this.appRoles().save(appRoles);
  }

  async createAppRole(projectId: string, name: string) {
    await this.checkProjectPerms(projectId, "editor", "create role for app");
    const appRoles = await this.listAppRoles(projectId);
    const roleOrder = appRoles.length > 0 ? appRoles[0].order + 1 : 0;
    const role = this.appRoles().create({
      ...this.stampNew(),
      projectId,
      name,
      order: roleOrder,
    });
    await this.appRoles().save(role);
    return role;
  }

  async updateAppRole(roleId: string, name: string) {
    const role = await findExactlyOne(this.appRoles(), {
      id: roleId,
      ...excludeDeleted(),
    });
    await this.checkProjectPerms(role.projectId, "editor", "update app role");
    role.name = name;
    await this.appRoles().save(role);
    return role;
  }

  async deleteAppRole(roleId: string) {
    const role = await findExactlyOne(this.appRoles(), {
      id: roleId,
      ...excludeDeleted(),
    });
    const appAuthConfig = await this.getPublicAppAuthConfig(role.projectId);
    if (appAuthConfig?.registeredRoleId === roleId) {
      throw new ForbiddenError("Cannot delete the registered role for an app");
    }
    const accessList = await this.listAppAccessRules(role.projectId);
    if (accessList.some((access) => access.roleId === roleId)) {
      throw new ForbiddenError(
        "Cannot delete a role that is assigned to an access rule"
      );
    }
    const appRoles = await this.listAppRoles(role.projectId);
    if (appRoles.length === 1) {
      throw new ForbiddenError("Cannot delete the only role for an app");
    }
    await this.checkProjectPerms(role.projectId, "editor", "delete app role");
    await this.appRoles().save({
      ...role,
      ...this.stampDelete(),
    });
    const newRoles = appRoles.filter((appRole) => appRole.id !== roleId);
    await this.changeAppRolesOrder(
      role.projectId,
      newRoles.reduce(
        (acc, appRole, idx) => ({
          ...acc,
          [appRole.id]: newRoles.length - 1 - idx,
        }),
        {}
      )
    );
  }

  async listAppAccessRules(projectId: string, skipPermissionCheck = false) {
    if (!skipPermissionCheck) {
      if (
        accessLevelRank(await this.getActorAccessLevelToProject(projectId)) <
        accessLevelRank("editor")
      ) {
        // Limited to editor as the access rules exposes users of a project
        // Instead of throwing an error if the user is not an editor, we return an empty list
        // so that the UI can still load and clone still works but without any access rules
        return [];
      }
    }
    return this.appEndUserAccess().find({
      where: {
        projectId,
        ...excludeDeleted(),
        manuallyAdded: true,
      },
      relations: ["role"],
    });
  }

  async getOldestAppEmailAccessRule(projectId: string) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get app end user accesses"
    );
    return this.appEndUserAccess().findOne({
      where: {
        projectId,
        email: Not(IsNull()),
        ...excludeDeleted(),
      },
      order: {
        createdAt: "ASC",
      },
    });
  }

  async listEmailAccessRules(projectId: string) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get app end user accesses"
    );
    return this.appEndUserAccess().find({
      where: {
        projectId,
        email: Not(IsNull()),
        ...excludeDeleted(),
      },
      relations: ["role"],
    });
  }

  async getAppEndUserAccessByIdentifier(
    projectId: string,
    identifier: AppEndUserAccessIdentifier
  ) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get app end user access"
    );
    const appEndUserAccess = await this.appEndUserAccess().findOne({
      where: {
        projectId,
        ...identifier,
        ...excludeDeleted(),
      },
      relations: ["role"],
    });
    return appEndUserAccess;
  }

  async getAppEndUserAccessByGroups(projectId: string, groupIds: string[]) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get app end user access"
    );
    const appEndUserAccess = await this.appEndUserAccess().find({
      where: {
        projectId,
        directoryEndUserGroupId: In(groupIds),
        ...excludeDeleted(),
      },
      relations: ["role"],
    });
    return appEndUserAccess;
  }

  async upsertAppEndUserAccess(
    projectId: string,
    identifier: AppEndUserAccessIdentifier,
    roleId?: string,
    manuallyAdded = true
  ) {
    await this.checkProjectPerms(
      projectId,
      "editor",
      "upsert app end user access"
    );
    let appEndUserAccess = await this.appEndUserAccess().findOne({
      projectId,
      ...identifier,
      ...excludeDeleted(),
    });
    if (!appEndUserAccess) {
      appEndUserAccess = this.appEndUserAccess().create({
        ...this.stampNew(),
        projectId,
        ...identifier,
        manuallyAdded,
      });
    }
    if (!roleId) {
      const defaultRole = await this.getAppDefaultRole(projectId);
      appEndUserAccess.roleId = defaultRole.id;
    } else {
      appEndUserAccess.roleId = roleId;
    }
    await this.appEndUserAccess().save({
      ...appEndUserAccess,
      ...this.stampUpdate(),
      manuallyAdded,
    });
    return appEndUserAccess;
  }

  async createAccessRules(
    projectId: string,
    accesses: {
      emails: string[];
      externalIds: string[];
      directoryEndUserGroupIds: string[];
      domains: string[];
    },
    roleId?: string
  ) {
    await this.checkProjectPerms(projectId, "editor", "invite user to app");
    const {
      emails = [],
      externalIds = [],
      directoryEndUserGroupIds = [],
      domains = [],
    } = accesses;
    const appEndUserAccesses: AppEndUserAccess[] = [];
    const identifiers = [
      ...emails.map((email) => ({ email })),
      ...externalIds.map((externalId) => ({ externalId })),
      ...directoryEndUserGroupIds.map((directoryEndUserGroupId) => ({
        directoryEndUserGroupId,
      })),
      ...domains.map((domain) => ({ domain })),
    ];
    // TODO(fmota): do it in paralel and more efficiently
    for (const identifier of identifiers) {
      const appEndUserAccess = await this.upsertAppEndUserAccess(
        projectId,
        identifier,
        roleId
      );
      appEndUserAccesses.push(appEndUserAccess);
    }
    return appEndUserAccesses;
  }

  async updateAccessRule(
    projectId: string,
    accessId: string,
    roleId: string,
    manuallyAdded = true
  ) {
    await this.checkProjectPerms(projectId, "editor", "update app user");
    const appEndUserAccess = await findExactlyOne(this.appEndUserAccess(), {
      id: accessId,
      ...excludeDeleted(),
    });
    if (appEndUserAccess.projectId !== projectId) {
      throw new ForbiddenError("Cannot update user from another app");
    }
    appEndUserAccess.roleId = roleId;
    // We consider this
    appEndUserAccess.manuallyAdded = manuallyAdded;
    await this.appEndUserAccess().save(appEndUserAccess);
    return appEndUserAccess;
  }

  async deleteAccessRule(projectId: string, accessId: string) {
    await this.checkProjectPerms(projectId, "editor", "delete app user");
    const appEndUserAccess = await findExactlyOne(this.appEndUserAccess(), {
      id: accessId,
      ...excludeDeleted(),
    });
    if (appEndUserAccess.projectId !== projectId) {
      throw new ForbiddenError("Cannot delete user from another app");
    }
    await this.appEndUserAccess().save({
      ...appEndUserAccess,
      ...this.stampDelete(),
    });
  }

  async getEndUserByIdentifier(
    identifier: EndUserIdentifier,
    appId: string,
    opts?: {
      skipDirectoryPermsCheck?: boolean;
    }
  ) {
    const appAuthConfig = await this.getPublicAppAuthConfig(appId);

    if (!appAuthConfig) {
      return undefined;
    }

    const endUser = await this.endUsers().findOne({
      where: {
        ...identifier,
        directoryId: appAuthConfig.directoryId,
        ...excludeDeleted(),
      },
      relations: ["directory"],
    });

    if (!endUser) {
      return undefined;
    }

    if (!endUser.directory) {
      throw new Error("End user does not have a directory");
    }

    if (!opts?.skipDirectoryPermsCheck) {
      await this.checkDirectoryPerms(
        endUser.directoryId,
        "viewer",
        "get end user"
      );
    }
    return endUser;
  }

  async getEndUsersByIds(endUserIds: string[]) {
    const endUsers = await this.endUsers().find({
      where: {
        id: In(endUserIds),
        ...excludeDeleted(),
      },
    });
    return endUsers;
  }

  async getAppEndUserAccess(appEndUserAccessId: string) {
    const appEndUserAccess = await findExactlyOne(this.appEndUserAccess(), {
      where: {
        id: appEndUserAccessId,
        ...excludeDeleted(),
      },
      relations: ["role"],
    });
    await this.checkProjectPerms(
      appEndUserAccess.projectId,
      "viewer",
      "get app end user access"
    );
    return appEndUserAccess;
  }

  async checkDirectoryPerms(
    directoryId: string,
    requiredLevel: AccessLevel,
    action: string
  ) {
    const directory = await findExactlyOne(this.endUserDirectories(), {
      where: {
        id: directoryId,
        ...excludeDeleted(),
      },
    });
    await this.checkTeamPerms(directory.teamId, requiredLevel, action);
    return directory;
  }

  async getEndUserDirectoryById(directoryId: string) {
    const directory = await this.checkDirectoryPerms(
      directoryId,
      "viewer",
      "access end user directory"
    );
    return directory;
  }

  async getEndUsersByEmails(directoryId: string, emails: string[]) {
    await this.checkDirectoryPerms(
      directoryId,
      "viewer",
      "get end users by emails"
    );
    const endUsers = await this.endUsers().find({
      where: {
        directoryId,
        email: In(emails),
        ...excludeDeleted(),
      },
    });
    return endUsers;
  }

  async addDirectoryEndUsers(directoryId: string, emails: string[]) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "add end users to directory"
    );
    const uniqEmails = uniq(emails);

    const existingEndUsers = await this.getEndUsersByEmails(
      directoryId,
      uniqEmails
    );
    const existingEmails = existingEndUsers.map((endUser) => endUser.email);

    const newEmails = uniqEmails.filter(
      (email) => !existingEmails.includes(email)
    );
    const newEndUsers: EndUser[] = newEmails.map((email) => {
      return this.endUsers().create({
        ...this.stampNew(),
        email,
        directoryId,
        properties: {},
      });
    });
    await this.endUsers().save(newEndUsers);
    return [...existingEndUsers, ...newEndUsers];
  }

  async removeEndUserFromDirectory(directoryId: string, endUserId: string) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "remove end user from directory"
    );
    const endUser = await findExactlyOne(this.endUsers(), {
      where: {
        id: endUserId,
        ...excludeDeleted(),
      },
    });
    if (endUser.directoryId !== directoryId) {
      throw new ForbiddenError("Cannot remove end user from another directory");
    }
    await this.endUsers().save({
      ...endUser,
      ...this.stampDelete(),
    });
  }

  async getDirectoryGroupById(directoryId: string, groupId: string) {
    await this.checkDirectoryPerms(
      directoryId,
      "viewer",
      "get directory group"
    );
    const directoryGroup = await findExactlyOne(this.directoryEndUserGroups(), {
      where: {
        id: groupId,
        ...excludeDeleted(),
      },
    });
    if (directoryGroup.directoryId !== directoryId) {
      throw new ForbiddenError("Cannot update group from another directory");
    }
    return directoryGroup;
  }

  async getDirectoryGroups(directoryId: string, skipPermissionCheck = false) {
    if (!skipPermissionCheck) {
      await this.checkDirectoryPerms(
        directoryId,
        "viewer",
        "get directory groups"
      );
    }
    return this.directoryEndUserGroups().find({
      where: {
        directoryId,
        ...excludeDeleted(),
      },
    });
  }

  async createDirectoryGroup(directoryId: string, name: string) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "create directory group"
    );
    const directoryGroup = this.directoryEndUserGroups().create({
      ...this.stampNew(),
      directoryId,
      name,
    });
    return this.directoryEndUserGroups().save(directoryGroup);
  }

  async getDirectoryGroupsByIds(ids: string[]) {
    return this.directoryEndUserGroups().findByIds(ids);
  }

  async updateDirectoryGroup(
    directoryId: string,
    groupId: string,
    name: string
  ) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "update directory group"
    );
    const directoryGroup = await this.getDirectoryGroupById(
      directoryId,
      groupId
    );
    directoryGroup.name = name;
    return this.directoryEndUserGroups().save(directoryGroup);
  }

  async deleteDirectoryGroup(directoryId: string, groupId: string) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "delete directory group"
    );
    const directoryGroup = await this.getDirectoryGroupById(
      directoryId,
      groupId
    );
    await this.directoryEndUserGroups().save({
      ...directoryGroup,
      ...this.stampDelete(),
    });

    // Hard delete all relations to this group
    await this.appEndUserGroups().delete({
      directoryEndUserGroupId: groupId,
    });
  }

  async addEndUserToGroups(
    directoryId: string,
    endUserId: string,
    groupIds: string[]
  ) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "add end user to groups"
    );
    const appEndUserGroups = groupIds.map((groupId) => {
      // TODO(fmota): validate group id (?)
      return this.appEndUserGroups().create({
        ...this.stampNew(),
        endUserId,
        directoryEndUserGroupId: groupId,
      });
    });

    return this.appEndUserGroups().save(appEndUserGroups);
  }

  async removeEndUserFromGroups(
    directoryId: string,
    endUserId: string,
    groupIds: string[]
  ) {
    await this.checkDirectoryPerms(
      directoryId,
      "editor",
      "remove end user from groups"
    );
    const appEndUserGroups = await this.appEndUserGroups().find({
      where: {
        endUserId,
        directoryEndUserGroupId: In(groupIds),
      },
    });
    await this.appEndUserGroups().save(
      appEndUserGroups.map((appEndUserGroup) => {
        return {
          ...appEndUserGroup,
          ...this.stampDelete(),
        };
      })
    );
  }

  async listEndUsersGroups(
    directoryId: string,
    endUserIds: string[],
    opts?: {
      skipDirectoryPermsCheck?: boolean;
    }
  ) {
    if (!opts?.skipDirectoryPermsCheck) {
      await this.checkDirectoryPerms(
        directoryId,
        "viewer",
        "list end users groups"
      );
    }
    // No need to validate that groups belong to directory, since endUser lives inside the directory
    return this.appEndUserGroups().find({
      where: {
        endUserId: In(endUserIds),
        ...excludeDeleted(),
      },
    });
  }

  async listAppAccessRegistries(
    projectId: string,
    pagination: {
      size: number;
      page: number;
    },
    search: string
  ) {
    // Limited to editor as the access rules exposes users of a project
    // Instead of throwing an error if the user is not an editor, we return an empty list
    // so that the UI can still load
    if (
      accessLevelRank(await this.getActorAccessLevelToProject(projectId)) <
      accessLevelRank("editor")
    ) {
      return [];
    }

    return await this.getEntMgr().query(
      `
    select
      "endUserId", "projectId",
      end_user.email,
      end_user."externalId",
      app_access_registry."createdAt",
      app_access_registry."updatedAt",
      app_access_registry.id
    from app_access_registry
    left join end_user on end_user.id = app_access_registry."endUserId"
    where
        "projectId" = $1
        and (
          end_user.email ilike $2
          or end_user."externalId" ilike $2
        )
    order by app_access_registry."updatedAt" desc
    offset $3
    limit $4;
    `,
      [
        projectId,
        `%${search}%`,
        pagination.size * pagination.page,
        pagination.size,
      ]
    );
  }

  async deleteAppAccessRegister(projectId: string, accessId: string) {
    await this.checkProjectPerms(projectId, "editor", "delete user access");
    await this.appAccessRegistries().delete({
      id: accessId,
    });
  }

  async countAppAccessRegistries(projectId: string, search: string) {
    await this.checkProjectPerms(projectId, "viewer", "list app access");
    const result = await this.getEntMgr().query(
      `
      select count(*) from app_access_registry left join end_user on end_user.id = app_access_registry."endUserId"
      where "projectId" = $1 and end_user.email ilike $2;
      `,
      [projectId, `%${search}%`]
    );
    return Number.parseInt(result[0].count);
  }

  async upsertAppAccessRegistry(projectId: string, endUserId: string) {
    await this.checkProjectPerms(projectId, "viewer", "list app access");
    let appAccessRegistry = await this.appAccessRegistries().findOne({
      where: {
        projectId,
        endUserId,
        ...excludeDeleted(),
      },
    });
    if (!appAccessRegistry) {
      appAccessRegistry = this.appAccessRegistries().create({
        ...this.stampNew(),
        projectId,
        endUserId,
      });
    }
    await this.appAccessRegistries().save({
      ...appAccessRegistry,
      ...this.stampUpdate(),
    });
    return appAccessRegistry;
  }

  /**
   * @param recency how many days back to look for users that have logged in the app
   * @param threshold how many logins to consider a app as active
   */
  async getAppAuthMetrics(recency = 7, threshold = 0) {
    this.checkSuperUser();

    const appsUsingPlasmicAuth = await this.appAuthConfigs().count({
      provider: "plasmic-auth",
      ...excludeDeleted(),
    });

    const appsUsingCustomAuth = await this.appAuthConfigs().count({
      provider: "custom-auth",
      ...excludeDeleted(),
    });

    const numberOfActiveApps = (
      await this.getEntMgr().query(
        `
      select count(*) from (
        select "projectId", count(*) as amount
            from app_access_registry
            where "updatedAt" > now() - $1::interval
            group by "projectId"
            order by amount desc
      ) as apps_with_active_users where amount > $2;
    `,
        [`${recency} days`, threshold]
      )
    )[0].count;

    const mostActiveApps = await this.appAccessRegistries()
      .createQueryBuilder("reg")
      .select("reg.projectId", "projectId")
      .addSelect("count(*)", "amount")
      .where("reg.updatedAt > now() - :recency::interval", {
        recency: `${recency} days`,
      })
      .groupBy("reg.projectId")
      .orderBy("amount", "DESC")
      .limit(10)
      .getRawMany();

    return {
      appsUsingPlasmicAuth,
      appsUsingCustomAuth,
      numberOfActiveApps,
      mostActiveApps,
    };
  }
  // Initialize a new auth config re using the auth config from another project
  async createAppAuthConfigFromProject(opts: {
    fromProjectId: ProjectId;
    toProjectId: ProjectId;
    toDirectoryId: string;
    oldToNewDirectoryGroupIds: Record<string, string>;
    keepGroupRefs: boolean;
  }) {
    const {
      fromProjectId,
      toProjectId,
      toDirectoryId,
      oldToNewDirectoryGroupIds,
      keepGroupRefs,
    } = opts;

    await this.checkProjectPerms(fromProjectId, "viewer", "copy auth config");
    await this.checkProjectPerms(toProjectId, "viewer", "copy auth config");
    await this.checkDirectoryPerms(toDirectoryId, "viewer", "copy auth config");

    const authConfig = await this.getAppAuthConfig(fromProjectId, true);

    if (!authConfig) {
      throw new NotFoundError("Auth config not found");
    }

    const oldToNewRoleIds: Record<string, string> = {};

    const appRoles = await this.listAppRoles(fromProjectId, true);
    const newAppRoles = appRoles.map((appRole) => {
      const newRole = this.appRoles().create({
        ...appRole,
        ...this.stampNew(),
        projectId: toProjectId,
      });
      oldToNewRoleIds[appRole.id] = newRole.id;
      return newRole;
    });
    await this.appRoles().save(newAppRoles);

    const newAuthConfig = this.appAuthConfigs().create({
      ...authConfig,
      ...this.stampNew(),
      token: generateSomeApiToken(),
      projectId: toProjectId,
      directoryId: toDirectoryId,
      registeredRole: null,
      registeredRoleId: authConfig.registeredRoleId
        ? oldToNewRoleIds[authConfig.registeredRoleId]
        : null,
    });
    await this.appAuthConfigs().save(newAuthConfig);

    const accessRules = await this.listAppAccessRules(fromProjectId, true);
    const newAccessRules = accessRules.map((accessRule) => {
      // Also requires to fix directoryEndUserGroupId
      const newAccessRule = this.appEndUserAccess().create({
        ...accessRule,
        ...this.stampNew(),
        directoryEndUserGroupId: keepGroupRefs
          ? accessRule.directoryEndUserGroupId
          : accessRule.directoryEndUserGroupId
          ? oldToNewDirectoryGroupIds[accessRule.directoryEndUserGroupId]
          : null,
        projectId: toProjectId,
        role: null,
        roleId: oldToNewRoleIds[accessRule.roleId],
      });

      return newAccessRule;
    });
    await this.appEndUserAccess().save(newAccessRules);

    return {
      oldToNewRoleIds,
      oldToNewDirectoryGroupIds,
    };
  }

  async createDirectoryGroupsFromDirectory(
    fromDirectoryId: string,
    toDirectoryId: string
  ) {
    // No checks for the directory permissions, since we only copy the groups
    // And checking the perms for the directory would require the user to have
    // access to the team where the fromProject lives, which may not be the case
    // as the fromProject may be a template
    const directoryGroups = await this.getDirectoryGroups(
      fromDirectoryId,
      true
    );
    const oldToNewDirectoryGroupIds: Record<string, string> = {};
    const newDirectoryGroups = directoryGroups.map((directoryGroup) => {
      const newDirectory = this.directoryEndUserGroups().create({
        ...directoryGroup,
        ...this.stampNew(),
        directoryId: toDirectoryId,
      });
      oldToNewDirectoryGroupIds[directoryGroup.id] = newDirectory.id;
      return newDirectory;
    });

    await this.directoryEndUserGroups().save(newDirectoryGroups);
    return oldToNewDirectoryGroupIds;
  }

  async moveAppAuthToWorkspace(projectId: ProjectId, workspaceId: WorkspaceId) {
    await this.checkProjectPerms(projectId, "editor", "move auth config");
    await this.checkWorkspacePerms(workspaceId, "editor", "move auth config");
    const authConfig = await this.getPublicAppAuthConfig(projectId);
    if (!authConfig) {
      return;
    }
    const directoryId = authConfig.directoryId;
    const directory = await this.getEndUserDirectoryById(directoryId);
    const workspace = await this.getWorkspaceById(workspaceId);
    if (directory.teamId === workspace.teamId) {
      return;
    }

    const accessRules = await this.listAppAccessRules(projectId);
    const byGroupAccessRules = accessRules
      .filter((accessRule) => accessRule.directoryEndUserGroupId)
      .map((accessRule) => {
        return {
          ...accessRule,
          ...this.stampDelete(),
        };
      });
    await this.appEndUserAccess().save(byGroupAccessRules);

    const newDirectory = await this.createEndUserDirectory(
      workspace.teamId,
      directory.name
    );
    await this.upsertAppAuthConfig(projectId, {
      directoryId: newDirectory.id,
    });
  }

  async getCommentsForProject({
    projectId,
    branchId,
  }: ProjectAndBranchId): Promise<Comment[]> {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "viewer",
      "view comments",
      false
    );
    return await this.comments().find({
      where: {
        projectId,
        branchId: branchId ?? null,
        ...excludeDeleted(),
      },
    });
  }

  async getCommentsForThread(threadId: CommentThreadId): Promise<Comment[]> {
    return await this.comments().find({
      where: {
        threadId,
        ...excludeDeleted(),
      },
      order: {
        createdAt: "ASC", // Sort by createdAt in ascending order
      },
      relations: ["createdBy"],
    });
  }

  async getUnnotifiedComments(): Promise<Comment[]> {
    this.checkSuperUser();
    return await this.comments().find({
      where: {
        isEmailNotificationSent: false,
        ...excludeDeleted(),
      },
      order: {
        createdAt: "ASC", // Sort by createdAt in ascending order
      },
      relations: ["createdBy"],
    });
  }

  async markCommentsAsNotified(commentIds: string[]): Promise<void> {
    this.checkSuperUser();
    await this.comments().update(
      { id: In(commentIds) }, // Match comments by their IDs
      { isEmailNotificationSent: true } // Set the notification status to true
    );
  }

  async postCommentInProject(
    { projectId, branchId }: ProjectAndBranchId,
    data: { location: CommentLocation; body: string; threadId: string }
  ): Promise<Comment> {
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "commenter",
      "post comment",
      true
    );
    const comment = this.comments().create({
      ...this.stampNew(),
      projectId,
      branchId: branchId ?? null,
      resolved: false,
      ...data,
    });
    await this.entMgr.save([comment]);
    return comment;
  }

  async editCommentInProject(
    commentId: CommentId,
    data: {
      body?: string;
      resolved?: boolean;
    }
  ) {
    const comment = await findExactlyOne(this.comments(), {
      id: commentId,
    });

    this.checkUserIdIsSelf(comment.createdById ?? undefined);

    Object.assign(comment, this.stampUpdate(), data);
    await this.entMgr.save(comment);
    return comment;
  }

  async deleteCommentInProject(
    { projectId, branchId }: ProjectAndBranchId,
    commentId: CommentId
  ): Promise<Comment> {
    const comment = await findExactlyOne(this.comments(), {
      projectId,
      branchId: branchId ?? null,
      id: commentId,
    });
    if (!this.isUserIdSelf(comment.createdById ?? undefined)) {
      await this.checkProjectBranchPerms(
        { projectId, branchId },
        "editor",
        "delete comments",
        true
      );
    }
    Object.assign(comment, this.stampDelete());
    await this.entMgr.save(comment);
    return comment;
  }

  async getFirstCommentInThread(
    threadId: CommentThreadId
  ): Promise<Comment | undefined> {
    return await this.comments().findOne({
      where: {
        threadId,
        ...excludeDeleted(),
      },
      order: {
        createdAt: "ASC",
      },
    });
  }

  async deleteThreadInProject(
    { projectId, branchId }: ProjectAndBranchId,
    threadId: CommentThreadId
  ): Promise<UpdateResult> {
    const firstComment = ensure(
      await this.getFirstCommentInThread(threadId),
      "Comment in thread should exist"
    );

    if (!this.isUserIdSelf(firstComment.createdById ?? undefined)) {
      await this.checkProjectBranchPerms(
        { projectId, branchId },
        "editor",
        "delete comments",
        true
      );
    }

    const updateQuery = this.comments()
      .createQueryBuilder()
      .update()
      .set(this.stampDelete())
      .where({
        projectId,
        threadId,
      });

    return updateQuery.execute();
  }

  async getReactionsForComments(
    comments: Comment[]
  ): Promise<CommentReaction[]> {
    if (comments.length === 0) {
      return [];
    }
    const projectId = only([...new Set(comments.map((c) => c.projectId))]);
    const branchId =
      only([...new Set(comments.map((c) => c.branchId))]) ?? undefined;
    await this.checkProjectBranchPerms(
      { projectId, branchId },
      "viewer",
      "view comment reactions",
      false
    );
    return await this.commentReactions().find({
      where: {
        commentId: In(comments.map((c) => c.id)),
        ...excludeDeleted(),
      },
    });
  }

  async addCommentReaction(
    commentId: CommentId,
    data: CommentReactionData
  ): Promise<CommentReaction> {
    await this.checkCommentPerms(
      commentId,
      "commenter",
      "post comment reaction",
      true
    );
    const reaction = this.commentReactions().create({
      ...this.stampNew(),
      commentId,
      data,
    });
    await this.entMgr.save([reaction]);
    return reaction;
  }

  async removeCommentReaction(
    reactionId: CommentReactionId
  ): Promise<CommentReaction> {
    const reaction = await findExactlyOne(this.commentReactions(), {
      id: reactionId,
    });
    await this.checkCommentPerms(
      reaction.commentId,
      "commenter",
      "post comment reaction",
      true
    );
    Object.assign(reaction, this.stampDelete());
    await this.entMgr.save([reaction]);
    return reaction;
  }

  private async checkCommentPerms(
    commentId: CommentId,
    requireLevel: AccessLevel,
    action: string,
    addPerm: boolean
  ) {
    const comment = await findExactlyOne(this.comments(), {
      id: commentId,
    });
    await this.checkProjectBranchPerms(
      { projectId: comment.projectId, branchId: comment.branchId ?? undefined },
      requireLevel,
      action,
      addPerm
    );
  }

  async tryGetNotificationSettings(
    userId: UserId,
    projectId: ProjectId
  ): Promise<ApiNotificationSettings | undefined> {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "get notification settings",
      false
    );
    const settings = await this.tryGetKeyValue(
      "notification-settings",
      JSON.stringify({ userId, projectId })
    );
    return settings ? JSON.parse(settings.value) : undefined;
  }

  async updateNotificationSettings(
    userId: UserId,
    projectId: ProjectId,
    settings: ApiNotificationSettings
  ) {
    await this.checkProjectPerms(
      projectId,
      "viewer",
      "update notification settings",
      false
    );
    await this.setKeyValue(
      "notification-settings",
      JSON.stringify({ userId, projectId }),
      JSON.stringify(settings)
    );
  }

  /**
   * Blocks until lock with key `resurce` is available for the transaction.
   */
  async waitLockTransactionResource(resource: string) {
    const key = stringToPair(resource);
    const lockTable = "pg_advisory_xact_lock";
    await this.getEntMgr().query(`SELECT ${lockTable}(${key[0]}, ${key[1]})`);
    return true;
  }

  async getPersonalWorkspace() {
    if (!isNormalUser(this.actor)) {
      return null;
    }

    const personalTeam = ensureFound<Team>(
      await this.teams().findOne({
        where: {
          personalTeamOwnerId: this.actor.userId,
        },
      }),
      `User's personal team`
    );

    const personalWorkspace = await this._queryWorkspaces({
      teamId: personalTeam.id,
    }).getOne();

    return ensureFound<Workspace>(
      personalWorkspace,
      `User's personal workspace`
    );
  }

  async createTutorialDb(type: TutorialType) {
    const result = await createTutorialDb(type);
    const db = this.tutorialDbs().create({
      ...this.stampNew(),
      info: result,
    });
    await this.entMgr.save(db);
    return db;
  }

  async getTutorialDb(id: TutorialDbId) {
    return ensureFound<TutorialDb>(
      await this.tutorialDbs().findOne({
        id,
        ...excludeDeleted(),
      }),
      `Tutorial DB with id ${id}`
    );
  }

  async cloneTutorialDbsFromProject(site: Site, workspaceId: WorkspaceId) {
    const usedSourceIds = getAllOpExprSourceIdsUsedInSite(site);

    const siteDataSources = await Promise.all(
      usedSourceIds.map(async (id) => {
        const dataSource = await this.getDataSourceById(id, {
          // Based on the nature of cloning tutorial db, we will skip the permission check for workspaces here
          skipPermissionCheck: true,
        });

        return dataSource;
      })
    );

    const siteTutorialDbs = await Promise.all(
      siteDataSources
        .filter((ds) => ds.source === "tutorialdb")
        .map(async (ds) => {
          const tutorialDbId = ds.credentials.tutorialDbId;
          const tutorialDb = await this.getTutorialDb(tutorialDbId);
          return {
            dataSource: ds,
            tutorialDb,
          };
        })
    );

    const oldToNewSourceIds: Record<string, string> = {};

    for (const { dataSource, tutorialDb } of siteTutorialDbs) {
      // We always create a new tutorial db for the workspace so that all opIds
      // get updated and we don't have to worry about not issuing a new opId
      const newDataSource = await this.createTutorialDbDataSource(
        tutorialDb.info.type,
        workspaceId,
        dataSource.name
      );
      oldToNewSourceIds[dataSource.id] = newDataSource.id;
    }

    return {
      oldToNewSourceIds,
    };
  }

  async createTutorialDbDataSource(
    type: TutorialType,
    workspaceId: WorkspaceId,
    name: string
  ) {
    const newTutorialDb = await this.createTutorialDb(type);
    const newDataSource = await this.createDataSource(workspaceId, {
      name,
      source: "tutorialdb",
      credentials: {
        tutorialDbId: newTutorialDb.id,
      },
      settings: {
        type,
      },
    });
    return newDataSource;
  }

  async createPromotionCode(
    id: string,
    message: string,
    trialDays: number,
    expirationDate?: Date | null
  ) {
    const promoCode = await this.promotioCodes().create({
      id,
      message,
      expirationDate,
      trialDays,
    });
    await this.entMgr.save(promoCode);
    return promoCode;
  }

  async getPromotionCodeById(id: string) {
    return this.promotioCodes().findOne(id, {
      where: [
        {
          expirationDate: IsNull(),
        },
        {
          expirationDate: MoreThan(new Date()),
        },
      ],
    });
  }

  //
  // Methods for PERMANENTLY DELETING stuff
  //
  /**
   * This IRREVERSABLY DELETES A PROJECT.
   */
  async permanentlyDeleteProject(id: ProjectId, opts?: { force?: boolean }) {
    const project = await findExactlyOne(this.projects(), { id });
    assert(
      opts?.force || !!project.deletedAt,
      `Can only permanently delete project that has been soft-deleted`
    );

    if (!project.deletedAt) {
      console.log(`Forced to delete project "${project.name}" (${project.id})`);
    }

    await this.projectRevs().delete({ projectId: id });
    await this.branches().delete({ projectId: id });
    await this.projectWebhooks().delete({ projectId: id });
    await this.projectWebhookEvents().delete({ projectId: id });
    await this.projectRepositories().delete({ projectId: id });
    await this.loaderPublishments().delete({ projectId: id });
    await this.permissions().delete({ projectId: id });
    await this.projectSyncMetadata().delete({ projectId: id });
    await this.copilotInteractions().delete({ projectId: id });

    // comment reactions deleted by cascade
    await this.comments().delete({ projectId: id });

    await this.appAuthConfigs().delete({ projectId: id });
    await this.appEndUserAccess().delete({ projectId: id });
    await this.appAccessRegistries().delete({ projectId: id });
    await this.appRoles().delete({ projectId: id });

    // We do not permanently delete a project row, as we are
    // keeping PkgVersions in case there are dependencies, and
    // we need the project row to be there for resolving
    // permissions etc.  Instead, we blank out all information
    // about the project.
    project.permanentlyDeletedAt = new Date();
    project.createdById = null;
    project.updatedById = null;
    project.deletedById = null;
    project.name = `DELETED PROJECT`;
    project.hostUrl = null;
    project.projectApiToken = null;
    project.secretApiToken = null;
    project.codeSandboxId = null;
    project.codeSandboxInfos = null;
    project.workspaceId = null;
    project.extraData = null;
    await this.entMgr.save(project);
  }

  async permanentlyDeleteDataSource(
    id: DataSourceId,
    opts?: { force?: boolean }
  ) {
    const source = await findExactlyOne(this.dataSources(), { id });
    assert(
      opts?.force || !!source.deletedAt,
      `Can only permanently delete data sources that have been soft-deleted`
    );

    if (!source.deletedAt) {
      console.log(
        `Forced to delete data source "${source.name}" (${source.id})`
      );
    }

    await this.dataSourceOperations().delete({ dataSourceId: id });
    await this.dataSources().delete({ id });
  }

  async permanentlyDeleteCms(id: CmsDatabaseId, opts?: { force?: boolean }) {
    const database = await findExactlyOne(this.cmsDatabases(), { id });
    assert(
      opts?.force || !!database.deletedAt,
      `Can only permanently delete CMS database that has been soft-deleted`
    );

    if (!database.deletedAt) {
      console.log(`Forced to delete CMS "${database.name}" (${database.id})`);
    }

    const tables = await this.cmsTables().find({ databaseId: id });
    for (const table of tables) {
      const rows = await this.cmsRows().find({ tableId: table.id });
      for (const row of rows) {
        await this.cmsRowRevisions().delete({ rowId: row.id });
      }
      await this.cmsRows().delete({ tableId: table.id });
    }
    await this.cmsTables().delete({ databaseId: id });
    await this.cmsDatabases().delete({ id });
  }

  async permanentlyDeleteWorkspace(
    id: WorkspaceId,
    opts?: { force?: boolean }
  ) {
    const workspace = await findExactlyOne(this.workspaces(), { id });
    assert(
      opts?.force || !!workspace.deletedAt,
      `Can only permanently delete workspace that has been soft-deleted`
    );

    if (!workspace.deletedAt) {
      console.log(
        `Forced to delete workspace "${workspace.name}" (${workspace.id})`
      );
    }

    const databases = await this.cmsDatabases().find({ workspaceId: id });
    if (databases.length > 0) {
      if (opts?.force) {
        for (const db of databases) {
          await this.permanentlyDeleteCms(db.id, opts);
        }
      } else {
        throw new Error(
          `Cannot permanently delete a workspace that still contains CMS databases: ${databases
            .map((db) => db.id)
            .join(", ")}`
        );
      }
    }

    const sources = await this.dataSources().find({ workspaceId: id });
    if (sources.length > 0) {
      if (opts?.force) {
        for (const source of sources) {
          await this.permanentlyDeleteDataSource(source.id, opts);
        }
      } else {
        throw new Error(
          `Cannot permanently delete a workspace that still contains data sources: ${sources
            .map((s) => s.id)
            .join(", ")}`
        );
      }
    }

    const projects = await this.projects().find({ workspaceId: id });

    if (projects.length > 0) {
      if (opts?.force) {
        for (const proj of projects) {
          await this.permanentlyDeleteProject(proj.id, opts);
        }
      } else {
        throw new Error(
          `Cannot permanently delete a workspace that still contains projects: ${projects
            .map((p) => p.id)
            .join(", ")}`
        );
      }
    }

    await this.permissions().delete({ workspaceId: id });
    await this.workspaces().delete({ id });
  }

  async permanentlyDeleteTeam(id: TeamId, opts?: { force?: boolean }) {
    const team = await findExactlyOne(this.teams(), { id });
    assert(
      opts?.force || !!team.deletedAt,
      `Can only permanently delete workspace that has been soft-deleted`
    );

    if (!team.deletedAt) {
      console.log(`Forced to delete team "${team.name}" (${team.id})`);
    }

    const workspaces = await this.workspaces().find({ teamId: id });
    if (workspaces.length > 0) {
      if (opts?.force) {
        for (const w of workspaces) {
          console.log(`Forced to delete workspace "${w.name}" (${w.id})`);
          await this.permanentlyDeleteWorkspace(w.id, opts);
        }
      } else {
        throw new Error(
          `Cannot permanently delete a team that still contains workspaces: ${workspaces
            .map((w) => w.id)
            .join(", ")}`
        );
      }
    }

    await this.teamApiTokens().delete({ teamId: id });
    await this.temporaryTeamApiTokens().delete({ teamId: id });
    await this.permissions().delete({ teamId: id });
    await this.ssoConfigs().delete({ teamId: id });

    // delete end user directories
    const directories = await this.endUserDirectories().find({ teamId: id });
    for (const dir of directories) {
      await this.endUsers().delete({ directoryId: dir.id });
      await this.directoryEndUserGroups().delete({ directoryId: dir.id });
      await this.endUserDirectories().delete({ id: dir.id });
    }

    await this.teams().delete({ id });
  }

  async permanentlyDeleteUser(id: UserId, opts?: { force?: boolean }) {
    const user = await findExactlyOne(this.users(), { id });
    assert(
      opts?.force || !!user.deletedAt,
      `Can only permanently delete a user that has been soft-deleted`
    );

    if (!user.deletedAt) {
      console.log(`Forced to delete "${user.email}" (${user.id})`);
    }

    assert(
      !user.whiteLabelInfo,
      `Cannot permanently delete whitelabeled users`
    );
    assert(
      !user.owningTeamId,
      `Cannot permanently delete users owned by an org`
    );

    await this.projectRepositories().delete({ userId: id });
    await this.trustedHosts().delete({ userId: id });
    await this.resetPasswords().delete({ forUserId: id });
    await this.emailVerifications().delete({ forUserId: id });
    await this.oauthTokens().delete({ userId: id });
    await this.personalApiTokens().delete({ userId: id });
    await this.permissions().delete({ userId: id });

    await this.copilotUsages().delete({ createdById: id });
    await this.copilotInteractions().delete({ createdById: id });

    // We do not permanently delete a user row, as we may still
    // have foreign key references to it.  Instead, we blank out
    // all information we have about the user.
    user.permanentlyDeletedAt = new Date();
    user.firstName = null;
    user.lastName = null;
    user.role = null;
    user.source = null;
    user.surveyResponse = null;
    user.email = `deleted-${user.id}@plasmic-deleted.app`;
    user.bcrypt = "";
    user.createdById = null;
    user.updatedById = null;
    user.deletedById = null;
    user.avatarUrl = null;
    user.extraData = null;
    await this.entMgr.save(user);
  }

  async getObsoleteDeletedEntities<T extends Base<any>>(
    Ent: EntityTarget<T>,
    days: number,
    opts?: {
      leftJoins?: [string, string][];
    }
  ) {
    let query = this.entMgr.getRepository(Ent).createQueryBuilder("x");

    if (opts?.leftJoins) {
      for (const [prop, alias] of opts.leftJoins) {
        query = query.leftJoinAndSelect(prop, alias);
      }
    }

    query = query.where(`x."deletedAt" < NOW() - :recency::interval`, {
      recency: `${days} days`,
    });

    if (Ent === User || Ent === Project) {
      query = query.andWhere('x."permanentlyDeletedAt" IS NULL');
    }

    if (Ent === User) {
      // We exclude org-owned users or white-labeled users
      query = query.andWhere(
        'x."isWhiteLabel" IS NULL OR x."isWhiteLabel" IS FALSE'
      );
      query = query.andWhere('x."owningTeamId" IS NULL');
    }
    return await query.getMany();
  }

  // Whether a project should be able to issue new operations
  // for a data source.
  async isProjectAllowedToUseDataSource(
    projectId: ProjectId,
    dataSourceId: DataSourceId
  ) {
    const permission = await this.dataSourceAllowedProjects().findOne({
      projectId,
      dataSourceId,
    });
    return !!permission;
  }

  async listAllowedDataSourcesForProject(projectId: ProjectId) {
    return await this.dataSourceAllowedProjects().find({
      projectId,
    });
  }

  async allowProjectToDataSources(
    projectId: ProjectId,
    dataSourceIds: DataSourceId[],
    opts: {
      skipPermissionCheck?: boolean;
    } = {}
  ) {
    if (dataSourceIds.length === 0) {
      return;
    }

    const alreadyAllowedDataSources = new Set<DataSourceId>(
      (await this.listAllowedDataSourcesForProject(projectId as ProjectId)).map(
        (p) => p.dataSourceId
      )
    );

    const newDataSourceIds = dataSourceIds.filter(
      (id) => !alreadyAllowedDataSources.has(id)
    );

    if (newDataSourceIds.length === 0) {
      return;
    }

    if (!opts.skipPermissionCheck) {
      for (const id of newDataSourceIds) {
        await this.checkDataSourceIssueOpIdPerms(id);
      }
    }

    const permissions = dataSourceIds.map((dataSourceId) => {
      return this.dataSourceAllowedProjects().create({
        ...this.stampNew(),
        dataSourceId,
        projectId,
      });
    });

    await this.entMgr.save(permissions);
  }

  async upsertDiscourseInfo(fields: {
    teamId: TeamId;
    slug: string;
    name: string;
    categoryId: number;
    groupId: number;
  }) {
    this.checkSuperUser();

    let discourseOrg = await this.getDiscourseInfoByTeamId(fields.teamId);
    if (discourseOrg) {
      assignAllowEmpty(discourseOrg, this.stampUpdate(), fields);
    } else {
      discourseOrg = this.discourseInfos().create({
        ...this.stampNew(),
        ...fields,
      });
    }
    await this.entMgr.save(discourseOrg);
    return discourseOrg;
  }

  async getDiscourseInfoByTeamId(
    teamId: TeamId
  ): Promise<TeamDiscourseInfo | undefined> {
    await this.checkTeamPerms(teamId, MIN_ACCESS_LEVEL_FOR_SUPPORT, "read");
    return this.discourseInfos().findOne({
      where: {
        teamId,
      },
    });
  }

  async getDiscourseInfosByTeamIds(
    teamIds: TeamId[]
  ): Promise<TeamDiscourseInfo[]> {
    await this.checkTeamsPerms(teamIds, MIN_ACCESS_LEVEL_FOR_SUPPORT, "read");
    return await this.discourseInfos().find({
      where: {
        teamId: In(teamIds),
      },
    });
  }
}

export function getLowestCommonAncestor(
  projectId: ProjectId,
  graph: CommitGraph,
  fromBranchId?: BranchId,
  toBranchId?: BranchId,
  fromPkgVersionId?: PkgVersionId,
  toPkgVersionId?: PkgVersionId
) {
  // Lowest common ancestors algorithm - find the "best" merge-base.
  // From https://git-scm.com/docs/git-merge-base: One common ancestor is better than another common ancestor if the latter is an ancestor of the former.
  const fromAncestors = ancestors(
    graph.parents,
    fromPkgVersionId ?? graph.branches[fromBranchId ?? MainBranchId]
  );
  const toAncestors = ancestors(
    graph.parents,
    toPkgVersionId ?? graph.branches[toBranchId ?? MainBranchId]
  );
  const commonAncestors = intersection(fromAncestors, toAncestors);
  const ancestorsSubgraph = subgraph(graph.parents, commonAncestors);
  const lowestCommonAncestors = leaves(ancestorsSubgraph);

  // If there are multiple LCAs, log a warning.
  if (lowestCommonAncestors.length > 1) {
    captureMessage(
      "Warning: multiple merge-bases (lowest common ancestors) found",
      {
        extra: {
          projectId,
          fromBranchId,
          toBranchId,
          graph,
          lowestCommonAncestors,
        },
      }
    );
  }

  // Choose an arbitrary LCA (not sure if this is the right behavior, need to research git some more, but anyway this is not possible for now given the operations we allow in the UI).
  const [lowestCommonAncestor] = lowestCommonAncestors;

  return lowestCommonAncestor;
}

const Includes = <T extends string | number>(value: T): FindOperator<T> =>
  Raw((columnAlias) => `:value = ANY(${columnAlias})`, { value });
