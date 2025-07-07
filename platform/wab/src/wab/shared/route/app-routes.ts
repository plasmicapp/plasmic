import { latestTag } from "@/wab/commons/semver";
import { encodeUriParams } from "@/wab/commons/urls";
import {
  ArenaType,
  CmsDatabaseId,
  CmsRowId,
  CmsRowRevisionId,
  CmsTableId,
  MainBranchId,
} from "@/wab/shared/ApiSchema";
import { fillRoute, route } from "@/wab/shared/route/route";

export const APP_ROUTES = {
  dashboard: route("/"),
  allProjects: route("/projects"),
  playground: route("/playground"),
  workspace: route<{ workspaceId: string }>("/workspaces/:workspaceId"),

  //
  // Analytics
  //
  teamAnalytics: route<{ teamId: string }>("/teams/:teamId/analytics"),
  orgAnalytics: route<{ teamId: string }>("/orgs/:teamId/analytics"),

  //
  // Content
  //

  contentRoot: route<{ databaseId: string }>("/content/:databaseId"),
  content: route<{ databaseId: CmsDatabaseId; tableId: CmsTableId }>(
    "/content/:databaseId/:tableId"
  ),
  contentEntry: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
  }>("/content/:databaseId/:tableId/:rowId"),
  contentEntryRevisions: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
  }>("/content/:databaseId/:tableId/:rowId/revisions"),
  contentEntryRevision: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
    revisionId: CmsRowRevisionId;
  }>("/content/:databaseId/:tableId/:rowId/revisions/:revisionId"),

  //
  // Models
  //

  models: route<{ databaseId: CmsDatabaseId }>("/models/:databaseId"),
  model: route<{ databaseId: CmsDatabaseId; tableId: CmsTableId }>(
    "/models/:databaseId/:tableId"
  ),

  //
  // CMS
  //
  cmsRoot: route<{ databaseId: CmsDatabaseId }>("/cms/:databaseId"),
  cmsContentRoot: route<{ databaseId: CmsDatabaseId }>(
    "/cms/:databaseId/content"
  ),
  cmsModelContent: route<{ databaseId: CmsDatabaseId; tableId: CmsTableId }>(
    "/cms/:databaseId/content/models/:tableId"
  ),
  cmsEntry: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
  }>("/cms/:databaseId/content/models/:tableId/entries/:rowId"),
  cmsEntryRevisions: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
  }>("/cms/:databaseId/content/models/:tableId/entries/:rowId/revisions"),
  cmsEntryRevision: route<{
    databaseId: CmsDatabaseId;
    tableId: CmsTableId;
    rowId: CmsRowId;
    revisionId: CmsRowRevisionId;
  }>(
    "/cms/:databaseId/content/models/:tableId/entries/:rowId/revisions/:revisionId"
  ),
  cmsSchemaRoot: route<{ databaseId: CmsDatabaseId }>(
    "/cms/:databaseId/schemas"
  ),
  cmsModelSchema: route<{ databaseId: CmsDatabaseId; tableId: CmsTableId }>(
    "/cms/:databaseId/schemas/:tableId"
  ),
  cmsSettings: route<{ databaseId: CmsDatabaseId }>(
    "/cms/:databaseId/settings"
  ),

  team: route<{ teamId: string }>("/teams/:teamId"),
  org: route<{ teamId: string }>("/orgs/:teamId"),
  teamSettings: route<{ teamId: string }>("/teams/:teamId/settings"),
  orgSettings: route<{ teamId: string }>("/orgs/:teamId/settings"),
  orgSupport: route<{ teamId: string }>("/orgs/:teamId/support"),
  settings: route("/settings"),
  project: route<{ projectId: string }>("/projects/:projectId"),
  projectSlug: route<{ projectId: string; slug: string }>(
    "/projects/:projectId/-/:slug"
  ),
  projectPreview: route<{ projectId: string; previewPath: string }>(
    "/projects/:projectId/preview/:previewPath*"
  ),
  projectFullPreview: route<{ previewPath: string; projectId: string }>(
    "/projects/:projectId/preview-full/:previewPath*"
  ),
  projectDocs: route<{ projectId: string }>("/projects/:projectId/docs"),
  projectDocsComponents: route<{
    projectId: string;
    codegenType: "loader" | "codegen";
  }>("/projects/:projectId/docs/:codegenType/components"),
  projectDocsComponent: route<{
    projectId: string;
    componentIdOrClassName: string;
    codegenType: "loader" | "codegen";
  }>(
    "/projects/:projectId/docs/:codegenType/component/:componentIdOrClassName"
  ),
  projectDocsIcons: route<{
    projectId: string;
    codegenType: "loader" | "codegen";
  }>("/projects/:projectId/docs/:codegenType/icons"),
  projectDocsIcon: route<{
    projectId: string;
    iconIdOrClassName: string;
    codegenType: "loader" | "codegen";
  }>("/projects/:projectId/docs/:codegenType/icon/:iconIdOrClassName"),
  projectDocsCodegenType: route<{
    projectId: string;
    codegenType: "loader" | "codegen";
  }>("/projects/:projectId/docs/:codegenType"),
  starter: route<{
    starterTag: string;
  }>("/starters/:starterTag"),
  fork: route<{
    projectId: string;
  }>("/fork/:projectId"),
  admin: route<{
    tab: string | undefined;
  }>("/admin/:tab?"),
  adminTeams: route<{
    teamId: string | undefined;
  }>("/admin/teams/:teamId?"),
  login: route("/login"),
  logout: route("/logout"),
  signup: route("/signup"),
  sso: route("/sso"),
  authorize: route("/authorize"),
  forgotPassword: route("/forgot-password"),
  resetPassword: route("/reset-password"),
  googleAuth: route(`/api/v1/auth/google`),
  airtableAuth: route(`/api/v1/auth/airtable`),
  googleSheetsAuth: route(`/api/v1/auth/google-sheets`),
  register: route("/register"),
  plasmicInit: route("/auth/plasmic-init/:initToken"),
  currentUser: route("/api/v1/auth/self"),
  survey: route("/survey"),
  emailVerification: route("/email-verification"),
  teamCreation: route("/team-creation"),
  orgCreation: route("/org-creation"),
  githubCallback: route("/github/callback"),
  discourseConnectClient: route("/auth/discourse-connect"),
  webImporterSandbox: route("/sandbox/web-importer"),
  importProjectsFromProd: route("/import-projects-from-prod"),
};

export const SEARCH_PARAM_BRANCH = "branch";
export const SEARCH_PARAM_VERSION = "version";
export const SEARCH_PARAM_ARENA_TYPE = "arena_type";
export const SEARCH_PARAM_ARENA = "arena";
export const SEARCH_PARAM_COMMENT = "comment";

export interface ProjectLocationParams {
  projectId: string;
  slug: string | undefined;
  branchName: MainBranchId | string;
  branchVersion: typeof latestTag | string;
  arenaType: ArenaType | undefined;
  arenaUuidOrNameOrPath: string | undefined;
  isPreview?: boolean;
  threadId?: string;
}

export function mkProjectLocation({
  projectId,
  slug,
  branchName,
  branchVersion,
  arenaType,
  arenaUuidOrNameOrPath,
  threadId,
}: ProjectLocationParams): {
  pathname: string;
  search?: string;
} {
  const searchParams: [string, string][] = [];
  if (branchName !== MainBranchId) {
    searchParams.push([SEARCH_PARAM_BRANCH, branchName]);
  }
  if (branchVersion !== latestTag) {
    searchParams.push([SEARCH_PARAM_VERSION, branchVersion]);
  }
  if (arenaType) {
    searchParams.push([SEARCH_PARAM_ARENA_TYPE, arenaType]);
  }
  if (arenaUuidOrNameOrPath) {
    searchParams.push([SEARCH_PARAM_ARENA, arenaUuidOrNameOrPath]);
  }
  if (threadId) {
    searchParams.push([SEARCH_PARAM_COMMENT, threadId]);
  }
  const search =
    searchParams.length === 0 ? undefined : "?" + encodeUriParams(searchParams);
  const pathname = slug
    ? fillRoute(APP_ROUTES.projectSlug, {
        projectId,
        slug,
      })
    : fillRoute(APP_ROUTES.project, {
        projectId,
      });
  return {
    pathname,
    search,
  };
}
