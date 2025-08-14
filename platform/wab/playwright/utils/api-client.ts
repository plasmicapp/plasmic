import { APIRequestContext, Page } from "playwright/test";

export class ApiClient {
  #token: string | undefined = undefined;

  constructor(private request: APIRequestContext, private baseUrl: string) {}

  async login(email: string, password: string) {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    this.#token = (await csrfRes.json()).csrf;

    if (!this.#token) {
      throw Error("X-CSRF-Token is not set");
    }

    await this.request.post(`${this.baseUrl}/api/v1/auth/login`, {
      data: { email, password },
      headers: { "X-CSRF-Token": this.#token },
    });
  }

  async logout() {
    await this.request.post(`${this.baseUrl}/api/v1/auth/logout`);
  }

  async removeProject(projectId: string) {
    await this.request.delete(`${this.baseUrl}/api/v1/projects/${projectId}`);
  }

  async importProjectFromTemplate(bundle: any) {
    if (!this.#token) {
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
        headers: { "X-CSRF-Token": this.#token },
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
  }: {
    skipVisit?: boolean;
    devFlags?: Record<string, any>;
    name?: string;
    email?: string;
    inviteOnly?: boolean;
    skipTours?: boolean;
  } = {}): Promise<string> {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    const res = await this.request.post(`${this.baseUrl}/api/v1/projects`, {
      data: {
        name: name ? `[playwright] ${name}` : undefined,
        devFlags,
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
    await this.login("admin@admin.example.com", "!53kr3tz!");

    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;
    const response = await this.request.post(
      `${this.baseUrl}/api/v1/admin/create-tutorial-db`,
      {
        data: { type },
        headers: { "X-CSRF-Token": csrf },
      }
    );
    return (await response.json()).id;
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
    return (await response.json()).id;
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
}
