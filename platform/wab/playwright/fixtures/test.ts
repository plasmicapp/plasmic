import { test as base } from "@playwright/test";

import { ProjectPage } from "../pages/project-page";
import { Environment, loadEnv } from "../types/environment";

export interface TestFixtures {
  pages: {
    projectPage: ProjectPage;
  };
  env: Environment;
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
    const environment = loadEnv();
    await use(environment);
  },
});
