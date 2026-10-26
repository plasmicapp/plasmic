import { Bundler } from "@/wab/shared/bundler";
import { ensure, jsonClone } from "@/wab/shared/common";
import { addSlotParam, ComponentType } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { upgradeProjectDeps } from "@/wab/shared/core/project-deps";
import { createSite } from "@/wab/shared/core/sites";
import {
  flattenTpls,
  mkSlot,
  mkTplComponentX,
  mkTplInlinedText,
} from "@/wab/shared/core/tpls";
import {
  Arg,
  ensureKnownProjectDependency,
  ensureKnownRawText,
  ensureKnownSite,
  ensureKnownTplComponent,
  ensureKnownTplTag,
  ObjectPath,
  ProjectDependency,
  RenderExpr,
  Site,
  VariantsRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  BranchSide,
  DirectConflictPickMap,
  tryMerge,
} from "@/wab/shared/site-diffs/merge-core";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import { TplMgr, VariantOptionsType } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant, mkVariantSetting } from "@/wab/shared/Variants";

function findInstance(site: Site, name: string) {
  const page = ensure(
    site.components.find((c) => c.name === "Page"),
    "Missing page",
  );
  return ensureKnownTplComponent(
    ensure(
      flattenTpls(page.tplTree).find(
        (tpl) => "name" in tpl && tpl.name === name,
      ),
      `Missing ${name}`,
    ),
  );
}

/** An imported wrapper with a local component instance in its customized slot. */
function setupMerge(
  upgradeSide: BranchSide,
  withSlotContent = false,
  importedLeaf = false,
) {
  const bundler = new Bundler();
  const depSite = createSite();
  const wrapper = new TplMgr({ site: depSite }).addComponent({
    name: "Wrapper",
    type: ComponentType.Plain,
  });
  const slot = mkSlot(addSlotParam(depSite, wrapper, "children"));
  slot.vsettings = [mkVariantSetting({ variants: [getBaseVariant(wrapper)] })];
  $$$(wrapper.tplTree).append(slot);
  wrapper.params.push(
    mkParam({ name: "title", type: typeFactory.text(), paramType: "prop" }),
  );
  const oldDep = new ProjectDependency({
    name: "Library",
    projectId: "lib",
    uuid: "lib",
    pkgId: "lib",
    version: "1.0.0",
    site: depSite,
  });
  const site = createSite();
  site.projectDependencies.push(oldDep);
  const mgr = new TplMgr({ site });
  const leafMgr = importedLeaf ? new TplMgr({ site: depSite }) : mgr;
  const leaf = leafMgr.addComponent({
    name: "Leaf",
    type: ComponentType.Plain,
  });
  leaf.params.push(
    mkParam({ name: "data", type: typeFactory.any(), paramType: "prop" }),
  );
  leafMgr.createVariantGroup({
    component: leaf,
    name: "isActive",
    optionsType: VariantOptionsType.standalone,
  });
  const page = mgr.addComponent({ name: "Page", type: ComponentType.Page });
  const baseVariant = getBaseVariant(page);
  $$$(page.tplTree).append(
    mkTplComponentX({
      name: "wrapper",
      component: wrapper,
      baseVariant,
      args: {
        children: new RenderExpr({
          tpl: [
            mkTplComponentX({ name: "leaf", component: leaf, baseVariant }),
          ],
        }),
      },
    }),
  );
  if (withSlotContent) {
    const content = addSlotParam(site, leaf, "content");
    const contentSlot = mkSlot(content);
    contentSlot.vsettings = [
      mkVariantSetting({ variants: [getBaseVariant(leaf)] }),
    ];
    $$$(leaf.tplTree).append(contentSlot);
    const text = mkTplInlinedText("Original", [baseVariant]);
    text.name = "slotText";
    $$$(findInstance(site, "leaf")).setSlotArgForParam(
      content,
      new RenderExpr({ tpl: [text] }),
    );
  }
  const depBundle = bundler.bundle(oldDep, "dep1", "");
  // Published versions retain IIDs/UUIDs, but unbundle to different objects.
  const newDep = ensureKnownProjectDependency(
    bundler.unbundle(jsonClone(depBundle), "dep2"),
  );
  newDep.version = "2.0.0";
  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const left = unbundle("left");
  const right = unbundle("right");
  const upgraded = upgradeSide === "left" ? left : right;
  upgradeProjectDeps(upgraded, [{ oldDep, newDep }]);
  const instance = findInstance(upgraded, "wrapper");
  instance.vsettings[0].args.push(
    new Arg({
      param: ensure(
        instance.component.params.find((p) => p.variable.name === "title"),
        "Missing title",
      ),
      expr: codeLit("Updated wrapper"),
    }),
  );
  // Model edits in these tests bypass Studio's timestamp tracking.
  left.components.forEach((c) => (c.updatedAt = 1));
  right.components.forEach((c) => (c.updatedAt = 2));
  let attempt = 0;
  return {
    left,
    right,
    merge: (picks?: DirectConflictPickMap) => {
      bundler.bundle(left, "left", "");
      bundler.bundle(right, "right", "");
      assertSiteInvariants(left);
      assertSiteInvariants(right);
      return tryMerge(
        ancestor,
        left,
        right,
        unbundle(`merged-${attempt++}`),
        bundler,
        picks,
      );
    },
  };
}

function setData(site: Site, value: string, dynamic: boolean) {
  const leaf = findInstance(site, "leaf");
  const param = ensure(
    leaf.component.params.find((p) => p.variable.name === "data"),
    "Missing data",
  );
  leaf.vsettings[0].args.push(
    new Arg({
      param,
      expr: dynamic
        ? new ObjectPath({ path: ["$q", value, "data"], fallback: null })
        : codeLit(value),
    }),
  );
}

for (const upgradeSide of ["left", "right"] as const) {
  for (const editSide of ["left", "right"] as const) {
    it.each([false, true])(
      `preserves one-sided props (${upgradeSide} upgrade, ${editSide} edit, dynamic=%s)`,
      (dynamic) => {
        const fixture = setupMerge(upgradeSide);
        setData(fixture[editSide], "filterListing", dynamic);
        const leaf = findInstance(fixture[editSide], "leaf");
        const group = ensure(
          leaf.component.variantGroups[0],
          "Missing variant group",
        );
        leaf.vsettings[0].args.push(
          new Arg({
            param: group.param,
            expr: new VariantsRef({ variants: group.variants }),
          }),
        );
        const result = fixture.merge();
        expect(result.status).toBe("merged");
        const args = findInstance(result.mergedSite, "leaf").vsettings[0].args;
        expect(args).toHaveLength(2);
        expect(
          args.find((arg) => arg.param.variable.name === "data")?.expr,
        ).toMatchObject(
          dynamic
            ? { path: ["$q", "filterListing", "data"] }
            : { code: '"filterListing"' },
        );
        expect(
          args.find((arg) => arg.param.variable.name === "isActive")?.expr,
        ).toMatchObject({ variants: [{ name: "isActive" }] });
        expect(
          findInstance(result.mergedSite, "wrapper").vsettings[0].args.find(
            (arg) => arg.param.variable.name === "title",
          )?.expr,
        ).toMatchObject({ code: '"Updated wrapper"' });
        expect(result.mergedSite.projectDependencies[0].version).toBe("2.0.0");
        assertSiteInvariants(result.mergedSite);
      },
    );
  }

  it.each(["left", "right"] as const)(
    `surfaces descendant conflicts after a ${upgradeSide} upgrade and resolves to %s`,
    (pickSide) => {
      const fixture = setupMerge(upgradeSide);
      setData(fixture.left, "leftQuery", true);
      setData(fixture.right, "rightQuery", true);
      const result = fixture.merge();
      expect(result.status).toBe("needs-resolution");
      if (result.status !== "needs-resolution") {
        throw new Error("Expected a descendant conflict");
      }
      expect(result.genericDirectConflicts).toHaveLength(1);
      const picks = Object.fromEntries(
        result.genericDirectConflicts.flatMap((conflict) =>
          conflict.conflictDetails.map((detail) => [detail.pathStr, pickSide]),
        ),
      );
      const resolved = fixture.merge(picks);
      expect(resolved.status).toBe("merged");
      expect(
        findInstance(resolved.mergedSite, "leaf").vsettings[0].args[0].expr,
      ).toMatchObject({
        path: ["$q", pickSide === "left" ? "leftQuery" : "rightQuery", "data"],
      });
      assertSiteInvariants(resolved.mergedSite);
    },
  );
}

for (const upgradeSide of ["left", "right"] as const) {
  it.each(["left", "right"] as const)(
    `surfaces slot-content conflicts after a ${upgradeSide} upgrade and resolves to %s`,
    (pickSide) => {
      const fixture = setupMerge(upgradeSide, true);
      const textNode = (site: Site) =>
        ensureKnownTplTag(
          ensure(
            flattenTpls(findInstance(site, "leaf")).find(
              (tpl) => "name" in tpl && tpl.name === "slotText",
            ),
            "Missing slot text",
          ),
        );
      ensureKnownRawText(textNode(fixture.left).vsettings[0].text).text =
        "Barbados";
      ensureKnownRawText(textNode(fixture.right).vsettings[0].text).text =
        "Branch text";
      const result = fixture.merge();
      expect(result.status).toBe("needs-resolution");
      if (result.status !== "needs-resolution") {
        throw new Error("Expected a slot-content conflict");
      }
      expect(result.genericDirectConflicts).toHaveLength(1);
      const picks = Object.fromEntries(
        result.genericDirectConflicts.flatMap((conflict) =>
          conflict.conflictDetails.map((detail) => [detail.pathStr, pickSide]),
        ),
      );
      const resolved = fixture.merge(picks);
      expect(resolved.status).toBe("merged");
      expect(
        ensureKnownRawText(textNode(resolved.mergedSite).vsettings[0].text)
          .text,
      ).toBe(pickSide === "left" ? "Barbados" : "Branch text");
      assertSiteInvariants(resolved.mergedSite);
    },
  );
}

it.each(["left", "right"] as const)(
  "preserves imported child props after a %s upgrade",
  (upgradeSide) => {
    const fixture = setupMerge(upgradeSide, false, true);
    setData(fixture.right, "filterListing", true);
    const result = fixture.merge();
    expect(result.status).toBe("merged");
    const leaf = findInstance(result.mergedSite, "leaf");
    const arg = ensure(
      leaf.vsettings[0].args.find((a) => a.param.variable.name === "data"),
      "Missing data binding",
    );
    expect(arg.expr).toMatchObject({ path: ["$q", "filterListing", "data"] });
    expect(leaf.component.params.includes(arg.param)).toBe(true);
    assertSiteInvariants(result.mergedSite);
  },
);
