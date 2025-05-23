/** @jest-environment node */
import { SharedApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";

describe("auth", () => {
  let api: SharedApiTester;
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
    api = new SharedApiTester(baseURL);
    await api.refreshCsrfToken();
  });

  afterEach(async () => {
    await api.dispose();
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

  describe("login", () => {
    it("is rate limited", async () => {
      await api.dispose();
      api = new SharedApiTester(baseURL, {
        "x-plasmic-test-rate-limit": "true",
      });
      await api.refreshCsrfToken();
      for (let i = 0; i < 20; ++i) {
        try {
          const res = await api.login({
            email: `${Date.now()}@example.com`,
            password: "SuperStrongPassword!!",
          });
          expect(res).toEqual({
            status: false,
            reason: "IncorrectLoginError",
          });
          expect(i).toBeLessThan(15);
        } catch (error: unknown) {
          if (error instanceof Error && error.message.startsWith("429")) {
            expect(i).toBeGreaterThanOrEqual(15);
          } else {
            throw error;
          }
        }
      }
    });
  });
});
