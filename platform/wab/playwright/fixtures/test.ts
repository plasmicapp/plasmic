import { test as base } from "@playwright/test";

import { AuthPage } from "../models/auth-page";
import { StudioModel } from "../models/studio-model";
import { ApiClient } from "../utils/api-client";

export interface TestFixtures {
  models: {
    studio: StudioModel;
    auth: AuthPage;
  };
  apiClient: ApiClient;
}

export const test = base.extend<TestFixtures>({
  models: async ({ page }, use) => {
    const models = {
      studio: new StudioModel(page),
      auth: new AuthPage(page),
    };
    await use(models);
  },
  apiClient: async ({ request, context }, use) => {
    const client = new ApiClient(request, "http://localhost:3003");
    await client.login("user2@example.com", "!53kr3tz!");
    const cookies = await request.storageState();

    await context.addCookies(cookies.cookies);
    await use(client);
  },
});
