interface CreateArgs {
  projectPath: string;
  template?: string;
  useTypescript: boolean;
}

interface ConfigArgs {
  projectId: string;
  projectPath: string;
  projectApiToken: string;
  useTypescript: boolean;
}

interface OverwriteFilesArgs {
  projectPath: string;
  useTypescript: boolean;
}

interface BuildArgs {
  projectPath: string;
  npmRunCmd: string;
}

export interface CPAStrategy {
  create: (args: CreateArgs) => Promise<void>;
  configLoader: (args: ConfigArgs) => Promise<void>;
  overwriteFiles: (args: OverwriteFilesArgs) => Promise<void>;
  build: (args: BuildArgs) => Promise<void>;
}
