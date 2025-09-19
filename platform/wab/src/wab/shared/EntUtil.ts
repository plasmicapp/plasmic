// TODO: add "admin" role to GrantableAccessLevel and AccessLevel (between owner and editor), but do not
//  allow granting this on workspaces/projects, only on teams.

import type { Project } from "@/wab/server/entities/Entities";
import { SiteInfo } from "@/wab/shared/SharedApi";

const accessLevelOrderAsc = [
  "blocked",
  "viewer",
  "commenter",
  "content",
  "designer",
  "editor",
  "owner",
] as const;

export type AccessLevel = (typeof accessLevelOrderAsc)[number];

const grantableAccessLevels = accessLevelOrderAsc.filter(
  (level) => level !== "owner" && level !== "blocked"
);

export type GrantableAccessLevel = (typeof grantableAccessLevels)[number];

export function ensureGrantableAccessLevel(x: string): GrantableAccessLevel {
  if ((grantableAccessLevels as string[]).includes(x)) {
    return x as GrantableAccessLevel;
  } else {
    throw new Error(`not a grantable access level: ${x}`);
  }
}

const humanLevelMapping = {
  content: "content creator",
  editor: "developer",
};

export function humanLevel(a: AccessLevel) {
  return humanLevelMapping[a] ?? a;
}

export function accessLevelRank(a: AccessLevel) {
  return accessLevelOrderAsc.indexOf(a);
}

export function isUnownedProject(project: SiteInfo | Project) {
  return !project.createdById && project.readableByPublic;
}
