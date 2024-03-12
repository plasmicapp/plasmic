/** @jest-environment node */
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { APIRequestContext, request } from "playwright";

describe("auth", () => {
  let apiRequestContext: APIRequestContext;
  let api: ApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const { dburi, cleanup: cleanupDatabase } = await createDatabase();
    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = `${host}/api/v1`;

    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(async () => {
    apiRequestContext = await request.newContext({
      baseURL,
    });
    api = new ApiTester(apiRequestContext, baseURL);
    await api.refreshCsrfToken();
  });

  afterEach(async () => {
    await apiRequestContext.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("can signup, logout, login", async () => {
    const email = `${Date.now()}@example.com`;
    expect(
      await api.signUp({
        email,
        password: "SuperStrongPassword!!",
        firstName: "GivenName",
        lastName: "FamilyName",
      })
    ).toMatchObject({
      status: true,
      user: {
        email,
        firstName: "GivenName",
        lastName: "FamilyName",
      },
    });
    expect(await api.getSelfInfo()).toMatchObject({
      user: { email },
    });
    await api.logout();
    expect(await api.getSelfInfo()).toMatchObject({
      error: { statusCode: 401 },
    });
    await api.login({
      email,
      password: "SuperStrongPassword!!",
    });
    expect(await api.getSelfInfo()).toMatchObject({
      user: { email },
    });
  });

  describe("signup", () => {
    it("rejects weak passwords", async () => {
      const email = `${Date.now()}@example.com`;
      expect(
        await api.signUp({
          email,
          password: "1234",
          firstName: "GivenName",
          lastName: "FamilyName",
        })
      ).toEqual({
        status: false,
        reason: "WeakPasswordError",
      });
    });

    it("rejects if email already used", async () => {
      const email = `${Date.now()}@example.com`;
      const data = {
        email,
        password: "SuperStrongPassword!!",
        firstName: "GivenName",
        lastName: "FamilyName",
      };
      expect(await api.signUp(data)).toMatchObject({
        status: true,
      });
      expect(await api.signUp(data)).toMatchObject({
        status: false,
        reason: "EmailSent",
      });
    });
  });
});
