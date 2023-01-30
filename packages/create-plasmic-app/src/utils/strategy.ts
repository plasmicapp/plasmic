import { JsOrTs, PlatformOptions, SchemeType } from "./types";

export interface CreateArgs {
  projectPath: string;
  template?: string;
  jsOrTs: JsOrTs;
  platformOptions: PlatformOptions;
}

export interface ConfigArgs {
  projectId: string;
  projectPath: string;
  jsOrTs: JsOrTs;
  scheme: SchemeType;
  projectApiToken: string | undefined;
  platformOptions: PlatformOptions;
}

export interface GenerateFilesArgs {
  projectPath: string;
  jsOrTs: JsOrTs;
  scheme: SchemeType;
  projectId: string;
  projectApiToken: string | undefined;
  platformOptions: PlatformOptions;
}

export interface BuildArgs {
  projectPath: string;
  npmRunCmd: string;
}

export interface InstallArgs {
  scheme: SchemeType;
  projectPath: string;
  jsOrTs: JsOrTs;
}

// TODO: Remove this interface and use a single "create" entry point.
// It forces us to make all strategies follow the same steps, even though each strategy has its own quirks.
// For example, this results in platform-specific conditionals in the utils files which is hard to follow.
export interface CPAStrategy {
  create: (args: CreateArgs) => Promise<void>;
  installDeps: (args: InstallArgs) => Promise<boolean>;
  overwriteConfig: (args: ConfigArgs) => Promise<void>;
  generateFiles: (args: GenerateFilesArgs) => Promise<void>;
  build: (args: BuildArgs) => Promise<void>;
}
