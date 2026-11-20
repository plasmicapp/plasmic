import {
  extractProjectId,
  isPinnedVersionToSync,
  makeRevisionSpec,
  mkRevisionToSync,
  mkVersionToSync,
  parseRevisionSpec,
} from "@/wab/server/loader/resolve-projects";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";

describe("parseRevisionSpec", () => {
  it("round-trips with makeRevisionSpec", () => {
    const spec = makeRevisionSpec("proj123", "rev-456_abc");
    expect(spec).toEqual("proj123@rev:rev-456_abc");
    expect(parseRevisionSpec(spec)).toEqual({
      projectId: "proj123",
      revisionId: "rev-456_abc",
    });
  });

  it.each([
    ["a bare project id", "proj123"],
    ["a pkg version", "proj123@1.2.3"],
    ["a tag or branch", "proj123@main"],
    ["an empty revision id", "proj123@rev:"],
    ["an empty project id", "@rev:rev456"],
    ["a revision id with a separator", "proj123@rev:rev456@rev:other"],
    ["a revision id with a slash", "proj123@rev:../rev456"],
  ])("rejects %s", (_, spec) => {
    expect(() => parseRevisionSpec(spec)).toThrow(BadRequestError);
  });
});

describe("extractProjectId", () => {
  it.each([
    ["proj123", "proj123"],
    ["proj123@1.2.3", "proj123"],
    ["proj123@main", "proj123"],
    ["proj123@rev:rev456", "proj123"],
  ])("extracts the project id from %s", (spec, projectId) => {
    expect(extractProjectId(spec)).toEqual(projectId);
  });
});

describe("isPinnedVersionToSync", () => {
  const branches = [{ name: "feature" }];

  it("treats pkg versions and revisions as pinned", () => {
    expect(isPinnedVersionToSync(mkVersionToSync("1.2.3"), branches)).toBe(
      true,
    );
    expect(isPinnedVersionToSync(mkRevisionToSync("rev456"), branches)).toBe(
      true,
    );
  });

  it("treats latest and branch names as unpinned", () => {
    expect(isPinnedVersionToSync(mkVersionToSync("latest"), branches)).toBe(
      false,
    );
    expect(isPinnedVersionToSync(mkVersionToSync("feature"), branches)).toBe(
      false,
    );
  });
});
