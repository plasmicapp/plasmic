import { mkShortId } from "@/wab/shared/common";
import {
  finalDataTokensForDep,
  siteDataTokens,
  siteDataTokensAllDeps,
  siteDataTokensAllDepsDict,
  siteDataTokensDirectDeps,
  siteFinalDataTokens,
  siteFinalDataTokensAllDeps,
  siteFinalDataTokensDirectDeps,
  siteFinalDataTokensOfType,
} from "@/wab/shared/core/site-data-tokens";
import { createSite as createDefaultSite } from "@/wab/shared/core/sites";
import {
  DataToken,
  ProjectDependency,
  Site,
  SiteParams,
} from "@/wab/shared/model/classes";

describe("siteDataTokens helper functions", () => {
  function createDataToken(
    name: string,
    value: string,
    isRegistered = false
  ): DataToken {
    return new DataToken({
      name,
      type: "Data",
      value,
      uuid: mkShortId(),
      variantedValues: [],
      isRegistered,
      regKey: undefined,
    });
  }

  function createSite(params: Partial<SiteParams> = {}): Site {
    const site = createDefaultSite();
    Object.assign(site, params);
    return site;
  }

  let deepTransitiveDepSite: Site;
  let deepTransitiveToken1: DataToken;
  let deepTransitiveToken2: DataToken;
  let deepTransitiveDep: ProjectDependency;

  let transitiveDepSite: Site;
  let transitiveToken1: DataToken;
  let transitiveDep: ProjectDependency;

  let directDepSite: Site;
  let directDepToken1: DataToken;
  let directDepToken2: DataToken;
  let directDep: ProjectDependency;

  let mainSite: Site;
  let mainToken1: DataToken;
  let mainToken2: DataToken;
  let mainToken3: DataToken;

  beforeEach(() => {
    // Create deep transitive dependency (no dependencies)
    deepTransitiveToken1 = createDataToken("deepTransitiveNumberToken", "42");
    deepTransitiveToken2 = createDataToken(
      "deepTransitiveStringToken",
      '"hello"'
    );
    deepTransitiveDepSite = createSite({
      dataTokens: [deepTransitiveToken1, deepTransitiveToken2],
    });
    deepTransitiveDep = new ProjectDependency({
      name: "DeepTransitiveDep",
      pkgId: "deep-transitive-pkg-id",
      projectId: "deep-transitive-project-id",
      version: "0.0.1",
      uuid: "deep-transitive-uuid",
      site: deepTransitiveDepSite,
    });

    // Create transitive dependency (depends on deep transitive)
    transitiveToken1 = createDataToken(
      "transitiveGenericToken",
      '{"theme": true}'
    );
    transitiveDepSite = createSite({
      dataTokens: [transitiveToken1],
      projectDependencies: [deepTransitiveDep],
    });
    transitiveDep = new ProjectDependency({
      name: "TransitiveDep",
      pkgId: "transitive-pkg-id",
      projectId: "transitive-project-id",
      version: "0.0.1",
      uuid: "transitive-uuid",
      site: transitiveDepSite,
    });

    // Create direct dependency (depends on transitive)
    directDepToken1 = createDataToken("directDepNumberToken", "3.14");
    directDepToken2 = createDataToken("directDepBoolToken", "true");
    directDepSite = createSite({
      dataTokens: [directDepToken1, directDepToken2],
      projectDependencies: [transitiveDep],
    });
    directDep = new ProjectDependency({
      name: "DirectDep",
      pkgId: "direct-dep-pkg-id",
      projectId: "direct-dep-project-id",
      version: "0.0.1",
      uuid: "direct-dep-uuid",
      site: directDepSite,
    });

    // Create main site (depends on directDep directly)
    mainToken1 = createDataToken("mainStringToken", '"world"');
    mainToken2 = createDataToken("mainNumberToken", "100");
    mainToken3 = createDataToken("mainArrayToken", "[1, 2, 3]");
    mainSite = createSite({
      dataTokens: [mainToken1, mainToken2, mainToken3],
      projectDependencies: [directDep],
    });
  });

  describe("siteDataTokens", () => {
    test("returns only site's own tokens", () => {
      const result = siteDataTokens(mainSite);
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.name)).toEqual([
        "mainStringToken",
        "mainNumberToken",
        "mainArrayToken",
      ]);
    });
  });

  describe("siteDataTokensDirectDeps", () => {
    test("returns site's tokens + direct dependencies", () => {
      const result = siteDataTokensDirectDeps(mainSite);
      expect(result).toHaveLength(
        mainSite.dataTokens.length + directDepSite.dataTokens.length
      );
      expect(result.map((t) => t.name)).toEqual([
        "mainStringToken",
        "mainNumberToken",
        "mainArrayToken",
        "directDepNumberToken",
        "directDepBoolToken",
      ]);
    });
  });

  describe("siteDataTokensAllDeps", () => {
    test("returns site's tokens + all transitive dependencies", () => {
      const result = siteDataTokensAllDeps(mainSite);
      expect(result).toHaveLength(
        mainSite.dataTokens.length +
          directDepSite.dataTokens.length +
          transitiveDepSite.dataTokens.length +
          deepTransitiveDepSite.dataTokens.length
      );
      expect(result.map((t) => t.name)).toEqual([
        "mainStringToken",
        "mainNumberToken",
        "mainArrayToken",
        "directDepNumberToken",
        "directDepBoolToken",
        "transitiveGenericToken",
        "deepTransitiveNumberToken",
        "deepTransitiveStringToken",
      ]);
    });
  });

  describe("siteDataTokensAllDepsDict", () => {
    test("returns dictionary of tokens by uuid", () => {
      const result = siteDataTokensAllDepsDict(mainSite);
      expect(Object.keys(result)).toHaveLength(
        mainSite.dataTokens.length +
          directDepSite.dataTokens.length +
          transitiveDepSite.dataTokens.length +
          deepTransitiveDepSite.dataTokens.length
      );
      expect(result[mainToken1.uuid]).toBe(mainToken1);
      expect(result[directDepToken1.uuid]).toBe(directDepToken1);
      expect(result[transitiveToken1.uuid]).toBe(transitiveToken1);
      expect(result[deepTransitiveToken1.uuid]).toBe(deepTransitiveToken1);
    });
  });

  describe("siteFinalDataTokens", () => {
    test("returns FinalToken for site's own tokens", () => {
      const result = siteFinalDataTokens(mainSite);
      expect(result).toHaveLength(mainSite.dataTokens.length);
      expect(result[0].name).toBe("mainStringToken");
      expect(result[0].value).toBe('"world"');
      expect(result[0].isLocal).toBe(true);
    });
  });

  describe("siteFinalDataTokensDirectDeps", () => {
    test("returns FinalToken for site's tokens + direct dependencies", () => {
      const result = siteFinalDataTokensDirectDeps(mainSite);
      expect(result).toHaveLength(
        mainSite.dataTokens.length + directDepSite.dataTokens.length
      );
      expect(result.map((t) => t.name)).toEqual([
        "mainStringToken",
        "mainNumberToken",
        "mainArrayToken",
        "directDepNumberToken",
        "directDepBoolToken",
      ]);
    });
  });

  describe("siteFinalDataTokensAllDeps", () => {
    test("returns FinalToken for all tokens including transitive deps", () => {
      const result = siteFinalDataTokensAllDeps(mainSite);
      expect(result).toHaveLength(
        mainSite.dataTokens.length +
          directDepSite.dataTokens.length +
          transitiveDepSite.dataTokens.length +
          deepTransitiveDepSite.dataTokens.length
      );
      expect(result.map((t) => t.name)).toEqual([
        "mainStringToken",
        "mainNumberToken",
        "mainArrayToken",
        "directDepNumberToken",
        "directDepBoolToken",
        "transitiveGenericToken",
        "deepTransitiveNumberToken",
        "deepTransitiveStringToken",
      ]);
    });
  });

  describe("siteFinalDataTokensOfCategory", () => {
    test("filters by category - no deps", () => {
      const numberTokens = siteFinalDataTokensOfType(mainSite, "number");
      expect(numberTokens).toHaveLength(1);
      expect(numberTokens[0].name).toBe("mainNumberToken");

      const stringTokens = siteFinalDataTokensOfType(mainSite, "string");
      expect(stringTokens).toHaveLength(1);
      expect(stringTokens[0].name).toBe("mainStringToken");

      const genericTokens = siteFinalDataTokensOfType(mainSite, "code");
      expect(genericTokens).toHaveLength(1);
      expect(genericTokens[0].name).toBe("mainArrayToken");
    });

    test("filters by category - direct deps", () => {
      const numberTokens = siteFinalDataTokensOfType(mainSite, "number", {
        includeDeps: "direct",
      });
      expect(numberTokens).toHaveLength(2);
      expect(numberTokens.map((t) => t.name)).toEqual([
        "mainNumberToken",
        "directDepNumberToken",
      ]);

      const genericTokens = siteFinalDataTokensOfType(mainSite, "code", {
        includeDeps: "direct",
      });
      expect(genericTokens).toHaveLength(2);
      expect(genericTokens.map((t) => t.name)).toEqual([
        "mainArrayToken",
        "directDepBoolToken",
      ]);
    });

    test("filters by category - all deps", () => {
      const numberTokens = siteFinalDataTokensOfType(mainSite, "number", {
        includeDeps: "all",
      });
      expect(numberTokens).toHaveLength(3);
      expect(numberTokens.map((t) => t.name)).toEqual([
        "mainNumberToken",
        "directDepNumberToken",
        "deepTransitiveNumberToken",
      ]);

      const stringTokens = siteFinalDataTokensOfType(mainSite, "string", {
        includeDeps: "all",
      });
      expect(stringTokens).toHaveLength(2);
      expect(stringTokens.map((t) => t.name)).toEqual([
        "mainStringToken",
        "deepTransitiveStringToken",
      ]);

      const genericTokens = siteFinalDataTokensOfType(mainSite, "code", {
        includeDeps: "all",
      });
      expect(genericTokens).toHaveLength(3);
      expect(genericTokens.map((t) => t.name)).toEqual([
        "mainArrayToken",
        "directDepBoolToken",
        "transitiveGenericToken",
      ]);
    });
  });

  describe("finalDataTokensForDep", () => {
    test("returns FinalToken for tokens from specific dependency", () => {
      const result = finalDataTokensForDep(mainSite, directDepSite);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.name)).toEqual([
        "directDepNumberToken",
        "directDepBoolToken",
      ]);
      expect(result[0].base).toBe(directDepToken1);
      expect(result[1].base).toBe(directDepToken2);
    });
  });
});
