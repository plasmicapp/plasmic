import { toOpaque } from "@/wab/commons/types";
import { AuthError } from "@/wab/shared/ApiErrors/errors";
import {
  AddCommentReactionRequest,
  AddCommentReactionResponse,
  AddFeatureTierResponse,
  ApiAnalyticsImpressionResponse,
  ApiAnalyticsProjectMeta,
  ApiAnalyticsQueryType,
  ApiAnalyticsResponse,
  ApiAppAccessRegistry,
  ApiAppAuthConfig,
  ApiAppAuthPublicConfig,
  ApiAppEndUserAccessRule,
  ApiAppRole,
  ApiAppUser,
  ApiAppUserOpConfig,
  ApiBranch,
  ApiCmsDatabase,
  ApiCmsDatabaseMeta,
  ApiCmseRow,
  ApiCmseRowRevision,
  ApiCmseRowRevisionMeta,
  ApiCmsTable,
  ApiCreateCmsRowsResponse,
  ApiCreateDataSourceRequest,
  ApiDataSource,
  ApiDataSourceTest,
  ApiDirectoryEndUserGroup,
  ApiEndUser,
  ApiEndUserDirectory,
  ApiEntityBase,
  ApiExecuteDataSourceStudioOpRequest,
  ApiFeatureTier,
  ApiNotificationSettings,
  ApiPermission,
  ApiProject,
  ApiProjectMeta,
  ApiProjectRepository,
  ApiProjectRevision,
  ApiProjectWebhook,
  ApiProjectWebhookEvent,
  ApiTeam,
  ApiTeamDiscourseInfo,
  ApiTeamMeta,
  ApiTeamSupportUrls,
  ApiUpdateDataSourceRequest,
  ApiUser,
  AppAuthProvider,
  AppConfigResponse,
  AppCtxResponse,
  BillingFrequency,
  BranchId,
  BranchStatus,
  CheckDomainRequest,
  CheckDomainResponse,
  CloneProjectRequest,
  CloneProjectResponse,
  CmsDatabaseId,
  CmsFileUploadResponse,
  CmsRowId,
  CmsRowRevisionId,
  CmsTableId,
  CmsTableSchema,
  CmsTableSettings,
  CommentData,
  CommentId,
  CommentReactionData,
  CommentReactionId,
  CommitGraph,
  ConfirmEmailRequest,
  ConfirmEmailResponse,
  CreateBranchRequest,
  CreateBranchResponse,
  CreateSiteRequest,
  CreateTeamResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  DeleteCommentResponse,
  DomainsForProjectResponse,
  EditCommentRequest,
  ExistingGithubRepoRequest,
  FeatureTierId,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GetClipResponse,
  GetCommentsResponse,
  GetDevFlagOverridesResponse,
  GetDevFlagOverridesVersionsResponse,
  GetProjectResponse,
  GetSubscriptionResponse,
  GetTeamResponse,
  GetWorkspaceResponse,
  GitActionParams,
  GitBranchesResponse,
  GithubData,
  GitRepository,
  GitSyncOptions,
  GitWorkflowJob,
  GitWorkflowJobStatus,
  GrantRevokeRequest,
  GrantRevokeResponse,
  ImageUploadRequest,
  ImageUploadResponse,
  JoinTeamRequest,
  JoinTeamResponse,
  ListAuthIntegrationsResponse,
  ListBranchesResponse,
  ListCmsDatabasesMetaResponse,
  ListDataSourceBasesResponse,
  ListDataSourcesResponse,
  ListFeatureTiersResponse,
  ListProjectsResponse,
  ListTeamProjectsResponse,
  ListTeamsResponse,
  ListUsersResponse,
  LoginRequest,
  LoginResponse,
  MayTriggerPaywall,
  NewGithubRepoRequest,
  NewGithubRepoResponse,
  NextPublishVersionRequest,
  NextPublishVersionResponse,
  PersonalApiToken,
  PlasmicHostingSettings,
  PostCommentRequest,
  PostCommentResponse,
  ProcessSvgRequest,
  ProcessSvgResponse,
  ProjectExtraData,
  ProjectFullDataResponse,
  ProjectId,
  ProjectRevWithoutDataResponse,
  ProjectsRequest,
  ProjectsResponse,
  ProjectWebhookEventsResponse,
  PublishProjectResponse,
  PurgeUserFromTeamRequest,
  QueryCopilotFeedbackRequest,
  QueryCopilotFeedbackResponse,
  QueryCopilotRequest,
  QueryCopilotResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RevalidatePlasmicHostingRequest,
  RevalidatePlasmicHostingResponse,
  SelfResponse,
  SendCopilotFeedbackRequest,
  SendEmailsResponse,
  SendEmailVerificationRequest,
  SendEmailVerificationResponse,
  SetCustomDomainForProjectRequest,
  SetCustomDomainForProjectResponse,
  SetDevFlagOverridesResponse,
  SetSiteInfoReq,
  SetSubdomainForProjectRequest,
  SetSubdomainForProjectResponse,
  SignUpRequest,
  SignUpResponse,
  StartFreeTrialResponse,
  StripeCustomerId,
  StripeSubscriptionId,
  SubscriptionIntentRequest,
  SubscriptionIntentResponse,
  TeamApiToken,
  TeamId,
  TeamWhiteLabelInfo,
  TrustedHostsListResponse,
  TryMergeRequest,
  TryMergeResponse,
  UpdateHostUrlRequest,
  UpdateHostUrlResponse,
  UpdateNotificationSettingsRequest,
  UpdatePasswordResponse,
  UpdateProjectMetaRequest,
  UpdateProjectResponse,
  UpdateSelfAdminModeRequest,
  UpdateSelfRequest,
  UpdateTeamRequest,
  UpdateWorkspaceRequest,
  UsersResponse,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { showProjectBranchId } from "@/wab/shared/ApiSchemaUtil";
import { Bundle } from "@/wab/shared/bundles";
import { Dict } from "@/wab/shared/collections";
import {
  assert,
  ensureType,
  NotImplementedError,
  omitNils,
} from "@/wab/shared/common";
import { OperationTemplate } from "@/wab/shared/data-sources-meta/data-sources";
import { CodeSandboxInfo } from "@/wab/shared/db-json-blobs";
import { GrantableAccessLevel } from "@/wab/shared/EntUtil";
import { LowerHttpMethod } from "@/wab/shared/HttpClientUtil";
import { modelSchemaHash } from "@/wab/shared/model/classes-metas";
import { UiConfig } from "@/wab/shared/ui-config-utils";
import { executePlasmicDataOp } from "@plasmicapp/data-sources";
import L, { pick, uniq } from "lodash";
import semver from "semver";
import Stripe from "stripe";

export interface SiteInfo {
  createdAt: string | Date;
  createdById: string | null;
  updatedAt: string | Date;
  updatedById: string | null;
  deletedAt: string | Date | null;
  deletedById: string | null;
  name: string;
  id: ProjectId;
  inviteOnly: boolean;
  hostUrl: string | null;
  defaultAccessLevel: GrantableAccessLevel;
  codeSandboxInfos?: CodeSandboxInfo[];
  clonedFromProjectId: ProjectId | null;
  projectApiToken: string | null;
  workspaceId: WorkspaceId | null;
  workspaceName: string | null;
  parentTeamId: TeamId | null;
  teamId: TeamId | null;
  teamName: string | null;
  featureTier: ApiFeatureTier | null;
  uiConfig: UiConfig | null;
  contentCreatorConfig: UiConfig | null;
  extraData: ProjectExtraData;

  // TODO We are hot-patching this data into the SiteInfo.  This is hacky.
  perms: ApiPermission[];
  owner: ApiUser | undefined;
  latestRevisionSynced: number;
  hasAppAuth: boolean;
  appAuthProvider?: AppAuthProvider;
  workspaceTutorialDbs?: ApiDataSource[];
  readableByPublic: boolean;
  isMainBranchProtected: boolean;
}

export interface SiteInstInfo {
  created: string;
  id: string;
  modified: string;
  siteId: string;
  subdomain: string;
}

export interface RevInfo {
  projectId: string;
  data: string;
  revision: number;
}

export interface PkgInfo {
  id: string;
  name: string;
  projectId;
}

export interface PkgVersionInfoMeta extends ApiEntityBase {
  id: string;
  pkgId: string;
  version: string;
  tags?: string[];
  description?: string;
  /**
   * This revision might be really old and not migrated
   */
  revisionId?: string;
  pkg?: PkgInfo | null;
  hostUrl?: string | null;
  branchId?: string | null;
  branch?: ApiBranch | null;
}

export type PkgVersionInfo = PkgVersionInfoMeta & {
  model: Bundle;
};

export type WrappedStorageEvent = Pick<StorageEvent, "key" | "newValue">;

export abstract class SharedApi {
  expectFailure = false;

  protected abstract setUser(user: ApiUser): void;
  protected abstract clearUser(): void;
  protected abstract req(
    method: LowerHttpMethod,
    url: string,
    data?: {},
    opts?: {
      headers: { [name: string]: string | undefined };
    },
    hideDataOnError?: boolean,
    noErrorTransform?: boolean
  ): Promise<any>;

  async get(url: string, data?: {}, extraHeaders?: {}) {
    return this.req("get", url, data, {
      ...this._opts(),
      headers: {
        ...this._opts().headers,
        ...(extraHeaders ?? {}),
      },
    });
  }

  async post(
    url: string,
    data?: {},
    hideDataOnError?: boolean,
    extraHeaders?: {},
    noErrorTransform?: boolean
  ) {
    return this.req(
      "post",
      url,
      data,
      {
        ...this._opts(),
        headers: {
          ...this._opts().headers,
          ...(extraHeaders ?? {}),
        },
      },
      hideDataOnError,
      noErrorTransform
    );
  }

  async put(
    url: string,
    data?: {},
    hideDataOnError?: boolean,
    extraHeaders?: {}
  ) {
    return this.req(
      "put",
      url,
      data,
      {
        ...this._opts(),
        headers: {
          ...this._opts().headers,
          ...(extraHeaders ?? {}),
        },
      },
      hideDataOnError
    );
  }

  async delete(url: string, data?: {}, extraHeaders?: {}) {
    return this.req("delete", url, data, {
      ...this._opts(),
      headers: {
        ...this._opts().headers,
        ...(extraHeaders ?? {}),
      },
    });
  }

  getDefaultSiteId() {
    return this.get("/debug/default-site-id");
  }

  async getSelfInfo(): Promise<SelfResponse> {
    const res: SelfResponse = await this.get("/auth/self");
    this.setUser(res.user);
    return res;
  }

  async updateSelfInfo(data: UpdateSelfRequest) {
    await this.post("/auth/self", data);
  }

  async updateSelfAdminMode(data: UpdateSelfAdminModeRequest) {
    await this.post("/admin/updateMode", data);
  }

  getProjects(
    data: ProjectsRequest = { query: "all" }
  ): Promise<ProjectsResponse> {
    return this.get("/projects", data);
  }

  createSite(workspaceId?: WorkspaceId) {
    return this.post(
      "/projects",
      ensureType<CreateSiteRequest>({ workspaceId })
    );
  }

  deleteSite(siteId) {
    return this.delete(`/projects/${siteId}`);
  }

  // Removes from project from dashboard
  removeSelfPerm(projectId: string) {
    return this.delete(`/projects/${projectId}/perm`);
  }

  getModelUpdates(
    projectId: string,
    revisionNum: number,
    installedDeps: string[],
    branchId: BranchId | undefined
  ): Promise<
    | {
        data: string;
        needsReload?: never;
        revision: number;
        depPkgs: PkgVersionInfo[];
        deletedIids: string[];
        modifiedComponentIids: string[];
      }
    | { data?: never; needsReload: true }
    | { data: null; needsReload?: never }
  > {
    return this.get(`/projects/${projectId}/updates`, {
      revisionNum,
      installedDeps,
      ...(branchId ? { branchId } : {}),
    });
  }

  /**
   * Get the Site (Project+Revision) from the server.
   * If revision is not specified, it will get the latest revision for the
   * project
   **/
  getSiteInfo(
    siteId: string,
    opts?: {
      branchId?: BranchId;
      revisionId?: string;
      revisionNum?: number;
      dontMigrateProject?: boolean;
    }
  ): Promise<GetProjectResponse> {
    return this.get(
      `/projects/${showProjectBranchId(toOpaque(siteId), opts?.branchId)}`,
      {
        ...(opts?.revisionId !== undefined
          ? { revisionId: opts.revisionId }
          : {}),
        ...(opts?.revisionNum !== undefined
          ? { revisionNum: opts.revisionNum }
          : {}),
        ...(opts?.dontMigrateProject !== undefined
          ? { dontMigrateProject: opts.dontMigrateProject }
          : {}),
      }
    );
  }

  /**
   * Download the site + branches data
   */
  getFullProjectData(
    projectId: string,
    branchIds: string[]
  ): Promise<ProjectFullDataResponse> {
    return this.get(`/project-data/${projectId}`, {
      branchIds,
    });
  }

  cloneProject(
    projectId: string,
    opts?: { name?: string; workspaceId?: WorkspaceId; branchName?: string }
  ): Promise<CloneProjectResponse> {
    return this.post(
      `/projects/${projectId}/clone`,
      ensureType<CloneProjectRequest>({ ...(opts ?? {}) })
    );
  }

  clonePublishedTemplate(
    projectId: string,
    name?: string,
    workspaceId?: WorkspaceId
  ): Promise<CloneProjectResponse> {
    return this.post(
      `/templates/${projectId}/clone`,
      ensureType<CloneProjectRequest>({ name, workspaceId })
    );
  }

  importProject(
    data: string,
    opts?: {
      keepProjectIdsAndNames?: boolean;
      projectName?: string;
    }
  ): Promise<{ projectId: string }> {
    return this.post(`/projects/import`, {
      data,
      keepProjectIdsAndNames: opts?.keepProjectIdsAndNames,
      name: opts?.projectName,
    });
  }

  /**
   * Only sends the relevant part of the project that has changed
   * since last save
   **/
  saveProjectRevChanges(
    projectId: string,
    rev: {
      revisionNum: number;
      data: string;
      modelVersion: number;
      hostlessDataVersion: number;
      incremental: boolean;
      toDeleteIids: string[];
      modifiedComponentIids: string[];
      branchId?: BranchId;
    }
  ) {
    const { branchId, revisionNum, ...rest } = rev;
    return this.post(
      `/projects/${showProjectBranchId(
        toOpaque(projectId),
        branchId
      )}/revisions/${revisionNum}`,
      {
        modelSchemaHash,
        ...rest,
      }
    );
  }

  setSiteInfo(
    siteId: string,
    data: SetSiteInfoReq
  ): Promise<MayTriggerPaywall<UpdateProjectResponse>> {
    return this.put(`/projects/${siteId}`, data);
  }

  updateProjectMeta(
    projectId: string,
    data: UpdateProjectMetaRequest
  ): Promise<ApiProjectMeta> {
    return this.put(`/projects/${projectId}/meta`, data);
  }

  setShowHostingBadge(projectId: ProjectId, showBadge: boolean) {
    return this.put(`/projects/${projectId}/hosting/badge`, { showBadge });
  }

  reset() {
    return this.post("/debug/reset");
  }

  register(data) {
    return this.post("/register", data);
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const res: LoginResponse = await this.post("/auth/login", data, true);
    if (res.status) {
      await this.refreshCsrfToken();
      this.setUser(res.user);
    }
    return res;
  }

  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    const res: ForgotPasswordResponse = await this.post(
      "/auth/forgotPassword",
      data
    );
    return res;
  }

  async isValidSsoEmail(
    email: string
  ): Promise<{ valid: boolean; tenantId?: string }> {
    const res = await this.get(
      `/auth/sso/test?${new URLSearchParams({ email }).toString()}`
    );
    return res;
  }

  async publishCodeSandbox(
    projectId: string,
    opts: Partial<CodeSandboxInfo>
  ): Promise<{ id: string }> {
    return this.post(
      `/projects/${projectId}/publish-codesandbox`,
      opts
    ) as Promise<{
      id: string;
    }>;
  }

  async shareCodeSandbox(
    projectId: string,
    sandboxId: string,
    email: string
  ): Promise<{}> {
    return this.post(`/projects/${projectId}/share-codesandbox`, {
      email,
      sandboxId,
    }) as Promise<{}>;
  }

  async detachCodeSandbox(projectId: string, sandboxId: string): Promise<{}> {
    return this.post(`/projects/${projectId}/detach-codesandbox`, {
      sandboxId,
    }) as Promise<{}>;
  }

  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    const res: LoginResponse = await this.post("/auth/sign-up", data);
    if (res.status) {
      await this.refreshCsrfToken();
      this.setUser(res.user);
    }
    return res;
  }

  async logout() {
    const res = await this.post("/auth/logout");
    this.clearUser();
    await this.refreshCsrfToken();
    return res;
  }

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<UpdatePasswordResponse> {
    return this.post("/auth/self/password", { oldPassword, newPassword });
  }

  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    return this.post("/auth/resetPassword", data);
  }

  setPassword(data) {
    return this.post("/admin/setPassword", data);
  }

  confirmEmail(data: ConfirmEmailRequest): Promise<ConfirmEmailResponse> {
    return this.post("/auth/confirmEmail", data);
  }

  sendEmailVerification(
    data: SendEmailVerificationRequest
  ): Promise<SendEmailVerificationResponse> {
    return this.post("/auth/sendEmailVerification", data);
  }

  fmtCode({ code, parser }: /*TWZ*/ { code: string; parser: string }) {
    return this.post("/fmt-code", { code, parser }) as Promise<{
      formatted: string;
    }>;
  }

  getLatestPlumePkg(): Promise<{ pkg: PkgVersionInfo }> {
    return this.get("/plume-pkg/latest");
  }

  getPlumePkg(): Promise<{ pkg: PkgVersionInfo; depPkgs: PkgVersionInfo[] }> {
    return this.get("/plume-pkg");
  }

  getPkgByProjectId(projectId: string): Promise<{ pkg?: PkgInfo }> {
    return this.get(`/projects/${projectId}/pkg`);
  }

  createPkgByProjectId(projectId: string): Promise<{ pkg: PkgInfo }> {
    return this.post(`/projects/${projectId}/create-pkg`);
  }

  getPkgVersionByProjectId(
    projectId: string,
    version
  ): Promise<{ pkg: PkgVersionInfo; depPkgs: PkgVersionInfo[]; etag: string }> {
    return this.get(`/pkgs/projectId/${projectId}`, { version });
  }

  /**
   * Gets the pkg at a particular version.
   * If the version is not specified, it will return the latest
   * @param pkgId
   * @param version
   */
  getPkgVersion(
    pkgId: string,
    version?: string,
    branchId?: string
  ): Promise<{ pkg: PkgVersionInfo; depPkgs: PkgVersionInfo[]; etag: string }> {
    return this.get(`/pkgs/${pkgId}`, {
      version: version ?? "latest",
      meta: false,
      ...(branchId ? { branchId } : {}),
    });
  }

  /**
   * Gets the pkg at a particular version, excluding data
   * If the version is not specified, it will return the latest
   * @param pkgId
   * @param version
   */
  getPkgVersionMeta(
    pkgId: string,
    version?: string,
    branchId?: BranchId
  ): Promise<{ pkg: PkgVersionInfoMeta; depPkgs: PkgVersionInfoMeta[] }> {
    return this.get(`/pkgs/${pkgId}`, {
      version: version ?? "latest",
      meta: true,
      ...(branchId ? { branchId } : {}),
    });
  }

  async computeNextProjectVersion(
    projectId,
    { branchId, revisionNum }: NextPublishVersionRequest
  ): Promise<NextPublishVersionResponse> {
    return this.post(`/projects/${projectId}/next-publish-version`, {
      projectId,
      branchId,
      revisionNum,
    });
  }

  async publishProject(
    projectId: string,
    revisionNum: number,
    version: string,
    tags: string[],
    description: string,
    hostLessPackage = false,
    branchId: BranchId | undefined,
    waitPrefill = true
  ): Promise<PublishProjectResponse> {
    return this.post(`/projects/${projectId}/publish`, {
      projectId,
      branchId,
      revisionNum,
      version,
      tags,
      description,
      hostLessPackage,
      waitPrefill,
    });
  }

  async getPkgVersionPublishStatus(
    projectId: string,
    pkgVersionId: string
  ): Promise<{ status: "ready" | "pre-filling" }> {
    return this.get(`/projects/${projectId}/pkgs/${pkgVersionId}/status`);
  }

  async listPkgVersionsWithoutData(
    pkgId: string,
    opts?: { branchId?: BranchId | null }
  ): Promise<{
    pkgVersions: PkgVersionInfoMeta[];
  }> {
    const result = await this.get(
      `/pkgs/${pkgId}/versions-without-data`,
      opts?.branchId ? opts : undefined
    );
    // Ensure it's sorted in reverse chronological order
    const sorted = (result.pkgVersions as PkgVersionInfoMeta[]).sort((a, b) =>
      semver.gt(a.version, b.version) ? -1 : +1
    );
    return {
      ...result,
      pkgVersions: sorted,
    };
  }

  async updatePkgVersion(
    pkgId: string,
    version: string,
    branchId: BranchId | null,
    toMerge: Partial<PkgVersionInfo>
  ): Promise<{ pkg: PkgVersionInfo }> {
    return await this.post(`/pkgs/${pkgId}/update-version`, {
      version,
      branchId,
      pkg: toMerge,
    });
  }

  async revertToVersion(
    projectId: ProjectId,
    data: {
      branchId: BranchId | undefined;
      pkgId: string;
      version: string;
    }
  ) {
    return await this.put(
      `/projects/${projectId}/revert-to-version`,
      pick(data, ["branchId", "pkgId", "version"])
    );
  }

  protected _csrf?: string;

  protected _opts() {
    if (this.expectFailure) {
      return {
        headers: {
          "x-expect-failure": "true",
        },
      };
    } else {
      return { headers: { "X-CSRF-Token": this._csrf } };
    }
  }

  async refreshCsrfToken() {
    try {
      const { csrf } = await this.get("/auth/csrf");
      this._csrf = csrf;
    } catch (err) {
      if (err instanceof AuthError) {
        // Reload the page and force user to try logging in again
        window.top?.location.reload();
      } else {
        throw err;
      }
    }
  }

  async getLastBundleVersion(): Promise<{ latestBundleVersion: string }> {
    return this.get("/latest-bundle-version");
  }

  async getProjectRevWithoutData(
    projectId: string,
    revisionId?: string,
    branchId?: string
  ): Promise<ProjectRevWithoutDataResponse> {
    return this.get(`/projects/${projectId}/revision-without-data`, {
      ...(revisionId !== undefined ? { revisionId } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
    });
  }

  async listPersonalApiTokens(): Promise<PersonalApiToken[]> {
    const tokens = await this.get(`/settings/apitokens`);
    return tokens.tokens;
  }

  async createPersonalApiToken(): Promise<PersonalApiToken> {
    const token = await this.put(`/settings/apitokens`);
    return token.token;
  }

  async revokePersonalApiToken(token: string): Promise<void> {
    await this.delete(`/settings/apitokens/${token}`);
  }

  async emitPersonalApiToken(initToken: string): Promise<PersonalApiToken> {
    const token = await this.put(`/settings/apitokens/emit/${initToken}`);
    return token.token;
  }

  /*
  async listTeamApiTokens(teamId: TeamId): Promise<TeamApiToken[]> {
    const tokens = await this.get(`/teams/${teamId}/tokens`);
    return tokens.tokens;
  }
  */

  async createTeamApiToken(teamId: TeamId): Promise<TeamApiToken> {
    const token = await this.post(`/teams/${teamId}/tokens`);
    return token.token;
  }

  async revokeTeamApiToken(teamId: string, token: string): Promise<void> {
    await this.delete(`/teams/${teamId}/tokens/${token}`);
  }

  async queryDataSource(url: string) {
    assert(
      new URL(url).origin === window.origin &&
        url.startsWith(window.origin + "/api/v1/"),
      "Unexpected URL " + url
    );
    return this.get(url.substring((window.origin + "/api/v1/").length));
  }

  async getUsersById(ids: string[]): Promise<UsersResponse> {
    assert(ids.length > 0, "Expected at least one user");
    ids = uniq(ids);
    return this.get(`/users/${ids.join(",")}`);
  }

  async listUsers(): Promise<ListUsersResponse> {
    return this.get(`/admin/users`);
  }

  async createTeam(name: string): Promise<CreateTeamResponse> {
    return this.post("/teams", { name });
  }

  async updateTeam(
    id: TeamId,
    data: UpdateTeamRequest
  ): Promise<CreateTeamResponse> {
    return this.put(`/teams/${id}`, data);
  }

  async listTeams(): Promise<ListTeamsResponse> {
    return this.get(`/teams`);
  }

  async getTeam(teamId: TeamId): Promise<GetTeamResponse> {
    return this.get(`/teams/${teamId}`);
  }

  async getTeamMeta(teamId: TeamId): Promise<{ meta: ApiTeamMeta }> {
    return this.get(`/teams/${teamId}/meta`);
  }

  async deleteTeam(teamId: TeamId) {
    return this.delete(`/teams/${teamId}`);
  }

  async purgeUsersFromTeam(data: PurgeUserFromTeamRequest) {
    return this.post(`/teams/purgeUsers`, data);
  }

  async updatePaymentMethod(teamId: TeamId, paymentMethodId: string) {
    return this.post(`/teams/${teamId}/paymentMethod`, {
      paymentMethodId,
    });
  }

  async prepareTeamSupportUrls(teamId: TeamId): Promise<ApiTeamSupportUrls> {
    return this.post(`/teams/${teamId}/prepare-support-urls`);
  }

  async createWorkspace(
    data: CreateWorkspaceRequest
  ): Promise<MayTriggerPaywall<CreateWorkspaceResponse>> {
    return this.post("/workspaces", data);
  }

  async updateWorkspace(
    id: WorkspaceId,
    data: UpdateWorkspaceRequest
  ): Promise<MayTriggerPaywall<CreateWorkspaceResponse>> {
    return this.put(`/workspaces/${id}`, data);
  }

  async getAppCtx(): Promise<AppCtxResponse> {
    return this.get("/app-ctx");
  }

  async listTeamProjects(teamId: TeamId): Promise<ListTeamProjectsResponse> {
    return this.get(`/teams/${teamId}/projects`);
  }

  async getWorkspace(id: WorkspaceId): Promise<GetWorkspaceResponse> {
    return this.get(`/workspaces/${id}`);
  }

  async getPersonalWorkspace(): Promise<GetWorkspaceResponse> {
    return this.get(`/personal-workspace`);
  }

  async deleteWorkspace(id: WorkspaceId) {
    return this.delete(`/workspaces/${id}`);
  }

  async grantRevoke(
    data: GrantRevokeRequest
  ): Promise<MayTriggerPaywall<GrantRevokeResponse>> {
    return this.post(`/grant-revoke`, data);
  }

  async joinTeam(data: JoinTeamRequest): Promise<JoinTeamResponse> {
    return this.post(`/teams/${data.teamId}/join`, data);
  }

  async listCurrentFeatureTiers(opts?: {
    includeLegacyTiers: boolean;
  }): Promise<ListFeatureTiersResponse> {
    return this.get(`/feature-tiers`, opts ? { ...opts } : {});
  }

  async listAllFeatureTiers(): Promise<ListFeatureTiersResponse> {
    return this.get(`/admin/feature-tiers`);
  }

  async addFeatureTier(data: ApiFeatureTier): Promise<AddFeatureTierResponse> {
    return this.put("/admin/feature-tiers", { data });
  }

  async startFreeTrial(teamId: TeamId): Promise<StartFreeTrialResponse> {
    return this.post(`/teams/${teamId}/trial`);
  }

  async getSubscription(teamId: TeamId): Promise<GetSubscriptionResponse> {
    return this.get(`/billing/subscription/${teamId}`);
  }

  async createSubscription(
    args: SubscriptionIntentRequest
  ): Promise<SubscriptionIntentResponse> {
    return this.post(`/billing/subscription/create`, args);
  }

  async changeSubscription(
    args: SubscriptionIntentRequest
  ): Promise<GetSubscriptionResponse> {
    return this.put(`/billing/subscription/${args.teamId}`, args);
  }

  async cancelSubscription(
    teamId: TeamId,
    { reason }: { reason?: string } = {}
  ): Promise<{}> {
    return this.delete(`/billing/subscription/${teamId}`, { reason });
  }

  async createSetupIntent(teamId: TeamId): Promise<Stripe.SetupIntent> {
    return this.post(`/billing/setup-intent/${teamId}`);
  }

  async changeTeamOwner(teamId: string, newOwner: string): Promise<{}> {
    return this.post(`/admin/change-team-owner`, { teamId, newOwner });
  }

  async upgradePersonalTeam(teamId: string): Promise<{}> {
    return this.post(`/admin/upgrade-personal-team`, { teamId });
  }

  async resetTeamTrial(teamId: string): Promise<{}> {
    return this.post(`/admin/reset-team-trial`, { teamId });
  }

  async adminListTeams(
    data:
      | {
          userId: string;
        }
      | {
          featureTierIds: string[];
        }
  ): Promise<ListTeamsResponse> {
    return this.post(`/admin/teams`, data);
  }

  async getTeamDiscourseInfo(teamId: TeamId): Promise<ApiTeamDiscourseInfo> {
    return this.get(`/admin/teams/${teamId}/discourse-info`);
  }

  async syncTeamDiscourseInfo(
    teamId: TeamId,
    data: { slug: string; name: string }
  ): Promise<ApiTeamDiscourseInfo> {
    return this.put(`/admin/teams/${teamId}/sync-discourse-info`, data);
  }

  async sendTeamSupportWelcomeEmail(
    teamId: TeamId
  ): Promise<SendEmailsResponse> {
    return this.post(`/admin/teams/${teamId}/send-support-welcome-email`);
  }

  async listProjectsForOwner(ownerId: string): Promise<ListProjectsResponse> {
    return this.post(`/admin/projects`, { ownerId });
  }

  async adminCreateWorkspace(data: {
    id: WorkspaceId;
    name: string;
    description: string;
    teamId: TeamId;
  }) {
    return this.post(`/admin/workspaces`, data);
  }

  async listBranchesForProject(
    projectId: ProjectId
  ): Promise<ListBranchesResponse> {
    return this.get(`/projects/${encodeURIComponent(projectId)}/branches`);
  }

  async tryMergeBranch(
    projectId: ProjectId,
    data: TryMergeRequest
  ): Promise<TryMergeResponse> {
    return this.post(`/projects/${encodeURIComponent(projectId)}/merge`, data);
  }

  async createBranch(
    projectId: ProjectId,
    data: CreateBranchRequest
  ): Promise<CreateBranchResponse> {
    return this.post(
      `/projects/${encodeURIComponent(projectId)}/branches`,
      data
    );
  }

  async updateBranch(
    projectId: ProjectId,
    branchId: BranchId,
    data: { name?: string; status?: BranchStatus }
  ): Promise<{}> {
    return this.put(
      `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(
        branchId
      )}`,
      data
    );
  }

  async deleteBranch(projectId: ProjectId, branchId: BranchId): Promise<{}> {
    return this.delete(
      `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(
        branchId
      )}`
    );
  }

  async setMainBranchProtection(
    projectId: ProjectId,
    mainBranchProtection: boolean
  ): Promise<{}> {
    return this.post(
      `/projects/${encodeURIComponent(projectId)}/main-branch-protection`,
      {
        protected: mainBranchProtection,
      }
    );
  }

  async updateHostUrl(
    projectId: ProjectId,
    data: UpdateHostUrlRequest
  ): Promise<UpdateHostUrlResponse> {
    return this.put(`/projects/${projectId}/update-host`, data);
  }

  async changeProjectOwner(projectId: string, ownerEmail: string): Promise<{}> {
    return this.post(`/admin/change-project-owner`, { projectId, ownerEmail });
  }

  async upsertSsoConfig(args: any): Promise<any> {
    return await this.post(`/admin/upsert-sso`, args);
  }

  async getSsoConfigByTeamId(teamId: TeamId): Promise<any> {
    return await this.get(
      `/admin/get-sso?${new URLSearchParams({ teamId }).toString()}`
    );
  }

  async getTeamByWhiteLabelName(name: string): Promise<ApiTeam> {
    const res = await this.get(
      `/admin/get-team-by-white-label-name?${new URLSearchParams({
        name,
      }).toString()}`
    );
    return res.team;
  }

  async updateTeamWhiteLabelInfo(
    teamId: TeamId,
    info: TeamWhiteLabelInfo
  ): Promise<ApiTeam> {
    const res = await this.post(`/admin/update-team-white-label-info`, {
      id: teamId,
      whiteLabelInfo: info,
    });
    return res.team;
  }

  async updateTeamWhiteLabelName(
    teamId: TeamId,
    name: string | null
  ): Promise<ApiTeam> {
    const res = await this.post(`/admin/update-team-white-label-name`, {
      id: teamId,
      whiteLabelName: name,
    });
    return res.team;
  }

  async createTutorialDb(type: any): Promise<any> {
    return await this.post(`/admin/create-tutorial-db`, { type });
  }

  async createPromotionCode(
    id: string,
    message?: string,
    trialDays?: number,
    expirationDate?: Date
  ): Promise<any> {
    return await this.post(`/admin/promotion-code`, {
      id,
      message,
      expirationDate,
      trialDays,
    });
  }

  async resetTutorialDb(sourceId: string): Promise<any> {
    return await this.post(`/admin/reset-tutorial-db`, { sourceId });
  }

  async adminLoginAs(args: { email: string }): Promise<LoginResponse> {
    return this.post("/admin/login-as", args);
  }

  async getDevFlagOverrides(): Promise<GetDevFlagOverridesResponse> {
    return this.get("/admin/devflags");
  }

  async getDevFlagVersions(): Promise<GetDevFlagOverridesVersionsResponse> {
    return this.get("/admin/devflags/versions");
  }

  async setDevFlagOverrides(
    data: string
  ): Promise<SetDevFlagOverridesResponse> {
    return this.put("/admin/devflags", { data });
  }

  async cloneProjectAsAdmin(
    projectId: string,
    revisionNum?: number
  ): Promise<CloneProjectResponse> {
    return this.post("/admin/clone", { projectId, revisionNum });
  }

  async revertProjectRevision(
    projectId: string,
    revision: number
  ): Promise<void> {
    return this.post("/admin/revert-project-revision", { projectId, revision });
  }

  async getLatestProjectRevisionAsAdmin(
    projectId: string
  ): Promise<ApiProjectRevision> {
    const res = await this.get(`/admin/project/${projectId}/rev`);
    return res.rev;
  }

  async getPkgVersionAsAdmin(opts: {
    pkgId?: string;
    version?: string;
    pkgVersionId?: string;
  }): Promise<PkgVersionInfo> {
    const search = new URLSearchParams();
    if (opts.pkgId) {
      search.set("pkgId", opts.pkgId);
    }
    if (opts.version) {
      search.set("version", opts.version);
    }
    if (opts.pkgVersionId) {
      search.set("pkgVersionId", opts.pkgVersionId);
    }
    const res = await this.get(`/admin/pkg-version/data?${search.toString()}`);
    return res.pkgVersion as PkgVersionInfo;
  }

  async savePkgVersionAsAdmin(opts: {
    pkgVersionId: string;
    data: string;
  }): Promise<PkgVersionInfo> {
    const res = await this.post(`/admin/pkg-version/${opts.pkgVersionId}`, {
      data: opts.data,
    });
    return res.pkgVersion as PkgVersionInfo;
  }

  async saveProjectRevisionDataAsAdmin(
    projectId: string,
    revision: number,
    data: string
  ) {
    const res = await this.post(`/admin/project/${projectId}/rev`, {
      revision,
      data: data,
    });
    return res.rev;
  }

  async deactivateUserAsAdmin(email: string): Promise<{}> {
    return this.post("/admin/deactivate-user", { email });
  }

  async upgradeTeamAsAdmin(args: {
    teamId: TeamId;
    featureTierId: FeatureTierId;
    seats: number;
    billingFrequency: BillingFrequency;
    billingEmail: string;
    stripeCustomerId: StripeCustomerId;
    stripeSubscriptionId: StripeSubscriptionId;
  }): Promise<{}> {
    return this.post("/admin/upgrade-team", args);
  }

  async getAppConfig(): Promise<AppConfigResponse> {
    return this.get("/app-config");
  }

  async getClip(clipId: string): Promise<GetClipResponse> {
    return this.get(`/clip/${encodeURIComponent(clipId)}`);
  }

  async connectGithubInstallations(state: string, code: string) {
    return this.post(`/github/connect`, {
      state,
      code,
    });
  }

  async getProjectRepositories(
    projectId: string
  ): Promise<{ projectRepositories: Array<ApiProjectRepository> }> {
    return this.get(`/projects/${projectId}/repositories`);
  }

  protected githubToken(): { "x-plasmic-github-token": string } {
    throw new NotImplementedError();
  }

  async setupNewGithubRepo(
    args: Omit<NewGithubRepoRequest, "token">
  ): Promise<NewGithubRepoResponse> {
    return this.post(`/github/repos`, args, undefined, this.githubToken());
  }

  async setupExistingGithubRepo(
    args: Omit<ExistingGithubRepoRequest, "token">
  ) {
    await this.put(`/github/repos`, args, undefined, this.githubToken());
  }

  async detectOptionsFromDirectory(
    repository: GitRepository,
    branch: string,
    dir: string
  ): Promise<Partial<GitSyncOptions>> {
    const { name, installationId } = repository;
    const res = await this.get(
      `/github/detect/${name}`,
      {
        branch,
        installationId,
        dir,
      },
      this.githubToken()
    );
    return res.syncOptions;
  }

  async addProjectRepository(
    pr: Omit<ApiProjectRepository, "id">
  ): Promise<ApiProjectRepository> {
    const { repo } = await this.post(
      `/project_repositories`,
      pr,
      undefined,
      this.githubToken()
    );
    return repo;
  }

  async deleteProjectAndRevisions(projectId: string) {
    return this.delete(`/admin/delete-project-and-revisions`, { projectId });
  }

  async deleteProjectRepository(id: string, projectId: string) {
    return this.delete(`/project_repositories/${id}`, { projectId });
  }

  async fetchGithubData(): Promise<GithubData> {
    return this.get(`/github/data`, {}, this.githubToken());
  }

  async fetchGitBranches(
    repository: GitRepository
  ): Promise<GitBranchesResponse> {
    return this.get(`/github/branches`, repository, this.githubToken());
  }

  async fireGitAction({
    projectRepositoryId,
    projectId,
    action,
    branch,
    title,
    description,
  }: GitActionParams): Promise<GitWorkflowJobStatus> {
    return this.post(`/project_repositories/${projectRepositoryId}/action`, {
      projectId,
      action,
      branch,
      title,
      description,
    });
  }

  async getGitLatestWorkflowRun(
    projectRepositoryId: string,
    projectId: string
  ): Promise<GitWorkflowJobStatus> {
    return this.get(`/project_repositories/${projectRepositoryId}/latest-run`, {
      projectId,
    });
  }

  async getGitWorkflowJob(
    projectRepositoryId: string,
    projectId: string,
    workflowRunId: number
  ): Promise<{ job: GitWorkflowJob | undefined }> {
    return this.get(
      `/project_repositories/${projectRepositoryId}/runs/${workflowRunId}`,
      { projectId }
    );
  }

  async createProjectWebhook(
    projectId: string
  ): Promise<{ webhook: ApiProjectWebhook }> {
    return this.post(`/projects/${projectId}/webhooks`);
  }

  async updateProjectWebhook(
    projectId: string,
    webhook: ApiProjectWebhook
  ): Promise<{ webhook: ApiProjectWebhook }> {
    return this.put(
      `/projects/${projectId}/webhooks/${webhook.id}`,
      L.omit(webhook, "id")
    );
  }

  async deleteProjectWebhook(projectId: string, webhookId: string) {
    return this.delete(`/projects/${projectId}/webhooks/${webhookId}`);
  }

  async getProjectWebhooks(
    projectId: string
  ): Promise<{ webhooks: ApiProjectWebhook[] }> {
    return this.get(`/projects/${projectId}/webhooks`);
  }

  async triggerProjectWebhook(
    projectId: string,
    webhook: ApiProjectWebhook
  ): Promise<ApiProjectWebhookEvent> {
    const { event } = await this.post(
      `/projects/${projectId}/trigger-webhook`,
      webhook
    );
    return event;
  }

  async getProjectWebhookEvents(
    projectId: string
  ): Promise<ProjectWebhookEventsResponse> {
    return this.get(`/projects/${projectId}/webhooks/events`);
  }

  /**
   * @param search The search query params to forward.
   */
  async discourseConnect(search: string) {
    return this.get("/auth/discourse-connect?" + search.replace(/^\?/, ""));
  }

  async getTrustedHostsList(): Promise<TrustedHostsListResponse> {
    return this.get("/hosts");
  }

  async addTrustedHost(url: string) {
    return this.post("/hosts", { url });
  }

  async deleteTrustedHost(id: string) {
    return this.delete(`/hosts/${id}`);
  }

  async listDataSources(
    workspaceId?: string
  ): Promise<ListDataSourcesResponse> {
    return this.get(`/data-source/sources`, { workspaceId });
  }

  async listDataSourceBases(id: string): Promise<ListDataSourceBasesResponse> {
    return this.get(`/data-source/${id}/bases`);
  }

  async executeDataSourceStudioOp(
    projectId: string,
    sourceId: string,
    opts: Omit<ApiExecuteDataSourceStudioOpRequest, "projectId">
  ): Promise<any> {
    return this.post(
      `/data-source/sources/${sourceId}`,
      { ...opts, projectId },
      false
    );
  }

  async createDataSource(
    opts: ApiCreateDataSourceRequest
  ): Promise<ApiDataSource> {
    return this.post("/data-source/sources", opts, true);
  }

  async testDataSource(
    opts: ApiCreateDataSourceRequest
  ): Promise<ApiDataSourceTest> {
    return this.post("/data-source/sources/test", opts, true);
  }

  async updateDataSource(
    id: string,
    opts: ApiUpdateDataSourceRequest
  ): Promise<ApiDataSource> {
    return this.put(`/data-source/sources/${id}`, { ...opts }, true);
  }

  async deleteDataSource(id: string) {
    return this.delete(`/data-source/sources/${id}`);
  }

  async getDataSourceById(
    id: string,
    opts?: {
      excludeSettings?: boolean;
    }
  ): Promise<ApiDataSource> {
    return this.get(`/data-source/sources/${id}`, opts);
  }

  async getDataSourceOpId(
    projectId: string,
    dataSourceId: string,
    op: OperationTemplate
  ): Promise<{ opId: string }> {
    return this.post(`/data-source/sources/${dataSourceId}/op-id`, {
      ...op,
      projectId,
    });
  }

  async allowProjectToDataSource(
    dataSourceId: string,
    projectId: string
  ): Promise<{}> {
    return this.post(`/data-source/sources/${dataSourceId}/allow`, {
      projectId,
    });
  }

  async uploadImageFile(req: ImageUploadRequest): Promise<ImageUploadResponse> {
    const data = new FormData();
    data.append("file", req.imageFile);
    return this.post("/image/upload", data);
  }

  //
  // CMS
  //

  async createDatabase(workspaceId: WorkspaceId, opts: { name: string }) {
    return (await this.post(`/cmse/databases`, {
      workspaceId,
      ...opts,
    })) as ApiCmsDatabase;
  }

  async listCmsDatabasesForWorkspace(workspaceId: WorkspaceId) {
    const res = await this.get(`/cmse/databases?workspaceId=${workspaceId}`);
    return res.databases as ApiCmsDatabase[];
  }

  async listCmsDatabasesForTeam(teamId: TeamId) {
    const res = await this.get(`/cmse/databases?teamId=${teamId}`);
    return res.databases as ApiCmsDatabase[];
  }

  async getCmsDatabase(databaseId: CmsDatabaseId, includeArchived?: boolean) {
    const res = await this.get(`/cmse/databases/${databaseId}`, {
      includeArchived,
    });
    return res as ApiCmsDatabase;
  }

  async getCmsDatabaseMeta(databaseId: CmsDatabaseId) {
    const res = await this.get(`/cmse/databases-meta/${databaseId}`);
    return res as ApiCmsDatabaseMeta;
  }

  async listDatabasesMeta(): Promise<ListCmsDatabasesMetaResponse> {
    return this.get(`/cmse/databases-meta`);
  }

  async updateCmsDatabase(
    databaseId: CmsDatabaseId,
    data: Partial<{
      name: string;
      extraData: {
        locales: string[];
      };
      workspaceId: string;
    }>
  ) {
    const res = await this.put(`/cmse/databases/${databaseId}`, data);
    return res as ApiCmsDatabase;
  }

  async cloneCmsDatabase(
    databaseId: CmsDatabaseId,
    data?: Partial<{
      name: string;
    }>
  ) {
    const res = await this.post(`/cmse/databases/${databaseId}/clone`, data);
    return res as ApiCmsDatabase;
  }

  async deleteCmsDatabase(databaseId: CmsDatabaseId) {
    return await this.delete(`/cmse/databases/${databaseId}`);
  }

  async createCmsTable(
    databaseId: CmsDatabaseId,
    opts: {
      name: string;
      identifier: string;
      schema?: CmsTableSchema;
    }
  ) {
    return (await this.post(
      `/cmse/databases/${databaseId}/tables`,
      opts
    )) as ApiCmsTable;
  }

  async updateCmsTable(
    tableId: CmsTableId,
    opts: {
      name?: string;
      schema?: CmsTableSchema;
      description?: string;
      settings?: CmsTableSettings;
      isArchived?: boolean;
    }
  ) {
    return (await this.put(`/cmse/tables/${tableId}`, opts)) as ApiCmsTable;
  }

  async deleteCmsTable(tableId: CmsTableId) {
    return await this.delete(`/cmse/tables/${tableId}`);
  }

  async triggerCmsTableWebhooks(tableId: CmsTableId, event: "publish") {
    return this.post(
      `/cmse/tables/${tableId}/trigger-webhook?event=${event}`
    ) as Promise<{
      responses: { status: number; data: string }[];
    }>;
  }

  async createCmsRow(
    tableId: CmsTableId,
    opts: {
      identifier?: string;
      data: Dict<Dict<unknown>> | null;
      draftData: Dict<Dict<unknown>> | null;
    }
  ) {
    const { rows } = await this.createCmsRows(tableId, [opts]);
    return rows[0];
  }

  async createCmsRows(
    tableId: CmsTableId,
    rowInputs: {
      identifier?: string;
      data: Dict<Dict<unknown>> | null;
      draftData: Dict<Dict<unknown>> | null;
    }[]
  ): Promise<ApiCreateCmsRowsResponse> {
    return await this.post(`/cmse/tables/${tableId}/rows`, {
      rows: rowInputs,
    });
  }

  async getCmsRow(rowId: CmsRowId) {
    return (await this.get(`/cmse/rows/${rowId}`)) as ApiCmseRow;
  }

  async updateCmsRow(
    rowId: CmsRowId,
    opts: {
      identifier?: string;
      data?: Dict<Dict<unknown>> | null;
      draftData?: Dict<Dict<unknown>> | null;
      revision?: number | null;
      noMerge?: boolean;
    }
  ) {
    return (await this.put(`/cmse/rows/${rowId}`, opts)) as ApiCmseRow;
  }

  async deleteCmsRow(rowId: CmsRowId) {
    return await this.delete(`/cmse/rows/${rowId}`);
  }

  async listCmsRows(tableId: CmsTableId, fields?: string[]) {
    let url = `/cmse/tables/${tableId}/rows`;
    if (fields && fields.length > 0) {
      const params = new URLSearchParams();
      for (const field of fields) {
        params.append("fields", field);
      }
      url = `${url}?${params.toString()}`;
    }
    const res = await this.get(url);

    return res.rows as ApiCmseRow[];
  }

  async listCmsRowRevisions(
    rowId: CmsRowId
  ): Promise<ApiCmseRowRevisionMeta[]> {
    const { revisions } = await this.get(`/cmse/rows/${rowId}/revisions`);
    return revisions;
  }

  async getCmsRowRevision(
    revId: CmsRowRevisionId
  ): Promise<ApiCmseRowRevision> {
    const { revision } = await this.get(`/cmse/row-revisions/${revId}`);
    return revision;
  }

  async cmsFileUpload(file: File): Promise<CmsFileUploadResponse> {
    const data = new FormData();
    data.append("file", file);
    return this.post("/cmse/file-upload", data);
  }

  async checkDomain(domain: string): Promise<CheckDomainResponse> {
    return this.get(
      "/check-domain",
      ensureType<CheckDomainRequest>({
        domain,
      })
    );
  }
  async getDomainsForProject(
    projectId: string
  ): Promise<DomainsForProjectResponse> {
    return this.get(`/domains-for-project/${encodeURIComponent(projectId)}`);
  }
  async setSubdomainForProject(
    subdomain: string | undefined,
    projectId: ProjectId
  ): Promise<SetSubdomainForProjectResponse> {
    return this.put(
      "/subdomain-for-project",
      ensureType<SetSubdomainForProjectRequest>({
        subdomain,
        projectId,
      })
    );
  }
  async setCustomDomainForProject(
    customDomain: string | undefined,
    projectId: ProjectId
  ): Promise<SetCustomDomainForProjectResponse> {
    return this.put(
      "/custom-domain-for-project",
      ensureType<SetCustomDomainForProjectRequest>({
        customDomain,
        projectId,
      })
    );
  }
  async revalidatePlasmicHosting(
    projectId: ProjectId
  ): Promise<RevalidatePlasmicHostingResponse> {
    return this.post(
      "/revalidate-hosting",
      ensureType<RevalidatePlasmicHostingRequest>({
        projectId,
      })
    );
  }
  async getPlasmicHostingSettings(projectId: ProjectId) {
    return this.get(
      `/plasmic-hosting/${projectId}`
    ) as Promise<PlasmicHostingSettings>;
  }
  async updatePlasmicHostingSettings(
    projectId: ProjectId,
    opts: {
      favicon?: { url: string; mimeType?: string };
    }
  ) {
    return this.put(
      `/plasmic-hosting/${projectId}`,
      opts
    ) as Promise<PlasmicHostingSettings>;
  }

  async getComments(
    projectId: ProjectId,
    branchId?: BranchId
  ): Promise<GetCommentsResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.get(`/comments/${projectBranchId}`);
  }

  async postComment(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    data: CommentData
  ): Promise<PostCommentResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.post(
      `/comments/${projectBranchId}`,
      ensureType<PostCommentRequest>(data)
    );
  }

  async editComment(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    commentId: CommentId,
    data: {
      body?: string;
      resolved?: boolean;
    }
  ): Promise<{}> {
    return this.put(
      `/comments/${showProjectBranchId(
        toOpaque(projectId),
        branchId
      )}/comment/${commentId}`,
      ensureType<EditCommentRequest>(data)
    );
  }

  async deleteComment(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    commentId: string
  ): Promise<DeleteCommentResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.delete(`/comments/${projectBranchId}/comment/${commentId}`);
  }

  async deleteThread(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    threadId: string
  ): Promise<DeleteCommentResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.delete(`/comments/${projectBranchId}/thread/${threadId}`);
  }

  async updateNotificationSettings(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    data: ApiNotificationSettings
  ): Promise<PostCommentResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.put(
      `/comments/${projectBranchId}/notification-settings`,
      ensureType<UpdateNotificationSettingsRequest>(data)
    );
  }

  async addReactionToComment(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    commentId: CommentId,
    data: CommentReactionData
  ): Promise<AddCommentReactionResponse> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.post(
      `/comments/${projectBranchId}/comment/${encodeURIComponent(
        commentId
      )}/reactions`,
      ensureType<AddCommentReactionRequest>({ data })
    );
  }

  async removeReactionFromComment(
    projectId: ProjectId,
    branchId: BranchId | undefined,
    reactionId: CommentReactionId
  ): Promise<{}> {
    const projectBranchId = showProjectBranchId(toOpaque(projectId), branchId);
    return this.delete(
      `/comments/${projectBranchId}/reactions/${encodeURIComponent(reactionId)}`
    );
  }

  async getTeamAnalytics(
    teamId: string,
    opts: {
      from: string;
      to: string;
      timezone: string;
      period?: string;
    }
  ): Promise<ApiAnalyticsImpressionResponse> {
    const search = new URLSearchParams(omitNils(opts));
    const result = await this.get(
      `/analytics/team/${teamId}?${search.toString()}`
    );
    return result;
  }

  async getProjectAnalytics(
    teamId: string,
    projectId: string,
    opts: {
      componentId?: string;
      splitId?: string;
      from: string;
      to: string;
      timezone: string;
      type: ApiAnalyticsQueryType;
      period?: string;
    }
  ): Promise<ApiAnalyticsResponse> {
    const search = new URLSearchParams(omitNils(opts));
    const result = await this.get(
      `/analytics/team/${teamId}/project/${projectId}?${search.toString()}`
    );
    return result;
  }

  async getProjectAnalayticsMeta(
    teamId: string,
    projectId: string
  ): Promise<ApiAnalyticsProjectMeta> {
    const meta = await this.get(
      `/analytics/team/${teamId}/project/${projectId}/meta`
    );
    return meta;
  }

  async listAuthIntegrations(): Promise<ListAuthIntegrationsResponse> {
    return this.get(`/auth/integrations`);
  }

  async listTeamDirectories(teamId: string): Promise<ApiEndUserDirectory[]> {
    return this.get(`/end-user/teams/${teamId}/directories`);
  }

  async listDirectoryUsers(directoryId: string): Promise<ApiEndUser[]> {
    return this.get(`/end-user/directories/${directoryId}/users`);
  }

  async getEndUserDirectory(directoryId: string): Promise<ApiEndUserDirectory> {
    return this.get(`/end-user/directories/${directoryId}`);
  }

  async getEndUserDirectoryApps(directoryId: string): Promise<ApiProject[]> {
    return this.get(`/end-user/directories/${directoryId}/apps`);
  }

  async updateEndUserDirectory(
    directoryId: string,
    changes: Partial<ApiEndUserDirectory>
  ): Promise<ApiEndUserDirectory> {
    return this.put(`/end-user/directories/${directoryId}`, changes);
  }

  async addDirectoryEndUsers(
    directoryId: string,
    emails: string[]
  ): Promise<ApiEndUser[]> {
    return this.post(`/end-user/directories/${directoryId}/users`, {
      emails,
    });
  }

  async removeEndUserFromDirectory(
    directoryId: string,
    endUserId: string
  ): Promise<{}> {
    return this.delete(
      `/end-user/directories/${directoryId}/users/${endUserId}`
    );
  }

  async listDirectoryGroups(
    directoryId: string
  ): Promise<ApiDirectoryEndUserGroup[]> {
    return this.get(`/end-user/directories/${directoryId}/groups`);
  }

  async createDirectoryGroup(
    directoryId: string,
    name: string
  ): Promise<ApiDirectoryEndUserGroup> {
    return this.post(`/end-user/directories/${directoryId}/groups`, {
      name,
    });
  }

  async deleteDirectoryGroup(
    directoryId: string,
    groupId: string
  ): Promise<{}> {
    return this.delete(
      `/end-user/directories/${directoryId}/groups/${groupId}`
    );
  }

  async updateDirectoryGroup(
    directoryId: string,
    groupId: string,
    name: string
  ): Promise<ApiDirectoryEndUserGroup> {
    return this.put(`/end-user/directories/${directoryId}/groups/${groupId}`, {
      name,
    });
  }

  async updateEndUserGroups(
    directoryId: string,
    userId: string,
    groupIds: string[]
  ): Promise<ApiEndUser> {
    return this.put(
      `/end-user/directories/${directoryId}/users/${userId}/groups`,
      {
        groupIds,
      }
    );
  }

  async createEndUserDirectory(
    teamId: string,
    name: string
  ): Promise<ApiEndUserDirectory> {
    return this.post(`/end-user/teams/${teamId}/directory`, { name });
  }

  async deleteEndUserDirectory(directoryId: string) {
    return this.delete(`/end-user/directories/${directoryId}`);
  }

  async getAppAuthConfig(appId: string): Promise<ApiAppAuthConfig | null> {
    return this.get(`/end-user/app/${appId}/config`);
  }

  async getAppCurrentUserOpConfig(
    appId: string
  ): Promise<ApiAppUserOpConfig | null> {
    return this.get(`/end-user/app/${appId}/user-props-config`);
  }

  async getAppAuthPubConfig(appId: string): Promise<ApiAppAuthPublicConfig> {
    return this.get(`/end-user/app/${appId}/pub-config`);
  }

  async upsertAppAuthConfig(
    appId: string,
    config: ApiAppAuthConfig
  ): Promise<ApiAppAuthConfig> {
    return this.post(`/end-user/app/${appId}/config`, config);
  }

  async upsertAppCurrentUserOpConfig(
    appId: string,
    config: ApiAppUserOpConfig
  ): Promise<ApiAppUserOpConfig> {
    return this.post(`/end-user/app/${appId}/user-props-config`, config);
  }

  async deleteAppAuthConfig(appId: string) {
    return this.delete(`/end-user/app/${appId}/config`);
  }

  async listAppRoles(appId: string): Promise<ApiAppRole[]> {
    return this.get(`/end-user/app/${appId}/roles`);
  }

  async createAppRole(appId: string): Promise<ApiAppRole> {
    return this.post(`/end-user/app/${appId}/roles`);
  }

  async updateAppRoleName(appId: string, roleId: string, name: string) {
    return this.put(`/end-user/app/${appId}/roles/${roleId}`, { name });
  }

  async deleteAppRole(appId: string, roleId: string) {
    return this.delete(`/end-user/app/${appId}/roles/${roleId}`);
  }

  async changeAppRolesOrder(appId: string, newOrders: Record<string, number>) {
    return this.put(`/end-user/app/${appId}/roles-orders`, { newOrders });
  }

  async listAppAccessRules(appId: string): Promise<ApiAppEndUserAccessRule[]> {
    return this.get(`/end-user/app/${appId}/access-rules`);
  }

  async createAppAccessRules(opts: {
    appId: string;
    emails: string[];
    externalIds: string[];
    directoryEndUserGroupIds: string[];
    domains: string[];
    roleId: string;
    notify?: boolean;
  }): Promise<ApiAppEndUserAccessRule[]> {
    const {
      appId,
      emails,
      externalIds,
      directoryEndUserGroupIds,
      domains,
      roleId,
      notify,
    } = opts;

    return this.post(`/end-user/app/${appId}/access-rules`, {
      emails,
      externalIds,
      directoryEndUserGroupIds,
      domains,
      roleId,
      notify,
    });
  }

  async updateAccessRule(appId: string, accessId: string, roleId: string) {
    return this.put(`/end-user/app/${appId}/access-rules/${accessId}`, {
      roleId,
    });
  }

  async deleteAccessRule(appId: string, accessId: string) {
    return this.delete(`/end-user/app/${appId}/access-rules/${accessId}`);
  }

  async listAppAccessRegistries(
    appId: string,
    pagination: {
      pageSize: number;
      pageIndex: number;
      search?: string;
    }
  ): Promise<{
    accesses: ApiAppAccessRegistry[];
    total: number;
  }> {
    return this.get(`/end-user/app/${appId}/access-registry`, pagination);
  }

  async deleteAppAccessRegister(appId: string, accessId: string): Promise<{}> {
    return this.delete(`/end-user/app/${appId}/access-registry/${accessId}`);
  }

  async listAppUsers(appId: string): Promise<{
    rolesAsUsers: ApiAppUser[];
    appUsers: ApiAppUser[];
  }> {
    return this.get(`/end-user/app/${appId}/app-users`);
  }

  async getEndUserRoleInApp(
    projectId: string,
    endUserId: string
  ): Promise<ApiAppRole | undefined> {
    return this.get(`/end-user/app/${projectId}/user-role/${endUserId}`);
  }

  async disableAppAuth(appId: string) {
    return this.delete(`/end-user/app/${appId}`);
  }

  async executeDataSourceOperationInCanvas(
    appId: string,
    sourceId: string,
    params: {
      opId: string;
      paginate: NonNullable<
        Parameters<typeof executePlasmicDataOp>[1]
      >["paginate"];
      userArgs?: Record<string, any>;
      identifier: {
        email?: string;
        externalId?: string;
      };
    }
  ): Promise<any> {
    return this.post(
      `/data-source/sources/${sourceId}/execute-studio`,
      {
        appId,
        ...params,
      },
      undefined,
      undefined,
      true
    );
  }

  async queryCopilot(
    request: QueryCopilotRequest
  ): Promise<QueryCopilotResponse> {
    return this.post(`/copilot`, request, true);
  }

  async sendCopilotFeedback(request: SendCopilotFeedbackRequest) {
    return this.post(`/copilot-feedback`, request, true);
  }

  async queryCopilotFeedback(
    request: QueryCopilotFeedbackRequest
  ): Promise<QueryCopilotFeedbackResponse> {
    return this.get(`/copilot-feedback`, {
      pageSize: request.pageSize,
      pageIndex: request.pageIndex,
      ...(request.query ? { query: request.query } : {}),
    });
  }

  async getAppCurrentUserProperties(
    appId: string,
    identifier: {
      email?: string;
      externalId?: string;
    }
  ): Promise<Record<string, any>> {
    return this.post(`/end-user/app/${appId}/user-props`, {
      identifier,
    });
  }

  async getInitialUserToViewAs(appId: string): Promise<{
    initialUser: ApiAppUser | undefined;
  }> {
    return this.get(`/end-user/app/${appId}/app-user`);
  }

  async getAppAuthMetrics(recency: number, threshold: number) {
    return this.get(`/admin/app-auth-metrics`, {
      recency,
      threshold,
    });
  }

  async getAppMeta(projectId: string): Promise<any> {
    return this.get(`/admin/project/${projectId}/app-meta`);
  }

  async getProjectBranchesMetadata(projectId: string): Promise<{
    branches: ApiBranch[];
    pkgVersions: PkgVersionInfoMeta[];
    commitGraph: CommitGraph;
    users: ApiUser[];
  }> {
    return this.get(`/admin/project-branches-metadata/${projectId}`);
  }

  async processSvg(data: ProcessSvgRequest): Promise<ProcessSvgResponse> {
    return this.post(`/process-svg`, data);
  }
}
