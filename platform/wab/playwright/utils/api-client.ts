import { APIRequestContext } from "playwright/test";

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
}
