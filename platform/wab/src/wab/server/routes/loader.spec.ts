/** @vitest-environment node */
import { PublicApiTester } from "@/wab/server/__testonly__/api-tester";
import {
  createBackend,
  createDatabase,
} from "@/wab/server/__testonly__/backend-util";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { Project, User } from "@/wab/server/entities/Entities";
import { previewLoaderCacheCounter } from "@/wab/server/promstats";
import { _testonly } from "@/wab/server/routes/loader";
import { Bundler } from "@/wab/shared/bundler";
import { createSite } from "@/wab/shared/core/sites";

describe("loader", () => {
  let publicApi: PublicApiTester;
  let userApi: PublicApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let db: DbMgr;
  let userToken: string;
  let user: User;
  let projects: Project[];
  let polyfillProject: Project;

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
        4,
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

      // polyfillProject uses the hardcoded Angular polyfill project ID and has a prefilled version
      const { project: polyfillProjectObj } = await db.createProject({
        name: "Angular Polyfill Project",
        projectId: _testonly.ANGULAR_POLYFILL_PROJECT_ID,
      });
      const site = createSite();
      const siteBundle = new Bundler().bundle(
        site,
        "",
        await getLastBundleVersion(),
      );
      await db.saveProjectRev({
        projectId: polyfillProjectObj.id,
        data: JSON.stringify(siteBundle),
        revisionNum: 2,
      });
      expect(await publish(db, polyfillProjectObj, true)).toEqual("0.0.1");
      polyfillProject = polyfillProjectObj;
    });

    db = new DbMgr(con.manager, normalActor(user.id));
    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = host;

    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(async () => {
    // Loader clients authenticate with project tokens only, which the request
    // helpers add per project.
    publicApi = new PublicApiTester(baseURL);
    // A personal API token authorizes a specific user. Shared caches must
    // never reuse responses to such requests.
    userApi = new PublicApiTester(baseURL, {
      "x-plasmic-api-user": user.email,
      "x-plasmic-api-token": userToken,
    });
  });

  afterEach(async () => {
    await publicApi.dispose();
    await userApi.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("fails code loader requests with no projectId", async () => {
    const publishedRes = await userApi.getPublishedLoaderAssets([], {});
    expect(publishedRes.status()).toEqual(400);

    const versionedRes = await userApi.rawReq(
      "get",
      "/api/v1/loader/code/versioned?cb=23&platform=nextjs&loaderVersion=7",
    );
    expect(versionedRes.status()).toEqual(400);
  });

  it("resolves polyfill project", async () => {
    const res = await publicApi.getPublishedLoaderAssets([polyfillProject], {
      loaderVersion: "7",
    });
    expect(res.status()).toEqual(200);
    const body = await res.json();
    expect(body.redirectUrl).toEqual(
      `/api/v1/loader/code/versioned?cb=23&platform=react&loaderVersion=7&projectId=${polyfillProject.id}%400.0.1`,
    );
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("resolves 1 project", async () => {
    const res = await publicApi.getPublishedLoaderAssets([projects[0]], {
      loaderVersion: "7",
    });
    expect(res.status()).toEqual(302);
    expect(res.headers()["location"]).toEqual(
      `/api/v1/loader/code/versioned?cb=23&platform=react&loaderVersion=7&projectId=${projects[0].id}%400.0.2`,
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
    const res = await publicApi.getPublishedLoaderAssets([b, a], {
      loaderVersion: "7",
    });
    expect(res.status()).toEqual(302);
    // expect in sorted order
    expect(res.headers()["location"]).toEqual(
      `/api/v1/loader/code/versioned?cb=23&platform=react&loaderVersion=7&projectId=${a.id}%400.0.2&projectId=${b.id}%400.0.2`,
    );
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("marks responses authorized by a user as private", async () => {
    // Shared caches key on the project tokens header, so a response that a
    // user's own credentials authorized must not be stored for other callers.
    const redirectRes = await userApi.getPublishedLoaderAssets([projects[0]], {
      loaderVersion: "7",
    });
    expect(redirectRes.status()).toEqual(302);
    expect(redirectRes.headers()["cache-control"]).toEqual("private, no-store");

    const htmlRes = await userApi.getPublishedLoaderHtml(
      projects[0],
      "Homepage",
      { followRedirect: true },
    );
    expect(htmlRes.status()).toEqual(200);
    expect(htmlRes.headers()["cache-control"]).toEqual("private, no-store");

    const previewRes = await userApi.getPreviewLoaderHtml(
      projects[0],
      "Homepage",
    );
    expect(previewRes.status()).toEqual(200);
    expect(previewRes.headers()["cache-control"]).toEqual("private, no-store");
  });

  it("fails if any project has no prefilled versions", async () => {
    const res = await publicApi.getPublishedLoaderAssets(
      [projects[0], projects[2]],
      {},
    );
    expect(res.status()).toEqual(404);
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("fails if any project is unpublished", async () => {
    const res = await publicApi.getPublishedLoaderAssets(
      [projects[0], projects[3]],
      {},
    );
    expect(res.status()).toEqual(400);
    expect(res.headers()["cache-control"]).toEqual("s-maxage=30");
  });

  it("does not cache a 401 for a token that can't view the project", async () => {
    // apiAuth lets any project token header through; the permission check
    // inside the route rejects it, and that response depends on the token.
    const otherApi = new PublicApiTester(baseURL, {
      "x-plasmic-api-project-tokens": `${projects[0].id}:not-the-token`,
    });
    try {
      const res = await otherApi.rawReq(
        "get",
        `/api/v1/loader/code/published?projectId=${projects[0].id}`,
      );
      expect(res.status()).toEqual(401);
      expect(res.headers()["cache-control"]).toEqual(
        "no-store, no-cache, must-revalidate, private",
      );
    } finally {
      await otherApi.dispose();
    }
  });

  it("resolves component as HTML", async () => {
    const redirectRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "Homepage",
    );
    expect(redirectRes.status()).toEqual(302);
    expect(redirectRes.headers()["location"]).toEqual(
      `/api/v1/loader/html/versioned/${projects[0].id}@0.0.2/Homepage?cb=23&embedHydrate=0&hydrate=0&componentProps=%7B%7D&globalVariants=%5B%5D&prepass=0`,
    );
    expect(redirectRes.headers()["cache-control"]).toEqual("s-maxage=30");

    const htmlRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "Homepage",
      { followRedirect: true },
    );
    expect(htmlRes.status()).toEqual(200);
    expect(htmlRes.headers()["cache-control"]).toEqual(
      "max-age=3600, s-maxage=31536000",
    );
    expect(await htmlRes.text()).toInclude("Hello, world!");
  });

  it.each([undefined, { title: "Hello & welcome" }])(
    "preserves global variants in HTML redirects with componentProps=%j",
    async (componentProps) => {
      const globalVariants = JSON.stringify([
        { name: "Publisher", value: "testplus" },
      ]);
      const query = new URLSearchParams({ globalVariants });
      if (componentProps) {
        query.set("componentProps", JSON.stringify(componentProps));
      }
      const response = await publicApi.getPublishedLoaderHtml(
        projects[0],
        `Homepage?${query}`,
      );
      expect(response.status()).toEqual(302);
      const destination = new URL(response.headers()["location"], baseURL);
      expect(destination.searchParams.get("globalVariants")).toEqual(
        globalVariants,
      );
      expect(destination.searchParams.get("componentProps")).toEqual(
        JSON.stringify(componentProps ?? {}),
      );
    },
  );

  it("resolves component as HTML with hydration", async () => {
    const redirectRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "Homepage?hydrate=1&embedHydrate=1",
    );
    expect(redirectRes.status()).toEqual(302);
    expect(redirectRes.headers()["location"]).toEqual(
      `/api/v1/loader/html/versioned/${projects[0].id}@0.0.2/Homepage?cb=23&embedHydrate=1&hydrate=1&componentProps=%7B%7D&globalVariants=%5B%5D&prepass=0`,
    );
    expect(redirectRes.headers()["cache-control"]).toEqual("s-maxage=30");

    const htmlRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "Homepage?hydrate=1&embedHydrate=1",
      { followRedirect: true },
    );
    expect(htmlRes.status()).toEqual(200);
    expect(htmlRes.headers()["cache-control"]).toEqual(
      "max-age=3600, s-maxage=31536000",
    );
    expect(await htmlRes.text()).toInclude("Hello, world!");
  });

  it("responds 404 if component does not exist", async () => {
    const redirectRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "NonExistentComponent",
    );
    expect(redirectRes.status()).toEqual(302);
    expect(redirectRes.headers()["location"]).toEqual(
      `/api/v1/loader/html/versioned/${projects[0].id}@0.0.2/NonExistentComponent?cb=23&embedHydrate=0&hydrate=0&componentProps=%7B%7D&globalVariants=%5B%5D&prepass=0`,
    );
    expect(redirectRes.headers()["cache-control"]).toEqual("s-maxage=30");

    const htmlRes = await publicApi.getPublishedLoaderHtml(
      projects[0],
      "NonExistentComponent",
      { followRedirect: true },
    );
    expect(htmlRes.status()).toEqual(404);
    expect(await htmlRes.json()).toEqual({
      error: {
        name: "NotFoundError",
        statusCode: 404,
        message: `Error: Unable to find components NonExistentComponent (project ${projects[0].id})`,
      },
    });
  });

  it("rebuilds a warm preview for uptime probes and when the TTL is disabled", async () => {
    const project = projects[3];
    const preview = (headers: Record<string, string> = {}) =>
      publicApi.rawReq(
        "get",
        `/api/v1/loader/code/preview?loaderVersion=10&projectId=${project.id}`,
        undefined,
        {
          headers: {
            "x-plasmic-api-project-tokens": `${project.id}:${project.projectApiToken}`,
            ...headers,
          },
        },
      );
    const builds = async () => {
      const { values } = await previewLoaderCacheCounter.get();
      return values.find((v) => v.labels.result === "computed")?.value ?? 0;
    };

    const before = await builds();
    const warm = await preview();
    expect(warm.status()).toBe(200);
    await preview({
      "x-plasmic-uptime-check": "1",
      "if-none-match": warm.headers().etag,
    });
    expect(await builds()).toBe(before + 2);
    const previous = (await db.tryGetDevFlagOverrides())?.data ?? "{}";
    try {
      await db.setDevFlagOverrides(
        JSON.stringify({ ...JSON.parse(previous), previewLoaderCacheTtlMs: 0 }),
      );
      expect((await preview()).status()).toBe(200);
      expect(await builds()).toBe(before + 3);
    } finally {
      await db.setDevFlagOverrides(previous);
    }
  });

  it("sets a valid preview HTML ETag for non-Latin-1 component names", async () => {
    const component = encodeURIComponent("平仮名s.php");

    const htmlRes = await publicApi.getPreviewLoaderHtml(
      projects[0],
      component,
    );
    expect(htmlRes.status()).toEqual(404);
    const etag = htmlRes.headers()["etag"];
    expect(etag).toBeString();

    const cachedRes = await publicApi.getPreviewLoaderHtml(
      projects[0],
      component,
      { ifNoneMatch: etag },
    );
    expect(cachedRes.status()).toEqual(304);
  });
});

async function publish(
  db: DbMgr,
  project: Project,
  prefill: boolean,
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
      },
    );
  }
  return pkgVersion.version;
}
