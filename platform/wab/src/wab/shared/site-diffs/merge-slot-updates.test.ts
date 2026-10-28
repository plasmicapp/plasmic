import { Bundler } from "@/wab/shared/bundler";
import { ensure, jsonClone } from "@/wab/shared/common";
import {
  addSlotParam,
  ComponentType,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { upgradeProjectDeps } from "@/wab/shared/core/project-deps";
import { createSite } from "@/wab/shared/core/sites";
import { getStateVarName } from "@/wab/shared/core/states";
import {
  flattenTpls,
  mkSlot,
  mkTplComponentX,
  mkTplInlinedText,
  mkTplTagX,
  trackComponentRoot,
  trackComponentSite,
} from "@/wab/shared/core/tpls";
import {
  Arg,
  ensureKnownCustomCode,
  ensureKnownProjectDependency,
  ensureKnownRawText,
  ensureKnownRenderExpr,
  ensureKnownSite,
  ensureKnownTplComponent,
  ensureKnownTplTag,
  isKnownVirtualRenderExpr,
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
import { fillVirtualSlotContents } from "@/wab/shared/SlotUtils";
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

function findComponent(site: Site, name: string) {
  return ensure(
    site.components.find((c) => c.name === name),
    `Missing ${name}`,
  );
}

function setupKitReleasesMerge(
  rightUpgrades: boolean,
  {
    recreateAlign = false,
    rightAlign,
  }: { recreateAlign?: boolean; rightAlign?: string } = {},
) {
  const bundler = new Bundler();
  const depSite = createSite();
  const depMgr = new TplMgr({ site: depSite });
  const intro = depMgr.addComponent({
    name: "Intro",
    type: ComponentType.Plain,
  });
  const headingSlot = mkSlot(addSlotParam(depSite, intro, "heading"));
  headingSlot.vsettings = [
    mkVariantSetting({ variants: [getBaseVariant(intro)] }),
  ];
  $$$(intro.tplTree).append(headingSlot);
  const hero = depMgr.addComponent({ name: "Hero", type: ComponentType.Plain });
  const defaultBackground = mkTplInlinedText("Default background", [
    getBaseVariant(hero),
  ]);
  defaultBackground.name = "backgroundText";
  const backgroundSlot = mkSlot(addSlotParam(depSite, hero, "background"), [
    defaultBackground,
  ]);
  defaultBackground.parent = backgroundSlot;
  backgroundSlot.vsettings = [
    mkVariantSetting({ variants: [getBaseVariant(hero)] }),
  ];
  $$$(hero.tplTree).append(backgroundSlot);
  const dep1 = new ProjectDependency({
    name: "Kit",
    projectId: "kit",
    uuid: "kit",
    pkgId: "kit",
    version: "1.0.0",
    site: depSite,
  });

  const site = createSite();
  site.projectDependencies.push(dep1);
  const mgr = new TplMgr({ site });
  const page = mgr.addComponent({ name: "Page", type: ComponentType.Page });
  const baseVariant = getBaseVariant(page);
  const heading = mkTplInlinedText("Welcome to St. Lucia", [baseVariant]);
  heading.name = "headingText";
  $$$(page.tplTree).append(
    mkTplComponentX({
      name: "intro",
      component: intro,
      baseVariant,
      args: { heading: new RenderExpr({ tpl: [heading] }) },
    }),
  );
  for (const name of ["hero", "hero2"]) {
    const heroInstance = mkTplComponentX({
      name,
      component: hero,
      baseVariant,
    });
    $$$(page.tplTree).append(heroInstance);
    fillVirtualSlotContents(mgr, heroInstance);
  }

  // Like a real publish, keeps the uuids and iids of unchanged objects.
  const release = (dep: ProjectDependency, version: string) => {
    const next = ensureKnownProjectDependency(
      bundler.unbundle(
        jsonClone(bundler.bundle(dep, `kit-${dep.version}`, "")),
        `kit-${version}`,
      ),
    );
    next.version = version;
    return next;
  };
  const dep2 = release(dep1, "2.0.0");
  const intro2 = findComponent(dep2.site, "Intro");
  const introRoot = ensureKnownTplTag(intro2.tplTree);
  intro2.params = [];
  introRoot.children = [];
  const recreatedSlot = mkSlot(addSlotParam(dep2.site, intro2, "heading"));
  recreatedSlot.vsettings = [
    mkVariantSetting({ variants: [getBaseVariant(intro2)] }),
  ];
  $$$(introRoot).append(recreatedSlot);
  const mkAlign = () =>
    mkParam({ name: "align", type: typeFactory.text(), paramType: "prop" });
  if (recreateAlign) {
    intro2.params.push(mkAlign());
  }
  bundler.bundle(dep2, "kit-2.0.0", "");
  const dep3 = release(dep2, "3.0.0");
  const intro3 = findComponent(dep3.site, "Intro");
  if (recreateAlign) {
    intro3.params = intro3.params.filter((p) => p.variable.name !== "align");
  }
  intro3.params.push(mkAlign());
  bundler.bundle(dep3, "kit-3.0.0", "");

  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const left = unbundle("left");
  const right = unbundle("right");
  const upgrade = (branch: Site, newDep: ProjectDependency) => {
    // Studio tracks components, so upgrades can rebuild default contents.
    branch.components.forEach((c) => {
      trackComponentRoot(c);
      trackComponentSite(c, branch);
    });
    upgradeProjectDeps(branch, [{ oldDep: dep1, newDep }]);
  };
  upgrade(left, dep3);
  if (rightUpgrades) {
    upgrade(right, dep2);
  }
  const setAlign = (branch: Site, value: string) => {
    const intro = findInstance(branch, "intro");
    intro.vsettings[0].args.push(
      new Arg({
        param: ensure(
          intro.component.params.find((p) => p.variable.name === "align"),
          "Missing align",
        ),
        expr: codeLit(value),
      }),
    );
  };
  setAlign(left, "center");
  if (rightAlign) {
    setAlign(right, rightAlign);
  }
  left.components.forEach((c) => (c.updatedAt = 1));
  right.components.forEach((c) => (c.updatedAt = 2));
  bundler.bundle(left, "left", "");
  bundler.bundle(right, "right", "");
  assertSiteInvariants(left);
  assertSiteInvariants(right);
  return (picks?: DirectConflictPickMap) =>
    tryMerge(ancestor, left, right, unbundle("merged"), bundler, picks);
}

for (const rightUpgrades of [true, false]) {
  it(`keeps instance args when ${
    rightUpgrades ? "both branches upgrade" : "one branch upgrades"
  } to dependency kit releases that recreated a slot and added a prop`, () => {
    const result = setupKitReleasesMerge(rightUpgrades)();
    expect(result.status).toBe("merged");
    expect(result.autoReconciliations).toEqual([]);
    expect(result.mergedSite.projectDependencies[0].version).toBe("3.0.0");

    const intro = findInstance(result.mergedSite, "intro");
    const introArgs = intro.vsettings[0].args;
    expect(introArgs.map((arg) => arg.param.variable.name).sort()).toEqual([
      "align",
      "heading",
    ]);
    expect(
      introArgs.every((arg) => intro.component.params.includes(arg.param)),
    ).toBe(true);
    const headingContent = ensureKnownRenderExpr(
      ensure(
        introArgs.find((arg) => arg.param.variable.name === "heading"),
        "Missing heading",
      ).expr,
    ).tpl;
    expect(headingContent.map((tpl) => "name" in tpl && tpl.name)).toEqual([
      "headingText",
    ]);
    expect(
      ensureKnownRawText(ensureKnownTplTag(headingContent[0]).vsettings[0].text)
        .text,
    ).toBe("Welcome to St. Lucia");
    expect(
      introArgs.find((arg) => arg.param.variable.name === "align")?.expr,
    ).toMatchObject({ code: '"center"' });

    const heroContents = ["hero", "hero2"].map((name) => {
      const heroArgs = findInstance(result.mergedSite, name).vsettings[0].args;
      expect(heroArgs).toHaveLength(1);
      expect(isKnownVirtualRenderExpr(heroArgs[0].expr)).toBe(true);
      return ensureKnownRenderExpr(heroArgs[0].expr).tpl.map((tpl) =>
        ensureKnownTplTag(tpl),
      );
    });
    expect(
      heroContents.map((tpls) =>
        tpls.map((tpl) => ensureKnownRawText(tpl.vsettings[0].text).text),
      ),
    ).toEqual([["Default background"], ["Default background"]]);
    expect(
      heroContents
        .flat()
        .map((tpl) => tpl.name)
        .sort(),
    ).toEqual(["backgroundText", "backgroundText 2"]);
    assertSiteInvariants(result.mergedSite);
  });
}

it("keeps default slot element names unique when both branches add the same component", () => {
  const bundler = new Bundler();
  const site = createSite();
  const mgr = new TplMgr({ site });
  const card = mgr.addComponent({ name: "Card", type: ComponentType.Plain });
  const input = mkTplTagX("input", { name: "sharedInput" });
  input.vsettings = [mkVariantSetting({ variants: [getBaseVariant(card)] })];
  const slot = mkSlot(addSlotParam(site, card, "content"), [input]);
  input.parent = slot;
  slot.vsettings = [mkVariantSetting({ variants: [getBaseVariant(card)] })];
  $$$(card.tplTree).append(slot);
  mgr.addComponent({ name: "Page", type: ComponentType.Page });

  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const left = unbundle("left");
  const right = unbundle("right");
  for (const [branch, id] of [
    [left, "left"],
    [right, "right"],
  ] as const) {
    branch.components.forEach((c) => {
      trackComponentRoot(c);
      trackComponentSite(c, branch);
    });
    const page = findComponent(branch, "Page");
    const instance = mkTplComponentX({
      name: `${id}Card`,
      component: findComponent(branch, "Card"),
      baseVariant: getBaseVariant(page),
    });
    $$$(page.tplTree).append(instance);
    fillVirtualSlotContents(new TplMgr({ site: branch }), instance);
    page.updatedAt = branch === left ? 1 : 2;
    bundler.bundle(branch, id, "");
  }

  const result = tryMerge(
    ancestor,
    left,
    right,
    unbundle("merged"),
    bundler,
    undefined,
  );
  expect(result.status).toBe("merged");
  expect(
    findComponent(result.mergedSite, "Page")
      .states.map((state) => getStateVarName(state))
      .sort(),
  ).toEqual(["sharedInput.value", "sharedInput2.value"]);
  assertSiteInvariants(result.mergedSite);
});

it("moves content into a local component's slot that the other branch deleted and made again with the same name", () => {
  const bundler = new Bundler();
  const site = createSite();
  const mgr = new TplMgr({ site });
  const card = mgr.addComponent({ name: "Card", type: ComponentType.Plain });
  const slot = mkSlot(addSlotParam(site, card, "content"));
  slot.vsettings = [mkVariantSetting({ variants: [getBaseVariant(card)] })];
  $$$(card.tplTree).append(slot);
  const page = mgr.addComponent({ name: "Page", type: ComponentType.Page });
  $$$(page.tplTree).append(
    mkTplComponentX({
      name: "card",
      component: card,
      baseVariant: getBaseVariant(page),
      args: {
        content: new RenderExpr({
          tpl: [mkTplInlinedText("Hello", [getBaseVariant(page)])],
        }),
      },
    }),
  );

  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const left = unbundle("left");
  const right = unbundle("right");
  for (const branch of [left, right]) {
    branch.components.forEach((c) => {
      trackComponentRoot(c);
      trackComponentSite(c, branch);
    });
  }

  // Left deletes the slot, with its content, and makes a new one with the
  // same name.
  const leftCard = findComponent(left, "Card");
  removeComponentParam(
    left,
    leftCard,
    ensure(
      leftCard.params.find((p) => p.variable.name === "content"),
      "Missing content",
    ),
  );
  const newSlot = mkSlot(addSlotParam(left, leftCard, "content"));
  newSlot.vsettings = [
    mkVariantSetting({ variants: [getBaseVariant(leftCard)] }),
  ];
  $$$(leftCard.tplTree).append(newSlot);

  // Right adds an element to the slot.
  const rightCard = findInstance(right, "card");
  const rightText = mkTplInlinedText("Right text", [
    getBaseVariant(findComponent(right, "Page")),
  ]);
  rightText.parent = rightCard;
  ensureKnownRenderExpr(rightCard.vsettings[0].args[0].expr).tpl.push(
    rightText,
  );

  left.components.forEach((c) => (c.updatedAt = 1));
  right.components.forEach((c) => (c.updatedAt = 2));
  bundler.bundle(left, "left", "");
  bundler.bundle(right, "right", "");
  assertSiteInvariants(left);
  assertSiteInvariants(right);

  const result = tryMerge(
    ancestor,
    left,
    right,
    unbundle("merged"),
    bundler,
    undefined,
  );
  expect(result.status).toBe("merged");
  const mergedCard = findInstance(result.mergedSite, "card");
  const args = mergedCard.vsettings[0].args;
  expect(args.map((arg) => arg.param)).toEqual([
    ensure(
      mergedCard.component.params.find((p) => p.variable.name === "content"),
      "Missing content",
    ),
  ]);
  expect(args[0].param.uuid).toBe(newSlot.param.uuid);
  expect(
    ensureKnownRenderExpr(args[0].expr).tpl.map(
      (tpl) =>
        ensureKnownRawText(ensureKnownTplTag(tpl).vsettings[0].text).text,
    ),
  ).toEqual(["Right text"]);
  assertSiteInvariants(result.mergedSite);
});

it("keeps one arg when both branches set the same value on a prop that a dependency kit release recreated", () => {
  const result = setupKitReleasesMerge(true, {
    recreateAlign: true,
    rightAlign: "center",
  })();
  expect(result.status).toBe("merged");
  const args = findInstance(result.mergedSite, "intro").vsettings[0].args;
  expect(args.map((arg) => arg.param.variable.name).sort()).toEqual([
    "align",
    "heading",
  ]);
  expect(
    args.find((arg) => arg.param.variable.name === "align")?.expr,
  ).toMatchObject({ code: '"center"' });
  assertSiteInvariants(result.mergedSite);
});

it.each(["left", "right"] as const)(
  "asks which value to keep when both branches set different values on a prop that a dependency kit release recreated, resolving to %s",
  (pickSide) => {
    const merge = setupKitReleasesMerge(true, {
      recreateAlign: true,
      rightAlign: "right",
    });
    const result = merge();
    expect(result.status).toBe("needs-resolution");
    if (result.status !== "needs-resolution") {
      throw new Error("Expected a conflict");
    }
    expect(result.specialDirectConflicts).toHaveLength(1);
    const resolved = merge({
      [result.specialDirectConflicts[0].pathStr]: pickSide,
    });
    expect(resolved.status).toBe("merged");
    const args = findInstance(resolved.mergedSite, "intro").vsettings[0].args;
    expect(
      args.filter((arg) => arg.param.variable.name === "align"),
    ).toHaveLength(1);
    expect(
      args.find((arg) => arg.param.variable.name === "align")?.expr,
    ).toMatchObject({ code: pickSide === "left" ? '"center"' : '"right"' });
    assertSiteInvariants(resolved.mergedSite);
  },
);

// Kit 2.0.0 deletes Intro's `title` prop and adds it again. Left upgrades to
// 2.0.0 and right stays on 1.0.0; each side sets `title` when given a value.
// With `variantTitles`, each side also sets `title` in a page variant. With
// `editInPlace`, a side changes an existing value's code instead of replacing
// the value, as Studio does for some values such as interactions.
function setupRecreatedTitleMerge({
  ancestorTitle,
  leftTitle,
  rightTitle,
  variantTitles,
  editInPlace = false,
}: {
  ancestorTitle?: string;
  leftTitle?: string;
  rightTitle?: string;
  variantTitles?: { left: string; right: string };
  editInPlace?: boolean;
}) {
  const bundler = new Bundler();
  const kitSite = createSite();
  const kitIntro = new TplMgr({ site: kitSite }).addComponent({
    name: "Intro",
    type: ComponentType.Plain,
  });
  const mkTitle = () =>
    mkParam({ name: "title", type: typeFactory.text(), paramType: "prop" });
  kitIntro.params.push(mkTitle());
  const dep1 = new ProjectDependency({
    name: "Kit",
    projectId: "kit",
    uuid: "kit",
    pkgId: "kit",
    version: "1.0.0",
    site: kitSite,
  });
  // Like a real publish, keeps the uuids and iids of unchanged objects.
  const dep2 = ensureKnownProjectDependency(
    bundler.unbundle(
      jsonClone(bundler.bundle(dep1, "kit-1.0.0", "")),
      "kit-2.0.0",
    ),
  );
  dep2.version = "2.0.0";
  const intro2 = findComponent(dep2.site, "Intro");
  intro2.params = intro2.params.filter((p) => p.variable.name !== "title");
  intro2.params.push(mkTitle());
  bundler.bundle(dep2, "kit-2.0.0", "");

  const site = createSite();
  site.projectDependencies.push(dep1);
  const mgr = new TplMgr({ site });
  const page = mgr.addComponent({ name: "Page", type: ComponentType.Page });
  const intro = mkTplComponentX({
    name: "intro",
    component: kitIntro,
    baseVariant: getBaseVariant(page),
  });
  if (variantTitles) {
    const group = mgr.createVariantGroup({
      component: page,
      name: "Dark",
      optionsType: VariantOptionsType.standalone,
    });
    intro.vsettings.push(mkVariantSetting({ variants: group.variants }));
  }
  if (ancestorTitle !== undefined) {
    intro.vsettings[0].args.push(
      new Arg({ param: kitIntro.params[0], expr: codeLit(ancestorTitle) }),
    );
  }
  $$$(page.tplTree).append(intro);
  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const left = unbundle("left");
  const right = unbundle("right");
  left.components.forEach((c) => {
    trackComponentRoot(c);
    trackComponentSite(c, left);
  });
  upgradeProjectDeps(left, [{ oldDep: dep1, newDep: dep2 }]);
  const setTitle = (branch: Site, value: string, vsIndex = 0) => {
    const branchIntro = findInstance(branch, "intro");
    const existing = branchIntro.vsettings[vsIndex].args.find(
      (arg) => arg.param.variable.name === "title",
    );
    if (existing && editInPlace) {
      ensureKnownCustomCode(existing.expr).code = JSON.stringify(value);
      return;
    }
    if (existing) {
      existing.expr = codeLit(value);
      return;
    }
    branchIntro.vsettings[vsIndex].args.push(
      new Arg({
        param: ensure(
          branchIntro.component.params.find((p) => p.variable.name === "title"),
          "Missing title",
        ),
        expr: codeLit(value),
      }),
    );
  };
  if (leftTitle !== undefined) {
    setTitle(left, leftTitle);
  }
  if (rightTitle !== undefined) {
    setTitle(right, rightTitle);
  }
  if (variantTitles) {
    setTitle(left, variantTitles.left, 1);
    setTitle(right, variantTitles.right, 1);
  }
  left.components.forEach((c) => (c.updatedAt = 1));
  right.components.forEach((c) => (c.updatedAt = 2));
  bundler.bundle(left, "left", "");
  bundler.bundle(right, "right", "");

  return (picks?: DirectConflictPickMap) =>
    tryMerge(ancestor, left, right, unbundle("merged"), bundler, picks);
}

function expectTitleConflict(
  merge: ReturnType<typeof setupRecreatedTitleMerge>,
  pickSide: "left" | "right",
  expected: string,
) {
  const result = merge();
  expect(result.status).toBe("needs-resolution");
  if (result.status !== "needs-resolution") {
    throw new Error("Expected a conflict");
  }
  expect(result.specialDirectConflicts).toHaveLength(1);
  const resolved = merge({
    [result.specialDirectConflicts[0].pathStr]: pickSide,
  });
  expect(resolved.status).toBe("merged");
  const args = findInstance(resolved.mergedSite, "intro").vsettings[0].args;
  expect(args.map((arg) => arg.expr)).toMatchObject([{ code: expected }]);
  assertSiteInvariants(resolved.mergedSite);
}

it.each(["left", "right"] as const)(
  "asks which value to keep when one branch sets a prop on a dependency kit release that recreated it and the other sets it on the old release, resolving to %s",
  (pickSide) => {
    expectTitleConflict(
      setupRecreatedTitleMerge({ leftTitle: "A", rightTitle: "B" }),
      pickSide,
      pickSide === "left" ? '"A"' : '"B"',
    );
  },
);

it.each(["left", "right"] as const)(
  "asks which value to keep when both branches edit a prop that one branch's dependency kit release recreated, resolving to %s",
  (pickSide) => {
    expectTitleConflict(
      setupRecreatedTitleMerge({
        ancestorTitle: "X",
        leftTitle: "A",
        rightTitle: "B",
      }),
      pickSide,
      pickSide === "left" ? '"A"' : '"B"',
    );
  },
);

it("asks which value to keep for a prop that a dependency kit release recreated separately in each variant", () => {
  const merge = setupRecreatedTitleMerge({
    leftTitle: "A",
    rightTitle: "B",
    variantTitles: { left: "X", right: "Y" },
  });
  const result = merge();
  expect(result.status).toBe("needs-resolution");
  if (result.status !== "needs-resolution") {
    throw new Error("Expected conflicts");
  }
  const [basePath, variantPath] = result.specialDirectConflicts.map(
    (conflict) => conflict.pathStr,
  );
  expect(basePath).not.toEqual(variantPath);
  const resolved = merge({ [basePath]: "left", [variantPath]: "right" });
  expect(resolved.status).toBe("merged");
  expect(
    findInstance(resolved.mergedSite, "intro").vsettings.map((vs) =>
      vs.args.map((arg) => arg.expr),
    ),
  ).toMatchObject([[{ code: '"A"' }], [{ code: '"Y"' }]]);
  assertSiteInvariants(resolved.mergedSite);
});

it.each(["left", "right"] as const)(
  "keeps the picked value when both branches edit in place a prop that one branch's dependency kit release recreated, resolving to %s",
  (pickSide) => {
    expectTitleConflict(
      setupRecreatedTitleMerge({
        ancestorTitle: "X",
        leftTitle: "A",
        rightTitle: "B",
        editInPlace: true,
      }),
      pickSide,
      pickSide === "left" ? '"A"' : '"B"',
    );
  },
);

it("keeps an edit to a prop that the other branch's dependency kit release recreated", () => {
  const result = setupRecreatedTitleMerge({
    ancestorTitle: "X",
    rightTitle: "B",
  })();
  expect(result.status).toBe("merged");
  const args = findInstance(result.mergedSite, "intro").vsettings[0].args;
  expect(args.map((arg) => arg.expr)).toMatchObject([{ code: '"B"' }]);
  assertSiteInvariants(result.mergedSite);
});

// Kit Link has a `label` slot whose default content is the text "Link", and
// the page's link shows that default content. Kit 2.0.0 doesn't change Link,
// so upgrading only rebuilds the default content. `editSide` changes the
// label, `upgradeSide` upgrades the kit, and the side that doesn't change
// the label adds an element elsewhere on the page.
function setupDefaultLabelMerge({
  editSide,
  upgradeSide,
  editLabel,
}: {
  editSide: BranchSide;
  upgradeSide: BranchSide;
  editLabel: (label: Arg, branch: Site) => void;
}) {
  const bundler = new Bundler();
  const kitSite = createSite();
  const kitLink = new TplMgr({ site: kitSite }).addComponent({
    name: "Link",
    type: ComponentType.Plain,
  });
  const defaultLabel = mkTplInlinedText("Link", [getBaseVariant(kitLink)]);
  defaultLabel.name = "labelText";
  const labelSlot = mkSlot(addSlotParam(kitSite, kitLink, "label"), [
    defaultLabel,
  ]);
  defaultLabel.parent = labelSlot;
  labelSlot.vsettings = [
    mkVariantSetting({ variants: [getBaseVariant(kitLink)] }),
  ];
  $$$(kitLink.tplTree).append(labelSlot);
  const dep1 = new ProjectDependency({
    name: "Kit",
    projectId: "kit",
    uuid: "kit",
    pkgId: "kit",
    version: "1.0.0",
    site: kitSite,
  });
  // Like a real publish, keeps the uuids and iids of unchanged objects.
  const dep2 = ensureKnownProjectDependency(
    bundler.unbundle(
      jsonClone(bundler.bundle(dep1, "kit-1.0.0", "")),
      "kit-2.0.0",
    ),
  );
  dep2.version = "2.0.0";
  bundler.bundle(dep2, "kit-2.0.0", "");

  const site = createSite();
  site.projectDependencies.push(dep1);
  const mgr = new TplMgr({ site });
  const page = mgr.addComponent({ name: "Page", type: ComponentType.Page });
  const link = mkTplComponentX({
    name: "link",
    component: kitLink,
    baseVariant: getBaseVariant(page),
  });
  $$$(page.tplTree).append(link);
  fillVirtualSlotContents(mgr, link);

  const bundle = bundler.bundle(site, "initial", "");
  const unbundle = (id: string) =>
    ensureKnownSite(bundler.unbundle(jsonClone(bundle), id));
  const ancestor = unbundle("ancestor");
  const branches = { left: unbundle("left"), right: unbundle("right") };
  const upgrading = branches[upgradeSide];
  // Studio tracks components, so upgrades can rebuild default contents.
  upgrading.components.forEach((c) => {
    trackComponentRoot(c);
    trackComponentSite(c, upgrading);
  });
  upgradeProjectDeps(upgrading, [{ oldDep: dep1, newDep: dep2 }]);
  for (const side of ["left", "right"] as const) {
    const branch = branches[side];
    if (side === editSide) {
      editLabel(
        ensure(
          findInstance(branch, "link").vsettings[0].args.find(
            (arg) => arg.param.variable.name === "label",
          ),
          "Missing label",
        ),
        branch,
      );
    } else {
      const branchPage = findComponent(branch, "Page");
      $$$(branchPage.tplTree).append(
        mkTplInlinedText("Elsewhere", [getBaseVariant(branchPage)]),
      );
    }
  }
  branches.left.components.forEach((c) => (c.updatedAt = 1));
  branches.right.components.forEach((c) => (c.updatedAt = 2));
  bundler.bundle(branches.left, "left", "");
  bundler.bundle(branches.right, "right", "");
  assertSiteInvariants(branches.left);
  assertSiteInvariants(branches.right);
  return tryMerge(
    ancestor,
    branches.left,
    branches.right,
    unbundle("merged"),
    bundler,
    undefined,
  );
}

function expectLabelText(
  result: ReturnType<typeof setupDefaultLabelMerge>,
  text: string,
) {
  expect(result.status).toBe("merged");
  const labelArg = ensure(
    findInstance(result.mergedSite, "link").vsettings[0].args.find(
      (arg) => arg.param.variable.name === "label",
    ),
    "Missing label",
  );
  expect(isKnownVirtualRenderExpr(labelArg.expr)).toBe(false);
  expect(
    ensureKnownRenderExpr(labelArg.expr).tpl.map(
      (tpl) =>
        ensureKnownRawText(ensureKnownTplTag(tpl).vsettings[0].text).text,
    ),
  ).toEqual([text]);
  assertSiteInvariants(result.mergedSite);
}

it.each(["left", "right"] as const)(
  "keeps content that a branch put in a dependency kit slot showing default content when that branch upgrades the kit, on the %s",
  (side) => {
    const result = setupDefaultLabelMerge({
      editSide: side,
      upgradeSide: side,
      editLabel: (label, branch) => {
        const page = findComponent(branch, "Page");
        const text = mkTplInlinedText("Land Sports", [getBaseVariant(page)]);
        text.parent = findInstance(branch, "link");
        label.expr = new RenderExpr({ tpl: [text] });
      },
    });
    expectLabelText(result, "Land Sports");
  },
);

it.each(["left", "right"] as const)(
  "keeps an edit to a dependency kit slot's default content when the other branch upgrades the kit, on the %s",
  (side) => {
    const result = setupDefaultLabelMerge({
      editSide: side,
      upgradeSide: side === "left" ? "right" : "left",
      editLabel: (label) => {
        const defaults = ensureKnownRenderExpr(label.expr).tpl;
        label.expr = new RenderExpr({ tpl: [...defaults] });
        ensureKnownRawText(
          ensureKnownTplTag(defaults[0]).vsettings[0].text,
        ).text = "Edited";
      },
    });
    expectLabelText(result, "Edited");
  },
);
