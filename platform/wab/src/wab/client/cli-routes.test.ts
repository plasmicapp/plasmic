import { parseProjectLocation as parseProjectLocationActual } from "@/wab/client/cli-routes";
import {
  ProjectLocationParams,
  mkProjectLocation,
} from "@/wab/shared/route/app-routes";
import { Location } from "history";

/** parseProjectLocation that makes it easier to specify a Location object. */
function parseProjectLocation({
  pathname = "",
  search = "",
  hash = "",
  key = "",
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
      expectedLocation: Partial<Location>
    ) {
      expect(mkProjectLocation(expectedParams)).toEqual(expectedLocation);
      expect(parseProjectLocation(expectedLocation)).toEqual(expectedParams);
    }
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: undefined,
        branchRevision: undefined,
        branchName: "main",
        branchVersion: "latest",
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "main",
        branchVersion: "latest",
        arenaType: undefined,
        branchRevision: undefined,
        arenaUuidOrNameOrPath: undefined,
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: undefined,
        branchName: "main",
        branchVersion: "latest",
        arenaType: "component",
        branchRevision: undefined,
        arenaUuidOrNameOrPath: "ARENA_UUID",
        threadId: "THREAD_ID",
      },
      {
        pathname: "/projects/PROJECT_ID",
        search: "?arena_type=component&arena=ARENA_UUID&comment=THREAD_ID",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: "THIS-IS-A-SLUG",
        branchName: "FEATURE",
        branchVersion: "latest",
        branchRevision: undefined,
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
        branchRevision: undefined,
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
        branchRevision: undefined,
        arenaType: "page",
        arenaUuidOrNameOrPath: "ARENA_UUID",
      },
      {
        pathname: "/projects/PROJECT_ID/-/THIS-IS-A-SLUG",
        search:
          "?branch=FEATURE&version=1.2.3&arena_type=page&arena=ARENA_UUID",
      }
    );
    expectMkParse(
      {
        projectId: "PROJECT_ID",
        slug: undefined,
        branchName: "main",
        branchVersion: "latest",
        branchRevision: undefined,
        arenaType: undefined,
        arenaUuidOrNameOrPath: undefined,
        threadId: "THREAD_ID",
      },
      {
        pathname: "/projects/PROJECT_ID",
        search: "?comment=THREAD_ID",
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
