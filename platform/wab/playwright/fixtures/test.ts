import { test as base } from "@playwright/test";

import { StudioModel } from "../pages/studio-model";
import { ENVIRONMENT, Environment } from "../types/environment";
import { ApiClient } from "../utils/api-client";

export interface TestFixtures {
  models: {
    studio: StudioModel;
  };
  env: Environment;
  apiClient: ApiClient;
}

export const test = base.extend<TestFixtures>({
  models: async ({ page }, use) => {
    const models = {
      studio: new StudioModel(page),
    };
    await use(models);
  },
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    const environment = ENVIRONMENT;
    await use(environment);
  },
  apiClient: async ({ request, env }, use) => {
    const client = new ApiClient(request, env.baseUrl);
    await client.login(env.testUser.email, env.testUser.password);
    await use(client);
  },
});
