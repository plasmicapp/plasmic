// TODO: add "admin" role to GrantableAccessLevel and AccessLevel (between owner and editor), but do not
//  allow granting this on workspaces/projects, only on teams.

export type GrantableAccessLevel =
  | "editor"
  | "commenter"
  | "designer"
  | "content";

export function ensureGrantableAccessLevel(x: string): GrantableAccessLevel {
  if (
    x === "editor" ||
    x === "commenter" ||
    x === "designer" ||
    x === "content"
  ) {
    return x;
  } else {
    throw new Error(`not a grantable access level: ${x}`);
  }
}

export type AccessLevel =
  | "owner"
  | "editor"
  | "designer"
  | "content"
  | "commenter"
  | "viewer"
  | "blocked";
export const accessLevelOrderAsc: AccessLevel[] = [
  "blocked",
  "viewer",
  "commenter",
  "content",
  "designer",
  "editor",
  "owner",
];

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
