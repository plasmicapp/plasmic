import {
  parseProjectLocation as parseProjectLocationActual,
  parseRoute,
} from "@/wab/client/cli-routes";
import {
  ProjectLocationParams,
  mkProjectLocation,
} from "@/wab/shared/route/app-routes";
import { Route, fillRoute, route } from "@/wab/shared/route/route";
import { Location, LocationDescriptorObject } from "history";

interface AB {
  a: string;
  b: string;
}

const abRoute = route<AB>("/:a/:b");

interface ABRepeated {
  a: string;
  b: undefined | string | string[];
}

const abRepeatedRoute = route<ABRepeated>("/:a/:b*");

/** parseProjectLocation that makes it easier to specify a Location object. */
function parseProjectLocation({
  pathname = "",
  search = "",
  hash = "",
  key,
  state,
}: Partial<Location>) {
  return parseProjectLocationActual({
    pathname,
    search,
    hash,
    key,
    state,
  });
}

describe("R", () => {
  it("fails to parse", () => {
    expect(parseRoute(abRoute, "/foo", false)).toBeNull();
    expect(parseRoute(abRoute, "/foo", true)).toBeNull();
    expect(parseRoute(abRoute, "/foo/bar", false)?.params).toEqual({
      a: "foo",
      b: "bar",
    });
    expect(parseRoute(abRoute, "/foo/bar", true)?.params).toEqual({
      a: "foo",
      b: "bar",
    });
    expect(parseRoute(abRoute, "/foo/bar/qux", false)?.params).toEqual({
      a: "foo",
      b: "bar",
    });
    expect(parseRoute(abRoute, "/foo/bar/qux", true)).toBeNull();
    expect(parseRoute(abRepeatedRoute, "/foo", false)?.params).toEqual({
      a: "foo",
      b: undefined,
    });
    expect(parseRoute(abRepeatedRoute, "/foo", true)?.params).toEqual({
      a: "foo",
      b: undefined,
    });
    expect(parseRoute(abRepeatedRoute, "/foo/bar", false)?.params).toEqual({
      a: "foo",
      b: "bar",
    });
    expect(parseRoute(abRepeatedRoute, "/foo/bar", true)?.params).toEqual({
      a: "foo",
      b: "bar",
    });
    expect(parseRoute(abRepeatedRoute, "/foo/bar/qux", false)?.params).toEqual({
      a: "foo",
      b: "bar/qux",
    });
    expect(parseRoute(abRepeatedRoute, "/foo/bar/qux", true)?.params).toEqual({
      a: "foo",
      b: "bar/qux",
    });
  });

  it("fills and parses", () => {
    function expectFillParse<PathParams extends {}>(
      r: Route<PathParams>,
      params: PathParams,
      expectedPath: string,
      expectedParams?: PathParams
    ) {
      // sometimes the parsed params have a different shape than the input params
      expectedParams = expectedParams || params;

      const path = fillRoute(r, params);
      expect(path).toBe(expectedPath);

      const match = parseRoute(r, path, false);
      expect(match).toBeTruthy();
      expect(match?.params).toEqual(expectedParams);

      const exactMatch = parseRoute(r, path, true);
      expect(exactMatch).toBeTruthy();
      expect(exactMatch?.params).toEqual(expectedParams);
    }

    expectFillParse(abRoute, { a: "foo", b: "bar" }, "/foo/bar");
    expectFillParse(abRoute, { a: "foo foo", b: "bar" }, "/foo%20foo/bar");
    expectFillParse(abRoute, { a: "foo@foo", b: "bar" }, "/foo%40foo/bar");
    expectFillParse(abRoute, { a: "foo/", b: "bar" }, "/foo%2F/bar");
    expectFillParse(abRoute, { a: "foo", b: "/bar" }, "/foo/%2Fbar");
    expectFillParse(abRepeatedRoute, { a: "foo", b: undefined }, "/foo", {
      a: "foo",
      b: undefined,
    });
    expectFillParse(abRepeatedRoute, { a: "foo", b: [] }, "/foo", {
      a: "foo",
      b: undefined,
    });
    expectFillParse(
      abRepeatedRoute,
      { a: "foo", b: "bar/qux" },
      "/foo/bar%2Fqux",
      { a: "foo", b: "bar/qux" }
    );
    expectFillParse(
      abRepeatedRoute,
      { a: "foo", b: ["bar", "qux"] },
      "/foo/bar/qux",
      { a: "foo", b: "bar/qux" }
    );
  });
});

describe("mkProjectLocation/parseProjectLocation", () => {
  it("does not parse non-exact-matching paths", () => {
    expect(
      parseProjectLocation({ pathname: "/wrong-pathname" })
    ).toBeUndefined();
    expect(
      parseProjectLocation({ pathname: "/projects/PROJECT_ID/docs" })
    ).toBeUndefined();
    expect(
      parseProjectLocation({
        pathname: "/projects/PROJECT_ID/missing-hyphen/slug",
      })
    ).toBeUndefined();
  });
  it("ignores unknown arena type", () => {
    expect(
      parseProjectLocation({
        pathname: "/projects/PROJECT_ID",
        search: "?arena_type=focusedframe&arena=ARENA_UUID",
      })
    ).toEqual({
      projectId: "PROJECT_ID",
      slug: undefined,
      branchName: "main",
      branchVersion: "latest",
      arenaType: undefined,
      arenaUuidOrNameOrPath: "ARENA_UUID",
    });
  });
  it("ignores unknown search params and hash", () => {
    expect(
      parseProjectLocation({
        pathname: "/projects/PROJECT_ID",
        search: "?unknown=search&params",
        hash: "#hash-tags-ignored",
      })
    ).toEqual({
      projectId: "PROJECT_ID",
      slug: undefined,
      branchName: "main",
      branchVersion: "latest",
      arenaType: undefined,
      arenaUuidOrNameOrPath: undefined,
    });
  });
  it("makes and parses project locations", () => {
    function expectMkParse(
      expectedParams: ProjectLocationParams,
      expectedLocation: LocationDescriptorObject
    ) {
      expect(mkProjectLocation(expectedParams)).toEqual(expectedLocation);
      expect(parseProjectLocation(expectedLocation)).toEqual(expectedParams);
    }
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: undefined,
        branchName: "main",
        branchVersion: "latest",
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID",
        search: undefined,
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "main",
        branchVersion: "latest",
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
        search: undefined,
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: undefined,
        branchName: "main",
        branchVersion: "latest",
        arenaType: "component",
        arenaUuidOrNameOrPath: "ARENA_UUID",
      },
      {
        pathname: "/projects/PROJECT_ID",
        search: "?arena_type=component&arena=ARENA_UUID",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "FEATURE",
        branchVersion: "latest",
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
        search: "?branch=FEATURE",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "main",
        branchVersion: "1.2.3",
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
        search: "?version=1.2.3",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "FEATURE",
        branchVersion: "1.2.3",
        arenaType: "page",
        arenaUuidOrNameOrPath: "ARENA_UUID",
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
        search:
          "?branch=FEATURE&version=1.2.3&arena_type=page&arena=ARENA_UUID",
      }
    );
  });
  it("Can parse preview locations", () => {
    expect(
      parseProjectLocation({
        pathname: "/projects/PROJECT_ID/preview/ARENA_UUID",
      })
    ).toEqual({
      arenaType: undefined,
      arenaUuidOrNameOrPath: "ARENA_UUID",
      branchVersion: "latest",
      branchName: "main",
      isPreview: true,
      projectId: "PROJECT_ID",
      slug: undefined,
    });
    expect(
      parseProjectLocation({
        pathname: "/projects/PROJECT_ID/preview/ARENA_UUID",
        hash: "#width=1180&height=540&branch=test",
      })
    ).toEqual({
      arenaType: undefined,
      arenaUuidOrNameOrPath: "ARENA_UUID",
      branchVersion: "latest",
      branchName: "test",
      isPreview: true,
      projectId: "PROJECT_ID",
      slug: undefined,
    });
  });
});
