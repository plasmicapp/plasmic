export interface ProjectVersionMeta {
  projectId: string;
  projectApiToken: string;
  // Exact version to sync
  version: string;
  // Project name
  projectName: string;
  // List of components to sync
  componentIds: string[];
  // List of icons to sync
  iconIds: string[];
  dependencies: {
    // projectId => version
    [projectId: string]: string;
  };
}

export interface VersionResolution {
  // Top-level projects (specified in sync command)
  projects: ProjectVersionMeta[];
  // All other projects in the dependency tree
  dependencies: ProjectVersionMeta[];
  // Deprecated - to be removed in future CR (now computed on client)
  conflicts: ProjectVersionMeta[];
}

export class NoChangesError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}
