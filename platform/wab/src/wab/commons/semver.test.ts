import * as semver from "@/wab/commons/semver";

describe("semver", () => {
  it("should understand latest", () => {
    expect(semver.valid("latest")).toEqual("latest");
    expect(semver.valid("1.0.1")).toEqual("1.0.1");
    expect(semver.valid("1.0")).toBeNull();
    expect(semver.inc("latest", "major")).toEqual("latest");
    expect(semver.inc("1.0.0", "major")).toEqual("2.0.0");
    expect(semver.inc("1.0", "major")).toBeNull();
    expect(semver.prerelease("latest")).toEqual([]);
    expect(semver.prerelease("1.2.3-alpha.1")).toEqual(["alpha", 1]);
    expect(semver.major("latest")).toEqual("latest");
    expect(semver.minor("latest")).toEqual("latest");
    expect(semver.patch("latest")).toEqual("latest");
    expect(semver.patch("1.2.3")).toEqual(3);
    expect(semver.gt("latest", "1.0.0")).toEqual(true);
    expect(semver.gt("1.0.0", "latest")).toEqual(false);
    expect(semver.gt("latest", "latest")).toEqual(false);
    expect(semver.gt("1.1.1", "1.0.0")).toEqual(true);
    expect(semver.lt("latest", "1.0.0")).toEqual(false);
    expect(semver.lt("1.0.0", "latest")).toEqual(true);
    expect(semver.lt("latest", "latest")).toEqual(false);
    expect(semver.lt("1.1.1", "1.0.0")).toEqual(false);
    expect(semver.gte("latest", "1.0.0")).toEqual(true);
    expect(semver.gte("1.0.0", "latest")).toEqual(false);
    expect(semver.gte("latest", "latest")).toEqual(true);
    expect(semver.gte("1.1.1", "1.0.0")).toEqual(true);
    expect(semver.lte("latest", "1.0.0")).toEqual(false);
    expect(semver.lte("1.0.0", "latest")).toEqual(true);
    expect(semver.lte("latest", "latest")).toEqual(true);
    expect(semver.lte("1.1.1", "1.0.0")).toEqual(false);
    expect(semver.eq("latest", "latest")).toEqual(true);
    expect(semver.neq("latest", "latest")).toEqual(false);
    expect(semver.valid("latest")).toEqual("latest");
    expect(semver.valid("1.0.0")).toEqual("1.0.0");
    expect(semver.valid("^1.0.0")).toEqual(null);
    expect(semver.satisfies("1.0.0", "latest")).toEqual(true);
    expect(semver.satisfies("1.2.3", "^1.0.0")).toEqual(true);
    expect(semver.satisfies("1.2.3", "^1.3.4")).toEqual(false);
    expect(semver.satisfies("1.2.3", "1.2.3")).toEqual(true);
    expect(semver.satisfies("1.2.3", ">=0")).toEqual(true);
    expect(semver.satisfies("1.2.3", ">0")).toEqual(true);
    expect(semver.satisfies("0.0.0", ">0")).toEqual(false);
    expect(semver.toTildeRange("invalid")).toEqual(null);
    expect(semver.toTildeRange("latest")).toEqual("latest");
    expect(semver.toTildeRange("1.2.3")).toEqual("~1.2.3");
    expect(semver.toCaretRange("invalid")).toEqual(null);
    expect(semver.toCaretRange("latest")).toEqual("latest");
    expect(semver.toCaretRange("1.2.3")).toEqual("^1.2.3");
    expect(semver.sortAsc(["4.5.6", "latest", "0.1.2", "latest"])).toEqual([
      "0.1.2",
      "4.5.6",
      "latest",
      "latest",
    ]);
    const versions = [
      "2.0.0",
      "1.10.0",
      "1.0.100",
      "1.0.1",
      "2.1.0",
      "latest",
      "1.1.2",
      "1.1.100",
      "1.0.10",
      "1.9.0",
      "1.0.99",
      "1.0.0",
      "latest",
    ];
    expect(semver.minSatisfying(versions, "~0.0.0")).toEqual(null);
    expect(semver.maxSatisfying(versions, "~0.0.0")).toEqual(null);
    expect(semver.minSatisfying(versions, "~1.0.0")).toEqual("1.0.0");
    expect(semver.maxSatisfying(versions, "~1.0.0")).toEqual("1.0.100");
    expect(semver.minSatisfying(versions, "~1.1.0")).toEqual("1.1.2");
    expect(semver.maxSatisfying(versions, "~1.1.0")).toEqual("1.1.100");
    expect(semver.minSatisfying(versions, "^1.0.0")).toEqual("1.0.0");
    expect(semver.maxSatisfying(versions, "^1.0.0")).toEqual("1.10.0");
    expect(semver.minSatisfying(versions, ">0")).toEqual("1.0.0");
    expect(semver.maxSatisfying(versions, ">0")).toEqual("2.1.0");
    expect(semver.coerce("latest")).toEqual("latest");
    expect(semver.coerce("1.1")).toEqual("1.1.0");
    expect(semver.coerce("1.2.3")).toEqual("1.2.3");
    expect(semver.gtr("3.0.0", "^2.1.0")).toEqual(true);
    expect(semver.gtr("2.2.0", "^2.1.0")).toEqual(false);
    expect(semver.gtr("latest", "^2.1.0")).toEqual(true);
    expect(semver.gtr("2.1.0", "latest")).toEqual(false);
    expect(semver.ltr("2.0.0", "^2.1.0")).toEqual(true);
    expect(semver.ltr("2.1.0", "^2.1.0")).toEqual(false);
    expect(semver.ltr("latest", "^2.1.0")).toEqual(false);
    expect(semver.ltr("2.1.0", "latest")).toEqual(true);
    expect(semver.gtr("3.0.0", ">0")).toEqual(false);
    expect(semver.ltr("0.0.0", ">0")).toEqual(true);
    expect(semver.outside("0.0.0", ">0")).toEqual(true);
    expect(semver.outside("1.0.0", ">0")).toEqual(false);
    expect(semver.outside("2.0.0", "^2.1.0")).toEqual(true);
    expect(semver.outside("2.1.0", "^2.1.0")).toEqual(false);
    expect(semver.outside("latest", "^2.1.0")).toEqual(true);
    expect(semver.outside("2.1.0", "latest")).toEqual(true);
    ///expect(semver.).toEqual();
  });
});
