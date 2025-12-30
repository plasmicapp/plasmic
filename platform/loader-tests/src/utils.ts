import execa, { ExecaChildProcess } from "execa";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { getEnvVar } from "./env";

export interface TestOpts {
  projectId: string;
  projectToken: string;
  tmpdir: string;
  npmRegistry: string;
  codegenHost: string;
}

export function runCommand(
  command: string,
  opts: {
    dir?: string;
    noExit?: boolean;
    env?: Record<string, string>;
    output?: "inherit";
  } = {}
) {
  if (!opts.dir) {
    opts.dir = process.cwd();
  }
  if (!opts.env) {
    opts.env = {};
  }
  console.log("EXEC", command, opts);
  const result = execa.command(command, {
    cwd: opts.dir,
    env: {
      ...process.env,
      npm_config_yes: "1",
      ...opts.env,
    },
    ...(opts.output && {
      stdout: opts.output,
      stderr: opts.output,
    }),
  });
  // Need to make sure we are returning the original ProcessPromise, so just attach these logs to the end without returning a new promise.
  if (!opts.noExit) {
    result.then(
      (outcome) =>
        console.log(
          `EXEC resolved with code ${outcome?.exitCode}:`,
          command,
          opts
        ),
      (reason) =>
        console.log(`EXEC rejected with reason ${reason}:`, command, opts)
    );
  }
  return result;
}

async function apiRequest(
  method: string,
  route: string,
  headers: any,
  body?: string
) {
  const host = getEnvVar("WAB_HOST");
  const response = await fetch(`${host}/api/v1${route}`, {
    method: method,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `${route} ${method} request returned ${response.status}: ${error}`
    );
  }

  return response.json();
}

export async function apiRequestWithLogin(
  method: string,
  route: string,
  body?: Record<string, any> | string
) {
  const email = getEnvVar("WAB_USER_EMAIL");
  const password = getEnvVar("WAB_USER_PASSWORD");
  return await apiRequest(
    method,
    route,
    {
      "x-plasmic-api-user": email,
      "x-plasmic-api-password": password,
    },
    typeof body === "string" ? body : JSON.stringify(body)
  );
}

export async function uploadProject(
  fileName: string,
  projectName: string,
  opts?: {
    bundleTransformation?: (value: string) => string;
    keepProjectIdsAndNames?: boolean;
    publish?: boolean;
    dataSourceReplacement?: {
      type: string;
    };
  }
) {
  const {
    bundleTransformation,
    keepProjectIdsAndNames,
    publish = true,
    dataSourceReplacement,
  } = opts ?? {};
  const name = projectName.replace(/\s/g, "");
  const rawData = fs
    .readFileSync(path.resolve(path.join(__dirname, "..", "data", fileName)))
    .toString();
  const data = bundleTransformation ? bundleTransformation(rawData) : rawData;
  const {
    projectId,
    projectApiToken: projectToken,
    workspaceId,
  } = await apiRequestWithLogin(
    "POST",
    "/projects/import",
    JSON.stringify({
      data,
      name,
      publish,
      prefilled: true,
      updateImportedHostLess: true,
      keepProjectIdsAndNames,
      dataSourceReplacement,
    })
  );
  console.log(`Uploaded ${fileName} as ${projectName} (${projectId})`);
  return { projectId, projectToken, workspaceId };
}

export async function setupCms(fileName: string) {
  const { workspaces } = await apiRequestWithLogin("GET", "/workspaces");
  const workspaceId = workspaces[0].id;
  const cmsDatabase = await apiRequestWithLogin(
    "POST",
    "/cmse/databases",
    JSON.stringify({
      name: "CMS Database",
      workspaceId,
    })
  );
  await apiRequestWithLogin(
    "PUT",
    `/cmse/databases/${cmsDatabase.id}`,
    JSON.stringify({
      extraData: {
        locales: ["pt-BR"],
      },
    })
  );
  const data = JSON.parse(
    fs
      .readFileSync(path.resolve(path.join(__dirname, "..", "data", fileName)))
      .toString()
  );
  const table = await apiRequestWithLogin(
    "POST",
    `/cmse/databases/${cmsDatabase.id}/tables`,
    JSON.stringify(data.table)
  );

  await apiRequest(
    "POST",
    `/cms/databases/${cmsDatabase.id}/tables/${table.identifier}/rows?publish=1`,
    {
      "x-plasmic-api-cms-tokens": `${cmsDatabase.id}:${cmsDatabase.secretToken}`,
    },
    JSON.stringify(data.entries)
  );

  return cmsDatabase;
}

export async function waitUntil(
  cond: () => boolean | Promise<boolean>,
  opts: { maxTimeout?: number; timeout?: number } = {}
) {
  const start = new Date().getTime();
  const maxTimeout = opts.maxTimeout ?? 300000;
  const timeout = opts.timeout ?? 1000;

  while (true) {
    const now = new Date().getTime();
    const ready = await cond();
    if (ready) {
      return;
    } else if (now >= start + maxTimeout) {
      throw new Error("Timeout exceeded");
    }
    await wait(timeout);
  }
}

export async function wait(timeMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timeMs);
  });
}

export async function waitUntilServerUp(
  url: string,
  opts: {
    maxTimeout?: number;
    timeout?: number;
    process?: ExecaChildProcess;
  } = {}
) {
  let exitCode: number | null = null;
  if (opts.process) {
    // If the process already exit, then quit early
    opts.process.on("exit", (code) => {
      exitCode = code;
    });
  }

  await waitUntil(async () => {
    if (exitCode != null) {
      return true;
    }
    try {
      await fetch(url);
      return true;
    } catch (err) {
      return false;
    }
  }, opts);

  if (exitCode != null) {
    throw new Error(`Server already exit with code ${exitCode}`);
  }
}

export async function waitUntilServerDown(
  url: string,
  opts: { maxTimeout?: number; timeout?: number } = {}
) {
  await waitUntil(async () => {
    try {
      await fetch(url);
      return false;
    } catch (err) {
      return true;
    }
  }, opts);
}

/**
 * Like unexpected, but will really create a type error if it is
 * reachable. Suitable for default branch of a switch of if/else
 * statement.  The argument to `unreachable()` should be the thing
 * that you have exhaustively checked for.
 */
export function unreachable(thing: never): never;
export function unreachable(thing: any) {
  throw new Error(`Did not expect ${thing}`);
}

export function ensure<T>(x: T | null | undefined): T {
  if (x == null) {
    throw new Error();
  }
  return x;
}
