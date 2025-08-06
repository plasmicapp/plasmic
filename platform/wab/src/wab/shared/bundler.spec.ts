/** @jest-environment node */
import { Bundler } from "@/wab/shared/bundler";
import { jsonClone, mkUuid } from "@/wab/shared/common";
import { Comparator } from "@/wab/shared/core/cmp";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { jsonLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { mkTplComponentX, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  ensureKnownComponent,
  ensureKnownTplComponent,
  TplTag,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { TEST_GLOBAL_VARIANT } from "@/wab/test/tpls";

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
      "1-some-version"
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
      componentBundle
    );
    expect(b.bundle(instance, instanceUuid, "1-some-version")).toEqual(
      instanceBundle
    );
    expect(instance.component).toBe(component);

    const b2 = new Bundler();
    expect(() => b2.unbundle(instanceBundle, instanceUuid)).toThrow();
    expect(b2._addr2inst).toBeEmpty();
    expect(b2._uid2addr).toBeEmpty();

    const component3 = ensureKnownComponent(
      b2.unbundle(jsonClone(componentBundle), componentUuid)
    );
    expect(component3).not.toBe(component);
    const instance3 = ensureKnownTplComponent(
      b2.unbundle(jsonClone(instanceBundle), instanceUuid)
    );
    expect(instance3).not.toBe(instance);
    const cmp = new Comparator();
    expect(cmp.deepEq(component, component3)).toBe(true);
    expect(cmp.deepEq(instance, instance3)).toBe(true);
    expect(cmp.deepEq(component, instance)).toBe(false);
    expect(instance3.component).toBe(component3);

    component3.params.push(
      mkParam({
        name: "className2",
        type: typeFactory.text(),
        paramType: "prop",
      })
    );
  });
});

describe("bundler performance", () => {
  [10000 /*, 100000, 1000000*/].forEach((n) => {
    it(`should measure performance of unbundle and bundle operations [n=${n}]`, function () {
      const uuid = mkUuid();
      const bundle = mkLargeBundle(uuid, n);
      const instanceCount = Object.keys(bundle.map).length;
      expect(instanceCount).toBeGreaterThanOrEqual(n);

      const b = new Bundler();

      // Measure unbundle time
      const unbundleStartTime = performance.now();
      const unbundledRoot = b.unbundle(bundle, uuid);
      const unbundleTime = performance.now() - unbundleStartTime;

      expect(unbundledRoot).toBeDefined();
      expect(b._addr2inst.size).toEqual(instanceCount);

      // Measure bundle time
      const bundleStartTime = performance.now();
      const rebundled = b.bundle(unbundledRoot!, uuid, bundle.version);
      const bundleTime = performance.now() - bundleStartTime;

      expect(rebundled).toEqual(bundle);
      expect(Object.keys(rebundled.map)).toHaveLength(instanceCount);

      console.log(
        `[bundler performance n=${n}] ` +
          `Unbundle: ${unbundleTime.toFixed(3)}ms, ` +
          `Bundle: ${bundleTime.toFixed(3)}ms`
      );
    });
  });
});

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
  if (instancesPerChild > 0) {
    tag.children.push(mkNestedTpls(instancesPerChild));
    tag.children.push(mkNestedTpls(instancesPerChild));
  }
  if (instancesPerChild + instancesRemaining > 0) {
    tag.children.push(mkNestedTpls(instancesPerChild + instancesRemaining));
  }

  return tag;
}
