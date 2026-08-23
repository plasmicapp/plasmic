import { latestTag } from "@/wab/commons/semver";
import { encodeUriParams } from "@/wab/commons/urls";
import {
  ArenaType,
  CmsDatabaseId,
  CmsRowId,
  CmsRowRevisionId,
  CmsTableId,
  MainBranchId,
  ProjectId,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { route as routeUntyped } from "@/wab/shared/route/route";

/**
 * Types for well-known path params, by name; params not listed here are
 * plain strings.
 */
type AppRouteParamTypes = {
  projectId: ProjectId;
  teamId: TeamId;
  workspaceId: WorkspaceId;
  databaseId: CmsDatabaseId;
  tableId: CmsTableId;
  rowId: CmsRowId;
  revisionId: CmsRowRevisionId;
  codegenType: "loader" | "codegen";
};

/** Route whose path param types are inferred from the pattern literal. */
function route<Pattern extends string>(pattern: Pattern) {
  return routeUntyped<Pattern, AppRouteParamTypes>(pattern);
}

export const APP_ROUTES = {
  dashboard: route("/"),
  copilot: route("/copilot"),
  allProjects: route("/projects"),
  playground: route("/playground"),
  workspace: route("/workspaces/:workspaceId"),

  //
  // Analytics
  //
  teamAnalytics: route("/teams/:teamId/analytics"),
  orgAnalytics: route("/orgs/:teamId/analytics"),

  //
  // Content
  //

  contentRoot: route("/content/:databaseId"),
  content: route("/content/:databaseId/:tableId"),
  contentEntry: route("/content/:databaseId/:tableId/:rowId"),
  contentEntryRevisions: route(
    "/content/:databaseId/:tableId/:rowId/revisions"
  ),
  contentEntryRevision: route(
    "/content/:databaseId/:tableId/:rowId/revisions/:revisionId"
  ),

  //
  // Models
  //

  models: route("/models/:databaseId"),
  model: route("/models/:databaseId/:tableId"),

  //
  // CMS
  //
  cmsRoot: route("/cms/:databaseId"),
  cmsContentRoot: route("/cms/:databaseId/content"),
  cmsModelContent: route("/cms/:databaseId/content/models/:tableId"),
  cmsEntry: route("/cms/:databaseId/content/models/:tableId/entries/:rowId"),
  cmsEntryRevisions: route(
    "/cms/:databaseId/content/models/:tableId/entries/:rowId/revisions"
  ),
  cmsEntryRevision: route(
    "/cms/:databaseId/content/models/:tableId/entries/:rowId/revisions/:revisionId"
  ),
  cmsSchemaRoot: route("/cms/:databaseId/schemas"),
  cmsModelSchema: route("/cms/:databaseId/schemas/:tableId"),
  cmsSettings: route("/cms/:databaseId/settings"),

  team: route("/teams/:teamId"),
  org: route("/orgs/:teamId"),
  orgBilling: route("/orgs/:teamId/billing"),
  teamSettings: route("/teams/:teamId/settings"),
  orgSettings: route("/orgs/:teamId/settings"),
  orgSupport: route("/orgs/:teamId/support"),
  settings: route("/settings"),
  project: route("/projects/:projectId"),
  projectSlug: route("/projects/:projectId/-/:slug"),
  projectPreview: route("/projects/:projectId/preview{/*previewPath}"),
  projectFullPreview: route("/projects/:projectId/preview-full{/*previewPath}"),
  projectDocs: route("/projects/:projectId/docs"),
  projectDocsComponents: route(
    "/projects/:projectId/docs/:codegenType/components"
  ),
  projectDocsComponent: route(
    "/projects/:projectId/docs/:codegenType/component/:componentIdOrClassName"
  ),
  projectDocsIcons: route("/projects/:projectId/docs/:codegenType/icons"),
  projectDocsIcon: route(
    "/projects/:projectId/docs/:codegenType/icon/:iconIdOrClassName"
  ),
  projectDocsCodegenType: route("/projects/:projectId/docs/:codegenType"),
  starter: route("/starters/:starterTag"),
  fork: route("/fork/:projectId"),
  admin: route("/admin{/:tab}"),
  adminTeams: route("/admin/teams{/:teamId}"),
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
  discourseConnect: route("/auth/discourse-connect"),
  webImporterSandbox: route("/sandbox/web-importer"),
  importProjectsFromProd: route("/import-projects-from-prod"),
};

export const SEARCH_PARAM_BRANCH = "branch";
export const SEARCH_PARAM_VERSION = "version";
export const SEARCH_PARAM_REVISION = "revision";
export const SEARCH_PARAM_ARENA_TYPE = "arena_type";
export const SEARCH_PARAM_ARENA = "arena";
export const SEARCH_PARAM_COMMENT = "comment";
export const SEARCH_PARAM_COPILOT_CHAT = "copilot_chat";
export const SEARCH_PROMPT = "prompt";

export interface ProjectLocationParams {
  projectId: string;
  slug: string | undefined;
  branchName: MainBranchId | string;
  branchVersion: typeof latestTag | string;
  branchRevision: string | undefined;
  arenaType: ArenaType | undefined;
  arenaUuidOrNameOrPath: string | undefined;
  isPreview?: boolean;
  threadId?: string;
  copilotChat?: boolean;
}

export function mkProjectLocation({
  projectId,
  slug,
  branchName,
  branchVersion,
  branchRevision,
  arenaType,
  arenaUuidOrNameOrPath,
  threadId,
  copilotChat,
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
  if (branchRevision) {
    searchParams.push([SEARCH_PARAM_REVISION, branchRevision]);
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
  if (copilotChat) {
    searchParams.push([SEARCH_PARAM_COPILOT_CHAT, "true"]);
  }
  const search =
    searchParams.length === 0 ? undefined : "?" + encodeUriParams(searchParams);
  const pathname = slug
    ? APP_ROUTES.projectSlug.fill({
        projectId: projectId as ProjectId,
        slug,
      })
    : APP_ROUTES.project.fill({
        projectId: projectId as ProjectId,
      });
  return {
    pathname,
    search,
  };
}
