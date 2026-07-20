import type { ProjectId, TeamId } from "@/wab/shared/ApiSchema";
import { PLEXUS_STORAGE_KEY } from "@/wab/shared/insertables";

// TODO: Make this a bit higher level in the future.
// This allows us to hide the keys completely and enforce the storage type too.
// class LocalStorage {
//   getSomePref(): string;
//   setSomePref(value: string): void;
// }

export type LocalStorageKey =
  | "codegenType"
  | "githubState"
  | "githubToken"
  | "plasmic-sso-email"
  | "plasmic.copilot.dialog-position"
  | "plasmic.tours.top-project-nav"
  | `copy/${ProjectId}`
  | `plasmic.focused.${ProjectId}`
  | `plasmic.free-trial.${TeamId}`
  | `plasmic.leftTabKey.${ProjectId}`
  | `plasmic.load-cache.${string}`
  | `plasmic.tours.${ProjectId}`
  | `${typeof PLEXUS_STORAGE_KEY}.${ProjectId}`
  | `${typeof loggedAppUserStorageKey}.${ProjectId}`;

export const codegenTypeKey: LocalStorageKey = "codegenType";

export const githubStateKey: LocalStorageKey = "githubState";

export const githubTokenKey: LocalStorageKey = "githubToken";

export const ssoEmailKey: LocalStorageKey = "plasmic-sso-email";

export const copilotDialogPositionKey: LocalStorageKey =
  "plasmic.copilot.dialog-position";

export const tourSeenTopProjectNavKey: LocalStorageKey =
  "plasmic.tours.top-project-nav";

export const copyFromProjectKey = (projectId: ProjectId): LocalStorageKey =>
  `copy/${projectId}`;

export const focusPreferenceKey = (projectId: ProjectId): LocalStorageKey =>
  `plasmic.focused.${projectId}`;

export const leftTabKey = (projectId: ProjectId): LocalStorageKey =>
  `plasmic.leftTabKey.${projectId}`;

export const tourSeenForProjectKey = (projectId: ProjectId): LocalStorageKey =>
  `plasmic.tours.${projectId}`;

const loggedAppUserStorageKey = "view-as.logged-app-user";

export const storageViewAsKey = (appId: ProjectId): LocalStorageKey =>
  `${loggedAppUserStorageKey}.${appId}`;

export const freeTrialKey = (teamId: TeamId): LocalStorageKey =>
  `plasmic.free-trial.${teamId}`;

export const loadCacheKey = (key: string): LocalStorageKey =>
  `plasmic.load-cache.${key}`;

export const plexusKey = (projectId: ProjectId): LocalStorageKey =>
  `${PLEXUS_STORAGE_KEY}.${projectId}`;
