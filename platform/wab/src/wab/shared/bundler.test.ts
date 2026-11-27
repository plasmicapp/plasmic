/** @vitest-environment node */
import { TEST_GLOBAL_VARIANT } from "@/wab/__testonly__/tpls";
import { bench } from "@/wab/shared/__testonly__/bench";
import {
  loadPlexusBundles,
  loadStarterBundles,
} from "@/wab/shared/__testonly__/project-fixtures";
import {
  Bundle,
  Bundler,
  FastBundler,
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
  removeUnreachableNodesFromBundle,
  visitRefsInFields,
} from "@/wab/shared/bundler";
import { jsonClone, mkUuid } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { jsonLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { observeModel } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import {
  flattenTpls,
  isTplTag,
  mkTplComponentX,
  mkTplTagX,
} from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { instUtil } from "@/wab/shared/model/InstUtil";
import * as classes from "@/wab/shared/model/classes";
import {
  Component,
  CustomCode,
  ObjInst,
  RuleSet,
  Site,
  TplTag,
  ensureKnownComponent,
  ensureKnownTplComponent,
  isKnownComponentArena,
  isKnownProjectDependency,
  isKnownSite,
  ensureKnownTplTag,
} from "@/wab/shared/model/classes";
import { meta } from "@/wab/shared/model/classes-metas";
import {
  Field,
  MetaRuntime,
  isModelInst,
  isStrongRefField,
} from "@/wab/shared/model/model-meta";
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
  it("preserves parent references when unbundling a snapshot", () => {
    const parent = mkTplTagX("div", {}, mkTplTagX("span"));
    const bundle = new Bundler().bundle(parent, mkUuid(), "1-some-version");
    const snapshot = ensureKnownTplTag(new Bundler().unbundleSnapshot(bundle));
    expect(snapshot.children[0].parent).toBe(snapshot);
  });

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

    const prepared = b2.prepareSnapshotBundle({
      ...instanceBundle,
      map: {
        ...instanceBundle.map,
        unused: componentBundle.map[componentBundle.root],
      },
    });
    expect(prepared).toEqual(instanceBundle);
    expect(() => new Bundler().prepareSnapshotBundle(instanceBundle)).toThrow();
    const wrongRef = jsonClone(instanceBundle);
    wrongRef.map[wrongRef.root].component = { __ref: wrongRef.root };
    expect(() => b2.prepareSnapshotBundle(wrongRef)).toThrow(/component/);

    const trackedSize = b2._addr2inst.size;
    const snapshot = ensureKnownTplComponent(
      b2.unbundleSnapshot(instanceBundle),
    );
    expect(cmp.deepEq(instance3, snapshot)).toBe(true);
    expect(snapshot).not.toBe(instance3);
    expect(snapshot.component).toBe(component3);
    expect(b2.addrOf(snapshot)).toBeUndefined();
    expect(b2._addr2inst.size).toBe(trackedSize);

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

const UUID = "site-uuid";

// Give fixture instances stable names for partial updates and error assertions.
function mkSiteBundle(): Bundle {
  const site = createSite();
  const span1 = mkTplTagX("span");
  const span2 = mkTplTagX("span");
  const div = mkTplTagX("div", {}, span1, span2);
  const comp = mkComponent({
    name: "Comp",
    params: [
      mkParam({ name: "p", type: typeFactory.text(), paramType: "prop" }),
    ],
    tplTree: div,
    type: ComponentType.Plain,
  });
  site.components = [comp];
  const bundler = new Bundler();
  const bundle = bundler.bundle(site, UUID, "v");
  const rename = new Map<string, string>();
  for (const [name, inst] of Object.entries({
    comp,
    div,
    span1,
    span2,
    baseVariant: comp.variants[0],
    param: comp.params[0],
  })) {
    rename.set(bundler.addrOf(inst)!.iid, name);
  }
  const counts: Record<string, number> = {};
  for (const [iid, json] of Object.entries(bundle.map)) {
    if (!rename.has(iid)) {
      const n = (counts[json.__type] = (counts[json.__type] ?? -1) + 1);
      rename.set(iid, `${json.__type}${n}`);
    }
  }
  const renamed: Bundle = JSON.parse(
    JSON.stringify(bundle, (key, value) =>
      key === "__ref" || key === "root" ? rename.get(value) : value,
    ),
  );
  renamed.map = Object.fromEntries(
    Object.entries(renamed.map).map(([iid, json]) => [rename.get(iid)!, json]),
  );
  return renamed;
}

function thrownMessage(f: () => unknown) {
  try {
    f();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("Didn't throw");
}

function unbundleSite(bundle: Bundle) {
  const bundler = new Bundler();
  const site = bundler.unbundle(bundle, UUID) as Site;
  const byIid = (iid: string) => bundler.objByAddr({ uuid: UUID, iid })!;
  return { bundler, site, byIid };
}

describe("unbundle", () => {
  it("copies collection fields", () => {
    const bundle = mkSiteBundle();
    const { byIid } = unbundleSite(bundle);
    const component = byIid("comp") as Component;
    const div = byIid("div") as TplTag;
    const rs = byIid("RuleSet0") as RuleSet;
    expect(component.params).not.toBe(bundle.map.comp.params);
    expect(div.children).not.toBe(bundle.map.div.children);
    expect(rs.values).not.toBe(bundle.map.RuleSet0.values);
    expect(rs.values).toEqual(bundle.map.RuleSet0.values);
  });

  it("makes holes in a list undefined", () => {
    const bundle = mkSiteBundle();
    // eslint-disable-next-line no-sparse-arrays
    bundle.map.div.children = [, { __ref: "span1" }];
    const { byIid } = unbundleSite(bundle);
    const children = (byIid("div") as TplTag).children;
    expect(children).toHaveLength(2);
    expect(0 in children).toBe(true);
    expect(children[0]).toBeUndefined();
    expect(children[1]).toBe(byIid("span1"));
  });

  it("keeps a __proto__ key of a map as an own key", () => {
    const bundle = mkSiteBundle();
    bundle.map.RuleSet0.values = JSON.parse(
      '{"__proto__": "a", "width": "1px"}',
    );
    const { byIid } = unbundleSite(bundle);
    const values = (byIid("RuleSet0") as RuleSet).values;
    expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
    expect(Object.keys(values)).toEqual(["__proto__", "width"]);
    expect(values["__proto__"]).toBe("a");
  });

  it.each<[string, (bundle: Bundle) => void, string]>([
    [
      "a missing ref",
      (b) => (b.map.comp.params = [{ __ref: "nope" }]),
      "Value must not be undefined or null- Missing reference (IID nope)",
    ],
    [
      "a missing xref",
      (b) => (b.map.comp.superComp = { __xref: { uuid: "u", iid: "i" } }),
      "Missing xref (u, i) (only know about: )",
    ],
    [
      "an unknown type",
      (b) => (b.map.span1.__type = "NoSuchType"),
      "Unknown type NoSuchType",
    ],
    [
      "an abstract class",
      (b) => (b.map.span1.__type = "TplNode"),
      "Cannot instantiate abstract class TplNode",
    ],
  ])("fails on %s", (_name, corrupt, message) => {
    const bundle = mkSiteBundle();
    corrupt(bundle);
    const bundler = new Bundler();
    expect(thrownMessage(() => bundler.unbundle(bundle, UUID))).toBe(message);
    expect(bundler._addr2inst.size).toBe(0);
  });

  it("fails on a cached inst of another type", () => {
    const bundle = mkSiteBundle();
    const { bundler } = unbundleSite(bundle);
    const partial = { ...bundle, map: { span1: bundle.map.span1 } };
    partial.map.span1 = { ...partial.map.span1, __type: "TplSlot" };
    expect(thrownMessage(() => bundler.unbundlePartial(partial, UUID))).toBe(
      "Cached instance has unexpected type TplTag, expected TplSlot",
    );
  });

  it("generated setters delegate to writeField with their schema field", () => {
    const writeField = vi
      .spyOn(meta, "writeField")
      .mockImplementation(() => undefined);
    for (const cls of meta.schema) {
      if (meta.isAbstract(cls) || !classes[cls.name]) {
        continue;
      }
      const inst = Object.create(classes[cls.name].prototype);
      for (const field of meta.allFields(cls)) {
        if (!field.annotations.includes("Transient")) {
          writeField.mockClear();
          inst[field.name] = "value";
          expect(writeField).toHaveBeenCalledExactlyOnceWith(
            inst,
            field,
            "value",
          );
          expect(writeField.mock.calls[0][1]).toBe(field);
        }
      }
    }
  });

  it.each([
    ["custom classes", new Bundler(meta, { ...classes })],
    ["a custom runtime", new Bundler(new MetaRuntime(meta.schema, 0))],
  ] as const)("uses field setters with %s", (_, bundler) => {
    const bundle = mkSiteBundle();
    const setter = vi.spyOn(TplTag.prototype, "tag", "set");
    bundler.unbundle(bundle, UUID);
    expect(setter).toHaveBeenCalledWith("div");
  });
});

describe("unbundlePartial", () => {
  it("writes only the fields in the bundle, resolving other refs from the cache", () => {
    const bundle = mkSiteBundle();
    const { bundler, byIid } = unbundleSite(bundle);
    const component = byIid("comp") as Component;
    const params = component.params;
    const [span1, span2] = (byIid("div") as TplTag).children;
    bundler.unbundlePartial(
      {
        ...bundle,
        map: {
          comp: { __type: "Component", name: "Renamed" },
          div: {
            ...bundle.map.div,
            children: [{ __ref: "span2" }, { __ref: "span1" }],
          },
        },
      },
      UUID,
    );
    expect(component.name).toBe("Renamed");
    expect(component.params).toBe(params);
    expect((byIid("div") as TplTag).children).toEqual([span2, span1]);
  });

  it("writes new insts first, each changed field once", () => {
    const bundle = mkSiteBundle();
    const { bundler, byIid } = unbundleSite(bundle);
    const div = byIid("div");
    const writes: [ObjInst, string][] = [];
    const writeField = meta.writeField.bind(meta);
    const spy = vi
      .spyOn(meta, "writeField")
      .mockImplementation((inst, field, value) => {
        writes.push([inst as ObjInst, field.name]);
        writeField(inst, field, value);
      });
    try {
      bundler.unbundlePartial(
        {
          ...bundle,
          map: {
            div: {
              ...bundle.map.div,
              children: [...bundle.map.div.children, { __ref: "new" }],
            },
            new: { ...bundle.map.span2, tag: "b" },
          },
        },
        UUID,
      );
    } finally {
      spy.mockRestore();
    }
    const newTag = byIid("new") as TplTag;
    expect(newTag.tag).toBe("b");
    expect(writes.map(([inst, field]) => [inst === div, field])).toEqual([
      // Refs of the new inst. Its other fields come from its constructor.
      [false, "children"],
      [false, "parent"],
      [false, "vsettings"],
      // The collections of the existing inst, which are fresh copies; its
      // unchanged fields, like a null parent, aren't written
      [true, "children"],
      [true, "vsettings"],
    ]);
    expect((div as TplTag).children[2]).toBe(newTag);
  });

  it("records only what changed on a tracked site", () => {
    const bundle = mkSiteBundle();
    const { bundler, site, byIid } = unbundleSite(bundle);
    const changes: string[] = [];
    const tracker = observeModel(site, {
      quiet: true,
      listener: (change) =>
        changes.push(
          `${change.type} ${bundler.addrOf(change.changeNode.inst)?.iid}.${
            change.changeNode.field
          }`,
        ),
    });
    onTestFinished(() => tracker.dispose());
    const partial = {
      ...bundle,
      map: {
        comp: { ...bundle.map.comp, name: "Renamed" },
        div: {
          ...bundle.map.div,
          children: [{ __ref: "span2" }, { __ref: "span1" }],
        },
      },
    };
    bundler.unbundlePartial(jsonClone(partial), UUID);
    expect(changes).toEqual(["update comp.name", "array-splice div.children"]);
    expect((byIid("comp") as Component).name).toBe("Renamed");

    changes.length = 0;
    bundler.unbundlePartial(jsonClone(partial), UUID);
    expect(changes).toEqual([]);
  });
});

describe("check functions", () => {
  it("checkBundleFields reports the first bad item of each field, in order", () => {
    const bundle = mkSiteBundle();
    bundle.map.comp.name = 5;
    bundle.map.comp.params = [
      { __ref: "param" },
      { __ref: "span1" },
      { __ref: "baseVariant" },
    ];
    bundle.map.div.type = "bad";
    bundle.map.div.children = [{ __ref: "baseVariant" }, { __ref: "param" }];
    bundle.map.RuleSet0.values = { a: "1", b: 2, c: 3 };
    bundle.map.span1.vsettings = { a: 1 };
    bundle.map.span2.locked = "yes";
    expect(thrownMessage(() => checkBundleFields(bundle)))
      .toMatchInlineSnapshot(`
        "Type checking error
        - iid: RuleSet0, field: values, error: 2 is not a string
        - iid: span1, field: vsettings, error: [object Object] is not an array
        - iid: span2, field: locked, error: yes is not a boolean
        - iid: div, field: children, error: Wrong type (got Variant, want TplNode)
        - iid: div, field: type, error: "bad" does not match any of the types "text","image","column","columns","other"
        - iid: comp, field: name, error: 5 is not a string
        - iid: comp, field: params, error: Wrong type (got TplTag, want Param)"
      `);
    // Only checks the given iids
    expect(() => checkBundleFields(bundle, ["param", "nope"])).not.toThrow();
    // Every item is checked, not just up to the first bad one, so a null
    // among insts throws, as it always has
    bundle.map.div.children = [{ __ref: "baseVariant" }, null];
    expect(thrownMessage(() => checkBundleFields(bundle))).toBe(
      "Cannot read properties of null (reading '__ref')",
    );
  });

  it("checkBundleFields reports unknown types and fields", () => {
    const bundle = mkSiteBundle();
    bundle.map.comp.params = [{ __ref: "nope" }];
    expect(thrownMessage(() => checkBundleFields(bundle))).toBe(
      "Type checking error\n" +
        '- iid: comp, field: params, error: undefined (referenced by (Param): {"__ref":"nope"}) has unknown type "undefined"',
    );
    bundle.map.div.extra = 1;
    expect(thrownMessage(() => checkBundleFields(bundle))).toMatch(
      /^Unexpected fields on \[TplTag\]:\n\s*\+ extra\s*$/,
    );
  });

  it("checkExistingReferences reports missing refs and xrefs", () => {
    const bundle = mkSiteBundle();
    checkExistingReferences(bundle);
    bundle.map.comp.superComp = { __xref: { uuid: "u", iid: "i" } };
    expect(thrownMessage(() => checkExistingReferences(bundle))).toBe(
      "Missing xref (u, i) (only know about: )",
    );
    bundle.map.comp.params = [{ __ref: "nope" }];
    expect(thrownMessage(() => checkExistingReferences(bundle))).toBe(
      "Missing reference (IID nope)",
    );
  });

  it("checkRefsInBundle reports weak refs to unreachable insts", () => {
    const bundle = mkSiteBundle();
    checkRefsInBundle(bundle);
    // Unlink the div, which the spans still weakly reference as their parent
    bundle.map.comp.tplTree = { __ref: "span1" };
    const report = vi.fn();
    checkRefsInBundle(bundle, { onWeakRefToUnreachableInst: report });
    expect(report).toHaveBeenCalledTimes(1);
    const [{ referencedIid, weakRefParents, strongRefParents }] =
      report.mock.calls[0];
    expect(referencedIid).toBe("div");
    expect(weakRefParents.size).toBe(Object.keys(bundle.map).length);
    expect(weakRefParents.get("div")).toEqual([
      { iid: "span1", field: "parent" },
      { iid: "span2", field: "parent" },
    ]);
    expect(strongRefParents.get("div")).toEqual([]);
    expect(thrownMessage(() => checkRefsInBundle(bundle))).toBe(
      "Unreachable instance has weak refs",
    );
  });

  it("checkRefsInBundle reports strong refs to xrefs", () => {
    const bundle = mkSiteBundle();
    bundle.map.div.children = [{ __xref: { uuid: "u", iid: "i" } }];
    const xrefs: unknown[] = [];
    checkRefsInBundle(bundle, {
      onWeakRefToUnreachableInst: () => undefined,
      onStrongRefToXref: ({ referencedXref }) => xrefs.push(referencedXref),
    });
    expect(xrefs).toEqual([{ uuid: "u", iid: "i" }]);
    expect(thrownMessage(() => checkRefsInBundle(bundle))).toBe(
      "Xref has strong refs",
    );
  });
});

describe("FastBundler", () => {
  it("reports an inst with two parents", () => {
    const bundle = mkSiteBundle();
    bundle.map.span1.children = [{ __ref: "span2" }];
    expect(
      thrownMessage(() =>
        new FastBundler().unbundleAndRecomputeParents(bundle, UUID),
      ),
    ).toMatchInlineSnapshot(`
      "Bundle invariant failed
      Instance (IID span2) of type TplTag has multiple parents:
      (TplTag.children IID:span1), (TplTag.children IID:div)"
    `);
  });

  it("reports an inst referenced twice by one field", () => {
    const bundle = mkSiteBundle();
    bundle.map.div.children = [
      { __ref: "span1" },
      { __ref: "span2" },
      { __ref: "span2" },
    ];
    expect(
      thrownMessage(() =>
        new FastBundler().unbundleAndRecomputeParents(bundle, UUID),
      ),
    ).toBe("parentKey already used: div children");
  });

  it("tracks the parents of each inst", () => {
    const bundle = mkSiteBundle();
    const fastBundler = new FastBundler();
    const site = fastBundler.unbundleAndRecomputeParents(
      jsonClone(bundle),
      UUID,
    ) as Site;
    const parents = (iid: string) => [
      ...((fastBundler as any)._iid2Parents.get(iid) ?? []),
    ];
    expect(parents("span2")).toEqual(["div children"]);
    expect(parents(bundle.root)).toEqual([]);
    // Removing a subtree prunes it from the bundle and the parents
    const div = site.components[0].tplTree as TplTag;
    div.children = div.children.slice(0, 1);
    const result = fastBundler.fastBundle(site, UUID, [
      { inst: div, field: "children" },
    ]);
    expect(result.map.span2).toBeUndefined();
    expect(parents("span2")).toEqual([]);
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
    const [mainUuid, main] = deps[deps.length - 1];

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

    it("unbundle", () => {
      bench(`${fixture}: unbundle all deps`, () => {
        const bundler = new Bundler();
        for (const [uuid, bundle] of deps) {
          bundler.unbundle(bundle, uuid);
        }
      });
    });

    it("unbundleAndRecomputeParents", () => {
      bench(
        `${fixture}: unbundleAndRecomputeParents all deps`,
        (cloned) => {
          const bundler = new FastBundler();
          for (const [uuid, bundle] of cloned) {
            bundler.unbundleAndRecomputeParents(bundle, uuid);
          }
        },
        { setup: () => jsonClone(deps) },
      );
    });

    it("unbundlePartial", () => {
      // A partial bundle like another user's edits of a few components: the
      // insts of 5 components, with some changed fields and new insts
      const bundler = new Bundler();
      for (const [uuid, bundle] of deps) {
        bundler.unbundle(jsonClone(bundle), uuid);
      }
      const back: Bundle = { ...main, map: {} };
      const queue = Object.keys(main.map)
        .filter((iid) => main.map[iid].__type === "Component")
        .slice(0, 5);
      while (queue.length > 0) {
        const iid = queue.pop()!;
        if (iid in back.map || !(iid in main.map)) {
          continue;
        }
        back.map[iid] = jsonClone(main.map[iid]);
        visitRefsInFields(main.map[iid], (ref, field) => {
          if ("__ref" in ref && isStrongRefField(field)) {
            queue.push(ref.__ref);
          }
        });
      }
      const fwd: Bundle = jsonClone(back);
      for (const [iid, json] of Object.entries(fwd.map)) {
        if (json.__type === "Component") {
          json.name += " changed";
        } else if (json.__type === "TplTag") {
          json.children.reverse();
        } else if (json.__type === "RuleSet") {
          json.values = { ...json.values, "z-index": "1" };
        } else if (json.__type === "VariantSetting") {
          fwd.map[`new-${iid}`] = {
            __type: "CustomCode",
            code: '"title"',
            fallback: null,
          };
          json.attrs = { ...json.attrs, title: { __ref: `new-${iid}` } };
        }
      }
      let i = 0;
      bench(
        `${fixture}: unbundlePartial (${Object.keys(back.map).length} insts)`,
        () => bundler.unbundlePartial(i++ % 2 ? back : fwd, mainUuid),
      );
    });

    it("check functions", () => {
      bench(`${fixture}: checkBundleFields`, () => checkBundleFields(main));
      bench(`${fixture}: checkRefsInBundle`, () => checkRefsInBundle(main));
      bench(`${fixture}: checkExistingReferences`, () =>
        checkExistingReferences(main),
      );
      bench(
        `${fixture}: removeUnreachableNodesFromBundle`,
        (cloned) => removeUnreachableNodesFromBundle(cloned),
        { setup: () => jsonClone(main) },
      );
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
