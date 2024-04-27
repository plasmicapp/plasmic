import { DeepMergeable, deepMerged } from "@/wab/commons/collections";
import { toOpaque } from "@/wab/commons/types";
import {
  ApiBranch,
  ApiUser,
  BranchId,
  MainBranchId,
  ProjectAndBranchId,
  ProjectId,
  UserExtraData,
} from "@/wab/shared/ApiSchema";

export function fullName(user: ApiUser) {
  return user.firstName || user.lastName
    ? `${user.firstName} ${user.lastName}`
    : getUserEmail(user);
}

export function fullNameAndEmail(user: ApiUser) {
  return user.firstName || user.lastName
    ? `${user.firstName} ${user.lastName} (${getUserEmail(user)})`
    : getUserEmail(user);
}

export function getUserEmail(user: ApiUser) {
  return user.whiteLabelInfo?.email ?? user.email;
}

export function getExtraData(user: ApiUser): UserExtraData {
  const raw: Partial<UserExtraData> = JSON.parse(user.extraData ?? "{}");
  return {
    collapseStarters: false,
    starterProgress: [],
    ...raw,
  };
}

export function updateExtraDataJson(
  user: ApiUser,
  updates: DeepMergeable<UserExtraData>
): { extraData: string } {
  const extraData = getExtraData(user);
  return {
    extraData: JSON.stringify(deepMerged(extraData, updates)),
  };
}

export function parseProjectBranchId(spec: string): ProjectAndBranchId {
  const [projectId, branchId] = spec.split("@");
  return {
    projectId: toOpaque(projectId),
    branchId: branchId !== undefined ? toOpaque(branchId) : undefined,
  };
}

export function showProjectBranchId(
  projectId: ProjectId,
  branchId?: BranchId
): string {
  return branchId ? `${projectId}@${branchId}` : `${projectId}`;
}

export function isMainBranchId(
  maybeBranchId: BranchId | MainBranchId
): maybeBranchId is MainBranchId {
  return maybeBranchId === MainBranchId;
}

export function validateBranchName(
  name: string,
  allBranches: ApiBranch[]
): string | undefined {
  if (["main", "master"].includes(name)) {
    return `${name} is a reserved branch name`;
  }
  if (!name.match(/^[a-z]([\w_/-]*[\w_-]+|[\w_-]*)$/gi)) {
    return "Branch name must start with a letter and include only alphanumeric and -_/ characters";
  }
  if (allBranches.some((b) => b.name === name)) {
    return "Branch name must be unique";
  }
  return undefined;
}
