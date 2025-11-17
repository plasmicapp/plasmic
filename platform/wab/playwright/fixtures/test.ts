import { APIRequestContext, test as base } from "@playwright/test";

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
}

export const testModels = base.extend<TestFixtures>({
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
