import { PlatformOptions, SchemeType } from "../lib";

export interface CreateArgs {
  projectPath: string;
  template?: string;
  useTypescript: boolean;
  platformOptions: PlatformOptions;
}

export interface ConfigArgs {
  projectId: string;
  projectPath: string;
  useTypescript: boolean;
  scheme: SchemeType;
  projectApiToken: string | undefined;
  platformOptions: PlatformOptions;
}

export interface GenerateFilesArgs {
  projectPath: string;
  useTypescript: boolean;
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
  useTypescript: boolean;
}

export interface CPAStrategy {
  create: (args: CreateArgs) => Promise<void>;
  installDeps: (args: InstallArgs) => Promise<boolean>;
  overwriteConfig: (args: ConfigArgs) => Promise<void>;
  generateFiles: (args: GenerateFilesArgs) => Promise<void>;
  build: (args: BuildArgs) => Promise<void>;
}
