/** @vitest-environment node */
import { TEST_GLOBAL_VARIANT } from "@/wab/__testonly__/tpls";
import { bench } from "@/wab/shared/__testonly__/bench";
import {
  loadPlexusBundles,
  loadStarterBundles,
} from "@/wab/shared/__testonly__/project-fixtures";
import { Bundle, Bundler, FastBundler } from "@/wab/shared/bundler";
import { jsonClone, mkUuid } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { jsonLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import {
  flattenTpls,
  isTplTag,
  mkTplComponentX,
  mkTplTagX,
} from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { instUtil } from "@/wab/shared/model/InstUtil";
import {
  Component,
  CustomCode,
  ObjInst,
  Site,
  TplTag,
  ensureKnownComponent,
  ensureKnownTplComponent,
  isKnownComponentArena,
  isKnownProjectDependency,
  isKnownSite,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import { Field, MetaRuntime, isModelInst } from "@/wab/shared/model/model-meta";
import { conformsToType, typeFactory } from "@/wab/shared/model/model-util";

// Equality comparator that uses class metadata to guide its crawling
export class Comparator {
  _rt: MetaRuntime;
  constructor(rt = meta) {
    this._rt = rt;
  }
  deepEq(x, y) {
    return instUtil.deepEquals(x, y);
  }
}

describe("bundler", () => {
  it("should work", function () {
    const component = mkComponent({
      name: "Component",
      tplTree: mkTplTagX("div"),
      params: [
        mkParam({
          name: "className",
          type: typeFactory.text(),
          paramType: "prop",
        }),
      ],
      type: ComponentType.Plain,
    });

    const instance = mkTplComponentX({
      component,
      args: { className: jsonLit("my-class") },
      baseVariant: TEST_GLOBAL_VARIANT,
    });
    const b = new Bundler();
    const componentUuid = mkUuid();
    const componentBundle = b.bundle(
      component,
      componentUuid,
      "1-some-version",
    );
    const instanceUuid = mkUuid();
    const instanceBundle = b.bundle(instance, instanceUuid, "1-some-version");
    expect(componentBundle).toEqual(jsonClone(componentBundle));
    expect(instanceBundle).toEqual(jsonClone(instanceBundle));

    const instance2 = b.unbundle(instanceBundle, instanceUuid);
    expect(instance2).toBe(instance);
    const component2 = b.unbundle(componentBundle, componentUuid);
    expect(component2).toBe(component);
    expect(b.bundle(component, componentUuid, "1-some-version")).toEqual(
      componentBundle,
    );
    expect(b.bundle(instance, instanceUuid, "1-some-version")).toEqual(
      instanceBundle,
    );
    expect(instance.component).toBe(component);

    const b2 = new Bundler();
    expect(() => b2.unbundle(instanceBundle, instanceUuid)).toThrow();
    expect(b2._addr2inst).toBeEmpty();
    expect(b2._uid2addr).toBeEmpty();

    const component3 = ensureKnownComponent(
      b2.unbundle(jsonClone(componentBundle), componentUuid),
    );
    expect(component3).not.toBe(component);
    const instance3 = ensureKnownTplComponent(
      b2.unbundle(jsonClone(instanceBundle), instanceUuid),
    );
    expect(instance3).not.toBe(instance);
    const cmp = new Comparator();
    expect(cmp.deepEq(component, component3)).toBe(true);
    expect(cmp.deepEq(instance, instance3)).toBe(true);
    expect(cmp.deepEq(component, instance)).toBe(false);
    expect(instance3.component).toBe(component3);

    component3.params = [
      ...component3.params,
      mkParam({
        name: "className2",
        type: typeFactory.text(),
        paramType: "prop",
      }),
    ];
  });
});

function mkTestComponent(name = "Component") {
  return mkComponent({
    name,
    tplTree: (base) =>
      mkTplTagX("div", { baseVariant: base, attrs: { title: "hello" } }),
    type: ComponentType.Plain,
  });
}

function nonTransientFieldNames(inst: ObjInst) {
  return meta
    .allFields(instUtil.getInstClass(inst))
    .filter((f) => !f.annotations.includes("Transient"))
    .map((f) => f.name);
}

describe("Bundler.bundle", () => {
  it.each<[string, (c: Component) => void, string]>([
    [
      "a top-level value",
      (c) => ((c as any).name = 5),
      "Expected type string for field Component.name value 5",
    ],
    [
      "a boxed string",
      // eslint-disable-next-line no-new-wrappers
      (c) => ((c as any).name = new String("x")),
      "Expected type string for field Component.name value x",
    ],
    [
      "a boxed number",
      // eslint-disable-next-line no-new-wrappers
      (c) => ((c as any).updatedAt = new Number(5)),
      "Expected type number | null | undefined for field Component.updatedAt value 5",
    ],
    [
      "a List element",
      (c) => ((c as any).variants = [...c.variants, "x"]),
      "Expected type ReadonlyArray<Variant> for field Component.variants value [object Object],x",
    ],
    [
      "a Map value",
      (c) => ((c as any).metadata = { a: 5 }),
      "Expected type Readonly<Record<string, string>> for field Component.metadata value [object Object]",
    ],
    [
      "an Optional value",
      (c) => ((c as any).updatedAt = "x"),
      "Expected type number | null | undefined for field Component.updatedAt value x",
    ],
    [
      "an Or value",
      (c) => ((c as any).type = "bogus"),
      'Expected type "plain" | "page" | "code" | "frame" for field Component.type value bogus',
    ],
    [
      "an Or of Optionals value",
      (c) => (((c.tplTree as TplTag).vsettings[0] as any).dataCond = "x"),
      "Expected type CustomCode | null | undefined | ObjectPath | null | undefined for field VariantSetting.dataCond value x",
    ],
    [
      "a non-inst value of an inst field",
      (c) => ((c as any).tplTree = "x"),
      "Expected type TplNode for field Component.tplTree value x",
    ],
    [
      // Checks run depth first, so the tplTree's invalid name is found
      // before Component.updatedAt, which comes after tplTree.
      "several values, reporting the first one visited",
      (c) => {
        (c as any).updatedAt = "x";
        (c.tplTree as any).name = 5;
      },
      "Expected type string | null | undefined for field TplTag.name value 5",
    ],
  ])("throws on an invalid type in %s", (_name, corrupt, message) => {
    const component = mkTestComponent();
    corrupt(component);
    expect(() => new Bundler().bundle(component, mkUuid(), "v")).toThrow(
      message,
    );
  });

  it.each<[string, (c: Component) => void, string]>([
    [
      "null in a Map field",
      (c) => ((c as any).metadata = null),
      "Cannot convert undefined or null to object",
    ],
    [
      "null in an inst field",
      (c) => ((c as any).tplTree = null),
      "Cannot read properties of null (reading 'constructor')",
    ],
  ])("throws a TypeError on %s", (_name, corrupt, message) => {
    const component = mkTestComponent();
    corrupt(component);
    expect(() => new Bundler().bundle(component, mkUuid(), "v")).toThrow(
      new TypeError(message),
    );
  });

  it("lists insts by ascending uid, with fields in order and __type last", () => {
    const component = mkTestComponent();
    const bundler = new Bundler();
    const uuid = mkUuid();
    const bundle = bundler.bundle(component, uuid, "v");
    const insts = Object.keys(bundle.map).map((iid) =>
      bundler.objByAddr({ uuid, iid }),
    );
    const uids = insts.map((inst) => inst!.uid);
    expect(uids).toEqual([...uids].sort((a, b) => a - b));
    for (const [iid, json] of Object.entries(bundle.map)) {
      const inst = bundler.objByAddr({ uuid, iid })!;
      expect(Object.keys(json)).toEqual([
        ...nonTransientFieldNames(inst),
        "__type",
      ]);
      expect(json.__type).toBe(instUtil.getInstClassName(inst));
    }
    expect(bundle.root).toBe(bundler.addrOf(component)!.iid);
  });

  it("excludes Transient fields without type checking them", () => {
    const bundler = new Bundler();
    const { root, uuid, site } = unbundleDeps(bundler, loadStarterBundles());
    const arena = site.componentArenas.find(isKnownComponentArena)!;
    (arena as any)._focusedFrame = "x";
    const json = bundler.bundle(root, uuid, "v").map[
      bundler.addrOf(arena)!.iid
    ];
    expect(json).not.toHaveProperty("_focusedFrame");
  });

  it("keeps Map key order and an own __proto__ key", () => {
    const component = mkTestComponent();
    (component as any).metadata = {
      b: "1",
      a: "2",
      "10": "3",
      "2": "4",
      ...JSON.parse('{"__proto__": "5"}'),
    };
    const bundler = new Bundler();
    const uuid = mkUuid();
    const bundle = bundler.bundle(component, uuid, "v");
    const metadata = bundle.map[bundler.addrOf(component)!.iid].metadata;
    expect(Object.keys(metadata)).toEqual(["2", "10", "b", "a", "__proto__"]);
    expect(Object.getPrototypeOf(metadata)).toBe(Object.prototype);
    expect(metadata.__proto__).toBe("5");
  });

  it("makes sparse arrays dense, with holes as undefined", () => {
    const component = mkTestComponent();
    (component as any).figmaMappings = new Array(2);
    const bundler = new Bundler();
    const bundle = bundler.bundle(component, mkUuid(), "v");
    const mappings = bundle.map[bundler.addrOf(component)!.iid].figmaMappings;
    expect(mappings).toStrictEqual([undefined, undefined]);
  });

  it("references external insts with xrefs and lists deps by referencing uid", () => {
    const bundler = new Bundler();
    const [uuidA, uuidB, uuidPage] = [mkUuid(), mkUuid(), mkUuid()];
    const componentA = mkTestComponent("A");
    const componentB = mkTestComponent("B");
    bundler.bundle(componentA, uuidA, "v");
    bundler.bundle(componentB, uuidB, "v");
    // tplB has the lower uid, but tplA is visited first
    const tplB = mkTplComponentX({
      component: componentB,
      baseVariant: TEST_GLOBAL_VARIANT,
    });
    const tplA = mkTplComponentX({
      component: componentA,
      baseVariant: TEST_GLOBAL_VARIANT,
    });
    const page = mkTplTagX("div", {}, [tplA, tplB]);
    tplA.parent = page;
    tplB.parent = page;

    const bundle = bundler.bundle(page, uuidPage, "v");
    expect(bundle.deps).toEqual([uuidB, uuidA]);
    expect(bundle.map[bundler.addrOf(tplA)!.iid].component).toEqual({
      __xref: { uuid: uuidA, iid: bundler.addrOf(componentA)!.iid },
    });
    expect(bundle.map[bundler.addrOf(page)!.iid].children).toEqual([
      { __ref: bundler.addrOf(tplA)!.iid },
      { __ref: bundler.addrOf(tplB)!.iid },
    ]);
    expect(Object.keys(bundle.map)).not.toContain(
      bundler.addrOf(componentA)!.iid,
    );
  });

  it("gives addrs to new insts", () => {
    const component = mkTestComponent();
    const bundler = new Bundler();
    const uuid = mkUuid();
    const first = bundler.bundle(component, uuid, "v");
    const tree = component.tplTree as TplTag;
    const child = mkTplTagX("span");
    child.parent = tree;
    tree.children = [child];
    expect(bundler.addrOf(child)).toBeUndefined();

    const second = bundler.bundle(component, uuid, "v");
    const addr = bundler.addrOf(child)!;
    expect(addr.uuid).toBe(uuid);
    expect(bundler.objByAddr(addr)).toBe(child);
    expect(second.map[addr.iid].__type).toBe("TplTag");
    expect(second.map[bundler.addrOf(tree)!.iid].children).toEqual([
      { __ref: addr.iid },
    ]);
    expect(Object.keys(second.map)).toHaveLength(
      Object.keys(first.map).length + 1,
    );
  });
});

describe("FastBundler.fastBundle", () => {
  it("prunes removed instances before type checking their changes", () => {
    const component = mkTestComponent();
    const uuid = mkUuid();
    const bundle = new Bundler().bundle(component, uuid, "v");
    const bundler = new FastBundler();
    const root = bundler.unbundleAndRecomputeParents(bundle, uuid) as Component;
    const vs = root.tplTree.vsettings[0];
    const title = vs.attrs.title as CustomCode;
    const iid = bundler.addrOf(title)!.iid;
    (title as any).code = 5;
    vs.attrs = {};

    const updated = bundler.fastBundle(root, uuid, [
      { inst: title, field: "code" },
      { inst: vs, field: "attrs" },
    ]);
    expect(updated.map[iid]).toBeUndefined();
    expect(updated).toEqual(bundler.bundle(root, uuid, "v"));
  });

  it("validates reachable fields and skips transient fields", () => {
    const bundler = new FastBundler();
    const { root, uuid, site } = unbundleDeps(bundler, loadStarterBundles());
    const arena = site.componentArenas.find(isKnownComponentArena)!;
    (arena as any)._focusedFrame = "x";
    bundler.fastBundle(root, uuid, [{ inst: arena, field: "_focusedFrame" }]);
    expect(
      bundler.cachedBundle()!.map[bundler.addrOf(arena)!.iid],
    ).not.toHaveProperty("_focusedFrame");

    const tpl = flattenTpls(site.components[0].tplTree).find(isTplTag)!;
    (tpl as any).name = 5;
    expect(() =>
      bundler.fastBundle(root, uuid, [{ inst: tpl, field: "tag" }]),
    ).toThrow("Expected type string | null | undefined for field TplTag.name");
  });
});

describe("benchmarks", () => {
  [10000 /*, 100000, 1000000*/].forEach((n) => {
    it(`should measure performance of unbundle and bundle operations [n=${n}]`, function () {
      const uuid = mkUuid();
      const bundle = mkLargeBundle(uuid, n);
      const instanceCount = Object.keys(bundle.map).length;
      expect(instanceCount).toBeGreaterThanOrEqual(n);

      const { b, unbundledRoot } = bench(`unbundle (n=${n})`, () => {
        const unbundler = new Bundler();
        return {
          b: unbundler,
          unbundledRoot: unbundler.unbundle(bundle, uuid),
        };
      });

      expect(unbundledRoot).toBeDefined();
      expect(b._addr2inst.size).toEqual(instanceCount);

      const rebundled = bench(`bundle (n=${n})`, () =>
        b.bundle(unbundledRoot, uuid, bundle.version),
      );

      expect(rebundled).toEqual(bundle);
      expect(Object.keys(rebundled.map)).toHaveLength(instanceCount);
    });
  });

  describe.each([
    ["starter", loadStarterBundles],
    ["plexus", loadPlexusBundles],
  ] as const)("%s", (fixture, loadDeps) => {
    const deps = loadDeps();

    it("bundle(site)", () => {
      const bundler = new Bundler();
      const { root, uuid } = unbundleDeps(bundler, deps);
      const expected = deps[deps.length - 1][1];
      const bundle = bench(`${fixture}: bundle(site)`, () =>
        bundler.bundle(root, uuid, expected.version),
      );
      expect(bundle).toStrictEqual(expected);
    });

    it.each([true, false])(
      "fastBundle(site) after changing every TplTag, skipInvariants=%s",
      (skipInvariants) => {
        const bundler = new FastBundler();
        const { root, uuid, site } = unbundleDeps(bundler, deps);
        const prevSkipInvariants = DEVFLAGS.skipInvariants;
        DEVFLAGS.skipInvariants = skipInvariants;
        try {
          let round = 0;
          bench(
            `${fixture}: fastBundle(site) after changing every TplTag, skipInvariants=${skipInvariants}`,
            (changes) => bundler.fastBundle(root, uuid, changes),
            { setup: () => changeTpls(site, ++round) },
          );
          expect(bundler.cachedBundle()).toEqual(
            bundler.bundle(root, uuid, bundler.cachedBundle()!.version),
          );
        } finally {
          DEVFLAGS.skipInvariants = prevSkipInvariants;
        }
      },
    );

    it("conformsToType on every field value", () => {
      const { site } = unbundleDeps(new Bundler(), deps);
      // Every non-Transient field value of every inst reachable from the site
      const checks: [any, Field][] = [];
      const seen = new Set<ObjInst>();
      const visit = (inst: ObjInst) => {
        if (seen.has(inst)) {
          return;
        }
        seen.add(inst);
        for (const f of meta.allFields(instUtil.getInstClass(inst))) {
          if (f.annotations.includes("Transient")) {
            continue;
          }
          const val = inst[f.name];
          checks.push([val, f]);
          const vals = Array.isArray(val)
            ? val
            : val && val.constructor === Object
              ? Object.values(val)
              : [val];
          for (const v of vals) {
            if (isModelInst(v)) {
              visit(v as ObjInst);
            }
          }
        }
      };
      visit(site);
      bench(`${fixture}: conformsToType on every field value`, () => {
        for (const [val, f] of checks) {
          if (!conformsToType(val, f.type, instUtil)) {
            throw new Error(`${f.name} doesn't conform`);
          }
        }
      });
    });
  });
});

function unbundleDeps(bundler: Bundler, deps: [string, Bundle][]) {
  for (const [uuid, bundle] of deps.slice(0, -1)) {
    bundler.unbundle(jsonClone(bundle), uuid);
  }
  const [uuid, bundle] = deps[deps.length - 1];
  const root =
    bundler instanceof FastBundler
      ? bundler.unbundleAndRecomputeParents(jsonClone(bundle), uuid)
      : bundler.unbundle(jsonClone(bundle), uuid);
  const site = isKnownProjectDependency(root) ? root.site : root;
  if (!isKnownSite(site)) {
    throw new Error("Could not extract site from bundle");
  }
  return { root, uuid, site };
}

function changeTpls(site: Site, round: number) {
  const changes: { inst: ObjInst; field: string }[] = [];
  for (const component of site.components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      if (!isTplTag(tpl)) {
        continue;
      }
      tpl.name = `tpl${round}`;
      changes.push({ inst: tpl, field: "name" });
      const vs = tpl.vsettings[0];
      if (vs) {
        vs.rs.values = { ...vs.rs.values, opacity: `0.${round}` };
        changes.push({ inst: vs.rs, field: "values" });
        vs.attrs = {
          ...vs.attrs,
          title: new CustomCode({ code: `"${round}"`, fallback: null }),
        };
        changes.push({ inst: vs, field: "attrs" });
      }
    }
  }
  return changes;
}

function mkLargeBundle(uuid: string, instances: number) {
  // Generate a single large component
  const largeComponent = mkComponent({
    name: "LargeComponent",
    tplTree: mkNestedTpls(instances),
    params: [
      mkParam({
        name: "prop1",
        type: typeFactory.text(),
        paramType: "prop",
      }),
      mkParam({
        name: "prop2",
        type: typeFactory.num(),
        paramType: "prop",
      }),
    ],
    type: ComponentType.Plain,
  });

  // Bundle the component
  const b = new Bundler();
  const bundle = b.bundle(largeComponent, uuid, "1.0.0");

  return bundle;
}

function mkNestedTpls(instances: number): TplTag {
  const tag = mkTplTagX("div");

  // Split remaining instances evenly among 3 children
  const instancesPerChild = Math.floor((instances - 1) / 3);
  const instancesRemaining = (instances - 1) % 3;
  const children: TplTag[] = [];
  if (instancesPerChild > 0) {
    children.push(mkNestedTpls(instancesPerChild));
    children.push(mkNestedTpls(instancesPerChild));
  }
  if (instancesPerChild + instancesRemaining > 0) {
    children.push(mkNestedTpls(instancesPerChild + instancesRemaining));
  }
  tag.children = [...tag.children, ...children];

  return tag;
}
