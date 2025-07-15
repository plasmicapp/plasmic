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
    const res = await this.request.post(
      `${this.baseUrl}/api/v1/projects/import-from-template`,
      { data: { template: bundle } }
    );
    return (await res.json()).id;
  }
}
