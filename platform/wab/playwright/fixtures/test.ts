import { APIRequestContext, test as base, expect } from "@playwright/test";

import { AuthPage } from "../models/auth-page";
import { StudioModel } from "../models/studio-model";
import { ApiClient } from "../utils/api-client";

export interface PageModels {
  studio: StudioModel;
  auth: AuthPage;
}

export interface TestModels {
  models: PageModels;
}
export interface TestFixtures extends TestModels {
  apiClient: ApiClient;
  /** Auto fixture; see below. Never requested by name. */
  noCopilotApi: void;
}

export const testModels = base.extend<TestFixtures>({
  /**
   * Copilot requests reach a real model provider and cost real money, so no
   * test may make one. Applies to every spec automatically — a test that
   * submits a prompt fails here rather than quietly spending tokens.
   */
  noCopilotApi: [
    async ({ page }, use) => {
      const attempted: string[] = [];
      await page.route("**/api/v1/copilot**", async (route) => {
        attempted.push(route.request().url());
        await route.abort("failed");
      });
      await use();
      expect(
        attempted,
        "e2e tests must not call the copilot API; stub it or avoid submitting"
      ).toEqual([]);
    },
    { auto: true },
  ],
  models: async ({ page }, use) => {
    const models = {
      studio: new StudioModel(page),
      auth: new AuthPage(page),
    };
    await use(models);
  },
});

export function makeApiClient(
  request: APIRequestContext,
  baseURL: string | undefined
) {
  return new ApiClient(request, baseURL || "http://localhost:3003");
}

export const test = testModels.extend<TestFixtures>({
  apiClient: async ({ request, context, baseURL }, use) => {
    const client = makeApiClient(request, baseURL);
    await client.login("user2@example.com", "!53kr3tz!");
    const cookies = await request.storageState();

    await context.addCookies(cookies.cookies);
    await use(client);
  },
});
