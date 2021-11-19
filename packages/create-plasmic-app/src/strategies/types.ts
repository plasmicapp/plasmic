import { CodeScheme } from "..";

interface CreateArgs {
  projectPath: string;
  template?: string;
  useTypescript: boolean;
}

interface ConfigArgs {
  projectId: string;
  projectPath: string;
  useTypescript: boolean;
  scheme: CodeScheme;
  projectApiToken: string | undefined;
}

interface GenerateFilesArgs {
  projectPath: string;
  useTypescript: boolean;
  scheme: CodeScheme;
  projectId: string;
  projectApiToken: string | undefined;
}

interface BuildArgs {
  projectPath: string;
  npmRunCmd: string;
}

interface InstallArgs {
  scheme: CodeScheme;
  projectPath: string;
}

export interface CPAStrategy {
  create: (args: CreateArgs) => Promise<void>;
  installDeps: (args: InstallArgs) => Promise<boolean>;
  overwriteConfig: (args: ConfigArgs) => Promise<void>;
  generateFiles: (args: GenerateFilesArgs) => Promise<void>;
  build: (args: BuildArgs) => Promise<void>;
}
