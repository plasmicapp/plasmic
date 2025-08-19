/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { Project, User } from "@/wab/server/entities/Entities";
import { PublicApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";

describe("loader", () => {
  let publicApi: PublicApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let userToken: string;
  let user: User;
  let projects: Project[];

  beforeAll(async () => {
    const {
      dburi,
      dbname,
      cleanup: cleanupDatabase,
    } = await createDatabase("loader_test");
    const con = await ensureDbConnection(dburi, dbname);
    await con.synchronize();
    await con.transaction(async (em) => {
      const userAndProjects = await seedTestUserAndProjects(
        em,
        {
          email: "user@example.com",
        },
        4
      );
      user = userAndProjects.user;
      projects = userAndProjects.projects;

      const db = new DbMgr(em, normalActor(user.id));

      const pat = await db.createPersonalApiToken(user.id);
      userToken = pat.token;

      // projects[0] has a mix of prefilled/un-prefilled versions
      expect(await publish(db, projects[0], true)).toEqual("0.0.1");
      expect(await publish(db, projects[0], true)).toEqual("0.0.2");
      expect(await publish(db, projects[0], false)).toEqual("0.0.3");

      // projects[1] has 2 prefilled versions
      expect(await publish(db, projects[1], true)).toEqual("0.0.1");
      expect(await publish(db, projects[1], true)).toEqual("0.0.2");

      // projects[2] has 1 un-prefilled version
      expect(await publish(db, projects[2], false)).toEqual("0.0.1");

      // projects[3] is never published
    });

    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = host;

    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(async () => {
    publicApi = new PublicApiTester(baseURL, {
      "x-plasmic-api-user": user.email,
      "x-plasmic-api-token": userToken,
    });
  });

  afterEach(async () => {
    await publicApi.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("resolves 1 project", async () => {
    const res = await publicApi.getPublishedLoaderAssets([projects[0]], {});
    expect(res.status()).toEqual(302);
    expect(res.headers()["location"]).toEqual(
      `/api/v1/loader/code/versioned?cb=20&platform=react&loaderVersion=0&projectId=${projects[0].id}%400.0.2`
    );
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("resolves 2 projects, ids sorted for caching", async () => {
    // a has a lesser id than b
    let a: Project, b: Project;
    if (projects[0].id < projects[1].id) {
      a = projects[0];
      b = projects[1];
    } else {
      a = projects[1];
      b = projects[0];
    }

    // request in reverse order
    const res = await publicApi.getPublishedLoaderAssets([b, a], {});
    expect(res.status()).toEqual(302);
    // expect in sorted order
    expect(res.headers()["location"]).toEqual(
      `/api/v1/loader/code/versioned?cb=20&platform=react&loaderVersion=0&projectId=${a.id}%400.0.2&projectId=${b.id}%400.0.2`
    );
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("fails if any project has no prefilled versions", async () => {
    const res = await publicApi.getPublishedLoaderAssets(
      [projects[0], projects[2]],
      {}
    );
    expect(res.status()).toEqual(404);
    expect(res.headers()["cache-control"]).toEqual(
      "no-store, no-cache, must-revalidate, private"
    );
  });

  it("fails if any project is unpublished", async () => {
    const res = await publicApi.getPublishedLoaderAssets(
      [projects[0], projects[3]],
      {}
    );
    expect(res.status()).toEqual(400);
    expect(res.headers()["cache-control"]).toEqual(
      "no-store, no-cache, must-revalidate, private"
    );
  });
});

async function publish(
  db: DbMgr,
  project: Project,
  prefill: boolean
): Promise<string> {
  let pkgVersion = (
    await db.publishProject(project.id, undefined, [], "description")
  ).pkgVersion;
  if (prefill) {
    pkgVersion = await db.updatePkgVersion(
      pkgVersion.pkgId,
      pkgVersion.version,
      pkgVersion.branchId,
      {
        isPrefilled: true,
      }
    );
  }
  return pkgVersion.version;
}
