import { arrayReplaceAt } from "@/wab/shared/collections";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import {
  ChangeRecorder,
  ModelChange,
  observeModel,
} from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import {
  Component,
  CustomCode,
  Mixin,
  ObjectPath,
  Site,
  TplNode,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import {
  ensureBaseVariantSetting,
  ensureVariantSetting,
} from "@/wab/shared/Variants";
import { omit } from "lodash";
import { autorun, Lambda } from "mobx";

/**
 * A site with one component, whose root tpl has no children. `mkTag` makes a
 * tpl with a base variant setting, to add to the tree.
 */
function mkSite() {
  const site = createSite();
  let base: Variant | undefined;
  const component: Component = mkComponent({
    name: "Component",
    type: ComponentType.Plain,
    tplTree: (baseVariant) => {
      base = baseVariant;
      const tag = mkTplTagX("div", { name: "root" });
      ensureVariantSetting(tag, [baseVariant]);
      return tag;
    },
  });
  site.components = [...site.components, component];
  const root = component.tplTree as TplTag;
  const mkTag = (name: string, parent?: TplNode) => {
    const tag = mkTplTagX("div", { name });
    ensureVariantSetting(tag, [
      ensure(base, "mkComponent made a base variant"),
    ]);
    tag.parent = parent ?? null;
    return tag;
  };
  // The path to a field of the root tpl starts with these
  const rootPath = [
    { inst: site, field: "components" },
    { inst: component, field: "tplTree" },
  ];
  return { site, component, root, mkTag, rootPath };
}

const vs = (tpl: TplNode) => ensureBaseVariantSetting(tpl);

function mkCode(code: string) {
  return new CustomCode({ code, fallback: null });
}

function mkMixin(name: string) {
  return new Mixin({
    name,
    rs: mkRuleSet({}),
    preview: undefined,
    uuid: name,
    forTheme: false,
    variantedRs: [],
  });
}

describe("observeModel", () => {
  const testSite = (
    site: Site,
    doWork: (prune: Lambda) => void,
    checkEvents: (
      events: ModelChange[],
      dispose: Lambda,
      prune: Lambda,
    ) => void,
  ) => {
    const events: ModelChange[] = [];
    const tracker = observeModel(site, {
      listener: (event) => events.push(event),
    });
    const dispose = () => tracker.dispose();
    const prune = () => tracker.prune();
    doWork(prune);
    prune();
    checkEvents(events, dispose, prune);
    dispose();
  };

  it("should work with primitive fields", () => {
    const { site, root, rootPath } = mkSite();

    testSite(
      site,
      () => {
        root.name = "ohhai";
        root.tag = "img";
      },
      (events, dispose) => {
        expect(events.length).toEqual(2);
        expect(events[0]).toMatchObject({
          path: [...rootPath, { inst: root, field: "name" }],
          changeNode: { inst: root, field: "name" },
          type: "update",
          oldValue: "root",
          newValue: "ohhai",
        });
        expect(events[1]).toMatchObject({
          path: [...rootPath, { inst: root, field: "tag" }],
          changeNode: { inst: root, field: "tag" },
          type: "update",
          oldValue: "div",
          newValue: "img",
        });

        // disposal also works
        events.length = 0;
        dispose();

        root.name = "what";
        root.tag = "okay";
        expect(events.length).toEqual(0);
      },
    );
  });

  it("should work with instance fields", () => {
    const { site, root, rootPath } = mkSite();
    const rootVs = vs(root);
    const vsPath = [
      ...rootPath,
      { inst: root, field: "vsettings" },
      { inst: rootVs, field: "dataCond" },
    ];
    const firstCode = mkCode("hello");
    const secondCode = mkCode("another one");

    testSite(
      site,
      (prune) => {
        // Setting a rich field
        rootVs.dataCond = firstCode;

        // Setting a field of rich field object
        firstCode.code = "goodbye";

        // Setting a rich field to another object
        rootVs.dataCond = secondCode;

        // New object's updates are automatically tracked as well
        secondCode.code = "another one 2";

        // But the removed object is no longer tracked
        prune();
        firstCode.code = "invisible";
      },
      (events, dispose) => {
        expect(events.length).toBe(4);

        expect(events[0]).toMatchObject({
          type: "update",
          path: vsPath,
          changeNode: { inst: rootVs, field: "dataCond" },
          newValue: firstCode,
        });

        expect(events[1]).toMatchObject({
          type: "update",
          path: [...vsPath, { inst: firstCode, field: "code" }],
          changeNode: { inst: firstCode, field: "code" },
          oldValue: "hello",
          newValue: "goodbye",
        });

        expect(events[2]).toMatchObject({
          type: "update",
          path: vsPath,
          changeNode: { inst: rootVs, field: "dataCond" },
          oldValue: firstCode,
          newValue: secondCode,
        });

        expect(events[3]).toMatchObject({
          type: "update",
          path: [...vsPath, { inst: secondCode, field: "code" }],
          changeNode: { inst: secondCode, field: "code" },
          oldValue: "another one",
          newValue: "another one 2",
        });

        events.length = 0;
        dispose();
        secondCode.code = "no one cares";
        rootVs.dataCond = mkCode("no one cares here either");
        firstCode.code = "definitely no one cares";
        expect(events.length).toBe(0);
      },
    );
  });

  it("should work with array fields", () => {
    const { site, root, mkTag, rootPath } = mkSite();
    const fontsPath = [{ inst: site, field: "userManagedFonts" }];
    const childrenPath = [...rootPath, { inst: root, field: "children" }];
    const ohhaiChild = mkTag("OHHAI", root);
    const whyNotChild = mkTag("Why not", root);
    const yesNotChild = mkTag("Yes not", root);
    const replaceChild = mkTag("replaced!", root);

    testSite(
      site,
      (prune) => {
        // primitive array
        site.userManagedFonts = [...site.userManagedFonts, "my-font"];
        site.userManagedFonts = [
          ...site.userManagedFonts,
          "favorite",
          "favorites2",
        ];
        site.userManagedFonts = site.userManagedFonts.filter(
          (n) => n !== "my-font",
        );
        site.userManagedFonts = arrayReplaceAt(
          site.userManagedFonts,
          1,
          "whatevs",
        );

        // rich array
        // add single
        root.children = [...root.children, ohhaiChild];
        // add multiple
        root.children = [whyNotChild, yesNotChild, ...root.children];
        // setting array element
        root.children = arrayReplaceAt(root.children, 1, replaceChild);
        // setting array element prop
        ohhaiChild.name = "ohhai 2";
        // setting array element prop of new element
        replaceChild.name = "replaced! 2";
        // remove item
        root.children = root.children.filter((c) => c !== ohhaiChild);
        prune();
        ohhaiChild.name = "OHHAI 2";
      },
      (events, dispose) => {
        expect(events.length).toBe(10);

        expect(events[0]).toMatchObject({
          path: fontsPath,
          changeNode: { inst: site, field: "userManagedFonts" },
          type: "array-splice",
          index: 0,
          object: ["my-font"],
          added: ["my-font"],
          removed: [],
        });

        expect(events[1]).toMatchObject({
          path: fontsPath,
          type: "array-splice",
          index: 1,
          object: ["my-font", "favorite", "favorites2"],
          added: ["favorite", "favorites2"],
          removed: [],
        });

        expect(events[2]).toMatchObject({
          path: fontsPath,
          type: "array-splice",
          index: 0,
          object: ["favorite", "favorites2"],
          added: [],
          removed: ["my-font"],
        });

        // Replacing an item is a splice of that item
        expect(events[3]).toMatchObject({
          path: fontsPath,
          type: "array-splice",
          index: 1,
          object: ["favorite", "whatevs"],
          added: ["whatevs"],
          removed: ["favorites2"],
        });

        expect(events[4]).toMatchObject({
          path: childrenPath,
          changeNode: { inst: root, field: "children" },
          type: "array-splice",
          index: 0,
          object: [ohhaiChild],
          added: [ohhaiChild],
        });

        expect(events[5]).toMatchObject({
          path: childrenPath,
          type: "array-splice",
          index: 0,
          object: [whyNotChild, yesNotChild, ohhaiChild],
          added: [whyNotChild, yesNotChild],
        });

        expect(events[6]).toMatchObject({
          path: childrenPath,
          type: "array-splice",
          index: 1,
          object: [whyNotChild, replaceChild, ohhaiChild],
          added: [replaceChild],
          removed: [yesNotChild],
        });

        expect(events[7]).toMatchObject({
          path: [...childrenPath, { inst: ohhaiChild, field: "name" }],
          changeNode: { inst: ohhaiChild, field: "name" },
          type: "update",
          oldValue: "OHHAI",
          newValue: "ohhai 2",
        });

        expect(events[8]).toMatchObject({
          path: [...childrenPath, { inst: replaceChild, field: "name" }],
          changeNode: { inst: replaceChild, field: "name" },
          type: "update",
          oldValue: "replaced!",
          newValue: "replaced! 2",
        });

        expect(events[9]).toMatchObject({
          path: childrenPath,
          type: "array-splice",
          index: 2,
          added: [],
          removed: [ohhaiChild],
        });

        dispose();
        events.length = 0;
        replaceChild.name = "blahblah";
        root.children = [...root.children, mkTag("blah2", root)];
        expect(events.length).toBe(0);
      },
    );
  });

  it("should work with two arrays referencing same elements", () => {
    const { site, root } = mkSite();
    const mixin = mkMixin("mixin");
    const rs = vs(root).rs;

    testSite(
      site,
      () => {
        // site.mixins owns the mixin, and rs.mixins only refers to it
        site.mixins = [...site.mixins, mixin];
        rs.mixins = [...rs.mixins, mixin];
        const removed = rs.mixins.slice(0, 1);
        rs.mixins = rs.mixins.slice(1);
        rs.mixins = [...removed, ...rs.mixins];

        mixin.name = "mixin 2";
      },
      (events) => {
        expect(events.length).toBe(5);
        // The change is reported through the owner only
        expect(events[4]).toMatchObject({
          path: [
            { inst: site, field: "mixins" },
            { inst: mixin, field: "name" },
          ],
          newValue: "mixin 2",
        });
      },
    );
  });

  it("should work with map fields", () => {
    const { site, root, rootPath } = mkSite();
    const rootVs = vs(root);
    const attrsPath = [
      ...rootPath,
      { inst: root, field: "vsettings" },
      { inst: rootVs, field: "attrs" },
    ];
    const myClass = mkCode("my-class");
    const yupCode = mkCode("Yup");
    const yup = new ObjectPath({ path: ["yup"], fallback: yupCode });
    const nope = new ObjectPath({ path: ["nope"], fallback: mkCode("Nope") });

    testSite(
      site,
      () => {
        rootVs.attrs = { ...rootVs.attrs, className: myClass };
        rootVs.attrs = { ...rootVs.attrs, stuff: yup };
        yupCode.code = "Yup 2";
        rootVs.attrs = { ...rootVs.attrs, stuff: nope };
        rootVs.attrs = omit(rootVs.attrs, "className");
      },
      (events, dispose) => {
        expect(events.length).toBe(5);

        expect(events[0]).toMatchObject({
          type: "obj-add",
          path: attrsPath,
          changeNode: { inst: rootVs, field: "attrs" },
          object: { className: myClass },
          key: "className",
          newValue: myClass,
        });

        expect(events[1]).toMatchObject({
          type: "obj-add",
          path: attrsPath,
          object: { className: myClass, stuff: yup },
          key: "stuff",
          newValue: yup,
        });

        expect(events[2]).toMatchObject({
          type: "update",
          path: [
            ...attrsPath,
            { inst: yup, field: "fallback" },
            { inst: yupCode, field: "code" },
          ],
          changeNode: { inst: yupCode, field: "code" },
          oldValue: "Yup",
          newValue: "Yup 2",
        });

        expect(events[3]).toMatchObject({
          type: "obj-update",
          path: attrsPath,
          object: { className: myClass, stuff: nope },
          key: "stuff",
          newValue: nope,
          oldValue: yup,
        });

        expect(events[4]).toMatchObject({
          type: "obj-delete",
          path: attrsPath,
          object: { stuff: nope },
          key: "className",
          oldValue: myClass,
        });

        dispose();
        events.length = 0;
        rootVs.attrs = { ...rootVs.attrs, stuff: mkCode("Nope 2") };
        rootVs.attrs = omit(rootVs.attrs, "stuff");
        expect(events.length).toBe(0);
      },
    );
  });

  it("reports assigning a collection as the difference", () => {
    const { site, root, mkTag, rootPath } = mkSite();
    const rootVs = vs(root);
    const a = mkTag("a", root);
    const b = mkTag("b", root);
    const c = mkTag("c", root);
    const d = mkTag("d", root);
    root.children = [a, b, d];
    const x = mkCode("x");
    const y = mkCode("y");
    rootVs.attrs = { x };

    testSite(
      site,
      (prune) => {
        root.children = [a, c, b, d];
        // Assigning an equal array changes nothing
        root.children = [...root.children];
        rootVs.attrs = { y, z: x };
        // Removing several items reports each run of removed items
        root.children = root.children.filter(
          (child) => child !== a && child !== b,
        );
        prune();
        // The removed children are no longer tracked; the kept ones are
        a.name = "invisible";
        c.name = "c 2";
      },
      (events) => {
        expect(events.map((e) => e.type)).toEqual([
          "array-splice",
          "obj-delete",
          "obj-add",
          "obj-add",
          "array-splice",
          "array-splice",
          "update",
        ]);
        expect(events[0]).toMatchObject({
          changeNode: { inst: root, field: "children" },
          index: 1,
          added: [c],
          removed: [],
        });
        expect(events[1]).toMatchObject({
          changeNode: { inst: rootVs, field: "attrs" },
          key: "x",
          oldValue: x,
        });
        expect(events[2]).toMatchObject({ key: "y", newValue: y });
        expect(events[3]).toMatchObject({ key: "z", newValue: x });
        expect(events[4]).toMatchObject({ index: 0, added: [], removed: [a] });
        expect(events[5]).toMatchObject({ index: 1, added: [], removed: [b] });
        expect(events[6]).toMatchObject({
          path: [
            ...rootPath,
            { inst: root, field: "children" },
            { inst: c, field: "name" },
          ],
          newValue: "c 2",
        });
      },
    );
  });

  it("keeps the old collection when assigned an equal one", () => {
    const { site, root, mkTag } = mkSite();
    const rootVs = vs(root);
    const a = mkTag("a", root);
    const x = mkCode("x");
    const y = mkCode("y");
    root.children = [a];
    rootVs.attrs = { x, y };
    const children = root.children;
    const attrs = rootVs.attrs;

    testSite(
      site,
      () => {
        let runs = 0;
        const dispose = autorun(() => {
          void root.children;
          void rootVs.attrs;
          runs++;
        });
        root.children = [...children];
        rootVs.attrs = { ...attrs };
        expect(root.children).toBe(children);
        expect(rootVs.attrs).toBe(attrs);
        expect(runs).toBe(1);
        // Reordering keys isn't a change either
        rootVs.attrs = { y, x };
        expect(rootVs.attrs).toBe(attrs);
        expect(runs).toBe(1);
        // A different item is
        root.children = [];
        expect(runs).toBe(2);
        // Null in place of undefined isn't, as both mean an absent value
        expect(rootVs.dataCond).toBeUndefined();
        rootVs.dataCond = null;
        expect(rootVs.dataCond).toBeUndefined();
        dispose();
      },
      (events) => {
        expect(events.map((e) => e.type)).toEqual(["array-splice"]);
      },
    );
  });

  it("freezes collections under test, so they can't change in place", () => {
    const { site, root, mkTag } = mkSite();
    const rootVs = vs(root);
    const a = mkTag("a", root);

    testSite(
      site,
      () => {
        expect(() => (root.children as TplNode[]).push(a)).toThrow(TypeError);
        expect(() => {
          (rootVs.attrs as Record<string, CustomCode>)["x"] = mkCode("x");
        }).toThrow(TypeError);
      },
      (events) => {
        expect(events).toEqual([]);
      },
    );
  });

  it("undoes assigning a collection", () => {
    const { site, root, mkTag } = mkSite();
    const rootVs = vs(root);
    const a = mkTag("a", root);
    const b = mkTag("b", root);
    const c = mkTag("c", root);
    const x = mkCode("x");
    root.children = [a, c];
    rootVs.attrs = { x };
    const recorder = new ChangeRecorder({ site });

    expect(() =>
      recorder.withRecording(() => {
        root.children = [b, a];
        rootVs.attrs = { y: mkCode("y") };
        throw new Error();
      }),
    ).toThrow();

    expect(root.children).toEqual([a, c]);
    expect(rootVs.attrs).toEqual({ x });
  });

  it("reports changes through an inst's owner, wherever it moves", () => {
    const { site, root, mkTag, rootPath } = mkSite();
    const a = mkTag("a", root);
    const b = mkTag("b", root);
    root.children = [a, b];
    const moved = mkTag("moved", a);
    a.children = [moved];
    const mixin = mkMixin("mixin");
    site.mixins = [mixin];
    const childPath = (parent: TplTag) => [
      ...rootPath,
      { inst: root, field: "children" },
      { inst: parent, field: "children" },
      { inst: moved, field: "name" },
    ];
    const mixinPath = [
      { inst: site, field: "mixins" },
      { inst: mixin, field: "name" },
    ];

    testSite(
      site,
      () => {},
      (events, dispose, prune) => {
        moved.name = "moved 2";
        expect(events).toMatchObject([{ path: childPath(a) }]);

        // Moving it to another parent changes its path
        a.children = [];
        b.children = [moved];
        moved.parent = b;
        events.length = 0;
        prune();
        moved.name = "moved 3";
        expect(events).toMatchObject([{ path: childPath(b) }]);

        // Referring to an inst weakly doesn't give it another path, ...
        vs(moved).rs.mixins = [mixin];
        events.length = 0;
        prune();
        mixin.name = "mixin 2";
        expect(events).toMatchObject([{ path: mixinPath }]);

        // ... and removing the weak reference doesn't affect its path
        vs(moved).rs.mixins = [];
        events.length = 0;
        prune();
        mixin.name = "mixin 3";
        expect(events).toMatchObject([{ path: mixinPath }]);

        // Once nothing owns it, its changes are no longer reported
        b.children = [];
        events.length = 0;
        prune();
        moved.name = "moved 4";
        expect(events.length).toBe(0);
      },
    );
  });

  it("disposes indirect references", () => {
    const { site, root, mkTag } = mkSite();
    const child = mkTag("child", root);
    root.children = [child];
    const childVs = vs(child);
    const expr = mkCode("expr");
    childVs.dataCond = expr;
    const attrExpr = mkCode("attr");
    childVs.attrs = { ...childVs.attrs, attr: attrExpr };

    testSite(
      site,
      () => {},
      (events, dispose, prune) => {
        events.length = 0;
        prune();
        expr.code = "expr 2";
        attrExpr.code = "attr 2";
        expect(events.length).toBe(2);

        // Detach the child from the tree
        root.children = root.children.filter((c) => c !== child);
        events.length = 0;
        prune();

        expr.code = "expr 3";
        attrExpr.code = "attr 3";
        expect(events.length).toBe(0);
      },
    );
  });

  it("untracks an inst whose last parent is untracked after it was checked", () => {
    const { site, root, mkTag } = mkSite();
    const parent1 = mkTag("parent1", root);
    const parent2 = mkTag("parent2", root);
    const parent3 = mkTag("parent3", root);
    const child = mkTag("child", parent1);
    root.children = [parent1, parent2, parent3];

    testSite(
      site,
      () => {},
      (events, dispose, prune) => {
        // The model is briefly invalid within a change, with three parents
        // holding the child
        parent2.children = [child];
        parent3.children = [child];
        parent1.children = [child];
        // Removed in this order, the child is checked after parent1 is
        // untracked but before parent2 is
        root.children = [parent2, parent3];
        parent3.children = [];
        root.children = [parent3];
        prune();

        events.length = 0;
        child.name = "renamed";
        expect(events.length).toBe(0);
      },
    );
  });

  it("tracks a subtree again when it is attached again", () => {
    const { site, root, mkTag } = mkSite();
    const child = mkTag("child", root);
    root.children = [child];
    const value = mkCode("value");
    const expr = new ObjectPath({ path: ["value"], fallback: value });
    vs(child).attrs = { attr: expr };

    testSite(
      site,
      () => {},
      (events, dispose, prune) => {
        events.length = 0;
        prune();
        value.code = "value 2";
        expect(events.length).toBe(1);
        expect(events[0].path).toBeDefined();

        // detach child
        root.children = root.children.filter((c) => c !== child);
        events.length = 0;
        prune();
        value.code = "value 3";
        expect(events.length).toBe(0);

        // add it again
        root.children = [...root.children, child];
        events.length = 0;
        prune();
        value.code = "value 4";
        expect(events.length).toBe(1);
        expect(events[0].path).toBeDefined();

        // detach again
        root.children = root.children.filter((c) => c !== child);
        events.length = 0;
        prune();
        value.code = "value 5";
        expect(events.length).toBe(0);
      },
    );
  });

  it("The change recorder should be transactional", () => {
    const { site, root, mkTag } = mkSite();
    const child1 = mkTag("child1", root);
    const child2 = mkTag("child2", root);
    root.children = [child1];
    const expr = mkCode("expr");
    vs(child1).attrs = { key: expr };
    const mixin = mkMixin("mixin");
    site.mixins = [mixin];

    const recorder = new ChangeRecorder({ site });

    const doWork = (fail: boolean) => {
      root.children = [...root.children, child2];
      vs(child1).attrs = omit(vs(child1).attrs, "key");
      vs(child2).rs.mixins = [...vs(child2).rs.mixins, mixin];
      if (fail) {
        throw new Error();
      }
      vs(child2).attrs = { ...vs(child2).attrs, key4: expr };
    };

    expect(() => recorder.withRecording(() => doWork(true))).toThrow();

    // Check that all changes have been undone
    expect(root.children.length).toBe(1);
    expect(vs(child1).attrs["key"]).toBe(expr);
    expect(vs(child2).rs.mixins).toEqual([]);
    expect(vs(child2).attrs["key4"]).toBe(undefined);

    // Now do the changes without throwing
    expect(recorder.withRecording(() => doWork(false)).changes.length).toBe(4);

    expect(root.children.length).toBe(2);
    expect(vs(child1).attrs["key"]).toBe(undefined);
    expect(vs(child2).rs.mixins).toEqual([mixin]);
    expect(vs(child2).attrs["key4"]).toBe(expr);
  });
});
