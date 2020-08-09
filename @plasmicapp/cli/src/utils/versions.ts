import L from "lodash";

export interface ProjectComponentVersionMeta {
  projectId: string;
  componentIds: string[];
  version: string;
}

export interface VersionResolution {
  projects: ProjectComponentVersionMeta[];
  conflicts: ProjectComponentVersionMeta[];
}

/**
 * Given multiple calls to doResolveSync,
 * combine the results together.
 * NOTE: currently merges in order, so the first seen will be included in results
 * @param results
 */
export function mergeResolves(input: VersionResolution[]): VersionResolution {
  const projects: L.Dictionary<ProjectComponentVersionMeta> = {};
  const conflicts = L.flatMap(input, (i) => i.conflicts);

  L.flatMap(input, (i) => i.projects).forEach((meta) => {
    if (!projects[meta.projectId]) {
      // First time seeing projectId
      projects[meta.projectId] = L.cloneDeep(meta);
    } else if (projects[meta.projectId].version !== meta.version) {
      // Add to conflicts
      const found = conflicts.find(
        (x) => x.projectId === meta.projectId && x.version === meta.version
      );
      if (found) {
        found.componentIds.push(...meta.componentIds);
      } else {
        conflicts.push(meta);
      }
    } else {
      // projectId and version match. Just add
      projects[meta.projectId].componentIds.push(...meta.componentIds);
    }
  });

  return {
    projects: L.values(projects),
    conflicts,
  };
}
