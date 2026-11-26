import { RUN_BENCHMARKS, bench } from "@/wab/shared/__testonly__/bench";
import {
  loadPlexusBundles,
  loadStarterBundles,
} from "@/wab/shared/__testonly__/project-fixtures";
import { generateSiteFromBundle } from "@/wab/shared/__testonly__/site-tests-utils";
import { Bundler } from "@/wab/shared/bundler";
import {
  AssertionError,
  InvalidCodePathError,
  isLiteralObject,
  isPrimitive,
  jsonClone,
  mkUuid,
} from "@/wab/shared/common";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  ObjInst,
  Site,
  ensureKnownSite,
  isKnownProjectDependency,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { isWeakRefField } from "@/wab/shared/model/model-meta";
import { NodeCtx, walkModelTree } from "@/wab/shared/model/model-tree-util";
import { tryMerge } from "@/wab/shared/site-diffs/merge-core";

const loadStarter = () => generateSiteFromBundle(loadStarterBundles());
const loadPlexus = () => generateSiteFromBundle(loadPlexusBundles());

describe("NodeCtx", () => {
  const site = {} as Site;
  const at = (path: string[], node: any = {}) =>
    NodeCtx.at({ site, node, path });

  it("roots a ctx at the site", () => {
    const realSite = loadStarter();
    const root = NodeCtx.root(realSite);
    expect(root.site).toBe(realSite);
    expect(root.node).toBe(realSite);
    expect(root.path()).toEqual([]);
    expect(root.keyedPath()).toEqual([]);
  });

  it("starts a ctx at a given path", () => {
    const node = {};
    const ctx = at(["components", "iid=1"], node);
    expect(ctx.site).toBe(site);
    expect(ctx.node).toBe(node);
    expect(ctx.path()).toEqual(["components", "iid=1"]);
    expect(ctx.keyedPath()).toEqual(["components", "iid=1"]);
  });

  it("reads a child's node from the parent's node", () => {
    const child = {};
    expect(at([], { f: child }).child("f").node).toBe(child);
    expect(
      at([], { f: [1, child] })
        .child("f")
        .child("1").node,
    ).toBe(child);
    expect(at([], undefined).child("f").node).toBeUndefined();
    expect(at([], null).child("f").node).toBeUndefined();
    expect(at([], {}).child("f").child("g").node).toBeUndefined();
  });

  it("gives a child the parent's site", () => {
    expect(at(["a"]).child("f").child("g").site).toBe(site);
  });

  it("uses keys in keyedPath and indexes in path", () => {
    const ctx = at(["components", "3"])
      .child("tplTree")
      .child("children")
      .child("2", "iid=abc")
      .child("vsettings")
      .child("0", "iid=def")
      .child("attrs");
    expect(ctx.path()).toEqual([
      "components",
      "3",
      "tplTree",
      "children",
      "2",
      "vsettings",
      "0",
      "attrs",
    ]);
    expect(ctx.keyedPath()).toEqual([
      "components",
      "3",
      "tplTree",
      "children",
      "iid=abc",
      "vsettings",
      "iid=def",
      "attrs",
    ]);
  });

  it("keeps an empty key, like a key of any other value", () => {
    expect(at([]).child("0", "").keyedPath()).toEqual([""]);
  });

  it("leaves the parent's path unchanged", () => {
    const path = ["a", "b"];
    const parent = at(path);
    parent.child("c", "k").child("d");
    expect(parent.path()).toEqual(["a", "b"]);
    expect(parent.keyedPath()).toEqual(["a", "b"]);
    expect(path).toEqual(["a", "b"]);
  });

  it.each([{ prefix: [] }, { prefix: ["a"] }])(
    "returns fresh paths with root prefix $prefix",
    ({ prefix }) => {
      const parent = at(prefix);
      const ctx = parent.child("b", "key-b");
      ctx.path().push("x");
      ctx.keyedPath().push("x");
      expect(ctx.path()).toEqual([...prefix, "b"]);
      expect(ctx.keyedPath()).toEqual([...prefix, "key-b"]);
      expect(ctx.path()).not.toBe(ctx.path());
      expect(ctx.keyedPath()).not.toBe(ctx.keyedPath());
      expect(parent.path()).toEqual(prefix);
    },
  );
});

describe("walkModelTree", () => {
  const walkWithContexts = (
    ctx: NodeCtx,
    walked: ObjInst[] = [],
  ): ObjInst[] => {
    const val = ctx.node;
    if (isPrimitive(val)) {
      return walked;
    } else if (Array.isArray(val)) {
      val.forEach((_v, i) => walkWithContexts(ctx.child(`${i}`), walked));
    } else if (isLiteralObject(val)) {
      Object.keys(val).forEach((k) => walkWithContexts(ctx.child(k), walked));
    } else if (instUtil.isObjInst(val)) {
      walked.push(val);
      meta
        .allFields(instUtil.getInstClass(val))
        .filter((field) => !isWeakRefField(field))
        .forEach((field) => walkWithContexts(ctx.child(field.name), walked));
    }
    return walked;
  };

  it.each([
    ["starter", loadStarter],
    ["plexus", loadPlexus],
  ])(
    "returns the %s instances in the order a NodeCtx walk reaches them",
    (_name, load) => {
      const site = load();
      const walked = walkModelTree(NodeCtx.root(site));
      const expected = walkWithContexts(NodeCtx.root(site));
      expect(walked[0]).toBe(site);
      expect(walked.length).toBe(expected.length);
      expect(walked.findIndex((inst, i) => inst !== expected[i])).toBe(-1);
    },
  );

  it("does not follow weak references", () => {
    const site = loadStarter();
    const walked = walkModelTree(NodeCtx.root(site));
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
      walkModelTree(
        NodeCtx.at<ObjInst>({ site: {} as Site, node: undefined, path: [] }),
      );
    expect(walk).toThrow(AssertionError);
    expect(walk).toThrow("inst must be defined");
  });

  it("throws an InvalidCodePathError on a value that is not part of the model", () => {
    const site = loadStarter();
    site.components[0].metadata = { k: new Date(0) } as any;
    expect(() => walkModelTree(NodeCtx.root(site))).toThrow(
      InvalidCodePathError,
    );
  });
});

describe("benchmarks", () => {
  it.each([
    ["starter", loadStarter],
    ["plexus", loadPlexus],
  ])("walkModelTree(%s)", (name, load) => {
    const site = load();
    bench(`walkModelTree(${name})`, () => {
      walkModelTree(NodeCtx.root(site));
    });
  });

  // One branch edits every component and the other edits every component's
  // root, so the merge takes both sides' changes without conflicts. Merges
  // skip components whose updatedAt is unchanged.
  const editComponents = (site: Site, updatedAt: number) =>
    site.components.forEach((component) => {
      component.metadata = { ...component.metadata, bench: "left" };
      component.updatedAt = updatedAt;
    });
  const editRoots = (site: Site, updatedAt: number) =>
    site.components.forEach((component) => {
      const vs = component.tplTree.vsettings[0];
      vs.rs.values = { ...vs.rs.values, "margin-top": "123px" };
      component.updatedAt = updatedAt;
    });

  describe.each([
    ["starter", loadStarterBundles, it],
    // Plexus merges take about a second, so only run them to print timings.
    ["plexus", loadPlexusBundles, it.skipIf(!RUN_BENCHMARKS)],
  ] as const)("tryMerge(%s)", (name, loadBundles, maybeIt) => {
    const runMerge = (
      label: string,
      edit?: (left: Site, right: Site) => void,
    ) => {
      const bundles = loadBundles();
      const deps = bundles.slice(0, -1);
      const [, siteBundle] = bundles[bundles.length - 1];
      const setup = () => {
        const bundler = new Bundler();
        deps.forEach(([uuid, bundle]) =>
          bundler.unbundle(jsonClone(bundle), uuid),
        );
        const freshSite = () => {
          const inst = bundler.unbundle(jsonClone(siteBundle), mkUuid());
          return ensureKnownSite(
            isKnownProjectDependency(inst) ? inst.site : inst,
          );
        };
        const ancestor = freshSite();
        const left = freshSite();
        const right = freshSite();
        const merged = freshSite();
        edit?.(left, right);
        return { ancestor, left, right, merged, bundler };
      };
      return bench(
        `${label} tryMerge(${name})`,
        ({ ancestor, left, right, merged, bundler }) =>
          tryMerge(ancestor, left, right, merged, bundler, undefined),
        { setup },
      );
    };

    maybeIt("no-op", () => {
      expect(runMerge("no-op").status).toBe("merged");
    });

    maybeIt("edited components", () => {
      const result = runMerge("edited components", (left, right) => {
        editComponents(left, 1);
        editRoots(right, 2);
      });
      expect(result.status).toBe("merged");
      expect(result.mergedSite.components).not.toHaveLength(0);
      result.mergedSite.components.forEach((component) => {
        expect(component.metadata.bench).toBe("left");
        expect(component.tplTree.vsettings[0].rs.values["margin-top"]).toBe(
          "123px",
        );
      });
    });
  });
});
