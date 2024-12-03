// TODO Debug why explicit type strings are nec for Column() / why reflect-metadata doesn't work
// TODO Use real UUID type, both in PG and in Typescript.

import { getEncryptionKey } from "@/wab/server/secrets";
import type { TutorialDbInfo } from "@/wab/server/tutorialdb/tutorialdb-utils";
import { makeStableEncryptor } from "@/wab/server/util/crypt";
import type {
  AppAuthProvider,
  BillingFrequency,
  BranchId,
  BranchStatus,
  CmsDatabaseExtraData,
  CmsDatabaseId,
  CmsRowId,
  CmsTableId,
  CmsTableSchema,
  CmsTableSettings,
  CommentId,
  CommentLocation,
  CommentReactionData,
  CommentThreadId,
  DataSourceId,
  FeatureTierId,
  GitSyncLanguage,
  GitSyncPlatform,
  GitSyncScheme,
  ProjectExtraData,
  ProjectId,
  SsoConfigId,
  StripeCustomerId,
  StripePriceId,
  StripeSubscriptionId,
  TeamId,
  TeamWhiteLabelInfo,
  UserId,
  UserWhiteLabelInfo,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { Dict } from "@/wab/shared/collections";
import type { DataSourceType } from "@/wab/shared/data-sources-meta/data-source-registry";
import type { OperationTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import { CodeSandboxInfo, WebhookHeader } from "@/wab/shared/db-json-blobs";
import type { AccessLevel, GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { LocalizationKeyScheme } from "@/wab/shared/localization";
import { UiConfig } from "@/wab/shared/ui-config-utils";
import { IsEmail, IsJSON, IsOptional, validateOrReject } from "class-validator";
import { ISession } from "connect-typeorm";
import Cryptr from "cryptr";
import _ from "lodash";
import type { Opaque } from "type-fest";
import {
  BeforeInsert,
  BeforeUpdate,
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Unique,
} from "typeorm";

function normalizeJson(x, mapping = { model: "json" }) {
  return _(x)
    .toPairs()
    .map(([k, v]) => [
      k,
      v === null || v === undefined
        ? null
        : v instanceof Date
        ? v.toISOString()
        : mapping[k] === "json"
        ? JSON.parse(v)
        : v,
    ])
    .fromPairs()
    .value();
}

@Entity()
export class ExpressSession implements ISession {
  @Index()
  @Column("bigint")
  expiredAt = Date.now();

  @PrimaryColumn("varchar", { length: 255 })
  id: string;

  @Column("text")
  json: string;
}

export abstract class Base<IdTag> {
  @PrimaryColumn({ type: "text" })
  id: Opaque<string, IdTag>;

  @Column("timestamptz") createdAt: Date;
  @Column("timestamptz") updatedAt: Date;
  @Column("timestamptz", { nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User)
  createdBy: User | null;
  @ManyToOne(() => User)
  updatedBy: User | null;
  @ManyToOne(() => User)
  deletedBy: User | null;

  @Column("text", { nullable: true })
  createdById: UserId | null;
  @Column("text", { nullable: true })
  updatedById: UserId | null;
  @Column("text", { nullable: true })
  deletedById: UserId | null;

  toJSON() {
    return normalizeJson(this);
  }

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }
}

abstract class OrgChild<IdTag> extends Base<IdTag> {
  @ManyToOne(() => Org, { eager: true })
  org: Org | null;

  @Column("text", { nullable: true })
  orgId: string | null;
}

@Entity()
export class Org extends Base<"OrgId"> {
  @Column("text") name: string;
  @Column("text", { nullable: true, unique: true }) domain: string | null;
}

@Entity()
export class Team extends Base<"TeamId"> {
  @Column("text")
  name: string;

  @Column("text")
  billingEmail: string;

  @Column("text", { nullable: true })
  personalTeamOwnerId: UserId | null;

  @OneToOne((_type) => User)
  @JoinColumn()
  personalTeamOwner: User | null;

  @OneToMany(() => Permission, (perm) => perm.team)
  permissions: Permission[];

  // How many seats has the team paid for?
  // - null if on free tier
  @Column("integer", { nullable: true })
  seats: number | null;

  @ManyToOne(() => FeatureTier)
  featureTier: FeatureTier | null;

  @Column("text", { nullable: true })
  featureTierId: FeatureTierId | null;

  @Column("text", { nullable: true })
  stripeCustomerId: StripeCustomerId | null;

  @Column("text", { nullable: true })
  stripeSubscriptionId: StripeSubscriptionId | null;

  @Column("text", { nullable: true })
  billingFrequency: BillingFrequency | null;

  @Column("timestamptz", { nullable: true })
  trialStartDate: Date | null;

  @Column("integer", { nullable: true })
  trialDays: number | null;

  @Column("text", { nullable: true })
  inviteId: string;

  @Column("text", { nullable: true })
  defaultAccessLevel: GrantableAccessLevel | null;

  @Index()
  @Column("text", { nullable: true })
  whiteLabelName: string | null;

  @Column("jsonb", { nullable: true })
  whiteLabelInfo: TeamWhiteLabelInfo | null;

  @Column("jsonb", { nullable: true })
  uiConfig: UiConfig | null;

  @Index()
  @Column("text", { nullable: true })
  parentTeamId: TeamId | null;

  @ManyToOne((_type) => Team)
  parentTeam: Team | null;
}

@Entity()
export class Workspace extends Base<"WorkspaceId"> {
  @Column("text") name: string;
  @Column("text") description: string;

  @ManyToOne(() => Team)
  team: Team;

  @Index()
  @Column("text")
  teamId: TeamId;

  @Column("jsonb", { nullable: true })
  uiConfig: UiConfig | null;

  @Column("jsonb", { nullable: true })
  contentCreatorConfig: UiConfig | null;

  @OneToMany(() => Permission, (perm) => perm.workspace)
  permissions: Permission[];
}

@Entity()
@Index(["owningTeamId", "whiteLabelId"])
export class User extends OrgChild<"UserId"> {
  @Column("text", { nullable: true }) firstName: string | null;
  @Column("text", { nullable: true }) lastName: string | null;
  @Column("text", { nullable: true }) role: string | null;
  @Column("text", { nullable: true }) source: string | null;
  @Column("jsonb", { nullable: true }) surveyResponse: {
    projectOption?: string;
  } | null;
  @Column("boolean") needsSurvey: boolean;
  @Column("boolean", { nullable: true }) waitingEmailVerification: boolean;
  @Column("boolean", { nullable: true }) adminModeDisabled: boolean;
  @Column("boolean", { nullable: true }) needsTeamCreationPrompt: boolean;
  @Index({ unique: true })
  @Column("text", { unique: true })
  @IsEmail({ ignore_max_length: true })
  email: string;
  @Column("text", { select: false }) bcrypt: string | undefined;
  @Column("timestamptz", { nullable: true })
  permanentlyDeletedAt: Date | null;

  /**
   * For now, we can only reference URLs from elsewhere, and not
   * host the image blob ourselves.
   */
  @Column("text", { nullable: true })
  avatarUrl: string | null;

  @Column("boolean")
  needsIntroSplash: boolean;

  @Column("text", { nullable: true })
  @IsOptional()
  @IsJSON()
  extraData: string | null;

  @Index()
  @Column("text", { nullable: true })
  owningTeamId: TeamId | null;

  @Column("boolean", { nullable: true })
  isWhiteLabel: boolean | null;

  @Column("text", { nullable: true })
  whiteLabelId: string | null;

  @Column("jsonb", { nullable: true })
  whiteLabelInfo: UserWhiteLabelInfo | null;

  @ManyToOne(() => PromotionCode, { nullable: true })
  signUpPromotionCode: PromotionCode | null;

  toJSON() {
    return normalizeJson(_.omit(this, "bcrypt"));
  }
}

@Entity()
export class Project extends OrgChild<"ProjectId"> {
  @Column("text") name: string;
  @Column("boolean") inviteOnly: boolean;
  @Column("text") defaultAccessLevel: GrantableAccessLevel;
  @Column("text", { nullable: true }) hostUrl: string | null;
  @Column("text", { nullable: true }) clonedFromProjectId: ProjectId | null;
  @Column("text", { nullable: true }) projectApiToken: string | null;

  @Column("text", { nullable: true }) secretApiToken: string | null;
  @Column("text", { nullable: true }) codeSandboxId: string | null;
  @Column("jsonb", { nullable: true }) codeSandboxInfos:
    | CodeSandboxInfo[]
    | null;
  @Column("boolean") readableByPublic: boolean;

  @Column("jsonb", { nullable: true })
  uiConfig: UiConfig | null;

  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Index()
  @Column("text", { nullable: true })
  workspaceId: WorkspaceId | null;

  @Column("jsonb", { nullable: true })
  extraData: ProjectExtraData | null;

  @Column("timestamptz", { nullable: true })
  permanentlyDeletedAt: Date | null;

  // Whether we should allow edits in the main branch or not
  @Column("boolean", { nullable: true })
  isMainBranchProtected?: boolean;

  // Whether this project is a starter configured by the user, not by us
  // It will be available as starter in the project workspace
  @Column("boolean", { nullable: true })
  isUserStarter?: boolean;

  toJSON() {
    return normalizeJson(_.omit(this, "secretApiToken"));
  }
}

@Entity()
export class Branch extends OrgChild<"BranchId"> {
  @Column("text") name: string;

  @ManyToOne(() => Project)
  project: Project;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @Column("text", { default: "active" })
  status: BranchStatus;

  @Column("text", { nullable: true })
  hostUrl: string | null;
}

const jsonTransformer = {
  from: (value: any): any => JSON.parse(value),
  to: (value: any): any => JSON.stringify(value),
};

@Entity()
@Index(["project", "revision"], { unique: true, where: `"branchId" is null` })
@Index(["project", "branch", "revision"], {
  unique: true,
  where: `"branchId" is not null`,
})
export class ProjectRevision extends Base<"ProjectRevisionId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => Branch)
  branch: Branch | null;

  @Column("text", { nullable: true })
  branchId: BranchId | null;

  // For now this is just an opaque JSON blob to the server; only the client understands it.
  @Column("text")
  @IsJSON()
  data: string;

  @Column("integer") revision: number;

  @Column("integer", { nullable: true })
  @Index()
  dataLength?: number | null;
}

@Entity()
@Index(["project", "revision"], { unique: true, where: `"branchId" is null` })
@Index(["project", "branch", "revision"], {
  unique: true,
  where: `"branchId" is not null`,
})
export class PartialRevisionCache extends Base<"PartialRevisionCacheId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => Branch)
  branch: Branch | null;

  @Column("text", { nullable: true })
  branchId: BranchId | null;

  @Column("text")
  @IsJSON()
  data: string;

  @Column("text")
  @IsJSON()
  deletedIids: string; // expects JSON to be of type `string[]`

  @Column("integer") revision: number;

  @ManyToOne(() => ProjectRevision, { onDelete: "CASCADE" })
  projectRevision: ProjectRevision | null;

  @Column("text", { array: true, nullable: true })
  modifiedComponentIids: string[] | null;

  @Index()
  @Column("text")
  projectRevisionId: string;
}

@Entity()
export class ProjectWebhook extends Base<"ProjectWebhookId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  projectId: ProjectId;

  @Column("text")
  method: string;

  @Column("text")
  url: string;

  @Column("jsonb")
  headers: WebhookHeader[];

  @Column("text")
  payload: string;
}

@Entity()
export class ProjectWebhookEvent extends Base<"ProjectWebhookEventId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  projectId: ProjectId;

  @Column("text")
  method: string;

  @Column("text")
  url: string;

  @Column("integer")
  status: number;

  @Column("text")
  response: string;
}

@Entity()
export class ProjectRepository extends Base<"ProjectRepositoryId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  @Index()
  projectId: ProjectId;

  // This is the user who set the repository.
  @ManyToOne(() => User, { nullable: false })
  user: User | null;

  @Column("text")
  @Index()
  userId: UserId;

  @Column("integer")
  installationId: number;

  @Column("text")
  repository: string;

  @Column("text")
  directory: string;

  @Column("text")
  defaultAction: string;

  @Column("text")
  defaultBranch: string;

  @Column("text")
  scheme: GitSyncScheme;

  @Column("text")
  platform: GitSyncPlatform;

  @Column("text")
  language: GitSyncLanguage;

  @Column("text", { nullable: true })
  cachedCname: string | null;

  @Column("boolean")
  publish: boolean;

  @Column("boolean")
  createdByPlasmic: boolean;
}

@Entity()
export class TrustedHost extends Base<"TrustedHostId"> {
  @ManyToOne(() => User, { nullable: false })
  user: User | null;

  @Index()
  @Column("text", { nullable: false })
  userId: UserId;

  @Column("text", { nullable: false })
  hostUrl: string;
}

@Entity()
export class ResetPassword extends Base<"ResetPasswordId"> {
  @Index()
  @ManyToOne(() => User)
  forUser: User | null;

  @Column("text", { nullable: true })
  forUserId: UserId | null;

  @Column("text") secret: string;
  @Column("boolean") used: boolean;
}

@Entity()
export class EmailVerification extends Base<"EmailVerificationid"> {
  @Index()
  @ManyToOne(() => User)
  forUser: User | null;

  @Column("text", { nullable: true })
  forUserId: UserId | null;

  @Column("text") secret: string;
  @Column("boolean") used: boolean;
}

@Entity()
export class Pkg extends Base<"PkgId"> {
  @Column("text") name: string;

  // Pkgs that are "special" will also have a sysname that we
  // may query by. This field is not filled by the user.
  @Index()
  @Column("text", { nullable: true })
  sysname: string | null;

  @ManyToOne(() => Project, { nullable: true })
  project: Project | null;

  @Index()
  @Column("text", { nullable: true })
  projectId: ProjectId;
}

@Entity()
@Index(["pkgId", "version"], { unique: true, where: `"branchId" is null` })
@Index(["pkgId", "branchId", "version"], {
  unique: true,
  where: `"branchId" is not null`,
})
export class PkgVersion extends Base<"PkgVersionId"> {
  @ManyToOne(() => Pkg, { nullable: true })
  pkg: Pkg | null;

  @Index()
  @Column("text", { nullable: true })
  pkgId: string;

  @ManyToOne(() => Branch, { nullable: true })
  branch: Branch | null;

  @Column("text", { nullable: true })
  branchId: BranchId | null;

  @Column("text")
  version: string;

  @Column("text")
  @IsJSON()
  model: string;

  @Column("integer", { nullable: true })
  @Index()
  modelLength?: number | null;

  @Column("text", { nullable: true })
  hostUrl: string | null;

  @Column("text", { array: true })
  tags: string[];

  @Column("text", { nullable: true })
  description: string;

  /**
   * Indexed to allow quick enforcement of this foreign key reference
   * when running prune_database.  But this is not a foreign key, as it
   * may be referencing a revision that has already been permanently
   * deleted.
   */
  @Column("text", { nullable: false })
  @Index()
  revisionId: string;

  @Column("boolean", { nullable: true })
  isPrefilled: boolean;

  // In case this version is the result of a branch merge with conflicts, we store how the user chose
  // to resolve conflicts in the conflictPickMap.
  @Column("text", { nullable: true })
  @IsJSON()
  @IsOptional()
  conflictPickMap?: string | null;
}

@Entity()
export class LoaderPublishment extends Base<"LoaderPublishmentId"> {
  @Column("text")
  @Index()
  projectId: string;

  @Column("text", { array: true })
  projectIds: string[];

  @Column("text")
  platform: string;

  @Column("integer", { nullable: true })
  loaderVersion: number;

  @Column("boolean", { nullable: true })
  browserOnly: boolean;

  @Column("text", { nullable: true })
  i18nKeyScheme: LocalizationKeyScheme | null;

  @Column("text", { nullable: true })
  i18nTagPrefix: string | null;

  @Column("boolean", { nullable: true })
  appDir: boolean | null;
}

export type OauthTokenProvider =
  | "google"
  | "okta"
  | "ping"
  | "airtable"
  | "google-sheets";

const cryptr = new Cryptr(getEncryptionKey());
const encryptTransformer = {
  from: (value: any): any => cryptr.decrypt(value),
  to: (value: any): any => cryptr.encrypt(value),
};

const stableEncryptTranformer = makeStableEncryptor(getEncryptionKey());

export interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export abstract class OauthTokenBase extends Base<"OauthTokenBaseId"> {
  @Column("text") provider: OauthTokenProvider;

  @Column("jsonb") userInfo: any;
  @Column("jsonb", {
    transformer: [jsonTransformer, encryptTransformer],
  })
  token: TokenData;

  @Column("text", { nullable: true })
  ssoConfigId: SsoConfigId | null;

  @ManyToOne(() => SsoConfig, { nullable: true })
  ssoConfig: SsoConfig | null;
}

@Entity()
@Unique(["user", "provider"])
export class OauthToken extends OauthTokenBase {
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column("text")
  userId: UserId;
}

@Entity()
export class PersonalApiToken extends Base<"PersonalApiTokenId"> {
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Index()
  @Column("text")
  userId: UserId;

  @Index({ unique: true })
  @Column("text")
  token: string;
}

@Entity()
export class TeamApiToken extends Base<"TeamApiTokenId"> {
  @ManyToOne(() => Team, { nullable: false })
  team: Team;

  @Index()
  @Column("text")
  teamId: TeamId;

  @Index({ unique: true })
  @Column("text", {
    transformer: [stableEncryptTranformer],
  })
  token: string;
}

@Entity()
export class TemporaryTeamApiToken extends Base<"TemporaryTeamApiTokenId"> {
  @ManyToOne(() => Team, { nullable: false })
  team: Team;

  @Index()
  @Column("text")
  teamId: TeamId;

  @Column("text")
  fromTeamTokenId: TeamApiToken["id"];

  @Index({ unique: true })
  @Column("text", {
    transformer: [stableEncryptTranformer],
  })
  token: string;
}

export type PermissionId = Opaque<string, "PermissionId">;

@Entity()
@Check(`("userId" is not null) <> ("email" is not null)`)
@Check(
  `("projectId" is not null)::int + ("workspaceId" is not null)::int + ("teamId" is not null)::int = 1`
)
export class Permission extends Base<"PermissionId"> {
  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text", { nullable: true })
  projectId: ProjectId | null;

  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Index()
  @Column("text", { nullable: true })
  workspaceId: WorkspaceId | null;

  @ManyToOne(() => Team)
  team: Team | null;

  @Index()
  @Column("text", { nullable: true })
  teamId: TeamId | null;

  @ManyToOne(() => User)
  user: User | null;

  @Index()
  @Column("text", { nullable: true })
  userId: UserId | null;

  /** For users that don't exist. */
  @Index()
  @Column("text", { nullable: true })
  @IsOptional()
  @IsEmail()
  email: string | null;

  @Column("text")
  accessLevel: AccessLevel;
}

/**
 * This is just a log of sign-up attempts.
 */
@Entity()
export class SignUpAttempt extends Base<"SignUpAttempt"> {
  @Column("text")
  email: string;
}

@Entity()
@Unique(["projectId", "revision"])
export class ProjectSyncMetadata extends Base<"ProjectSyncMetadataId"> {
  @Index({ unique: true })
  @Column("text")
  projectRevId: string;

  @Column("text")
  projectId: ProjectId;

  @Column("integer")
  revision: number;

  @Column("text", { nullable: false })
  @IsJSON()
  data: string;
}

@Entity()
export class DevFlagOverrides extends Base<"DevFlagOverridesId"> {
  @Column("text")
  data: string;
}

@Entity()
export class BundleBackup extends Base<"BundleBackupId"> {
  @Column("text")
  rowType: string;

  @Column("text")
  @Index()
  migrationName: string;

  @ManyToOne(() => PkgVersion, { nullable: true, onDelete: "CASCADE" })
  pkgVersion: PkgVersion | null;

  @Column("text", { nullable: true })
  pkgVersionId: string;

  @ManyToOne(() => ProjectRevision, { nullable: true, onDelete: "CASCADE" })
  projectRevision: ProjectRevision | null;

  @Index()
  @Column("text", { nullable: true })
  projectRevisionId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: "CASCADE" })
  project: Project | null;

  @Column("text", { nullable: true })
  projectId: ProjectId;

  @Column("text")
  @IsJSON()
  data: string;
}

/**
 * Represents a snapshot in time of feature flags that is sold to new customers
 * - This effectively plays the same role as devflags for price-gated features
 * - We need to keep all rows around for existing users
 * - For any "name", we treat the most recent (by createdAt) as the advertised
 * one
 */
@Entity()
export class FeatureTier extends Base<"FeatureTierId"> {
  // Human-readable name
  @Column("text") name: string;
  // Prices by month/year (discounted)
  @Column("integer") monthlySeatPrice: number;
  @Column("text") monthlySeatStripePriceId: StripePriceId;

  @Column("integer", { nullable: true }) monthlyBasePrice: number | null;
  @Column("text", { nullable: true })
  monthlyBaseStripePriceId: StripePriceId | null;

  @Column("integer") annualSeatPrice: number;
  @Column("text") annualSeatStripePriceId: StripePriceId;

  @Column("integer", { nullable: true }) annualBasePrice: number | null;
  @Column("text", { nullable: true })
  annualBaseStripePriceId: StripePriceId | null;

  // Feature tier limits
  // Min users in team. If null, not enforced
  @Column("integer", { default: 0 }) minUsers: number;
  // Max users in team. Require upsell if exceeded. If null, unlimited users
  @Column("integer", { nullable: true }) maxUsers: number | null;

  @Column("integer", { nullable: true }) privateUsersIncluded: number | null;
  @Column("integer", { nullable: true }) maxPrivateUsers: number | null;

  @Column("integer", { nullable: true }) publicUsersIncluded: number | null;
  @Column("integer", { nullable: true }) maxPublicUsers: number | null;

  // If can contains designer on the team.
  @Column("boolean") designerRole: boolean;
  // If can contains content creators on the team.
  @Column("boolean") contentRole: boolean;
  // If can customize content creator mode
  @Column("boolean", { default: false }) editContentCreatorMode: boolean;
  // If can publish sites with split content
  @Column("boolean", { default: false }) splitContent: boolean;
  // If can make use of support for localization frameworks
  @Column("boolean", { default: false }) localization: boolean;
  // How many days of versions will we keep? If null, unlimited history
  @Column("integer", { nullable: true }) versionHistoryDays: number | null;
  // Max workspaces in team. If null, unlimited
  @Column("integer", { nullable: true }) maxWorkspaces: number | null;
  // Number of views per month allowed for a team
  @Column("integer", { default: 1000000000 /* 1B */ }) monthlyViews: number;
  // If can access analytics page
  @Column("boolean", { default: false }) analytics: boolean;
}

@Entity()
export class DataSource extends Base<"DataSourceId"> {
  @Column("text")
  @Index()
  workspaceId: WorkspaceId;

  @ManyToOne(() => Workspace, { nullable: false })
  workspace: Workspace | null;

  @Column("text")
  name: string;

  @Column("jsonb", {
    transformer: [jsonTransformer, encryptTransformer],
  })
  credentials: Record<string, any>;

  @Column("text")
  source: DataSourceType;

  @Column("jsonb")
  settings: Record<string, any>;
}

@Entity()
export class DataSourceOperation extends Base<"DataSourceOperationId"> {
  @Column("text")
  @Index()
  dataSourceId: DataSourceId;

  @ManyToOne(() => DataSource, { nullable: false })
  dataSource: DataSource;

  /**
   * Note that OperationTemplate stored here has bee "normalized" so that the
   * embedded dynamic expressions are replaced with `{{ DYNAMIC }}`. Therefore,
   * the same template with different dynamic expressions will now be the same
   * OperationTemplate to the server.  This is sufficient for the server;
   * the full operation template with the proper dynamic expression is in the
   * data model.
   */
  @Column("jsonb")
  @Index("OPERATION_IDX", { synchronize: false })
  operationInfo: OperationTemplate;
}

@Entity()
export class SsoConfig extends Base<"SsoConfigId"> {
  @Index()
  @Column("text")
  teamId: TeamId;

  @OneToOne(() => Team)
  @JoinColumn()
  team: Team;

  @Index()
  @Column("text", { array: true })
  domains: string[];

  @Column("text")
  ssoType: "oidc";

  @Column("text")
  provider: "okta";

  @Index({ unique: true })
  @Column("text")
  tenantId: string;

  @Column("jsonb")
  config: Record<string, any>;

  @Column("jsonb", { nullable: true })
  whitelabelConfig: Record<string, any> | null;
}

export type KeyValueNamespace =
  | "hosting-hit"
  | "copilot-cache"
  | "notification-settings";

export interface HostingHit {
  path: string;
  hit: boolean;
}

export type GenericKeyValueId = Opaque<string, "GenericKeyValueId">;

@Entity()
@Index(["namespace", "key"])
export class GenericKeyValue extends Base<"GenericKeyValueId"> {
  @Column("text")
  namespace: KeyValueNamespace;

  @Column("text")
  key: string;

  @Column("text")
  value: string;
}

export type PairNamespace = "domain-project";

@Entity()
@Index(["namespace", "left"])
@Index(["namespace", "right"])
export class GenericPair extends Base<"GenericPair"> {
  @Column("text")
  namespace: PairNamespace;

  @Column("text")
  left: string;

  @Column("text")
  right: string;
}

@Entity()
@Index(["createdAt"])
@Index(["createdById"])
export class CopilotUsage extends Base<"CopilotUsageId"> {}

@Entity()
@Index(["createdById"])
export class CopilotInteraction extends Base<"CopilotInteractionId"> {
  @Column("text")
  userPrompt: string;

  @Column("text")
  response: string;

  @Column("text")
  fullPromptSnapshot: string;

  @Column("text")
  model: "gpt" | "claude";

  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text")
  projectId: ProjectId;

  // Whether the it received good, bad or no review
  @Column("boolean", { nullable: true })
  feedback?: boolean | null;

  @Column("text", { nullable: true })
  feedbackDescription?: string | null;
}

@Entity()
export class CmsDatabase extends Base<"CmsDatabaseId"> {
  @Column("text")
  name: string;

  @Index()
  @Column("text")
  workspaceId: WorkspaceId;

  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Column("jsonb")
  extraData: CmsDatabaseExtraData;

  @Column("text") publicToken: string;
  @Column("text", { select: false }) secretToken: string;
}

@Entity()
export class CmsTable extends Base<"CmsTableId"> {
  /** Stable unchanging identifier, like blogPosts */
  @Index()
  @Column("text")
  identifier: string;

  /** Human friendly display name, like "Blog posts" */
  @Column("text")
  name: string;

  @Column("text", { nullable: true })
  description: string | null;

  @Column("jsonb")
  schema: CmsTableSchema;

  @Index()
  @Column("text")
  databaseId: CmsDatabaseId;

  @ManyToOne(() => CmsDatabase)
  database: CmsDatabase | null;

  @Column("jsonb", { nullable: true })
  settings: CmsTableSettings | null;

  @Column("boolean", { nullable: true })
  isArchived: boolean | null;
}

@Entity()
export class CmsRow extends Base<"CmsRowId"> {
  @Index()
  @Column("text", { nullable: true })
  identifier: string | null;

  @Index()
  @Column("text")
  tableId: CmsTableId;

  @ManyToOne(() => CmsTable)
  table: CmsTable | null;

  /**
   * The default ordering of a row, using something like lexorank
   * so it's easy to reorder rows without updating the rank of every
   * row.
   */
  @Column("text")
  rank: string;

  @Column("jsonb", { nullable: true })
  data: Dict<Dict<unknown>> | null;

  @Column("jsonb", { nullable: true })
  draftData: Dict<Dict<unknown>> | null;

  @Column("integer", { nullable: true })
  revision: number | null;
}

@Entity()
export class CmsRowRevision extends Base<"CmsRowRevisionId"> {
  @ManyToOne(() => CmsRow, { nullable: false })
  row: CmsRow | null;

  @Column("text")
  rowId: CmsRowId;

  // For now this is just an opaque JSON blob to the server; only the client understands it.
  @Column("jsonb")
  data: Record<string, any>;

  @Column("boolean")
  isPublished: boolean;
}

@Entity()
export class WorkspaceApiToken extends Base<"WorkspaceApiTokenId"> {
  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Index()
  @Column("text")
  workspaceId: WorkspaceId;

  @Column("text", { transformer: [stableEncryptTranformer] })
  token: string;
}

@Entity()
export class WorkspaceAuthConfig extends Base<"WorkspaceAuthConfigId"> {
  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Index()
  @Column("text")
  workspaceId: WorkspaceId;

  @Column("text", { nullable: true })
  provider: string | null;

  @Column("jsonb")
  config: Record<string, any>;
}

@Entity()
export class WorkspaceUser extends Base<"WorkspaceUserId"> {
  @Index()
  @Column("text")
  workspaceId: WorkspaceId;

  @ManyToOne(() => Workspace)
  workspace: Workspace | null;

  @Index()
  @Column("text")
  userId: string;

  @Index()
  @Column("text")
  email: string;

  @Column("text", { array: true })
  roles: string[];

  @Column("jsonb", { nullable: true })
  properties: Dict<unknown> | null;

  @Index({ unique: true })
  @Column("text", {
    transformer: [stableEncryptTranformer],
  })
  token: string;
}

@Entity()
export class HostlessVersion extends Base<"HostlessVersionId"> {
  @Column("integer", { nullable: false })
  versionCount: number;
}

@Entity()
@Index("PROJECT_AND_BRANCH_IDX", ["projectId", "branchId"])
export class Comment extends Base<"CommentId"> {
  @ManyToOne(() => Project, { nullable: false })
  project: Project | null;

  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => Branch)
  branch: Branch | null;

  @Column("text", { nullable: true })
  branchId: BranchId | null;

  @Column("boolean", { default: false })
  resolved: boolean;

  @Column("boolean", { default: false })
  isEmailNotificationSent: boolean;

  @Column("jsonb")
  location: CommentLocation;

  @Column("text")
  body: string;

  @Index()
  @Column("text")
  threadId: CommentThreadId;
}

@Entity()
export class CommentReaction extends Base<"CommentReactionId"> {
  @ManyToOne(() => Comment, { nullable: false, onDelete: "CASCADE" })
  comment: Comment | null;

  @Index()
  @Column("text")
  commentId: CommentId;

  @Column("jsonb")
  data: CommentReactionData;
}

// This table represents the directories that are configured for a team
@Entity()
export class EndUserDirectory extends Base<"EndUserDirectoryId"> {
  @ManyToOne(() => Team)
  team: Team | null;

  @Column("text")
  teamId: TeamId;

  @Column("text", { nullable: true })
  name?: string;

  @Column("jsonb")
  config: Record<string, any>;

  @Index({ unique: true })
  @Column("text", { transformer: [stableEncryptTranformer] })
  token: string;
}

// This table represents the groups that are defined in a directory
@Entity()
export class DirectoryEndUserGroup extends Base<"DirectoryGroupId"> {
  @ManyToOne(() => EndUserDirectory)
  directory: EndUserDirectory | null;

  @Index()
  @Column("text")
  directoryId: string;

  @Column("text")
  name: string;
}

export interface EndUserIdentifier {
  id?: string;
  email?: string;
  externalId?: string;
}

// This table represents end users that are associated with a directory
@Entity()
export class EndUser extends Base<"EndUserId"> {
  @ManyToOne(() => EndUserDirectory)
  directory: EndUserDirectory | null;

  @Index()
  @Column("text")
  directoryId: string;

  @Index()
  @Column("text", { nullable: true })
  email?: string;

  @Index()
  @Column("text", { nullable: true })
  externalId?: string;

  @ManyToOne(() => User)
  user: User | null;

  @Index()
  @Column("text", { nullable: true })
  userId?: UserId;

  @Column("jsonb")
  properties: Record<string, any>;
}

/*
This table represents the configuration of an app's authentication
config, redirectUri, and authScreenProperties represent data to be used in the oauth flow

also, besides the rules for roles stored in `AppEndUserAccess` the following rules apply to:
- anonymousRoleId is the role that will be assigned to users who are not logged in
- registedRoleId is the role that will be assigned to users who are logged in

in case any of these roles are not set, it will be assumed that in those cases this users will not have access to the app

When a user tries to access an app through the auth flow, the access is going to be granted only:
- if the user matches some rule in `AppEndUserAccess`
- if `registedRoleId` is set
*/
@Entity()
export class AppAuthConfig extends Base<"AppAuthConfigId"> {
  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => EndUserDirectory)
  directory: EndUserDirectory | null;

  @Index()
  @Column("text")
  directoryId: string;

  @Column("text", { nullable: true })
  redirectUri?: string;

  @Column("jsonb", { nullable: true })
  authScreenProperties?: Record<string, any>;

  @Index()
  @Column("text", { nullable: true })
  anonymousRoleId?: string | null;

  @ManyToOne(() => AppRole)
  anonymousRole: AppRole | null;

  @Index()
  @Column("text", { nullable: true })
  registeredRoleId?: string | null;

  @ManyToOne(() => AppRole)
  registeredRole: AppRole | null;

  @Column("text", { nullable: true })
  provider?: AppAuthProvider;

  @Index({ unique: true })
  @Column("text", { transformer: [stableEncryptTranformer], nullable: true })
  token?: string;

  @Column("text", { array: true, default: "{}" })
  redirectUris: string[];

  // Operation ID for execute currentUser properties query operations
  @Column("text", { nullable: true })
  userPropsOpId?: string;

  @Column("text", { nullable: true })
  userPropsDataSourceId?: string;

  @Column("text", { nullable: true })
  userPropsBundledOp?: string;
}

/*
This table represents a roles in an app
Order is used to determine which roles have higher priority
the higher the order, the higher the priority
*/
@Entity()
export class AppRole extends Base<"AppRoleId"> {
  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @Column("text")
  name: string;

  @Column("integer", { default: 0 })
  order: number;
}

@Entity()
export class IssuedCode extends Base<"IssuedCodesId"> {
  @Index()
  @Column("text")
  code: string;
}

/*
This table represents a collection of rules to enable access to an app.
Every access is composed with either a domain, an email or a directory group.
Every access comes with a role.

The role with the highest order that a user matches will be used.

Besides this rules:
- For anonymous users, the `anonymousRoleId` in `AppAuthConfig` will be used
- For registered users, the `registedRoleId` in `AppAuthConfig` will be used
*/

@Entity()
export class AppEndUserAccess extends Base<"AppEndUserAccessId"> {
  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @Index()
  @Column("text", { nullable: true })
  domain?: string;

  @Index()
  @Column("text", { nullable: true })
  email?: string;

  @Index()
  @Column("text", { nullable: true })
  externalId?: string;

  @ManyToOne(() => DirectoryEndUserGroup)
  directoryEndUserGroup: DirectoryEndUserGroup | null;

  @Index()
  @Column("text", { nullable: true })
  directoryEndUserGroupId?: string | null;

  @ManyToOne(() => AppRole)
  role: AppRole | null;

  @Index()
  @Column("text")
  roleId: string;

  @Column("boolean", { default: true })
  manuallyAdded: boolean;
}

// This table is used to mantain which users are in which groups
@Entity()
export class AppEndUserGroup extends Base<"AppEndUserGroupId"> {
  @ManyToOne(() => EndUser)
  endUser: EndUser | null;

  @Index()
  @Column("text")
  endUserId: string;

  @ManyToOne(() => DirectoryEndUserGroup)
  directoryEndUserGroup: DirectoryEndUserGroup | null;

  @Index()
  @Column("text")
  directoryEndUserGroupId: string;
}

// This tables is used to track which users have accessed which apps
@Entity()
export class AppAccessRegistry extends Base<"AppAccessRegistryId"> {
  @ManyToOne(() => Project)
  project: Project | null;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => EndUser)
  endUser: EndUser | null;

  @Index()
  @Column("text")
  endUserId: string;
}

@Entity()
export class TutorialDb extends Base<"TutorialDbId"> {
  @Column("jsonb", {
    transformer: [jsonTransformer, encryptTransformer],
  })
  info: TutorialDbInfo;
}

@Entity()
export class PromotionCode {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column("text") message: string;

  @Column("integer")
  trialDays: number;

  @Column("timestamptz", { nullable: true }) expirationDate: Date | null;
}

@Entity()
export class DataSourceAllowedProjects extends Base<"DataSourceAllowedProjectsId"> {
  @Index()
  @Column("text")
  dataSourceId: DataSourceId;

  @ManyToOne(() => DataSource)
  dataSource: DataSource;

  @Index()
  @Column("text")
  projectId: ProjectId;

  @ManyToOne(() => Project)
  project: Project;
}

@Entity()
export class TeamDiscourseInfo extends Base<"TeamDiscourseInfo"> {
  @Index({ unique: true })
  @Column({ nullable: false, type: "text" })
  teamId: TeamId;

  @OneToOne(() => Team)
  @JoinColumn()
  team: Team;

  /**
   * Used as the category.slug and group.name.
   *
   * Slug should be <=50 characters because that's Discourse's limit.
   */
  @Index({ unique: true })
  @Column({ nullable: false, type: "text" })
  slug: string;

  /**
   * Used as the category.name and group.full_name.
   *
   * This could be different from their organization's name in Plasmic.
   */
  @Index({ unique: true })
  @Column({ nullable: false, type: "text" })
  name: string;

  @Column({ nullable: false, type: "integer" })
  categoryId: number;

  @Column({ nullable: false, type: "integer" })
  groupId: number;
}

// Import any additional database tables
require("./CustomEntities");
