import * as genCodeBundleMod from "@/wab/server/loader/gen-code-bundle";
import * as resolveProjectsMod from "@/wab/server/loader/resolve-projects";
import { withDb } from "@/wab/server/test/backend-util";
import { prefillCloudfront } from "@/wab/server/workers/prefill-cloudfront";

describe("Prefill cloudfront", () => {
  describe("upsertLoaderPublishmentEntities", () => {
    it("should insert loader publishment for each project id", async () => {
      await withDb(async (sudo) => {
        const publishment = {
          platform: "react",
          projectIds: ["p1", "p2", "p3"],
        };
        // doing it twice, it should be upserted
        // TODO: mock Date
        await sudo.upsertLoaderPublishmentEntities({
          projectIds: publishment.projectIds,
          platform: publishment.platform,
          loaderVersion: 1,
          browserOnly: false,
          i18nKeyScheme: undefined,
          i18nTagPrefix: undefined,
          appDir: undefined,
        });
        await sudo.upsertLoaderPublishmentEntities({
          projectIds: publishment.projectIds,
          platform: publishment.platform,
          loaderVersion: 1,
          browserOnly: false,
          i18nKeyScheme: undefined,
          i18nTagPrefix: undefined,
          appDir: undefined,
        });
        for (const proj of ["p1", "p2", "p3"]) {
          const recentLoaderPublishments =
            await sudo.getRecentLoaderPublishments(proj);
          expect(recentLoaderPublishments.length).toBe(1);
          expect(recentLoaderPublishments[0]).toMatchObject({
            projectId: proj,
            ...publishment,
          });
        }
      });
    });
  });

  describe("prefillCloudfront", () => {
    it("should trigger request for each publishment", async () => {
      await withDb(async (sudo) => {
        const getPkgById = jest.fn().mockImplementation((pkgId: string) => ({
          projectId: PROJECT_ID,
        }));

        sudo.getPkgById = getPkgById;

        jest.mock("@/wab/server/loader/resolve-projects");
        const getResolvedProjectVersions = jest
          .fn()
          .mockImplementation((mgr, projectIds) => {
            if (projectIds.length === 3) {
              return ["p1@0.0.1", "p2@0.0.2", "p3@0.0.3"];
            } else {
              return ["p1@0.0.1"];
            }
          });
        (resolveProjectsMod as any).getResolvedProjectVersions =
          getResolvedProjectVersions;

        jest.mock("@/wab/server/loader/gen-code-bundle");
        const genPublishedLoaderCodeBundle = ((
          genCodeBundleMod as any
        ).genPublishedLoaderCodeBundle = jest.fn());

        // replace it so that the project versions are already resolved
        const getRecentLoaderPublishmentsMock = jest
          .fn()
          .mockImplementation((projectId) => {
            return [
              {
                projectId,
                platform: "react",
                projectIds: ["p1", "p2", "p3"],
                loaderVersion: 8,
                browserOnly: false,
              },
              {
                projectId,
                platform: "nextjs",
                projectIds: ["p1", "p2", "p3"],
                loaderVersion: 8,
                browserOnly: false,
                i18nKeyScheme: "hash",
                i18nTagPrefix: "n",
                appDir: true,
              },
              {
                projectId,
                platform: "react",
                projectIds: ["p1"],
                loaderVersion: 8,
                browserOnly: true,
              },
              {
                projectId,
                platform: "react",
                projectIds: ["p1"],
                browserOnly: true,
                loaderVersion: 1,
              },
            ];
          });
        sudo.getRecentLoaderPublishments = getRecentLoaderPublishmentsMock;

        sudo.getPkgByProjectId = jest
          .fn()
          .mockImplementation((projectId: string) => ({
            id: PKG_ID,
            projectId: PROJECT_ID,
          }));

        const getPkgVersionById = jest
          .fn()
          .mockImplementation((pkgVersionId: string) => {
            return {
              pkgId: PKG_ID,
              id: PKG_VERSION_ID,
              version: PKG_VERSION,
            };
          });
        sudo.getPkgVersionById = getPkgVersionById;

        const updatePkgVersionMock = jest.fn();
        sudo.updatePkgVersion = updatePkgVersionMock;

        const CODEGEN_HOST = "cghost";
        const PROJECT_ID = "P1";
        const PKG_ID = "p1-pkgId-1";
        const PKG_VERSION = "0.0.1";
        const PKG_VERSION_ID = "pkg-version-1";

        const pool: any = {};

        await prefillCloudfront(sudo, pool, PKG_VERSION_ID);

        expect(getResolvedProjectVersions).toHaveBeenNthCalledWith(1, sudo, [
          "p1",
          "p2",
          "p3",
        ]);
        expect(getResolvedProjectVersions).toHaveBeenNthCalledWith(2, sudo, [
          "p1",
          "p2",
          "p3",
        ]);
        expect(getResolvedProjectVersions).toHaveBeenNthCalledWith(3, sudo, [
          "p1",
        ]);
        expect(getRecentLoaderPublishmentsMock).toBeCalledWith(PROJECT_ID);
        expect(genPublishedLoaderCodeBundle).toHaveBeenNthCalledWith(
          1,
          sudo,
          pool,
          {
            platform: "react",
            platformOptions: {
              nextjs: {
                appDir: false,
              },
            },
            loaderVersion: 8,
            projectVersions: {
              p1: { version: "0.0.1", indirect: false },
              p2: { version: "0.0.2", indirect: false },
              p3: { version: "0.0.3", indirect: false },
            },
            browserOnly: false,
          }
        );
        expect(genPublishedLoaderCodeBundle).toHaveBeenNthCalledWith(
          2,
          sudo,
          pool,
          {
            platform: "nextjs",
            platformOptions: {
              nextjs: {
                appDir: true,
              },
            },
            loaderVersion: 8,
            projectVersions: {
              p1: { version: "0.0.1", indirect: false },
              p2: { version: "0.0.2", indirect: false },
              p3: { version: "0.0.3", indirect: false },
            },
            browserOnly: false,
            i18nKeyScheme: "hash",
            i18nTagPrefix: "n",
          }
        );
        expect(genPublishedLoaderCodeBundle).toHaveBeenNthCalledWith(
          3,
          sudo,
          pool,
          {
            platform: "react",
            platformOptions: {
              nextjs: {
                appDir: false,
              },
            },
            loaderVersion: 8,
            projectVersions: {
              p1: { version: "0.0.1", indirect: false },
            },
            browserOnly: true,
          }
        );

        expect(updatePkgVersionMock).toBeCalledWith(
          PKG_ID,
          PKG_VERSION,
          undefined,
          {
            isPrefilled: true,
          }
        );
      });
    });
  });
});
