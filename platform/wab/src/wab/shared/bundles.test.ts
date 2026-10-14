import { Bundle, pickPartialBundle } from "@/wab/shared/bundles";

describe("pickPartialBundle", () => {
  const full: Bundle = {
    root: "1",
    deps: ["dep"],
    version: "v1",
    map: {
      "1": { __type: "Site", name: "site", components: [{ __ref: "2" }] },
      "2": { __type: "Component", name: "merged", params: [] },
      "3": { __type: "Component", name: "untouched", params: [] },
    },
  };

  it("keeps only the partial's instances and fields, with full's values", () => {
    const partial: Bundle = {
      ...full,
      map: {
        "2": { __type: "Component", name: "stale" },
        "4": { __type: "Component", name: "deleted" },
      },
    };
    expect(pickPartialBundle(full, partial)).toEqual({
      root: "1",
      deps: ["dep"],
      version: "v1",
      map: {
        "2": { __type: "Component", name: "merged" },
      },
    });
  });

  it("matches a JSON round trip of full and doesn't modify its inputs", () => {
    const fullJson = JSON.stringify(full);
    const partial: Bundle = {
      ...full,
      map: { "1": { __type: "Site", components: [] } },
    };
    const partialJson = JSON.stringify(partial);

    const result = JSON.stringify(pickPartialBundle(full, partial));

    expect(result).toEqual(
      JSON.stringify(pickPartialBundle(JSON.parse(fullJson), partial)),
    );
    expect(JSON.parse(result).map).toEqual({
      "1": { __type: "Site", components: [{ __ref: "2" }] },
    });
    expect(JSON.stringify(full)).toEqual(fullJson);
    expect(JSON.stringify(partial)).toEqual(partialJson);
  });
});
