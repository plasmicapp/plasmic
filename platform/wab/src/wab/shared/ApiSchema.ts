// This file is a placeholder for having a fully strongly typed RPC system in
// place.  We use it to type the API and to ensure the voluntarily ensure server
// responses conform.

import { TokenType } from "@/wab/commons/StyleToken";
import { Bundle } from "@/wab/shared/bundles";
import { Dict } from "@/wab/shared/collections";
import { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  LabeledValue,
  RawPagination,
} from "@/wab/shared/data-sources-meta/data-sources";
import { WebhookHeader } from "@/wab/shared/db-json-blobs";
import {
  DevFlagsType,
  InsertableTemplateComponentResolution,
  InsertableTemplateTokenResolution,
} from "@/wab/shared/devflags";
import { AccessLevel, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { PkgVersionInfo, RevInfo, SiteInfo } from "@/wab/shared/SharedApi";
import {
  DirectConflictPickMap,
  MergeStep,
} from "@/wab/shared/site-diffs/merge-core";
import type { DataSourceSchema } from "@plasmicapp/data-sources";
import { PlasmicElement } from "@plasmicapp/host/dist/element-types";
import Stripe from "stripe";
import { MakeADT } from "ts-adt/MakeADT";
import type { JsonValue, Opaque } from "type-fest";

import { WholeChatCompletionResponse } from "@/wab/shared/copilot/prompt-utils";
import { ChangeLogEntry, SemVerReleaseType } from "@/wab/shared/site-diffs";
import { UiConfig } from "@/wab/shared/ui-config-utils";

export type UserId = Opaque<string, "UserId">;
export type ProjectId = Opaque<string, "ProjectId">;
export type PkgVersionId = Opaque<string, "PkgVersionId">;
export type BranchId = Opaque<string, "BranchId">;
export type WorkspaceId = Opaque<string, "WorkspaceId">;
export type TeamId = Opaque<string, "TeamId">;
export type FeatureTierId = Opaque<string, "FeatureTierId">;
export type StripeCustomerId = Opaque<string, "StripeCustomerId">;
export type StripePriceId = Opaque<string, "StripePriceId">;
export type StripeSubscriptionId = Opaque<string, "StripeSubscriptionId">;
export type CmsDatabaseId = Opaque<string, "CmsDatabaseId">;
export type CmsTableId = Opaque<string, "CmsTableId">;
export type CmsRowId = Opaque<string, "CmsRowId">;
export type CmsRowRevisionId = Opaque<string, "CmsRowRevisionId">;
export type CommentId = Opaque<string, "CommentId">;
export type CommentReactionId = Opaque<string, "CommentReactionId">;
export type SsoConfigId = Opaque<string, "SsoConfigId">;
export type TutorialDbId = Opaque<string, "TutorialDbId">;
export type DataSourceId = Opaque<string, "DataSourceId">;
export type CopilotInteractionId = Opaque<string, "CopilotInteractionId">;

export type MainBranchId = Opaque<string, "MainBranchId">;
export const MainBranchId = "main" as MainBranchId;

export interface CommitParentGraph {
  [pkgVersionId: PkgVersionId]: PkgVersionId[];
}

export interface CommitGraph {
  branches: {
    [branchId: BranchId | MainBranchId]: PkgVersionId;
  };
  /** The first parent is the "primary" parent - in a merge, that's from the branch that we're merging *into*. */
  parents: CommitParentGraph;
}

export interface CustomHostConfig {
  headers?: Record<string, string>;
}

export interface ProjectExtraData {
  commitGraph?: CommitGraph;
  wasImported?: boolean;
  mainBranchProtection?: "enforce" | "encourage" | "none";
  customHostConfig?: CustomHostConfig;

  /**
   * Custom (outside of Plasmic hosting) production/published URL.
   */
  prodUrl?: string;

  /**
   * Whether to hide/show Plasmic logo in Plasmic hosting. If undefined,
   * badge is shown.
   */
  hideHostingBadge?: boolean;

  /**
   * Allow robots to crawl the site. If undefined, robots aren't allowed.
   */
  allowRobots?: boolean;
}

export interface ApiEntityBase<IdType extends string = string> {
  id: IdType;
  // TODO These are Date in the DB but string via API.
  //  Ideally we should deserialize these back into Dates in the API client.
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
  createdById: string | null;
  updatedById: string | null;
  deletedById: string | null;
}

export interface ApiUser extends ApiEntityBase {
  id: UserId;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  needsIntroSplash: boolean;
  extraData: string | null;
  needsSurvey: boolean;
  waitingEmailVerification?: boolean;
  adminModeDisabled?: boolean;
  needsTeamCreationPrompt?: boolean;
  isFake?: boolean;
  isWhiteLabel?: boolean | null;
  whiteLabelInfo?: UserWhiteLabelInfo | null;
  whiteLabelId?: string | null;
}

export interface UserWhiteLabelInfo {
  email?: string;
}

export interface ApiTeamMeta {
  projectCount: number;
  workspaceCount: number;
  memberCount: number;
}

export interface ApiTeamDiscourseInfo {
  slug: string;
  name: string;
  categoryId: number;
  groupId: number;
}

export type BillingFrequency = "month" | "year";

export interface ApiTeam extends ApiEntityBase {
  id: TeamId;
  parentTeamId: TeamId | null;
  name: string;
  billingEmail: string;
  seats: number | null;
  featureTier: ApiFeatureTier | null;
  featureTierId: FeatureTierId | null;
  stripeCustomerId: StripeCustomerId | null;
  stripeSubscriptionId: StripeSubscriptionId | null;
  billingFrequency: BillingFrequency | null;
  inviteId: string;
  defaultAccessLevel: GrantableAccessLevel | null;
  personalTeamOwnerId: UserId | null;
  // TODO These are Date in the DB but string via API.
  //  Ideally we should deserialize these back into Dates in the API client.
  trialStartDate: Date | string | null;
  trialDays: number | null;
  onTrial: boolean;
  whiteLabelName: string | null;
  whiteLabelInfo: TeamWhiteLabelInfo | null;
  uiConfig: UiConfig;
}

export interface TeamWhiteLabelInfo {
  /**
   * JWT redirect info
   */
  openRedirect?: {
    scheme: "jwt";
    algo: "RS256";
    publicKey: string;
  };
  /**
   * Info for verifying API calls via client credentials
   */
  apiClientCredentials?: {
    clientId: string;
    issuer: string;
    aud: string;
  };
}

export interface TeamJwtOpenPayload {
  team: string;
  externalUserId: string;
}

export interface ApiFeatureTier extends ApiEntityBase {
  id: FeatureTierId;
  name: string;
  monthlySeatPrice: number;
  monthlySeatStripePriceId: StripePriceId;
  monthlyBasePrice: number | null;
  monthlyBaseStripePriceId: StripePriceId | null;
  annualSeatPrice: number;
  annualSeatStripePriceId: StripePriceId;
  annualBasePrice: number | null;
  annualBaseStripePriceId: StripePriceId | null;

  minUsers: number;
  maxUsers: number | null;
  privateUsersIncluded: number | null;
  maxPrivateUsers: number | null;
  publicUsersIncluded: number | null;
  maxPublicUsers: number | null;

  designerRole: boolean;
  contentRole: boolean;
  editContentCreatorMode: boolean;
  splitContent: boolean;
  localization: boolean;
  versionHistoryDays: number | null;
  maxWorkspaces: number | null;
  analytics: boolean;
  monthlyViews: number;
}

export type MayTriggerPaywall<T> = MakeADT<
  "paywall",
  {
    pass: {
      response: T;
    };
    requireTeam: {
      description?: PaywallDescription;
    };
    upsell: {
      team?: ApiTeam;
      minSeats?: number;
      features: ApiFeatureTier[];
      description: PaywallDescription;
    };
  }
>;

export type PaywallDescription =
  | "moreSeats"
  | "moreWorkspaces"
  | "splitContentAccess"
  | "monthlyViewLimit";

/**
 * This is a superset of sections exposed in registerComponent(), as it also supports
 * deeper customization for content creator mode.
 */
export enum PublicStyleSection {
  Visibility = "visibility",
  Repetition = "repetition",
  Typography = "typography",
  Sizing = "sizing",
  Spacing = "spacing",
  Positioning = "positioning",
  Background = "background",
  Transform = "transform",
  Transitions = "transitions",
  Layout = "layout",
  Overflow = "overflow",
  Border = "border",
  Outline = "outline",
  Shadows = "shadows",
  Effects = "effects",
  Interactions = "interactions",
  CustomBehaviors = "customBehaviors",
  Tag = "tag",
  HTMLAttributes = "htmlAttributes",
  ElementStates = "elementStates",
  Mixins = "mixins",
  ArbitrayCssSelectors = "arbitraryCssSelectors",

  // component-level features
  States = "states",
  DataQueries = "queries",
  PageMeta = "pageMeta",
  ComponentVariants = "variants",
  ComponentProps = "props",
}

export type StyleSectionVisibilities = {
  [key in PublicStyleSection]: boolean;
};

export interface TemplateSpec {
  displayName: string;
  imageUrl: string;
  projectId: ProjectId;
  componentName: string;
  category?: string;
  tokenResolution?: InsertableTemplateTokenResolution;
  componentResolution?: InsertableTemplateComponentResolution;
}

export interface ApiWorkspace extends ApiEntityBase {
  id: WorkspaceId;
  name: string;
  description: string;
  team: ApiTeam;
  uiConfig: UiConfig | null;
  contentCreatorConfig: UiConfig | null;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nextPath?: string;
  appInfo?: {
    appName: string;
    authorizationPath: string;
  };
}

export type SignUpResponse =
  | {
      status: true;
      user: ApiUser;
    }
  | {
      status: false;
      reason: string;
    };

export type UpdatePasswordResponse =
  | {
      status: true;
    }
  | {
      status: false;
      reason: string;
    };

export interface JoinTeamRequest {
  teamId: TeamId;
  inviteId: string;
}

export type JoinTeamResponse =
  | { status: true }
  | { status: false; reason: string };

export interface LoginRequest {
  email: string;
  password: string;
  appInfo?: {
    appName: string;
    authorizationPath: string;
  };
}
export type LoginResponse =
  | {
      status: true;
      user: ApiUser;
    }
  | {
      status: false;
      reason: string;
    };

export interface ForgotPasswordRequest {
  email: string;
  appName?: string;
  nextPath?: string;
}

export type ForgotPasswordResponse = { status: true };

export interface GetEmailVerificationTokenRequest {
  email: string;
}

export type GetEmailVerificationTokenResponse = { status: true; token: string };

export interface SendEmailVerificationRequest {
  email: string;
  nextPath?: string;
  appName?: string;
}

export type SendEmailVerificationResponse = { status: true };

export interface ConfirmEmailRequest {
  email: string;
  token: string;
}

export type ConfirmEmailResponse =
  | { status: true }
  | { status: false; reason: string };

export interface ResetPasswordRequest {
  email: string;
  resetPasswordToken: string;
  newPassword: string;
}

export type ResetPasswordResponse =
  | { status: true }
  | { status: false; reason: string };

export interface SelfResponse {
  user: ApiUser;
  usesOauth?: boolean;
  observer?: boolean;
}

export interface UpdateSelfRequest {
  needsIntroSplash?: boolean;
  needsSurvey?: boolean;
  needsTeamCreationPrompt?: boolean;
  role?: string;
  source?: string;
  surveyResponse?: { projectOption?: string };
  extraData?: string | null;
  waitingEmailVerification?: boolean;
}

export interface UpdateSelfAdminModeRequest {
  adminModeDisabled: boolean;
}

export type ProjectsRequest = MakeADT<
  "query",
  {
    all: object;
    byIds: { projectIds: string[] };
    byWorkspace: { workspaceId: WorkspaceId };
  }
>;

export interface ProjectsResponse {
  projects: ApiProject[];
  perms: ApiPermission[];
}

export interface UpdateProjectResponse {
  project: ApiProject;
  perms: ApiPermission[];
  owner: ApiUser | undefined;
  latestRevisionSynced: number;
  regeneratedSecretApiToken?: string;
}

export interface UsersResponse {
  users: ApiUser[];
}

export interface ApiTrustedHost {
  id: string;
  hostUrl: string;
}

export interface TrustedHostsListResponse {
  trustedHosts: ApiTrustedHost[];
}

export const branchStatuses = ["active", "merged", "abandoned"] as const;

export type BranchStatus = (typeof branchStatuses)[number];

export interface ApiBranch extends ApiEntityBase {
  id: BranchId;
  name: string;
  status: BranchStatus;
  hostUrl: string | null;
}

export interface ApiProject extends ApiEntityBase {
  id: ProjectId;
  hostUrl: string | null;
  clonedFromProjectId: ProjectId | null;
  name: string;
  inviteOnly: boolean;
  defaultAccessLevel: GrantableAccessLevel;
  workspaceId: WorkspaceId | null;
  workspaceName: string | null;
  parentTeamId: TeamId | null;
  teamId: TeamId | null;
  teamName: string | null;
  projectApiToken: string | null;
  featureTier: ApiFeatureTier | null;
  uiConfig: UiConfig | null | undefined;
  contentCreatorConfig: UiConfig | null | undefined;
  extraData: ProjectExtraData | null;
  readableByPublic: boolean;
  isUserStarter?: boolean;
}

export interface ApiProjectMeta
  extends Pick<
    ApiProject,
    "id" | "name" | "workspaceId" | "hostUrl" | "uiConfig"
  > {
  lastPublishedVersion?: string;
  publishedVersions: (Pick<
    PkgVersionInfo,
    "version" | "description" | "tags"
  > & { createdAt: string; createdBy?: string })[];
  branches: Pick<ApiBranch, "id" | "name" | "hostUrl" | "status">[];
}

export interface ApiWhiteLabelUser {
  id: string; // Plasmic user id
  firstName: string;
  lastName: string;
  email: string;
  externalId: string;
}

export interface CreateSiteRequest {
  workspaceId?: WorkspaceId;
  name?: string;
}

export interface CloneProjectRequest {
  name?: string;
  workspaceId?: WorkspaceId;
  branchName?: string;
  hostUrl?: string;
}

export interface CloneProjectResponse {
  projectId: string;
}

export interface Grant {
  email: string;
  accessLevel: GrantableAccessLevel;
  projectId?: ProjectId;
  workspaceId?: WorkspaceId;
  teamId?: TeamId;
}

export interface Revoke {
  email: string;
  projectId?: ProjectId;
  workspaceId?: WorkspaceId;
  teamId?: TeamId;
}

export interface GrantRevokeRequest {
  grants: Grant[];
  revokes: Revoke[];
  requireSignUp?: boolean;
}

export interface GrantRevokeResponse {
  perms: ApiPermission[];
  enqueued?: boolean;
}

export interface ApiPermission {
  id: string;
  projectId: ProjectId | null;
  workspaceId: WorkspaceId | null;
  teamId: TeamId | null;
  userId: UserId | null;
  email: string | null;
  user: ApiUser | null;
  accessLevel: AccessLevel;
}

export type ApiResource =
  | { type: "project"; resource: ApiProject }
  | {
      type: "workspace";
      resource: ApiWorkspace;
    }
  | { type: "team"; resource: ApiTeam };

export interface ApiProjectRevision {
  createdBy: ApiUser | null;
  id: string;
  projectId: string;
  revision: number;
  data?: string;
}

export interface ProjectRevWithoutDataResponse {
  project: ApiProject;
  rev: ApiProjectRevision;
  perms: ApiPermission[];
}

export interface ProjectFullDataResponse {
  project: {
    name: string;
    id: ProjectId;
    commitGraph: CommitGraph;
  };
  pkgVersions: {
    id: PkgVersionId;
    version: string;
    projectId: ProjectId;
    branchId: BranchId | MainBranchId;
    data: Bundle;
  }[];
  revisions: {
    branchId: BranchId | MainBranchId;
    data: Bundle;
  }[];
  branches: {
    id: BranchId;
    name: string;
  }[];
}

export interface PersonalApiToken {
  createdDate: Date;
  token: string;
}

export interface TeamApiToken {
  createdDate: Date;
  teamId: TeamId;
  token: string;
}

export interface InitServerInfo {
  modelSchemaHash: number;
  bundleVersion: string;
  selfPlayerId: number;
}

export interface ServerSessionsInfo {
  sessions: ServerPlayerInfo[];
}

interface ServerPlayerBase {
  playerId: number;
  viewInfo?: PlayerViewInfo;
}

interface NormalServerPlayerInfo extends ServerPlayerBase {
  type: "NormalUser";
  userId: UserId;
}

interface AnonServerPlayerInfo extends ServerPlayerBase {
  type: "AnonUser";
  userId?: undefined;
}

export type ServerPlayerInfo = NormalServerPlayerInfo | AnonServerPlayerInfo;

export const arenaTypes = ["custom", "page", "component"] as const;

export type ArenaType = (typeof arenaTypes)[number];

export interface PlayerViewInfo {
  branchId?: BranchId;
  arenaInfo?: ArenaInfo;
  selectionInfo?: PlayerSelectionInfo;
  cursorInfo?: PlayerCursorInfo;
  positionInfo?: PlayerPositionInfo;
}

export interface ArenaInfo {
  type: ArenaType;
  uuidOrName: string;
  focused: boolean;
}

export interface PlayerSelectionInfo {
  selectableFrameUuid: string;
  selectableKey?: string;
}
export interface PlayerCursorInfo {
  left: number;
  top: number;
}

export interface PlayerPositionInfo {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UpdatePlayerViewRequest {
  projectId: string;
  branchId: BranchId | null;
  arena: ArenaInfo | null;
  selection: PlayerSelectionInfo | null;
  cursor: PlayerCursorInfo | null;
  position: PlayerPositionInfo | null;
}

export interface ListUsersResponse {
  users: ApiUser[];
}

export interface CreateTeamRequest {
  name?: string;
  billingEmail?: string;
  defaultAccessLevel?: GrantableAccessLevel | null;
  uiConfig?: UiConfig | null;
}

export type UpdateTeamRequest = Partial<CreateTeamRequest>;

export interface CreateTeamResponse {
  team: ApiTeam;
}

export type TeamMember = MakeADT<
  "type",
  {
    user: ApiUser & { lastActive: Date | string; projectsCreated: number };
    email: {
      email: string;
    };
  }
>;

export interface GetTeamResponse {
  team: ApiTeam;
  perms: ApiPermission[];
  members: TeamMember[];
}

export interface ListTeamsResponse {
  teams: ApiTeam[];
  perms: ApiPermission[];
}

export interface PurgeUserFromTeamRequest {
  teamId: TeamId;
  emails: string[];
}

export interface ListFeatureTiersResponse {
  tiers: ApiFeatureTier[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AddFeatureTierResponse {}

export interface SubscriptionIntentRequest {
  // Which team is signing up?
  teamId: TeamId;
  // Which feature tier do I want to sign up for?
  featureTierId: FeatureTierId;
  // Monthly or annual
  billingFrequency: BillingFrequency;
  // Number of seats
  seats: number;
}

export type SubscriptionIntentResponse = MakeADT<
  "type",
  {
    // See https://stripe.com/docs/billing/subscriptions/elements
    success: {
      subscription: Stripe.Subscription;
      featureTier: ApiFeatureTier;
      clientSecret: string;
    };
    needPayment: {
      subscription: Stripe.Subscription;
      featureTier: ApiFeatureTier;
      clientSecret: string;
    };
    alreadyExists: {
      subscription: Stripe.Subscription;
      featureTier: ApiFeatureTier;
    };
  }
>;

export type StartFreeTrialResponse = MakeADT<
  "type",
  {
    success: object;
    alreadyExists: {
      subscription: Stripe.Subscription;
      featureTier: ApiFeatureTier;
    };
  }
>;

export type GetSubscriptionResponse = MakeADT<
  "type",
  {
    success: { subscription: Stripe.Subscription };
    notFound: object;
  }
>;

export interface ListTeamProjectsResponse {
  team: ApiTeam;
  members: TeamMember[];
  workspaces: ApiWorkspace[];
  projects: ApiProject[];
  perms: ApiPermission[];
}

export interface AppCtxResponse {
  teams: ApiTeam[];
  workspaces: ApiWorkspace[];
  perms: ApiPermission[];
}

export interface ListTeamWorkspacesResponse {
  team: ApiTeam;
  workspaces: ApiWorkspace[];
  perms: ApiPermission[];
}

export interface GetModelsResponse {
  models: string;
  modelData: string;
}

export interface UpdateModelsRequest {
  models: string;
  modelData: string;
}

export interface GetModelsResponse {
  team: ApiTeam;
  members: TeamMember[];
  workspaces: ApiWorkspace[];
  projects: ApiProject[];
  perms: ApiPermission[];
}

export interface GetWorkspaceResponse {
  workspace: ApiWorkspace;
  perms: ApiPermission[];
}

export interface CreateWorkspaceRequest {
  name?: string;
  description?: string;
  contentCreatorConfig?: UiConfig;
  teamId: TeamId;
}

export type UpdateWorkspaceRequest = Partial<CreateWorkspaceRequest>;

export interface CreateWorkspaceResponse {
  workspace: ApiWorkspace;
}

export interface ListProjectsResponse {
  projects: ApiProject[];
}

export interface ListBranchesResponse {
  branches: ApiBranch[];
}

export interface CreateBranchRequest {
  name: string;
  sourceBranchId?: BranchId;
  base?: "new" | "latest";
}

export interface CreateBranchResponse {
  branch: ApiBranch;
}

export interface TryMergeRequest {
  subject: MergeSrcDst;
  pretend: boolean;
  resolution?: MergeResolution;
  autoCommitOnToBranch?: boolean;
}

export type TryMergeResponse = MergeResult;

export interface UpdateBranchRequest {
  name: string;
  hostUrl?: string;
}

export interface GetDevFlagOverridesResponse {
  data: string;
}

export interface GetDevFlagOverridesVersionsResponse {
  versions: Array<{
    id: string;
    data: string;
    createdAt: any;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetDevFlagOverridesResponse {}

export interface AppConfigResponse {
  config: DevFlagsType;
}

export interface GetClipResponse {
  content: string;
}

export interface UserExtraData {
  starterProgress: string[];
  collapseStarters: boolean;
}

export interface NewComponentReq {
  name?: string;
  body: PlasmicElement;
  path?: string;
  /** For updates only */
  byUuid?: string;
  /** For creates only */
  cloneFrom?: { uuid: string } | { name: string };
}

export interface UpsertTokenReq {
  name: string;
  value: string;
  type: TokenType | "BoxShadow";
}

export interface UpdateProjectReq {
  newComponents?: NewComponentReq[];
  updateComponents?: NewComponentReq[];
  tokens?: UpsertTokenReq[];
  regenerateSecretApiToken?: boolean;
  branchId?: string;
}

export interface SetSiteInfoReq
  extends Partial<
    Pick<
      ApiProject,
      | "name"
      | "workspaceId"
      | "inviteOnly"
      | "defaultAccessLevel"
      | "readableByPublic"
      | "isUserStarter"
    >
  > {
  regenerateSecretApiToken?: boolean;
}

export type UpdateProjectMetaRequest = Partial<
  Pick<ApiProject, "name" | "hostUrl" | "workspaceId" | "uiConfig">
>;

export type GitSyncAction = "commit" | "pr" | "build";
export type GitSyncScheme = "codegen" | "loader";
export type GitSyncPlatform = "react" | "nextjs" | "gatsby";
export type GitSyncLanguage = "js" | "ts";

export interface GitSyncOptions {
  scheme: GitSyncScheme;
  platform: GitSyncPlatform;
  language: GitSyncLanguage;
}

export interface ApiProjectRepository {
  id: string;
  projectId: string;
  installationId: number;
  repository: string;
  directory: string;
  defaultAction: GitSyncAction;
  defaultBranch: string;
  branches?: string[];
  scheme: GitSyncScheme;
  platform: GitSyncPlatform;
  language: GitSyncLanguage;
  cachedCname?: string;
  publish: boolean;
  createdByPlasmic: boolean;
}

export interface GitActionParams {
  projectRepositoryId?: string;
  projectId: string;
  action?: GitSyncAction;
  branch?: string;
  title?: string;
  description?: string;
}

export interface GitWorkflowJobStep {
  number: number;
  name: string;
  status: string;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface GitWorkflowJob {
  id: number;
  html_url: string | null;
  status: string;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  steps?: GitWorkflowJobStep[];
}

export type GitWorkflowJobStatus =
  | {
      state: "running";
      workflowRunId: number;
      workflowJobUrl?: string | null;
    }
  | {
      state: "requested";
    }
  | {
      state: "unknown";
    };

export interface GithubOrganization {
  installationId: number;
  login: string;
  type: string;
}

export interface GitRepository {
  name: string;
  installationId: number;
  defaultBranch: string;
}

export interface GithubData {
  organizations: GithubOrganization[];
  repositories: GitRepository[];
}

export interface GitBranchesResponse {
  branches: string[];
}

export interface ProjectWebhookEventsResponse {
  events: ApiProjectWebhookEvent[];
}

export interface ApiProjectWebhook {
  id: string;
  method: string;
  url: string;
  headers: Array<WebhookHeader> | undefined;
  payload: string | undefined;
}
export const apiProjectWebhookFields = [
  "id",
  "method",
  "url",
  "headers",
  "payload",
] as const;

export interface ApiProjectWebhookEvent {
  id: string;
  createdAt: Date | string;
  method: string;
  url: string;
  status: number;
  response: string;
}

export interface SurveyRequest {
  source: string;
  role: string;
  projectOption: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SurveyResponse {}

export interface ResolveSyncRequest {
  projects: {
    projectId: string;
    branchName: string;
    versionRange: string;
    componentIdOrNames: readonly string[] | undefined;
    projectApiToken?: string;
  }[];
  recursive?: boolean;
}

export interface ProjectIdAndToken {
  projectId: string;
  projectApiToken: string;
}

export interface CmsIdAndToken {
  databaseId: string;
  token: string;
}

export interface SetupGithubPagesRequest {
  domain: string;
}

export interface NewGithubRepoRequest {
  org: GithubOrganization;
  name: string;
  privateRepo: boolean;
  // We still support passing the `token` here so current sessions don't need
  // to be invalidated
  token?: string;
  domain?: string;
  projectId: string;
}

export type NewGithubRepoResponse =
  | {
      type: "KnownError";
      knownError: "domain taken" | "repo exists";
    }
  | {
      type: "Repo";
      repo: GitRepository;
    };

export interface ExistingGithubRepoRequest {
  repository: GitRepository;
  // We still support passing the `token` here so current sessions don't need
  // to be invalidated
  token?: string;
}

export interface ApiDataSource {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  source: DataSourceType;
  settings: Record<string, any>;
  ownerId?: string;
}

export interface ApiDataSourceTest {
  result: {
    connected: boolean;
    error?: string;
  };
}

export type ListDataSourcesResponse = Array<{
  workspace: ApiWorkspace;
  dataSources: ApiDataSource[];
}>;

export interface ApiDataSourceWithSecrets extends ApiDataSource {
  credentials: Record<string, any>;
}

export type ApiExecuteDataSourceStudioOpRequest = {
  projectId: string;
  name: string;
  args?: Record<string, JsonValue>;
  paginate?: RawPagination;
};

export type ListDataSourceBasesResponse = {
  bases: LabeledValue[];
};

export type ApiCreateDataSourceRequest = Pick<
  ApiDataSourceWithSecrets,
  "name" | "credentials" | "source" | "settings" | "workspaceId"
>;

export type ApiUpdateDataSourceRequest = Partial<ApiCreateDataSourceRequest>;

export interface ImageUploadRequest {
  imageFile: File | Blob;
}

export type ImageUploadResponse = {
  dataUri: string;
  width: number;
  height: number;
  aspectRatio?: number;
  warning?: string;
  mimeType?: string;
};
//
// CMS
//

export const enum CmsMetaType {
  TEXT = "text",
  LONG_TEXT = "long-text",
  NUMBER = "number",
  IMAGE = "image",
  FILE = "file",
  DATE_TIME = "date-time",
  BOOLEAN = "boolean",
  COLOR = "color",
  RICH_TEXT = "rich-text",
  REF = "ref",
  LIST = "list",
  OBJECT = "object",
  ENUM = "enum",
}

export interface CmsTableSchema {
  fields: CmsFieldMeta[];
}

interface CmsWebhook {
  url: string;
  method: string;
  headers: WebhookHeader[];
  payload: string;
  event: "publish";
}

export interface CmsTableSettings {
  previewUrl?: string;
  webhooks?: CmsWebhook[];
}

export interface CmsBaseType<T> {
  /** The stable unique identifier, like `heroImage`. */
  identifier: string;
  /** NOT IN USE. */
  name: string;
  /** The field label. */
  label?: string;
  helperText: string;
  required: boolean;
  hidden: boolean;
  localized: boolean;
  /** The empty string "" locale is the default locale. */
  defaultValueByLocale: Dict<T>;
}

export interface CmsTextLike {
  minChars?: number;
  maxChars?: number;
}

export interface CmsTypeRef {
  type: CmsMetaType.REF;
  tableId: CmsTableId;
}

export interface CmsTypeList {
  type: CmsMetaType.LIST;
  fields: CmsFieldMeta[];
}

export interface CmsTypeObject {
  type: CmsMetaType.OBJECT;
  fields: CmsFieldMeta[];
}

export interface CmsTypeText extends CmsTextLike {
  type: CmsMetaType.TEXT;
}

export interface CmsTypeLongText extends CmsTextLike {
  type: CmsMetaType.LONG_TEXT;
}

export interface CmsTypeNumber {
  type: CmsMetaType.NUMBER;
}

export interface CmsTypeBoolean {
  type: CmsMetaType.BOOLEAN;
}

export interface CmsTypeImage {
  type: CmsMetaType.IMAGE;
}

export interface CmsTypeFile {
  type: CmsMetaType.FILE;
}

export interface CmsTypeDateTime {
  type: CmsMetaType.DATE_TIME;
}

export interface CmsTypeColor {
  type: CmsMetaType.COLOR;
  defaultValue?: string;
}

export interface CmsTypeRichtext {
  type: CmsMetaType.RICH_TEXT;
}

export interface CmsTypeEnum {
  type: CmsMetaType.ENUM;
  options: string[];
}

////

export interface CmsRef extends CmsBaseType<string>, CmsTypeRef {}

export interface CmsList extends CmsBaseType<any[]>, CmsTypeList {}

export interface CmsObject extends CmsBaseType<object>, CmsTypeObject {}

export interface CmsText
  extends CmsBaseType<string>,
    CmsTextLike,
    CmsTypeText {}

export interface CmsLongText
  extends CmsBaseType<string>,
    CmsTextLike,
    CmsTypeLongText {}

export interface CmsNumber extends CmsBaseType<number>, CmsTypeNumber {}

export interface CmsBoolean extends CmsBaseType<boolean>, CmsTypeBoolean {}

export interface CmsImage extends CmsBaseType<string>, CmsTypeImage {}

export interface CmsFile extends CmsBaseType<string>, CmsTypeFile {}

export interface CmsDateTime extends CmsBaseType<string>, CmsTypeDateTime {}

export interface CmsColor extends CmsBaseType<string>, CmsTypeColor {}

export interface CmsRichtext extends CmsBaseType<string>, CmsTypeRichtext {}

export interface CmsEnum extends CmsBaseType<string>, CmsTypeEnum {}

export type CmsFieldMeta =
  | CmsRef
  | CmsList
  | CmsObject
  | CmsText
  | CmsLongText
  | CmsNumber
  | CmsBoolean
  | CmsImage
  | CmsFile
  | CmsDateTime
  | CmsColor
  | CmsRichtext
  | CmsEnum;

export type CmsTypeName = CmsFieldMeta["type"];

export type CmsTypeMeta =
  | CmsTypeRef
  | CmsTypeList
  | CmsTypeObject
  | CmsTypeText
  | CmsTypeLongText
  | CmsTypeNumber
  | CmsTypeBoolean
  | CmsTypeImage
  | CmsTypeFile
  | CmsTypeDateTime
  | CmsTypeColor
  | CmsTypeRichtext
  | CmsTypeEnum;

export const CMS_TYPE_DISPLAY_NAMES = {
  [CmsMetaType.TEXT]: "Text",
  [CmsMetaType.LONG_TEXT]: "Long Text",
  [CmsMetaType.NUMBER]: "Number",
  [CmsMetaType.IMAGE]: "Image",
  [CmsMetaType.FILE]: "File",
  [CmsMetaType.DATE_TIME]: "Date Time",
  [CmsMetaType.BOOLEAN]: "Boolean",
  [CmsMetaType.COLOR]: "Color",
  [CmsMetaType.RICH_TEXT]: "Rich Text",
  [CmsMetaType.REF]: "Ref",
  [CmsMetaType.LIST]: "List",
  [CmsMetaType.OBJECT]: "Object",
  [CmsMetaType.ENUM]: "Enumeration",
};

export const cmsFieldMetaDefaults: CmsBaseType<unknown> = {
  identifier: "",
  name: "",
  helperText: "",
  required: false,
  hidden: false,
  localized: false,
  defaultValueByLocale: {},
} as const;

export interface CmsDatabaseExtraData {
  /** The additional non-default locales available in this database. Does not include the default ("") locale. */
  locales: string[];
}

export interface ApiCmsDatabase extends ApiEntityBase<CmsDatabaseId> {
  name: string;
  workspaceId: WorkspaceId;
  extraData: CmsDatabaseExtraData;
  tables: ApiCmsTable[];
  publicToken: string;
  secretToken: string | undefined;
}

export type ApiCmsDatabaseMeta = Pick<
  ApiCmsDatabase,
  "id" | "name" | "publicToken"
>;

export type ListCmsDatabasesMetaResponse = Array<{
  workspace: ApiWorkspace;
  databases: ApiCmsDatabaseMeta[];
}>;

export interface ApiCmsTable extends ApiEntityBase<CmsTableId> {
  identifier: string;
  name: string;
  schema: CmsTableSchema;
  description: string | null;
  settings: CmsTableSettings | null;
  isArchived: boolean | null;
}

export interface ApiCmsRow extends ApiEntityBase<CmsRowId> {
  tableId: string;
  identifier: string | null;
  data: Record<string, any>;
}

export interface ApiCmsWriteRow extends ApiEntityBase<CmsRowId> {
  tableId: string;
  identifier: string | null;
  data: Record<string, any>;
  draftData: Record<string, any>;
}

export interface ApiCmseRow extends ApiEntityBase<CmsRowId> {
  tableId: string;
  identifier: string | null;
  data: Dict<Dict<unknown>> | null;
  draftData: Dict<Dict<unknown>> | null;
  revision: number | null;
}

export interface ApiCmseRowRevisionMeta
  extends ApiEntityBase<CmsRowRevisionId> {
  rowId: string;
  isPublished: boolean;
}

export interface ApiCmseRowRevision extends ApiCmseRowRevisionMeta {
  data: Dict<Dict<unknown>>;
}

export interface ApiCmsQuery {
  where?: FilterClause;
  limit?: number;
  offset?: number;
  order?: (string | { field: string; dir: "asc" | "desc" })[];
  fields?: string[];
}

export interface FilterClause {
  $and?: FilterClause[];
  $or?: FilterClause[];
  $not?: FilterClause;
  [field: string]: any;
}

type PrimitiveFilterCond = string | number | boolean;
export type FilterCond =
  | PrimitiveFilterCond
  | { $in: PrimitiveFilterCond[] }
  | { $gt: PrimitiveFilterCond }
  | { $ge: PrimitiveFilterCond }
  | { $lt: PrimitiveFilterCond }
  | { $le: PrimitiveFilterCond }
  | { $regex: PrimitiveFilterCond };

export type CmsUploadedFile = {
  name: string;
  url: string;
  mimetype: string;
  size: number;
  imageMeta?: {
    width: number;
    height: number;
  };
};

export type CmsFileUploadResponse = {
  files: CmsUploadedFile[];
};
export type ApiCreateCmsRowsResponse = { rows: ApiCmseRow[] };

export type CheckDomainStatus =
  | {
      isValid: false;
      configuredBy?: string;
    }
  | {
      isValid: true;
      isAvailable: boolean;
      isPlasmicSubdomain: boolean;
      isAnyPlasmicDomain: boolean;
      isCorrectlyConfigured?: boolean;
      configuredBy?: string;
    };

export interface CheckDomainRequest {
  domain: string;
}

export interface CheckDomainResponse {
  status: CheckDomainStatus;
}

export interface PlasmicHostingSettings {
  favicon?: {
    url: string;
    mimeType?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetCommentsRequest {}

interface ModelAddr {
  uuid: string;
  iid: string;
}

export type CommentLocation = {
  subject: ModelAddr;
  variants: ModelAddr[];
};

export type CommentThreadId = Opaque<string, "CommentThreadId">;

// Comment data is already branch specific
export interface CommentData {
  location: CommentLocation;
  body: string;
  threadId: CommentThreadId;
}

export interface CommentReactionData {
  emojiName: string;
}

export interface ApiComment extends ApiEntityBase<CommentId> {
  location: CommentLocation;
  body: string;
  threadId: CommentThreadId;
  resolved: boolean;
}

export interface ApiCommentReaction extends ApiEntityBase<CommentReactionId> {
  commentId: CommentId;
  data: CommentReactionData;
}

export interface ApiNotificationSettings {
  notifyAbout: "all" | "mentions-and-replies" | "none";
}

export interface GetCommentsResponse {
  comments: ApiComment[];
  reactions: ApiCommentReaction[];
  selfNotificationSettings?: ApiNotificationSettings;
  users: ApiUser[];
}

export type UpdateNotificationSettingsRequest = ApiNotificationSettings;

export interface PostCommentRequest {
  location: CommentLocation;
  body: string;
  threadId: CommentThreadId;
}

export interface EditCommentRequest {
  body?: string;
  resolved?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostCommentResponse {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeleteCommentResponse {}

export interface DomainsForProjectRequest {
  projectId: string;
}

export interface DomainsForProjectResponse {
  domains: string[];
}

export interface AddCommentReactionRequest {
  data: CommentReactionData;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AddCommentReactionResponse {}

export type SetDomainStatus =
  | "DomainInvalid"
  | "DomainUsedElsewhereInPlasmic"
  | "DomainUsedElsewhereInVercel"
  | "OtherDomainError"
  | "DomainUpdated";

export interface SetSubdomainForProjectRequest {
  subdomain?: string;
  projectId: ProjectId;
}

export interface SetSubdomainForProjectResponse {
  status: SetDomainStatus;
}

export interface SetCustomDomainForProjectRequest {
  customDomain?: string;
  projectId: ProjectId;
}

export interface SetCustomDomainForProjectResponse {
  status: { [domain: string]: SetDomainStatus };
}
export type ApiAnalyticsProjectMeta = {
  pages: Array<{
    id: string;
    name: string;
  }>;
  splits: Array<{
    id: string;
    name: string;
    type: string;
    slices: Array<{
      id: string;
      name: string;
    }>;
  }>;
};

export type ApiAnalyticsImpressionResult = {
  time: string;
  impressions: number;
  unique_impressions: number;
};

export type ApiAnalyticsConversionResult = {
  time: string;
  conversions: number;
  conversion_amount: number;
};

export type ApiAnalyticsConversionRateResult = {
  time: string;
  renders: number;
  conversions: number;
  conversion_rate: number;
};

export type ApiAnalyticsQueryType =
  | "impressions"
  | "conversions"
  | "conversion_rate";

export type ApiAnalyticsImpressionResponse = {
  type: "impressions";
  data:
    | Array<ApiAnalyticsImpressionResult>
    | Record<string, Array<ApiAnalyticsImpressionResult>>;
};

export type ApiAnalyticsConversionResponse = {
  type: "conversions";
  data:
    | Array<ApiAnalyticsConversionResult>
    | Record<string, Array<ApiAnalyticsConversionResult>>;
};

export type ApiAnalyticsConversionRateResponse = {
  type: "conversion_rate";
  data:
    | Array<ApiAnalyticsConversionRateResult>
    | Record<string, Array<ApiAnalyticsConversionRateResult>>;
};

export type ApiAnalyticsPaywallResponse = {
  type: "paywall";
  data: [];
};

export type ApiAnalyticsResponse =
  | ApiAnalyticsImpressionResponse
  | ApiAnalyticsConversionResponse
  | ApiAnalyticsConversionRateResponse
  | ApiAnalyticsPaywallResponse;

export interface RevalidatePlasmicHostingRequest {
  projectId: ProjectId;
}

export type RevalidateError =
  | {
      type: "Invalid JSON response";
    }
  | {
      type: "Cloudflare challenge";
    }
  | {
      type: "Unknown error";
      message: string;
    };

export interface RevalidatePlasmicHostingResponse {
  successes: { domain: string }[];
  failures: { domain: string; error: RevalidateError }[];
}

export type ProjectAndBranchId = { projectId: string; branchId?: BranchId };

export interface BaseMergeResult {
  ancestorPkgVersionId: PkgVersionId;
  pkgId: string;
  ancestorPkgVersionString: string;
  ancestorPkgVersionBranchId?: string | null;
  fromPkgVersionId: PkgVersionId;
  fromPkgVersionString: string;
  toPkgVersionId: PkgVersionId;
  toPkgVersionString: string;
  fromHasOutstandingChanges: boolean;
  toHasOutstandingChanges: boolean;
}

export interface UncommittedChanges extends BaseMergeResult {
  status: "uncommitted changes on destination branch";
}

export interface DifferentHostApps extends BaseMergeResult {
  status: "app host mismatch";
  fromHostUrl: string | null;
  toHostUrl: string | null;
}

export interface CanBeMerged extends BaseMergeResult {
  status: "can be merged";
  mergeStep?: MergeStep;
}

export interface ResolutionAccepted extends BaseMergeResult {
  status: "resolution accepted";
}

export interface HasConflicts extends BaseMergeResult {
  status: "has conflicts";
  parentToPkgVersionId: PkgVersionId;
  fromRevisionNum: number;
  toRevisionNum: number;
  mergeStep?: MergeStep;
}

export interface ConcurrentChanges extends BaseMergeResult {
  status: "concurrent source branch changes during merge";
}

export interface ConcurrentCommits extends BaseMergeResult {
  status: "concurrent destination branch changes during merge";
}

export type MergeResult =
  | UncommittedChanges
  | DifferentHostApps
  | CanBeMerged
  | ResolutionAccepted
  | HasConflicts
  | ConcurrentChanges
  | ConcurrentCommits;

export interface GetProjectResponse {
  rev: RevInfo;
  project: SiteInfo;
  depPkgs: PkgVersionInfo[];
  perms: ApiPermission[];
  modelVersion: number;
  hostlessDataVersion: number;
  owner: ApiUser | undefined;
  latestRevisionSynced: number;
  hasAppAuth: boolean;
  appAuthProvider?: AppAuthProvider;
  workspaceTutorialDbs?: ApiDataSource[];
  isMainBranchProtected: boolean;
}

export type MergeSrcDst =
  | {
      fromBranchId: BranchId;
      toBranchId: BranchId | MainBranchId;
    }
  | {
      fromBranchId: BranchId | MainBranchId;
      toBranchId: BranchId;
    };

export interface MergeResolution {
  resolvedSite?: string;
  picks?: DirectConflictPickMap;
  expectedFromRevisionNum: number;
  expectedToRevisionNum: number;
}

export interface NextPublishVersionRequest {
  revisionNum: number;
  branchId: BranchId | undefined;
}

export interface NextPublishVersionResponse {
  version: string;
  changeLog: ChangeLogEntry[];
  releaseType: SemVerReleaseType;
}

export interface PublishProjectRequest {
  projectId: string;
  revisionNum: number;
  version: string;
  tags: string[];
  description: string;
  hostLessPackage: boolean;
  branchId: BranchId | undefined;
  waitPrefill: boolean;
}

export type PublishProjectResponse = MayTriggerPaywall<{ pkg: PkgVersionInfo }>;

export type AppEndUserAccessIdentifier =
  | { externalId: string }
  | { email: string }
  | { directoryEndUserGroupId: string }
  | { domain: string };

export type ApiAppEndUserAccessRule = {
  id: string;
  roleId: string;
  properties: Record<string, any>;
  isFake?: boolean;
} & AppEndUserAccessIdentifier;

export interface ApiAppRole {
  id: string;
  name: string;
  order: number;
  isFake?: boolean;
}

export interface ApiEndUserDirectory {
  id: string;
  name?: string;
}

export interface ApiDirectoryEndUserGroup {
  id: string;
  name: string;
  isFake?: boolean;
}

export interface ApiEndUser {
  id: string;
  email?: string;
  externalId?: string;
  groups: ApiDirectoryEndUserGroup[];
}

export interface ApiAppAccessRegistry {
  id: string;
  endUserId: string;
  endUserEmail?: string;
  endUserExternalId?: string;
  createdAt: Date;
  updatedAt: Date;
  matchedRoles: Array<{
    accessId: string;
    reason: "domain" | "email" | "group" | "general-access" | "external-id";
    role: ApiAppRole;
  }>;
}

export interface ApiAppUserOpConfig {
  userPropsOpId?: string | null;
  userPropsBundledOp?: string | null;
  userPropsDataSourceId?: string | null;
}

export type AppAuthProvider = "plasmic-auth" | "custom-auth";
export interface ApiAppAuthConfig {
  directoryId?: string | null;
  redirectUri?: string | null;
  anonymousRoleId?: string | null;
  registeredRoleId?: string | null;
  provider?: AppAuthProvider | null;
  token?: string | null;
  redirectUris?: string[] | null;
}

export interface ApiAppUser {
  email?: string;
  externalId?: string;
  properties: Record<string, unknown> | null;
  customProperties: Record<string, unknown> | null;
  roleId: string;
  roleName: string;
  roleOrder: number;
  roleIds: string[];
  roleNames: string[];
  isLoggedIn: boolean;
}

export interface ApiAppAuthPublicConfig {
  allowed: boolean;
  appName: string;
  authScreenProperties: Record<string, unknown> | null;
  isAuthEnabled: boolean;
}

export interface ListAuthIntegrationsResponse {
  providers: {
    name: string;
    id: string;
  }[];
}

export type Role = "agent" | "user";

export interface CopilotChatEntry {
  role: Role;
  msg: string;
  currentComponent: string | undefined;
  commandData?: any;
}

interface QueryCopilotResquestBase {
  type: string;
  projectId: ProjectId;
  useClaude?: boolean;
}

export interface QueryCopilotChatRequest extends QueryCopilotResquestBase {
  /** Conversation history */
  type: "chat";
  messages: CopilotChatEntry[];
}

export interface QueryCopilotCodeRequest extends QueryCopilotResquestBase {
  type: "code";
  data: any;
  currentCode?: string;
  context?: string;
  goal: string;
}

export interface QueryCopilotSqlCodeRequest extends QueryCopilotResquestBase {
  type: "code-sql";
  data: any;
  currentCode?: string;
  schema: DataSourceSchema;
  goal: string;
}

export interface QueryCopilotDebugRequest extends QueryCopilotResquestBase {
  type: "debug";
  rawDebug?: string;
  typeDebug?: string;
  dataSourcesDebug?: true;
}

export type QueryCopilotRequest =
  | QueryCopilotChatRequest
  | QueryCopilotCodeRequest
  | QueryCopilotSqlCodeRequest
  | QueryCopilotDebugRequest;

export interface QueryCopilotResponse {
  dataSourcesDebug?: string;
  rawDebug?: string;
  response: string;
  typeDebug?: string;
}
export interface CopilotResponseData extends WholeChatCompletionResponse {
  copilotInteractionId: CopilotInteractionId;
}

export interface SendCopilotFeedbackRequest {
  id: CopilotInteractionId;
  feedback: boolean;
  feedbackDescription?: string | null;
  projectId: ProjectId;
}

export interface QueryCopilotFeedbackRequest {
  query?: string;
  pageSize: number;
  pageIndex: number;
}

export interface QueryCopilotFeedbackResponse {
  feedback: {
    id: CopilotInteractionId;
    createdAt: Date | string;
    createdByEmail: string;
    userPrompt: string;
    response: string;
    model: "gpt" | "claude";
    fullPromptSnapshot: string;
    projectId: ProjectId;
    feedback: boolean;
    feedbackDescription?: string | null;
  }[];
  total: number;
  totalLikes: number;
  totalDislikes: number;
}

export interface ApiPromotionCode {
  id: string;
  message: string;
  expirationDate?: Date;
}

export interface UpdateHostUrlRequest {
  hostUrl: string | null;
  branchId: BranchId | null;
}

export interface UpdateHostUrlResponse extends UpdateHostUrlRequest {
  updatedAt: Date | string;
}

export interface ProcessSvgRequest {
  svgXml: string;
}

export type ProcessSvgResponse =
  | {
      status: "success";
      result: {
        xml: string;
        width: number;
        height: number;
        aspectRatio: number | undefined;
      };
    }
  | {
      status: "failure";
      error: Error;
    };

export interface ApiTeamSupportUrls {
  publicSupportUrl: string;
  privateSupportUrl?: string;
}

export interface SendEmailsResponse {
  sent: string[];
  failed: string[];
}

export enum StudioRoomMessageTypes {
  commentsUpdate = "commentsUpdate",
}
