import {
  APIRequestContext,
  Browser,
  BrowserContext,
  Page,
} from "@playwright/test";
import { TestFixtures, makeApiClient, testModels } from "../fixtures/test";
import { AuthPage } from "../models/auth-page";
import { StudioModel } from "../models/studio-model";

export interface TestUserCredentials {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const ADMIN = {
  firstName: "Plasmic",
  lastName: "Admin",
  email: "admin@admin.example.com",
  password: "!53kr3tz!",
};

export const USER1 = {
  firstName: "Plasmic",
  lastName: "User",
  email: "user@example.com",
  password: "!53kr3tz!",
};

export const USER2 = {
  firstName: "Plasmic",
  lastName: "User 2",
  email: "user2@example.com",
  password: "!53kr3tz!",
};

export interface TestUserFixture extends TestFixtures {
  user: TestUserCredentials;
  page: Page;
  context: BrowserContext;
  request: APIRequestContext;
}

export interface Test3Fixture {
  admin: TestUserFixture;
  user1: TestUserFixture;
  user2: TestUserFixture;
}

interface MakeUserArgs {
  baseURL: string | undefined;
  browser: Browser;
}

export function fullName(user: TestUserCredentials): string {
  return `${user.firstName} ${user.lastName}`;
}

export async function makeUserFixture(
  args: MakeUserArgs,
  credentials: TestUserCredentials,
  use: (page: TestUserFixture) => Promise<void>
) {
  const ctx = await args.browser.newContext();
  const page = await ctx.newPage();

  const apiClient = makeApiClient(ctx.request, args.baseURL);

  const user: TestUserFixture = {
    user: credentials,
    page,
    context: ctx,
    request: ctx.request,
    apiClient,
    models: {
      studio: new StudioModel(page),
      auth: new AuthPage(page),
    },
  };
  try {
    await use(user);
  } finally {
    await ctx.close();
  }
}

export function forEachAsync<T>(
  items: T[],
  testFn: (item: T, index: number) => Promise<void>
) {
  return Promise.all(items.map(testFn));
}

export const testMultiplayer = testModels.extend<Test3Fixture>({
  admin: async ({ baseURL, browser }, use) => {
    await makeUserFixture({ baseURL, browser }, ADMIN, use);
  },
  user1: async ({ baseURL, browser }, use) => {
    await makeUserFixture({ baseURL, browser }, USER1, use);
  },
  user2: async ({ baseURL, browser }, use) => {
    await makeUserFixture({ baseURL, browser }, USER2, use);
  },
});

export async function setupMultiplayerProject(
  admin: TestUserFixture,
  user1: TestUserFixture,
  user2: TestUserFixture,
  projectName: string,
  devFlags?: Record<string, any>
) {
  const sessions = [admin, user1, user2];

  await forEachAsync(sessions, async (session) => {
    await session.apiClient.login(session.user.email, session.user.password);
    const cookies = await session.request.storageState();
    await session.context.addCookies(cookies.cookies);
  });

  const projectId = await admin.apiClient.setupNewProject({
    name: projectName,
    devFlags,
  });

  await admin.apiClient.grantProjectPermission(
    projectId,
    USER1.email,
    "editor"
  );
  await admin.apiClient.grantProjectPermission(
    projectId,
    USER2.email,
    "editor"
  );

  return projectId;
}
