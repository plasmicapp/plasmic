import {
  ApiPermission,
  ApiResource,
  ApiUser,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { AccessLevel, accessLevelRank } from "@/wab/shared/EntUtil";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import * as _ from "lodash";
import { MakeADT } from "ts-adt/MakeADT";

export type ResourceType = "project" | "workspace" | "team";
export function labelForResourceType(type: ResourceType) {
  return type === "team" ? ORGANIZATION_LOWER : type;
}

export type SiteFeature = "split";
export type ResourceId = string | WorkspaceId | TeamId;

export type TaggedResourceId = MakeADT<
  "type",
  {
    project: { id: string };
    workspace: { id: WorkspaceId };
    team: { id: TeamId };
  }
>;

export type TaggedResourceIds = MakeADT<
  "type",
  {
    project: { ids: string[] };
    workspace: { ids: WorkspaceId[] };
    team: { ids: TeamId[] };
  }
>;

export function createTaggedResourceId(
  type: ResourceType,
  id: ResourceId
): TaggedResourceId {
  switch (type) {
    case "project":
      return { type: "project", id };
    case "workspace":
      return { type: "workspace", id: id as WorkspaceId };
    case "team":
      return { type: "team", id: id as TeamId };
  }
}

export function pluralizeResourceId(
  taggedResourceId: TaggedResourceId
): TaggedResourceIds {
  switch (taggedResourceId.type) {
    case "project":
      return { type: "project", ids: [taggedResourceId.id] };
    case "workspace":
      return { type: "workspace", ids: [taggedResourceId.id] };
    case "team":
      return { type: "team", ids: [taggedResourceId.id] };
  }
}

export function explodeResourceIds(
  taggedResourceIds: TaggedResourceIds
): TaggedResourceId[] {
  switch (taggedResourceIds.type) {
    case "project":
      return taggedResourceIds.ids.map((id) => ({ type: "project", id }));
    case "workspace":
      return taggedResourceIds.ids.map((id) => ({ type: "workspace", id }));
    case "team":
      return taggedResourceIds.ids.map((id) => ({ type: "team", id }));
  }
}

export function resourceTypeIdField(
  resourceType: "project" | "workspace" | "team"
) {
  return resourceType + "Id";
}

export function convertToTaggedResourceId(
  resource: ApiResource
): TaggedResourceId {
  return createTaggedResourceId(resource.type, resource.resource.id);
}

export function getAccessLevelToResource(
  resource: ApiResource,
  user: ApiUser | null,
  perms: ApiPermission[]
): AccessLevel {
  return (
    _.maxBy(
      [
        ...filterDirectResourcePerms(
          perms,
          convertToTaggedResourceId(resource),
          user?.id
        ).map((p) => p.accessLevel),
        getAccessLevelToParent(resource, user, perms),
      ],
      (level) => accessLevelRank(level)
    ) ?? "blocked"
  );
}

export function getAccessLevelToParent(
  resource: ApiResource,
  user: ApiUser | null,
  perms: ApiPermission[]
): AccessLevel {
  let filteredPerms: ApiPermission[] = [];
  if (
    resource.type === "project" &&
    resource.resource.workspaceId &&
    resource.resource.teamId
  ) {
    filteredPerms = [
      ...filteredPerms,
      ...filterDirectResourcePerms(
        perms,
        createTaggedResourceId("workspace", resource.resource.workspaceId),
        user?.id
      ),
      ...filterDirectResourcePerms(
        perms,
        createTaggedResourceId("team", resource.resource.teamId),
        user?.id
      ),
      ...(resource.resource.parentTeamId
        ? filterDirectResourcePerms(
            perms,
            createTaggedResourceId("team", resource.resource.parentTeamId),
            user?.id
          )
        : []),
    ];
  } else if (resource.type === "workspace") {
    filteredPerms = [
      ...filteredPerms,
      ...filterDirectResourcePerms(
        perms,
        createTaggedResourceId("team", resource.resource.team.id),
        user?.id
      ),
      ...(resource.resource.team.parentTeamId
        ? filterDirectResourcePerms(
            perms,
            createTaggedResourceId("team", resource.resource.team.parentTeamId),
            user?.id
          )
        : []),
    ];
  } else if (resource.type === "team" && resource.resource.parentTeamId) {
    filteredPerms = [
      ...filteredPerms,
      ...filterDirectResourcePerms(
        perms,
        createTaggedResourceId("team", resource.resource.parentTeamId),
        user?.id
      ),
    ];
  }
  const maxPerm = _.maxBy(filteredPerms, (p) => accessLevelRank(p.accessLevel));
  return maxPerm?.accessLevel ?? "blocked";
}

export function filterDirectResourcePerms(
  perms: ApiPermission[],
  res: TaggedResourceId,
  userId?: string
) {
  const field = resourceTypeIdField(res.type);
  const filteredPerms = perms.filter((p) => p[field] === res.id);
  return userId
    ? filteredPerms.filter((p) => p.userId === userId)
    : filteredPerms;
}
