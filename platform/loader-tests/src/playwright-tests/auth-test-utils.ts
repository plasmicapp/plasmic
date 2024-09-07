import { APIRequestContext, APIResponse } from "@playwright/test";
import fs from "fs";
import getPort from "get-port";
import path from "path";
import tmp from "tmp";
import { getEnvVar } from "../env";
import { NextJsContext, prepareTemplate } from "../nextjs/nextjs-setup";
import { runCommand, waitUntilServerUp } from "../utils";

type AppRoles = Array<{ id: string; name: string; order: number }>;

class Api {
  private host: string | undefined;
  private csrf: string | undefined;

  constructor(private readonly request: APIRequestContext) {
    this.host = getEnvVar("WAB_HOST");
    this.request = request;
  }

  async loadCSRF() {
    const { csrf } = await this.fetch("GET", "/auth/csrf", {});
    this.csrf = csrf;
  }

  async login() {
    const email = getEnvVar("WAB_USER_EMAIL");
    const password = getEnvVar("WAB_USER_PASSWORD");

    await this.loadCSRF();

    await this.fetch(
      "POST",
      "/auth/login",
      {},
      {
        email,
        password,
      }
    );

    await this.loadCSRF();
  }

  defaultHeaders() {
    return {
      Accept: "*/*",
      "Content-Type": "application/json",
      "X-CSRF-Token": this.csrf ?? "",
    };
  }

  async fetch(
    method: string,
    route: string,
    headers: Record<string, string> = {},
    body?: Record<string, any>
  ) {
    const reqHeaders = {
      ...this.defaultHeaders(),
      ...headers,
    };

    const url = `${this.host}/api/v1${route}`;

    async function jsonResponse(response: APIResponse) {
      const json = await response.json();
      // TODO: handle errors ?
      return json;
    }

    switch (method) {
      case "GET": {
        return jsonResponse(
          await this.request.get(url, {
            headers: reqHeaders,
          })
        );
      }
      case "POST": {
        return jsonResponse(
          await this.request.post(url, {
            headers: reqHeaders,
            data: body,
          })
        );
      }
      case "DELETE": {
        return jsonResponse(
          await this.request.delete(url, {
            headers: reqHeaders,
            data: body,
          })
        );
      }
      default:
        throw new Error(`Unsupported method ${method}`);
    }
  }
}

async function uploadProject(
  api: Api,
  fileName: string,
  projectName: string,
  opts?: {
    bundleTransformation?: (value: string) => string;
    keepProjectIdsAndNames?: boolean;
    publish?: boolean;
    dataSourceReplacement?: {
      type: string;
    };
    projectDomains?: string[];
  }
) {
  const {
    bundleTransformation,
    keepProjectIdsAndNames,
    publish,
    dataSourceReplacement,
    projectDomains,
  } = opts ?? {};
  const name = projectName.replace(/\s/g, "");
  const rawData = fs
    .readFileSync(
      path.resolve(path.join(__dirname, "..", "..", "data", fileName))
    )
    .toString();
  const data = bundleTransformation ? bundleTransformation(rawData) : rawData;
  const {
    projectId,
    projectApiToken: projectToken,
    workspaceId,
  } = await api.fetch(
    "POST",
    "/projects/import",
    {},
    {
      data,
      name,
      publish,
      keepProjectIdsAndNames,
      dataSourceReplacement,
      projectDomains,
    }
  );
  console.log(`Uploaded ${fileName} as ${projectName} (${projectId})`);
  return { projectId, projectToken, workspaceId };
}

async function deleteProjectAndRevisions(api: Api, projectId: string) {
  await api.fetch(
    "DELETE",
    `/admin/delete-project-and-revisions`,
    {},
    {
      projectId,
    }
  );
}

export async function createEndUserDirectory(api: Api, workspaceId: string) {
  const { workspace } = await api.fetch("GET", `/workspaces/${workspaceId}`);

  const teamId = workspace.team.id as string;

  const directory = await api.fetch(
    "POST",
    `/end-user/teams/${teamId}/directory`,
    {},
    {
      name: "Test Directory",
    }
  );

  return {
    teamId,
    directoryId: directory.id as string,
  };
}

export async function upsertAppAuthConfig(
  api: Api,
  projectId: string,
  directoryId: string,
  provider: "plasmic-auth" | "custom-auth",
  redirectUris: string[] = []
) {
  const config = await api.fetch(
    "POST",
    `/end-user/app/${projectId}/config`,
    {},
    {
      directoryId,
      provider,
      redirectUris,
    }
  );

  return {
    appAuthSecret: config.token as string,
  };
}

export async function getAppAuthRoles(api: Api, projectId: string) {
  const roles = await api.fetch("GET", `/end-user/app/${projectId}/roles`);
  return roles as AppRoles;
}

export async function inviteUsersToApp(
  api: Api,
  projectId: string,
  roles: AppRoles
) {
  const nonAnonRoles = roles.filter((r) => r.order > 0);
  const accesses = await Promise.all(
    // With the basic auth setup should create users e2e.1@plasmic.app, e2e.2@plasmic.app
    // e2e.1@plasmic.app: Normal User
    // e2e.2@plasmic.app: Admin
    nonAnonRoles.map(async (role) => {
      return await api.fetch(
        "POST",
        `/end-user/app/${projectId}/access-rules`,
        {},
        {
          roleId: role.id,
          emails: [`e2e.${role.order}@plasmic.app`],
        }
      );
    })
  );

  // Just invite plasmic app default users
  await api.fetch(
    "POST",
    `/end-user/app/${projectId}/access-rules`,
    {},
    {
      roleId: nonAnonRoles[0].id,
      emails: ["admin@admin.example.com", "user@example.com"],
    }
  );

  return accesses.map(([access]) => {
    const user = access.email as string;
    const role = roles.find((r) => r.id === access.roleId);
    return {
      user,
      role,
    };
  });
}

const AUTH_BUNDLE_REFERENCES = {
  projectId: "bFHHfYQ7wXpVHsXTeXbivS",
  antd5ProjectId: "ohDidvG9XsCeFumugENU5J",
  richCompsProjectId: "jkU653o1Cz7HrJdwdxhVHk",
  adminRoleId: "27b32aa8-8953-4b2a-b5c2-cdd561f25a25",
  normalRoleId: "47fad4af-d0f8-4ac4-83a7-d93449e2da8a",
};

// We assume that the project has already been uploaded since we need the projectId to setup auth
// for it, the bundle is re uploaded under the same id so that we fix auth references for it
export async function setupAppAuth(
  api: Api,
  projectId: string,
  workspaceId: string,
  bundleFileName: string,
  opts: {
    host: string;
    provider: "plasmic-auth" | "custom-auth";
  }
) {
  await deleteProjectAndRevisions(api, projectId);

  const { teamId, directoryId } = await createEndUserDirectory(
    api,
    workspaceId
  );
  const { appAuthSecret } = await upsertAppAuthConfig(
    api,
    projectId,
    directoryId,
    opts.provider,
    [`${opts.host}/`]
  );
  const roles = await getAppAuthRoles(api, projectId);
  const users = await inviteUsersToApp(api, projectId, roles);
  // Real token for the project
  const { projectToken } = await uploadProject(
    api,
    bundleFileName,
    "Auth e2e",
    {
      bundleTransformation: (rawBundle) => {
        // Manually replace the references in the bundle
        // for now, figure out a better way to do this later
        return rawBundle
          .replace(new RegExp(AUTH_BUNDLE_REFERENCES.projectId, "g"), projectId)
          .replace(
            new RegExp(AUTH_BUNDLE_REFERENCES.antd5ProjectId, "g"),
            `${projectId}antd5`
          )
          .replace(
            new RegExp(AUTH_BUNDLE_REFERENCES.richCompsProjectId, "g"),
            `${projectId}rich`
          )
          .replace(
            new RegExp(AUTH_BUNDLE_REFERENCES.adminRoleId, "g"),
            roles.find((r) => r.order === 2)?.id as string
          )
          .replace(
            new RegExp(AUTH_BUNDLE_REFERENCES.normalRoleId, "g"),
            roles.find((r) => r.order === 1)?.id as string
          );
      },
      keepProjectIdsAndNames: true,
      publish: false,
      dataSourceReplacement: {
        type: "todomvc_pg12",
      },
    }
  );
  return {
    projectId,
    projectToken,
    teamId,
    directoryId,
    roles,
    appAuthSecret,
    users,
  };
}

export type AppAuthContext = Awaited<ReturnType<typeof setupAppAuth>>;
export type AuthNextJsContext = NextJsContext & {
  workspaceId: string;
  authCtx: AppAuthContext;
};

// copied from nextjs-setup.ts
export async function authNextJsSetup(opts: {
  bundleFile: string;
  projectName: string;
  npmRegistry: string;
  codegenHost: string;
  wabHost: string;
  removeComponentsPage?: boolean;
  template?: string;
  loaderVersion?: string;
  nextVersion?: string;
  request: APIRequestContext;
  keepRedirectUri?: boolean;
  appAuthOpts: {
    provider: "plasmic-auth" | "custom-auth";
  };
}): Promise<AuthNextJsContext> {
  const port = await getPort();
  const host = `http://localhost:${port}`;

  const {
    bundleFile,
    projectName,
    npmRegistry,
    codegenHost,
    wabHost,
    removeComponentsPage,
    loaderVersion = "latest",
    // TODO: Only works with 12 sine we're running with node 14 for now...
    nextVersion = "^12",
    request,
    appAuthOpts,
    keepRedirectUri,
  } = opts;

  const api = new Api(request);
  await api.login();

  const { projectId, workspaceId } = await uploadProject(
    api,
    bundleFile,
    projectName,
    {
      // Don't publish since we will do a second upload with auth
      publish: false,
      projectDomains: [`localhost:${port}`],
    }
  );

  const authCtx: AppAuthContext = await setupAppAuth(
    api,
    projectId,
    workspaceId,
    bundleFile,
    {
      ...appAuthOpts,
      host,
    }
  );

  const { projectToken } = authCtx;

  const { name: tmpdir, removeCallback: tmpdirCleanup } = tmp.dirSync({
    unsafeCleanup: true,
  });

  console.log("tmpdir", tmpdir);
  const template = opts.template ?? "template";
  const templateDir = path.resolve(
    path.join(__dirname, "..", "nextjs", template)
  );

  await prepareTemplate({
    templateDir,
    tmpdir,
    removeComponentsPage,
    npmRegistry,
    codegenHost,
    nextVersion,
    loaderVersion,
    projectId,
    projectToken,
    authRedirectUri: !keepRedirectUri ? host : undefined,
  });

  fs.writeFileSync(
    path.join(tmpdir, "auth.config.json"),
    JSON.stringify({
      appSecret: authCtx.appAuthSecret,
      authHost: wabHost,
    })
  );

  await runCommand(`npm run build`, { dir: tmpdir });

  const nextServer = runCommand(
    `./node_modules/.bin/next start --port ${port}`,
    { dir: tmpdir, noExit: true, output: "inherit" }
  );

  await waitUntilServerUp(host, { process: nextServer });
  nextServer.on("message", (msg) => {
    console.log("nextjs server message", msg);
  });
  nextServer.stdout?.on("data", (data) => {
    console.log("nextjs server stdout", data.toString());
  });
  console.log(`Started nextjs server at ${host} (pid ${nextServer.pid})`);

  return {
    projectId,
    projectToken,
    workspaceId,
    tmpdir,
    tmpdirCleanup,
    server: nextServer,
    host,
    authCtx,
  };
}
