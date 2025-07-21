import { test as base } from "@playwright/test";

import { StudioModel } from "../pages/studio-model";
import { ENVIRONMENT, Environment } from "../types/environment";
import { ApiClient } from "../utils/api-client";
import { TextInteractionsArena } from "../pages/arenas/text-interactions";

export interface TestFixtures {
  models: {
    studio: StudioModel;
  };
  arenas: {
    textInteractionsArena: TextInteractionsArena;
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
  arenas: async ({ page }, use) => {
    const arenas = {
      textInteractionsArena: await TextInteractionsArena.init(page),
    };
    await use(arenas);
  },
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    const environment = ENVIRONMENT;
    await use(environment);
  },
  apiClient: async ({ request, env }, use) => {
    const client = new ApiClient(request, env.baseUrl);
    await use(client);
  },
});
