import { Bundler } from "@/wab/shared/bundler";
import {
  AssertionError,
  InvalidCodePathError,
  isLiteralObject,
  isPrimitive,
} from "@/wab/shared/common";
import { instUtil } from "@/wab/shared/model/InstUtil";
import { ObjInst, Site, ensureKnownSite } from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { isWeakRefField } from "@/wab/shared/model/model-meta";
import {
  NodeFieldCtx,
  createNodeCtx,
  nextCtx,
  walkModelTree,
} from "@/wab/shared/model/model-tree-util";
import { readFileSync } from "fs";

describe("nextCtx", () => {
  const site = {} as Site;
  const ctx = (
    path: string[],
    keyPath?: (string | undefined)[],
    node: any = {},
  ): NodeFieldCtx =>
    keyPath === undefined
      ? { site, node, path }
      : { site, node, path, keyPath };

  it("returns site, node, path and keyPath, in that key order", () => {
    const next = nextCtx(ctx(["a"], ["x"], { f: 1 }), "f", "k");
    expect(Object.keys(next)).toEqual(["site", "node", "path", "keyPath"]);
    expect(next.site).toBe(site);
  });

  it("reads node[field], or undefined when there is no node", () => {
    const child = {};
    expect(nextCtx(ctx([], [], { f: child }), "f").node).toBe(child);
    expect(nextCtx(ctx([], [], undefined), "f").node).toBeUndefined();
  });

  it("appends the field to a copy of path", () => {
    const parent = ctx(["a", "b"]);
    const next = nextCtx(parent, "c");
    expect(next.path).toEqual(["a", "b", "c"]);
    expect(next.path).not.toBe(parent.path);
  });

  // toStrictEqual fails when keyPath has holes (missing indexes).
  // toEqual does not.
  it.each([
    ["missing", ["a", "b"], undefined, [undefined, undefined, "k"]],
    ["empty", ["a", "b"], [], [undefined, undefined, "k"]],
    [
      "shorter than path",
      ["a", "b", "c"],
      ["x"],
      ["x", undefined, undefined, "k"],
    ],
    ["as long as path", ["a", "b"], ["x", "y"], ["x", "y", "k"]],
  ])(
    "pads a keyPath that is %s with undefined to the path length, then appends key",
    (_shape, path, keyPath, expected) => {
      expect(nextCtx(ctx(path, keyPath), "f", "k").keyPath).toStrictEqual(
        expected,
      );
    },
  );

  it("keeps keyPath entries past the end of path", () => {
    expect(
      nextCtx(ctx(["a"], ["x", "y", "z"]), "f", "k").keyPath,
    ).toStrictEqual(["x", "y", "z", "k"]);
  });

  it("turns holes in keyPath into undefined entries", () => {
    // eslint-disable-next-line no-sparse-arrays
    const sparse = [, "y", , "w"];
    expect(
      nextCtx(ctx(["a", "b", "c", "d"], sparse), "f", "k").keyPath,
    ).toStrictEqual([undefined, "y", undefined, "w", "k"]);
  });

  it("appends undefined when no key is given", () => {
    expect(nextCtx(ctx(["a"], ["x"]), "f").keyPath).toStrictEqual([
      "x",
      undefined,
    ]);
  });

  it("leaves the incoming context unchanged", () => {
    const path = ["a", "b"];
    const keyPath = ["x"];
    const parent = ctx(path, keyPath);
    nextCtx(parent, "c", "k");
    expect(parent).toStrictEqual({ site, node: {}, path, keyPath });
    expect(path).toStrictEqual(["a", "b"]);
    expect(keyPath).toStrictEqual(["x"]);
  });
});

describe("walkModelTree", () => {
  const loadStarter = () => {
    const tuples: [string, any][] = JSON.parse(
      readFileSync(
        "src/wab/shared/web-exporter/bundles/starter-project-desktop-first.json",
        "utf8",
      ),
    );
    const bundler = new Bundler();
    const roots = tuples.map(([uuid, bundle]) =>
      bundler.unbundle(bundle, uuid),
    );
    return ensureKnownSite(roots[roots.length - 1]);
  };

  const walkWithContexts = (
    ctx: NodeFieldCtx,
    walked: ObjInst[] = [],
  ): ObjInst[] => {
    const val = ctx.node;
    if (isPrimitive(val)) {
      return walked;
    } else if (Array.isArray(val)) {
      val.forEach((_v, i) => walkWithContexts(nextCtx(ctx, `${i}`), walked));
    } else if (isLiteralObject(val)) {
      Object.keys(val).forEach((k) =>
        walkWithContexts(nextCtx(ctx, k), walked),
      );
    } else if (instUtil.isObjInst(val)) {
      walked.push(val);
      meta
        .allFields(instUtil.getInstClass(val))
        .filter((field) => !isWeakRefField(field))
        .forEach((field) => walkWithContexts(nextCtx(ctx, field.name), walked));
    }
    return walked;
  };

  it("returns the instances in the order a nextCtx walk reaches them", () => {
    const site = loadStarter();
    const walked = walkModelTree(createNodeCtx(site));
    const expected = walkWithContexts(createNodeCtx(site));
    expect(walked[0]).toBe(site);
    expect(walked.length).toBe(expected.length);
    expect(walked.findIndex((inst, i) => inst !== expected[i])).toBe(-1);
  });

  it("does not follow weak references", () => {
    const site = loadStarter();
    const walked = walkModelTree(createNodeCtx(site));
    expect(site.projectDependencies).not.toHaveLength(0);
    // site.activeTheme is a weak reference to a theme in site.themes. If the
    // walk followed weak references, that theme would appear twice.
    site.projectDependencies.forEach((dep) => {
      expect(walked).not.toContain(dep);
      expect(walked).not.toContain(dep.site);
    });
    expect(new Set(walked).size).toBe(walked.length);
  });

  it("throws an AssertionError when the context has no node", () => {
    const walk = () =>
      walkModelTree({ node: undefined, site: {} as Site, path: [] });
    expect(walk).toThrow(AssertionError);
    expect(walk).toThrow("inst must be defined");
  });

  it("throws an InvalidCodePathError on a value that is not part of the model", () => {
    const site = loadStarter();
    site.components[0].metadata = { k: new Date(0) } as any;
    expect(() => walkModelTree(createNodeCtx(site))).toThrow(
      InvalidCodePathError,
    );
  });
});
