import playwright from "playwright";
import { APIRequestContext, Page } from "playwright/test";

export class ApiClient {
  private token: string | undefined = undefined;
  private dataSourceId: string | undefined = undefined;

  constructor(public request: APIRequestContext, public baseUrl: string) {}

  async getCsrf() {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);

    if (!csrfRes.ok()) {
      const errorText = await csrfRes.text();
      throw new Error(
        `Failed to get CSRF token: ${csrfRes.status()} ${errorText}`
      );
    }
    return (await csrfRes.json()).csrf;
  }

  private async withAdminContext<T>(
    operation: (context: APIRequestContext, token: string) => Promise<T>
  ): Promise<T> {
    const adminContext = await playwright.request.newContext({
      baseURL: this.baseUrl,
    });

    try {
      const csrfRes = await adminContext.get(
        `${this.baseUrl}/api/v1/auth/csrf`
      );
      const adminToken = (await csrfRes.json()).csrf;

      await adminContext.post(`${this.baseUrl}/api/v1/auth/login`, {
        data: { email: "admin@admin.example.com", password: "!53kr3tz!" },
        headers: { "X-CSRF-Token": adminToken },
      });

      const csrfRes2 = await adminContext.get(
        `${this.baseUrl}/api/v1/auth/csrf`
      );
      const adminToken2 = (await csrfRes2.json()).csrf;

      return await operation(adminContext, adminToken2);
    } finally {
      await adminContext.dispose();
    }
  }

  async login(email: string, password: string) {
    this.token = await this.getCsrf();

    if (!this.token) {
      throw Error("X-CSRF-Token is not set");
    }

    await this.request.post(`${this.baseUrl}/api/v1/auth/login`, {
      data: { email, password },
      headers: { "X-CSRF-Token": this.token },
    });

    const csrfRes2 = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);

    if (!csrfRes2.ok()) {
      const errorText = await csrfRes2.text();
      throw new Error(
        `Failed to refresh CSRF token after login: ${csrfRes2.status()} ${errorText}`
      );
    }

    this.token = (await csrfRes2.json()).csrf;
  }

  async logout() {
    await this.request.post(`${this.baseUrl}/api/v1/auth/logout`);
  }

  async removeProject(projectId: string) {
    await this.request.delete(`${this.baseUrl}/api/v1/projects/${projectId}`);
  }

  async importProjectFromTemplate(bundle: any) {
    if (!this.token) {
      throw Error("X-CSRF-Token is not set");
    }
    const res = await this.request.post(
      `${this.baseUrl}/api/v1/projects/import`,
      {
        data: {
          data: JSON.stringify(bundle),
          keepProjectIdsAndNames: false,
          migrationsStrict: true,
        },
        headers: { "X-CSRF-Token": this.token },
      }
    );
    return (await res.json()).projectId;
  }

  async setupNewProject({
    skipVisit: _skipVisit = false,
    devFlags = {},
    name,
    email: _email = "user2@example.com",
    inviteOnly,
    skipTours: _skipTours = true,
    workspaceId,
  }: {
    skipVisit?: boolean;
    devFlags?: Record<string, any>;
    name?: string;
    email?: string;
    inviteOnly?: boolean;
    skipTours?: boolean;
    workspaceId?: string;
  } = {}): Promise<string> {
    const csrf = await this.getCsrf();

    const res = await this.request.post(`${this.baseUrl}/api/v1/projects`, {
      data: {
        name: name ? `[playwright] ${name}` : undefined,
        devFlags,
        workspaceId,
      },
      headers: { "X-CSRF-Token": csrf },
    });

    const projectId = (await res.json()).project.id;

    if (inviteOnly !== undefined) {
      await this.request.put(`${this.baseUrl}/api/v1/projects/${projectId}`, {
        data: { inviteOnly },
        headers: { "X-CSRF-Token": csrf },
      });
    }
    return projectId;
  }

  async setupProjectWithHostlessPackages({
    hostLessPackagesInfo,
    devFlags = {},
  }: {
    hostLessPackagesInfo:
      | (Partial<{
          name: string;
          npmPkg: string[];
          deps?: string[];
          cssImport?: string[];
          minimumReactVersion?: string | null;
        }> & { name: string })
      | (Partial<{
          name: string;
          npmPkg: string[];
          deps?: string[];
          cssImport?: string[];
          minimumReactVersion?: string | null;
        }> & { name: string })[];
    devFlags?: Record<string, any>;
  }): Promise<string> {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    const res = await this.request.post(
      `${this.baseUrl}/api/v1/projects/create-project-with-hostless-packages`,
      {
        data: {
          hostLessPackagesInfo: Array.isArray(hostLessPackagesInfo)
            ? hostLessPackagesInfo.map((info) => ({
                name: info.name,
                npmPkg: info.npmPkg || [],
                deps: info.deps || [],
                cssImport: info.cssImport || [],
                registerCalls: [],
                minimumReactVersion: info.minimumReactVersion ?? null,
              }))
            : [
                {
                  name: hostLessPackagesInfo.name,
                  npmPkg: hostLessPackagesInfo.npmPkg || [],
                  deps: hostLessPackagesInfo.deps || [],
                  cssImport: hostLessPackagesInfo.cssImport || [],
                  registerCalls: [],
                  minimumReactVersion:
                    hostLessPackagesInfo.minimumReactVersion ?? null,
                },
              ],
          devFlags,
        },
        headers: { "X-CSRF-Token": csrf },
      }
    );

    return (await res.json()).project.id;
  }

  async codegen(page: Page) {
    const pathname = await page.evaluate(() => window.location.pathname);
    const projectId = pathname.split("/")[2];

    const response = await this.request.post(
      `/api/v1/projects/${projectId}/code/components`,
      {
        headers: {
          "x-plasmic-api-user": "user2@example.com",
          "x-plasmic-api-token": await this.getApiToken(),
        },
      }
    );

    return response.json();
  }

  async getApiToken() {
    const response = await this.request.get("/api/v1/settings/apitokens");
    const tokens = await response.json();

    if (tokens.tokens.length > 0) {
      return tokens.tokens[0].token;
    }

    const tokenResponse = await this.request.put("/api/v1/settings/apitokens");
    const tokenData = await tokenResponse.json();
    return tokenData.token.token;
  }

  async createTutorialDb(type: string) {
    return this.withAdminContext(async (context, token) => {
      const response = await context.post(
        `${this.baseUrl}/api/v1/admin/create-tutorial-db`,
        {
          data: { type },
          headers: { "X-CSRF-Token": token },
        }
      );
      return (await response.json()).id;
    });
  }

  async createTutorialDataSource(type: string, dsname: string) {
    let csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    let csrf = (await csrfRes.json()).csrf;

    const workspaceRes = await this.request.get(
      `${this.baseUrl}/api/v1/personal-workspace`,
      { headers: { "X-CSRF-Token": csrf } }
    );
    const workspaceId = (await workspaceRes.json()).workspace.id;

    await this.logout();
    const dbId = await this.createTutorialDb(type);
    csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    csrf = (await csrfRes.json()).csrf;

    const response = await this.request.post(
      `${this.baseUrl}/api/v1/data-source/sources`,
      {
        data: {
          source: "tutorialdb",
          name: dsname,
          workspaceId: workspaceId,
          credentials: {
            tutorialDbId: dbId,
          },
          settings: {
            type: "northwind",
          },
        },
        headers: { "X-CSRF-Token": csrf },
      }
    );
    const result = await response.json();
    this.dataSourceId = result.id;
    return result.id;
  }

  async removeProjectAfterTest(
    projectId: string | undefined,
    email: string,
    password: string
  ) {
    if (!projectId) {
      throw new Error("Project ID is required for project removal");
    }
    await this.login(email, password);
    await this.removeProject(projectId);
  }

  async createComponentState(
    projectId: string,
    componentId: string,
    state: {
      name: string;
      variableType: string;
      accessType: string;
      initialValue: string;
    }
  ) {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    const response = await this.request.post(
      `${this.baseUrl}/api/v1/projects/${projectId}/components/${componentId}/states`,
      {
        data: {
          name: state.name,
          variableType: state.variableType,
          accessType: state.accessType,
          initialValue: state.initialValue,
        },
        headers: { "X-CSRF-Token": csrf },
      }
    );

    return await response.json();
  }

  async createFakeDataSource(options?: any) {
    const csrf = await this.getCsrf();

    const workspaceRes = await this.request.get(
      `${this.baseUrl}/api/v1/personal-workspace`,
      { headers: { "X-CSRF-Token": csrf } }
    );
    const workspaceId = (await workspaceRes.json()).workspace.id;

    const fakeDataSourceName = `Fake Data Source ${Date.now()}`;
    const createDataSourceOptions = options ?? {
      source: "fake",
      name: fakeDataSourceName,
      workspaceId: workspaceId,
    };

    const response = await this.request.post(
      `${this.baseUrl}/api/v1/data-source/sources`,
      {
        headers: { "X-CSRF-Token": csrf },
        data: createDataSourceOptions,
      }
    );

    const result = await response.json();
    this.dataSourceId = result.id;
    return result.id;
  }

  async deleteDataSourceOfCurrentTest() {
    if (this.dataSourceId) {
      const csrf = await this.getCsrf();

      await this.request.delete(
        `${this.baseUrl}/api/v1/data-source/sources/${this.dataSourceId}`,
        {
          headers: { "X-CSRF-Token": csrf },
        }
      );

      this.dataSourceId = undefined;
    }
  }

  async grantProjectPermission(
    projectId: string,
    userEmail: string,
    accessLevel: string = "editor"
  ) {
    const csrf = await this.getCsrf();

    const res = await this.request.post(`${this.baseUrl}/api/v1/grant-revoke`, {
      data: {
        grants: [
          {
            email: userEmail,
            accessLevel: accessLevel,
            projectId,
          },
        ],
        revokes: [],
      },
      headers: { "X-CSRF-Token": csrf },
    });
    return await res.json();
  }

  async setupProjectFromTemplate(
    templateNameOrBundle: string | any,
    options?: {
      keepProjectIdsAndNames?: boolean;
      dataSourceReplacement?: Record<string, string>;
      devFlags?: Record<string, boolean>;
    }
  ) {
    let bundle: any;

    if (typeof templateNameOrBundle === "string") {
      const bundles = require("../../cypress/bundles");
      bundle =
        bundles.default?.[templateNameOrBundle] ||
        bundles[templateNameOrBundle];

      if (!bundle) {
        throw new Error(`Template ${templateNameOrBundle} not found`);
      }
    } else {
      bundle = templateNameOrBundle;
    }

    if (!this.token) {
      throw Error("X-CSRF-Token is not set");
    }

    const importResponse = await this.request.post(
      `${this.baseUrl}/api/v1/projects/import`,
      {
        headers: {
          "X-CSRF-Token": this.token,
        },
        data: {
          data: JSON.stringify(bundle),
          keepProjectIdsAndNames: options?.keepProjectIdsAndNames ?? false,
          migrationsStrict: true,
          dataSourceReplacement: options?.dataSourceReplacement,
        },
      }
    );

    if (!importResponse.ok()) {
      const errorText = await importResponse.text();
      throw new Error(
        `Failed to import template: ${importResponse.status()} ${errorText}`
      );
    }

    const importData = await importResponse.json();
    const projectId = importData.projectId;

    if (options?.devFlags) {
      const origDevFlags = await this.getDevFlags();
      await this.upsertDevFlags({
        ...origDevFlags,
        ...options.devFlags,
      });
    }

    return projectId;
  }

  async getDevFlags() {
    return this.withAdminContext(async (context) => {
      const response = await context.get(
        `${this.baseUrl}/api/v1/admin/devflags`
      );
      const responseBody = await response.json();
      return JSON.parse(responseBody.data);
    });
  }

  async upsertDevFlags(devFlags: Record<string, any>) {
    return this.withAdminContext(async (context, token) => {
      await context.put(`${this.baseUrl}/api/v1/admin/devflags`, {
        data: {
          data: JSON.stringify(devFlags),
        },
        headers: { "X-CSRF-Token": token },
      });
    });
  }

  async deleteProjectAndRevisions(projectId: string) {
    return this.withAdminContext(async (context, token) => {
      await context.delete(
        `${this.baseUrl}/api/v1/admin/delete-project-and-revisions`,
        {
          data: {
            projectId,
          },
          headers: { "X-CSRF-Token": token },
        }
      );
    });
  }

  async getUserEmailVerificationToken(email: string): Promise<string> {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    const response = await this.request.get(
      `${this.baseUrl}/api/v1/auth/getEmailVerificationToken`,
      {
        data: { email },
        headers: { "X-CSRF-Token": csrf },
      }
    );

    const responseBody = await response.json();
    return responseBody.token;
  }

  async cloneProject(opts: {
    projectId: string;
    name?: string;
    workspaceId?: string;
  }): Promise<{ projectId: string; workspaceId: string }> {
    const { projectId, name, workspaceId } = opts;
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    const response = await this.request.post(
      `${this.baseUrl}/api/v1/projects/${projectId}/clone`,
      {
        data: {
          name,
          workspaceId,
        },
        headers: { "X-CSRF-Token": csrf },
      }
    );

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(
        `Failed to clone project ${projectId}: ${response.status()} ${errorText}`
      );
    }

    const result = await response.json();
    return { projectId: result.projectId, workspaceId: result.workspaceId };
  }

  async makeApiClient(
    request,
    context,
    email = "user2@example.com",
    password = "!53kr3tz!"
  ) {
    const client = new ApiClient(request, "http://localhost:3003");
    await client.login(email, password);
    const cookies = await request.storageState();

    await context.addCookies(cookies.cookies);
    return client;
  }
}
