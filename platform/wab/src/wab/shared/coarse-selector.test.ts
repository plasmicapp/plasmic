import { arrayRemoveAt } from "@/wab/shared/collections";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import { flattenTpls, mkTplTagX } from "@/wab/shared/core/tpls";
import mobx from "@/wab/shared/import-mobx";
import {
  coarseComputed,
  componentSelector,
  maybeComputedFn,
  siteSelector,
} from "@/wab/shared/mobx-util";
import {
  Component,
  ObjInst,
  Site,
  TplNode,
  TplTag,
  Variant,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { ModelInst } from "@/wab/shared/model/model-meta";
import {
  InternalTrackedModelInst,
  setFieldAtomBudget,
} from "@/wab/shared/model/tracking";
import L from "lodash";

function appendChildren(tpl: TplTag, ...children: TplNode[]) {
  tpl.children = [...tpl.children, ...children];
}

function removeChildAt(tpl: TplTag, index: number) {
  tpl.children = arrayRemoveAt(tpl.children, index);
}

function appendComponents(site: Site, ...components: Component[]) {
  site.components = [...site.components, ...components];
}

function setColor(tpl: TplTag, color: string) {
  const rs = tpl.vsettings[0].rs;
  rs.values = { ...rs.values, color };
}

function mkTestTag(name: string, baseVariant: Variant, ...children: TplTag[]) {
  // Having styles makes it have a VariantSetting
  return mkTplTagX(
    "div",
    { name, baseVariant, styles: { display: "block" } },
    ...children,
  );
}

function mkTestComponent(name: string) {
  return mkComponent({
    name,
    type: ComponentType.Plain,
    tplTree: (baseVariant) =>
      mkTestTag(
        `${name} root`,
        baseVariant,
        mkTestTag(`${name} child`, baseVariant),
      ),
  });
}

function mkTestSite() {
  const site = createSite();
  const compA = mkTestComponent("A");
  const compB = mkTestComponent("B");
  appendComponents(site, compA, compB);
  return { site, compA, compB };
}

function mkRecorder(site: Site) {
  return new ChangeRecorder({
    site,
  });
}

function setup() {
  const { site, compA, compB } = mkTestSite();
  const recorder = mkRecorder(site);
  return { site, compA, compB, recorder };
}

function tplRoot(component: Component) {
  const root = component.tplTree;
  return ensure(isKnownTplTag(root) ? root : undefined, "Expected a TplTag");
}

function tplChild(component: Component) {
  const child = tplRoot(component).children[0];
  return ensure(isKnownTplTag(child) ? child : undefined, "Expected a TplTag");
}

function tplName(tpl: TplNode) {
  return isKnownTplTag(tpl) ? tpl.name : undefined;
}

/** Everything that a selector that walks the whole tree would read */
function deepRead(tplTree: TplNode) {
  return flattenTpls(tplTree).map((tpl) => [
    tplName(tpl),
    tpl.vsettings.map((vs) => [
      Object.entries(vs.rs.values),
      Object.keys(vs.attrs),
      vs.variants.map((v) => v.name),
    ]),
  ]);
}

function ownedInsts(component: Component): ObjInst[] {
  return [
    component,
    ...flattenTpls(component.tplTree).flatMap((tpl) => [
      tpl,
      ...tpl.vsettings.flatMap((vs) => [vs, vs.rs]),
    ]),
  ];
}

function trackingState(inst: ModelInst) {
  return (inst as InternalTrackedModelInst).$s;
}

function countFieldAtoms(insts: ObjInst[]) {
  let count = 0;
  for (const inst of insts) {
    const atoms = trackingState(inst)?.atoms;
    for (const key of atoms?.keys() ?? []) {
      if (key !== "$scope") {
        count++;
      }
    }
  }
  return count;
}

/** Wraps `fn` in a coarse selector of a Component, counting its runs */
function countingComponentSelector<T>(fn: (component: Component) => T) {
  const counter = { runs: 0 };
  const selector = componentSelector((component: Component) => {
    counter.runs++;
    return fn(component);
  });
  return { selector, counter };
}

describe("coarseSelector", () => {
  beforeAll(() => {
    mobx.configure({ enforceActions: "never" });
  });

  it("recomputes after a change deep inside its component only", () => {
    const { compA, compB, recorder } = setup();
    const { selector, counter } = countingComponentSelector((c) =>
      deepRead(c.tplTree),
    );

    selector(compA);
    selector(compA);
    expect(counter.runs).toBe(1);

    // Field write
    tplChild(compA).name = "renamed";
    expect(selector(compA)[1][0]).toBe("renamed");
    expect(counter.runs).toBe(2);

    // Array push
    appendChildren(tplChild(compA), mkTestTag("pushed", compA.variants[0]));
    expect(selector(compA).map(([name]) => name)).toContain("pushed");
    expect(counter.runs).toBe(3);

    // Map write and delete
    setColor(tplChild(compA), "red");
    expect(JSON.stringify(selector(compA))).toContain("red");
    expect(counter.runs).toBe(4);
    const rs = tplChild(compA).vsettings[0].rs;
    rs.values = L.omit(rs.values, "color");
    expect(JSON.stringify(selector(compA))).not.toContain("red");
    expect(counter.runs).toBe(5);

    // The Component's own fields are in its scope too
    compA.name = "A2";
    selector(compA);
    expect(counter.runs).toBe(6);

    // Changes elsewhere
    tplChild(compB).name = "other";
    setColor(tplChild(compB), "blue");
    selector(compA);
    expect(counter.runs).toBe(6);

    recorder.dispose();
  });

  it("recomputes a site selector after a change anywhere it read", () => {
    const { site, compA, compB, recorder } = setup();
    let runs = 0;
    const selector = siteSelector((s: Site) => {
      runs++;
      return s.components.map((c) => deepRead(c.tplTree));
    });

    selector(site);
    selector(site);
    expect(runs).toBe(1);

    tplChild(compA).name = "renamed A";
    expect(selector(site)[0][1][0]).toBe("renamed A");
    expect(runs).toBe(2);

    setColor(tplChild(compB), "blue");
    expect(JSON.stringify(selector(site)[1])).toContain("blue");
    expect(runs).toBe(3);

    // A site-level change
    const compC = mkTestComponent("C");
    appendComponents(site, compC);
    expect(selector(site).length).toBe(3);
    expect(runs).toBe(4);

    recorder.dispose();
  });

  it("does not recompute a site selector that read no component after a component change", () => {
    const { site, compA, recorder } = setup();
    let runs = 0;
    const selector = siteSelector((s: Site) => {
      runs++;
      return s.styleTokens.map((t) => t.name);
    });

    selector(site);
    tplChild(compA).name = "renamed";
    selector(site);
    expect(runs).toBe(1);

    // A site-level change
    site.pageWrapper = compA;
    selector(site);
    expect(runs).toBe(2);

    recorder.dispose();
  });

  it("chains site selectors to component selectors", () => {
    const { site, compA, compB, recorder } = setup();
    const perComponent = countingComponentSelector((c) =>
      flattenTpls(c.tplTree).map(tplName),
    );
    let siteRuns = 0;
    const selector = siteSelector((s: Site) => {
      siteRuns++;
      return s.components.flatMap((c) => perComponent.selector(c));
    });

    expect(selector(site)).toEqual(["A root", "A child", "B root", "B child"]);
    expect(perComponent.counter.runs).toBe(2);

    tplChild(compB).name = "B kid";
    expect(selector(site)).toEqual(["A root", "A child", "B root", "B kid"]);
    // Only B was recomputed
    expect(perComponent.counter.runs).toBe(3);
    expect(siteRuns).toBe(2);
    expect(countFieldAtoms([...ownedInsts(compA), ...ownedInsts(compB)])).toBe(
      0,
    );

    recorder.dispose();
  });

  it("allocates no field atoms on the insts it reads", () => {
    const { site, compA, compB, recorder } = setup();
    const selector = siteSelector((s: Site) =>
      s.components.map((c) => [c.name, c.params.length, deepRead(c.tplTree)]),
    );
    selector(site);

    const insts = [site, ...ownedInsts(compA), ...ownedInsts(compB)];
    expect(insts.length).toBeGreaterThan(10);
    expect(countFieldAtoms(insts)).toBe(0);
    // One scope atom per component and per tpl tree, and one for the rest of
    // the site
    for (const scopeRoot of [
      site,
      compA,
      compA.tplTree,
      compB,
      compB.tplTree,
    ]) {
      expect([...(trackingState(scopeRoot)?.atoms?.keys() ?? [])]).toEqual([
        "$scope",
      ]);
    }

    // The same reads in a fine-grained selector do allocate atoms
    const fineSelector = maybeComputedFn((c: Component) => deepRead(c.tplTree));
    fineSelector(compA);
    expect(countFieldAtoms(ownedInsts(compA))).toBeGreaterThan(10);
    expect(countFieldAtoms(ownedInsts(compB))).toBe(0);

    recorder.dispose();
  });

  it("keeps the tpl tree of a component apart from the rest of it", () => {
    const { compA, compB, recorder } = setup();
    // Like a selector of A that looks at the components that A instantiates
    const { selector, counter } = countingComponentSelector((c) => ({
      names: flattenTpls(c.tplTree).map(tplName),
      otherName: compB.name,
      otherParams: compB.params.map((p) => p.variable.name),
    }));
    selector(compA);

    tplChild(compB).name = "renamed";
    setColor(tplRoot(compB), "blue");
    selector(compA);
    expect(counter.runs).toBe(1);

    compB.name = "B2";
    expect(selector(compA).otherName).toBe("B2");
    expect(counter.runs).toBe(2);

    // A tree that stops being the root of a component stops being a scope
    const oldRoot = tplRoot(compA);
    const oldChild = tplChild(compA);
    recorder.withRecording(() => {
      const newRoot = mkTestTag("new root", compA.variants[0]);
      compA.tplTree = newRoot;
      appendChildren(newRoot, oldRoot);
      oldRoot.parent = newRoot;
    });
    expect(selector(compA).names).toEqual(["new root", "A root", "A child"]);
    oldRoot.name = "old root";
    oldChild.name = "grandchild";
    expect(selector(compA).names).toEqual([
      "new root",
      "old root",
      "grandchild",
    ]);

    recorder.dispose();
  });

  it("lets a fine-grained computed first evaluated inside it track its own reads", () => {
    const { compA, recorder } = setup();
    let fineRuns = 0;
    const fine = maybeComputedFn((tpl: TplTag) => {
      fineRuns++;
      return tpl.name;
    });
    const { selector, counter } = countingComponentSelector((c) => [
      c.name,
      fine(tplChild(c)),
    ]);

    expect(selector(compA)).toEqual(["A", "A child"]);
    const child = tplChild(compA);
    expect([...(trackingState(child)?.atoms?.keys() ?? [])]).toEqual(["name"]);

    // Read the fine-grained one on its own after a write that it depends on
    child.name = "renamed";
    expect(fine(child)).toBe("renamed");
    expect(fineRuns).toBe(2);
    expect(selector(compA)).toEqual(["A", "renamed"]);
    expect(counter.runs).toBe(2);

    // A write it does not depend on invalidates only the coarse one
    setColor(child, "red");
    expect(fine(child)).toBe("renamed");
    expect(fineRuns).toBe(2);
    selector(compA);
    expect(counter.runs).toBe(3);

    recorder.dispose();
  });

  it("is fresh in the middle of a recording", () => {
    const { site, compA, recorder } = setup();
    const perComponent = countingComponentSelector((c) =>
      flattenTpls(c.tplTree).map(tplName),
    );
    const selector = siteSelector((s: Site) =>
      s.components.flatMap((c) => perComponent.selector(c)),
    );
    selector(site);

    recorder.withRecording(() => {
      mobx.runInAction(() => {
        const added = mkTestTag("added", compA.variants[0]);
        appendChildren(tplRoot(compA), added);
        expect(selector(site)).toContain("added");

        added.name = "added and renamed";
        expect(selector(site)).toContain("added and renamed");

        const compC = mkTestComponent("C");
        appendComponents(site, compC);
        expect(selector(site)).toContain("C child");
        tplChild(compC).name = "C kid";
        expect(selector(site)).toContain("C kid");
      });
    });

    recorder.dispose();
  });

  it("is not left stale by edits to a detached subtree", () => {
    const { site, compA, compB, recorder } = setup();
    // Reads the tpl through a reference that survives detaching it
    const child = tplChild(compA);
    let runs = 0;
    const selector = siteSelector((s: Site, tpl: TplTag) => {
      runs++;
      return [s.components.length, tpl.name, tpl.children.length];
    });
    expect(selector(site, child)).toEqual([2, "A child", 0]);

    recorder.withRecording(() => {
      removeChildAt(tplRoot(compA), 0);
      // Detached, and not pruned yet
      child.name = "detached";
      expect(selector(site, child)).toEqual([2, "detached", 0]);
      appendChildren(child, mkTestTag("grandchild", compA.variants[0]));
      expect(selector(site, child)).toEqual([2, "detached", 1]);

      // Attach it somewhere else
      appendChildren(tplRoot(compB), child);
      child.name = "moved";
      expect(selector(site, child)).toEqual([2, "moved", 1]);
    });
    child.name = "moved and renamed";
    expect(selector(site, child)).toEqual([2, "moved and renamed", 1]);
    const runsBefore = runs;
    tplRoot(compA).name = "unrelated";
    selector(site, child);
    expect(runs).toBe(runsBefore);

    // Deleted for good
    recorder.withRecording(() => {
      removeChildAt(tplRoot(compB), 1);
      expect(selector(site, child)).toEqual([2, "moved and renamed", 1]);
    });
    child.name = "deleted";
    expect(selector(site, child)).toEqual([2, "deleted", 1]);

    recorder.dispose();
  });

  it("observes an inst it was handed that is not tracked yet", () => {
    const { site, compA, recorder } = setup();
    let runs = 0;
    const selector = siteSelector((s: Site, tpl: TplTag) => {
      runs++;
      return [
        s.components.length,
        tpl.name,
        tpl.vsettings.map((vs) => vs.rs.values["color"]),
      ];
    });
    const fresh = mkTestTag("fresh", compA.variants[0]);
    expect(selector(site, fresh)).toEqual([2, "fresh", [undefined]]);

    // Still being built
    fresh.name = "built";
    expect(selector(site, fresh)).toEqual([2, "built", [undefined]]);
    const vs = fresh.vsettings[0];
    fresh.vsettings = [];
    expect(selector(site, fresh)).toEqual([2, "built", []]);
    fresh.vsettings = [vs];
    expect(selector(site, fresh)).toEqual([2, "built", [undefined]]);

    // Attached
    appendChildren(tplRoot(compA), fresh);
    vs.rs.values = { ...vs.rs.values, color: "red" };
    expect(selector(site, fresh)).toEqual([2, "built", ["red"]]);
    fresh.name = "attached";
    expect(selector(site, fresh)).toEqual([2, "attached", ["red"]]);

    // The tracked insts that it read were still observed coarsely
    expect(countFieldAtoms([site])).toBe(0);
    const runsBefore = runs;
    tplChild(compA).name = "unrelated";
    selector(site, fresh);
    // Once it is tracked, the inst is in the scope of A's tree
    expect(runs).toBe(runsBefore + 1);

    recorder.dispose();
  });

  it("just computes when nothing tracks the insts", () => {
    const { site, compA } = mkTestSite();
    const { selector, counter } = countingComponentSelector((c) =>
      deepRead(c.tplTree),
    );
    let siteRuns = 0;
    const siteSel = siteSelector((s: Site) => {
      siteRuns++;
      return s.components.map((c) => selector(c));
    });

    selector(compA);
    selector(compA);
    expect(counter.runs).toBe(2);
    siteSel(site);
    siteSel(site);
    expect(siteRuns).toBe(2);

    tplChild(compA).name = "renamed";
    expect(selector(compA)[1][0]).toBe("renamed");
    expect(countFieldAtoms([site, ...ownedInsts(compA)])).toBe(0);
    expect(trackingState(compA)).toBeUndefined();

    // Once tracking stops, it stops caching too
    const recorder = mkRecorder(site);
    const runsBefore = counter.runs;
    selector(compA);
    selector(compA);
    expect(counter.runs).toBe(runsBefore + 1);
    recorder.dispose();
    selector(compA);
    selector(compA);
    expect(counter.runs).toBe(runsBefore + 3);
  });

  it("supports coarse computeds with custom equality", () => {
    const { compA, recorder } = setup();
    let outerRuns = 0;
    const names = coarseComputed(
      () => flattenTpls(compA.tplTree).map(tplName),
      { equals: mobx.comparer.shallow },
    );
    const outer = mobx.computed(
      () => {
        outerRuns++;
        return names.get().join();
      },
      { keepAlive: true },
    );
    expect(outer.get()).toBe("A root,A child");
    setColor(tplChild(compA), "red");
    expect(outer.get()).toBe("A root,A child");
    expect(outerRuns).toBe(1);
    tplChild(compA).name = "kid";
    expect(outer.get()).toBe("A root,kid");
    expect(outerRuns).toBe(2);
    expect(countFieldAtoms(ownedInsts(compA))).toBe(0);

    recorder.dispose();
  });

  it("warns about a fine-grained derivation that allocates many atoms", () => {
    const { compA, recorder } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setFieldAtomBudget(5);
    try {
      const { selector } = countingComponentSelector((c) =>
        deepRead(c.tplTree),
      );
      selector(compA);
      expect(warn).not.toHaveBeenCalled();

      const fine = maybeComputedFn((c: Component) => deepRead(c.tplTree));
      fine(compA);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("more than 5 model field atoms");
    } finally {
      setFieldAtomBudget(5000);
      warn.mockRestore();
    }

    recorder.dispose();
  });
});
