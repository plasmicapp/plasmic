import { APIRequestContext } from "playwright/test";

export class ApiClient {
  constructor(private request: APIRequestContext, private baseUrl: string) {}

  async login(email: string, password: string) {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;

    await this.request.post(`${this.baseUrl}/api/v1/auth/login`, {
      data: { email, password },
      headers: { "X-CSRF-Token": csrf },
    });
  }

  async removeProject(projectId: string, email: string, password: string) {
    await this.login(email, password);
    await this.request.delete(`${this.baseUrl}/api/v1/projects/${projectId}`);
  }

  async importProjectFromTemplate(bundle: any) {
    const csrfRes = await this.request.get(`${this.baseUrl}/api/v1/auth/csrf`);
    const csrf = (await csrfRes.json()).csrf;
    const res = await this.request.post(
      `${this.baseUrl}/api/v1/projects/import`,
      {
        data: {
          data: JSON.stringify(bundle),
          keepProjectIdsAndNames: false,
          migrationsStrict: true,
        },
        headers: { "X-CSRF-Token": csrf },
      }
    );
    return (await res.json()).projectId;
  }
}
