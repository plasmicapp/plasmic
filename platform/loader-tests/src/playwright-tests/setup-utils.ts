import tmp from "tmp";
import {
  CraContext,
  setupCraServer,
  teardownCraServer,
} from "../cra/cra-setup";
import {
  GatsbyContext,
  setupGatsbyServer,
  teardownGatsbyServer,
} from "../gatsby/gatsby-setup";
import {
  NextJsContext,
  setupNextjsServer,
  teardownNextJsServer,
} from "../nextjs/nextjs-setup";
import { apiRequestWithLogin, unreachable, uploadProject } from "../utils";

export interface NextJsEnv {
  type: "nextjs";
  loaderVersion: string;
  nextVersion: string;
  removeComponentsPage?: boolean;
  template?: string;
}
export interface GatsbyEnv {
  type: "gatsby";
  template?: string;
}

export interface CraEnv {
  type: "cra";
  template?: string;
}

export type LoaderEnv = NextJsEnv | GatsbyEnv | CraEnv;

export type ServerContext =
  | ({ type: "nextjs" } & NextJsContext)
  | ({ type: "gatsby" } & GatsbyContext)
  | ({ type: "cra" } & CraContext);

export type ProjectConfig =
  | string
  | {
      bundleFile: string;
      transform?: (value: string) => string;
      projectName?: string;
      dataSourceReplacement?: {
        type: string;
      };
    };

export interface LoaderTestConfig {
  bundle: ProjectConfig;
  env: LoaderEnv;
}

export interface ProjectContext {
  projectId: string;
  projectToken: string;
}

export async function setupBundle(bundle: ProjectConfig) {
  const { projectId, projectToken } = await uploadProject(
    typeof bundle === "string" ? bundle : bundle.bundleFile,
    typeof bundle === "string"
      ? bundle
      : bundle.projectName || bundle.bundleFile,
    {
      bundleTransformation:
        typeof bundle === "string" ? undefined : bundle.transform,
    }
  );

  return { projectId, projectToken };
}

export async function teardownBundle(ctx: ProjectContext) {
  await apiRequestWithLogin("DELETE", `/projects/${ctx.projectId}`);
}

export async function setupServer(
  env: LoaderEnv,
  project: ProjectContext
): Promise<ServerContext> {
  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });
  if (env.type === "nextjs") {
    const ctx = await setupNextjsServer(project, env, tmpdir);
    return {
      type: "nextjs",
      ...ctx,
      ...project,
      tmpdir,
      tmpdirCleanup,
    };
  } else if (env.type === "gatsby") {
    const ctx = await setupGatsbyServer(project, env, tmpdir);
    return {
      type: "gatsby",
      ...ctx,
      ...project,
      tmpdir,
      tmpdirCleanup,
    };
  } else if (env.type === "cra") {
    const ctx = await setupCraServer(project, env, tmpdir);
    return {
      type: "cra",
      ...ctx,
      ...project,
      tmpdir,
      tmpdirCleanup,
    };
  } else {
    unreachable(env);
  }
}

export async function teardownServer(ctx: ServerContext) {
  if (ctx.type === "nextjs") {
    await teardownNextJsServer(ctx);
  } else if (ctx.type === "gatsby") {
    await teardownGatsbyServer(ctx);
  } else if (ctx.type === "cra") {
    await teardownCraServer(ctx);
  }
  await ctx.tmpdirCleanup();
}

export function makeEnvName(env: LoaderEnv) {
  if (env.type === "nextjs") {
    const { loaderVersion, nextVersion } = env;
    return `loader-nextjs@${loaderVersion}, next@${nextVersion}`;
  } else if (env.type === "gatsby") {
    return `loader-gatsby`;
  } else if (env.type === "cra") {
    return `create-react-app`;
  } else {
    unreachable(env);
  }
}
