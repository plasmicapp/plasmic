import { test as base } from "@playwright/test";

import { ProjectPage } from "../pages/project-page";
import { ENVIRONMENT, Environment } from "../types/environment";
import { ApiClient } from "../utils/api-client";

export interface TestFixtures {
  pages: {
    projectPage: ProjectPage;
  };
  env: Environment;
  apiClient: ApiClient;
}

export const test = base.extend<TestFixtures>({
  pages: async ({ page }, use) => {
    const pages = {
      projectPage: new ProjectPage(page),
    };
    await use(pages);
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
