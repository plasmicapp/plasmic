/** @vitest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import {
  DbMgr,
  DEFAULT_DEV_PASSWORD,
  normalActor,
  SUPER_USER,
} from "@/wab/server/db/DbMgr";
import { Project, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { ensure } from "@/wab/shared/common";

describe("project routes", () => {
  let api: ApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let user: User;
  let contentUser: User;
  let project: Project;
  /** Read-only token, handed out to published apps and loader clients. */
  let publicToken: string;
  /** Write-capable token, must never leave the server. */
  let secretToken: string;

  beforeAll(async () => {
    const {
      dburi,
      dbname,
      cleanup: cleanupDatabase,
    } = await createDatabase("project_routes");
    const con = await ensureDbConnection(dburi, dbname);
    await con.synchronize();
    await con.transaction(async (em) => {
      const userAndProjects = await seedTestUserAndProjects(
        em,
        { email: "user@example.com" },
        1
      );
      user = userAndProjects.user;

      const db = new DbMgr(em, normalActor(user.id));
      // Give the project a secret API token, as the "Regenerate secret token"
      // flow in Studio does.
      project = await db.updateProject(
        { id: userAndProjects.projects[0].id },
        true
      );
      publicToken = ensure(project.projectApiToken, "expected public token");
      secretToken = ensure(project.secretApiToken, "expected secret token");
      expect(secretToken).not.toEqual(publicToken);

      const sudo = new DbMgr(em, SUPER_USER);
      contentUser = await sudo.createUser({
        email: "content@example.com",
        password: DEFAULT_DEV_PASSWORD,
        firstName: "Content",
        lastName: "Creator",
        needsIntroSplash: false,
        needsSurvey: false,
        needsTeamCreationPrompt: false,
      });
      await sudo.markEmailAsVerified(contentUser);
      await db.grantProjectPermissionByEmail(
        project.id,
        contentUser.email,
        "content"
      );
    });

    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = host;

    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(() => {
    // No session cookie and no user API token: the project API token in the
    // header is the caller's only credential, exactly as for a published app.
    api = new ApiTester(baseURL);
  });

  afterEach(async () => {
    await api.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  function withPublicToken() {
    return {
      headers: {
        "x-plasmic-api-project-tokens": `${project.id}:${publicToken}`,
      },
    };
  }

  /** Authenticates as `u`; only accepted outside production. */
  function asUser(u: User) {
    return {
      headers: {
        "x-plasmic-api-user": u.email,
        "x-plasmic-api-password": DEFAULT_DEV_PASSWORD,
      },
    };
  }

  describe("secret API token", () => {
    it.each([
      ["getProjectRev", (id: string) => `/api/v1/projects/${id}`],
      [
        "getProjectRevWithoutData",
        (id: string) => `/api/v1/projects/${id}/revision-without-data`,
      ],
    ])("is not exposed by %s", async (_name, mkUrl) => {
      const res = await api.rawReq(
        "get",
        mkUrl(project.id),
        undefined,
        withPublicToken()
      );
      expect(res.status()).toEqual(200);

      // Sanity check that the public token really did authorize us, so that
      // the assertions below aren't passing on an error response.
      const body = await res.json();
      expect(body.project.id).toEqual(project.id);
      expect(body.project.projectApiToken).toEqual(publicToken);

      expect(body.project.secretApiToken).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(secretToken);
    });

    it("grants write access, which the public token does not", async () => {
      // Establishes why leaking the secret token matters: it is a privilege
      // escalation from read-only to editor.
      const readOnly = await api.rawReq(
        "put",
        `/api/v1/projects/${project.id}`,
        { name: "renamed with public token" },
        withPublicToken()
      );
      expect(readOnly.status()).toEqual(403);

      const readWrite = await api.rawReq(
        "put",
        `/api/v1/projects/${project.id}`,
        { name: "renamed with secret token" },
        {
          headers: {
            "x-plasmic-api-project-tokens": `${project.id}:${secretToken}`,
          },
        }
      );
      expect(readWrite.status()).toEqual(200);
    });

    it("is not returned by an update that did not regenerate it", async () => {
      // "content" is two levels below the "editor" required to regenerate the
      // token, but it is enough to rename a project.
      const res = await api.rawReq(
        "put",
        `/api/v1/projects/${project.id}`,
        { name: "renamed by a content creator" },
        asUser(contentUser)
      );
      expect(res.status()).toEqual(200);

      // `updateProject` wraps its response in a paywall envelope.
      const body = await res.json();
      expect(body.paywall).toEqual("pass");
      expect(body.response.project.name).toEqual(
        "renamed by a content creator"
      );
      expect(body.response.regeneratedSecretApiToken).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(secretToken);
    });

    it("is returned by an update that regenerated it", async () => {
      const res = await api.rawReq(
        "put",
        `/api/v1/projects/${project.id}`,
        { regenerateSecretApiToken: true },
        asUser(user)
      );
      expect(res.status()).toEqual(200);

      const { response: body } = await res.json();
      expect(body.regeneratedSecretApiToken).toBeTruthy();
      expect(body.regeneratedSecretApiToken).not.toEqual(secretToken);
      // Still absent from the project itself.
      expect(body.project.secretApiToken).toBeUndefined();
    });
  });
});
