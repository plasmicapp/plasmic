import { getTplSlots } from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import { generateSiteFromBundle } from "@/wab/shared/__testonly__/site-tests-utils";
import { Bundle } from "@/wab/shared/bundler";
import {
  cachedExprsInSite,
  componentToDeepReferenced,
  componentToElementNames,
  componentToReferenced,
  componentToReferencers,
  componentToTplComponents,
  componentToUsedImageAssets,
  componentToUsedMixins,
  customFunctionsAndLibsUsedByComponent,
  customFunctionsAndLibsUsedByComponents,
  deepComponentToReferencers,
  extractImageAssetRefsByAttrs,
  findNonEmptyCombos,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import { arrayWithout } from "@/wab/shared/collections";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { mkImageAssetRef } from "@/wab/shared/core/image-assets";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import {
  TplTagType,
  flattenTpls,
  isTplComponent,
  mkTplComponent,
  mkTplTagX,
} from "@/wab/shared/core/tpls";
import mobx from "@/wab/shared/import-mobx";
import {
  CodeLibrary,
  Component,
  CustomCode,
  ImageAsset,
  ImageAssetRef,
  ProjectDependency,
  Site,
  TplTag,
  Variant,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import _bundle from "@/wab/shared/web-exporter/bundles/starter-project-desktop-first.json";
import L from "lodash";

function mkRandom(seed: number) {
  // mulberry32
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mkTag(name: string, baseVariant: Variant, ...children: TplTag[]) {
  return mkTplTagX(
    "div",
    { name, baseVariant, styles: { display: "block" } },
    ...children,
  );
}

function names(components: Iterable<Component>) {
  return [...components].map((c) => c.name).sort();
}

/** The results of a bunch of cached selectors, as plain data */
function snapshot(site: Site) {
  const referencers = componentToReferencers(site);
  const deepReferencers = deepComponentToReferencers(site);
  return {
    components: site.components.map((c) => ({
      name: c.name,
      tpls: flattenComponent(c).map((tpl) => tpl.uuid),
      referenced: names(componentToReferenced(c)),
      deepReferenced: names(componentToDeepReferenced(c)),
      referencers: names(referencers.get(c) ?? []),
      deepReferencers: names(deepReferencers.get(c) ?? []),
      instances: componentToTplComponents(site, c).map((tpl) => tpl.uuid),
      elementNames: componentToElementNames(c),
      mixins: componentToUsedMixins(c).size,
      combos: findNonEmptyCombos(c).length,
      slots: getTplSlots(c).map((tpl) => tpl.uuid),
    })),
    exprs: cachedExprsInSite(site).map(({ ownerComponent, exprRefs }) => [
      ownerComponent.name,
      exprRefs.length,
    ]),
  };
}

/** Same, computed from scratch: selectors only cache in the browser */
function freshSnapshot(site: Site) {
  vi.stubGlobal("window", undefined);
  try {
    return snapshot(site);
  } finally {
    vi.unstubAllGlobals();
  }
}

describe("cached selectors", () => {
  beforeAll(() => {
    mobx.configure({ enforceActions: "never" });
  });

  it.each([1, 2, 3])(
    "match a fresh computation under random edits (seed %i)",
    (seed) => {
      const random = mkRandom(seed);
      const pick = <T>(xs: ReadonlyArray<T>): T | undefined =>
        xs[Math.floor(random() * xs.length)];

      const site = createSite();
      let counter = 0;
      const addComponent = () => {
        const name = `Comp${site.components.length}`;
        site.components = [
          ...site.components,
          mkComponent({
            name,
            type: ComponentType.Plain,
            tplTree: (baseVariant) =>
              mkTag(`${name} root`, baseVariant, mkTag("child", baseVariant)),
          }),
        ];
      };
      for (let i = 0; i < 4; i++) {
        addComponent();
      }
      const recorder = new ChangeRecorder({
        site,
      });

      const tags = (c: Component) =>
        flattenTpls(c.tplTree).filter((tpl): tpl is TplTag =>
          isKnownTplTag(tpl),
        );
      const nonRootTags = (c: Component) =>
        tags(c).filter((tpl) => tpl !== c.tplTree && isKnownTplTag(tpl.parent));
      const removeFromParent = (tpl: TplTag) => {
        const parent = tpl.parent;
        if (isKnownTplTag(parent)) {
          parent.children = arrayWithout(parent.children, tpl);
          tpl.parent = null;
        }
      };

      const ops: (() => void)[] = [
        () => {
          const tpl = pick(tags(pick(site.components)!));
          if (tpl) {
            tpl.name = `renamed ${counter++}`;
          }
        },
        () => {
          const tpl = pick(tags(pick(site.components)!));
          const rs = tpl?.vsettings[0]?.rs;
          if (rs) {
            if ("color" in rs.values && random() < 0.5) {
              rs.values = L.omit(rs.values, "color");
            } else {
              rs.values = { ...rs.values, color: `#${counter++}` };
            }
          }
        },
        () => {
          const tpl = pick(tags(pick(site.components)!));
          const vs = tpl?.vsettings[0];
          if (vs) {
            vs.attrs = { ...vs.attrs, title: codeLit(`title ${counter++}`) };
          }
        },
        () => {
          const comp = pick(site.components)!;
          const parent = pick(tags(comp));
          if (parent) {
            const child = mkTag(`inserted ${counter++}`, comp.variants[0]);
            parent.children = [...parent.children, child];
            child.parent = parent;
          }
        },
        () => {
          // Only instantiate earlier components, so that there are no cycles
          const index = Math.floor(random() * site.components.length);
          const comp = site.components[index];
          const instantiated = pick(site.components.slice(0, index));
          const parent = pick(tags(comp));
          if (parent && instantiated) {
            const child = mkTplComponent(instantiated, comp.variants[0]);
            parent.children = [...parent.children, child];
            child.parent = parent;
          }
        },
        () => {
          const tpl = pick(nonRootTags(pick(site.components)!));
          if (tpl) {
            removeFromParent(tpl);
          }
        },
        () => {
          // Move a subtree to another component
          const tpl = pick(nonRootTags(pick(site.components)!));
          const target = pick(tags(pick(site.components)!));
          if (
            tpl &&
            target &&
            !flattenTpls(tpl).includes(target) &&
            !flattenTpls(tpl).some(isTplComponent)
          ) {
            removeFromParent(tpl);
            if (random() < 0.5) {
              // Edit it while it is detached
              tpl.name = `detached ${counter++}`;
            }
            target.children = [...target.children, tpl];
            tpl.parent = target;
          }
        },
        () => addComponent(),
      ];

      const check = () => expect(snapshot(site)).toEqual(freshSnapshot(site));

      check();
      for (let step = 0; step < 60; step++) {
        recorder.withRecording(() => {
          mobx.runInAction(() => {
            const numOps = 1 + Math.floor(random() * 3);
            for (let i = 0; i < numOps; i++) {
              pick(ops)!();
              // Selectors are read in the middle of changes too
              if (random() < 0.5) {
                check();
              }
            }
          });
        });
        check();
      }

      recorder.dispose();
    },
  );
});

describe("customFunctionsAndLibsUsedByComponents", () => {
  it("deduplicates library members and lets a whole-library use override members", () => {
    const site = createSite();
    const lib = new CodeLibrary({
      name: "utils",
      importPath: "utils",
      jsIdentifier: "utils",
      importType: "namespace",
      namedImport: null,
      isSyntheticDefaultImport: false,
    });
    site.codeLibraries = [lib];
    const components = [
      "($$.utils.first())",
      "($$.utils.first() + $$.utils.last())",
      "($$.utils)",
    ].map((code, i) =>
      mkComponent({
        name: `Component${i}`,
        type: ComponentType.Plain,
        tplTree: (baseVariant) =>
          mkTplTagX("div", {
            baseVariant,
            attrs: { title: new CustomCode({ code, fallback: null }) },
          }),
      }),
    );
    expect(
      customFunctionsAndLibsUsedByComponent(site, components[0]).codeLibraries,
    ).toEqual([[lib, ["first"]]]);
    expect(
      customFunctionsAndLibsUsedByComponents(site, components.slice(0, 2))
        .codeLibraries,
    ).toEqual([[lib, ["first", "last"]]]);
    for (const order of [components, [...components].reverse()]) {
      expect(
        customFunctionsAndLibsUsedByComponents(site, order).codeLibraries,
      ).toEqual([[lib, "all"]]);
    }
  });
});

describe("componentToUsedImageAssets", () => {
  let site: Site;
  let tplMgr: TplMgr;
  const addAsset = (name: string, type: ImageAssetType) =>
    tplMgr.addImageAsset({
      name,
      type,
      dataUri: `https://example.com/${name}`,
    });
  const ref = (asset: ImageAsset) => new ImageAssetRef({ asset });
  const background = (...assets: ImageAsset[]) =>
    assets
      .map((a) => `${mkImageAssetRef(a)} top 50% left 50% / cover`)
      .join(", ");
  const mkImg = (baseVariant: Variant, asset: ImageAsset) =>
    mkTplTagX("img", {
      type: TplTagType.Image,
      baseVariant,
      attrs: { src: ref(asset) },
    });
  const mkIcon = (baseVariant: Variant, asset: ImageAsset) =>
    mkTplTagX("svg", {
      type: TplTagType.Image,
      baseVariant,
      attrs: { outerHTML: ref(asset) },
    });
  const addComponent = (tplTree: (baseVariant: Variant) => TplTag) => {
    const component = mkComponent({
      name: `Comp${site.components.length}`,
      type: ComponentType.Plain,
      tplTree,
    });
    site.components = [...site.components, component];
    return component;
  };
  const used = (component: Component) => {
    const assets = componentToUsedImageAssets(site, component);
    expect([...extractImageAssetRefsByAttrs(site, component)]).toEqual(assets);
    return assets.map((a) => a.name);
  };

  beforeEach(() => {
    site = createSite();
    tplMgr = new TplMgr({ site });
  });

  it("finds pictures and icons set in attrs, in every variant", () => {
    const photo = addAsset("photo", ImageAssetType.Picture);
    const hoverPhoto = addAsset("hoverPhoto", ImageAssetType.Picture);
    const icon = addAsset("icon", ImageAssetType.Icon);
    const hoverIcon = addAsset("hoverIcon", ImageAssetType.Icon);
    addAsset("unused", ImageAssetType.Picture);
    let img!: TplTag;
    let svg!: TplTag;
    const component = addComponent((baseVariant) => {
      img = mkImg(baseVariant, photo);
      svg = mkIcon(baseVariant, icon);
      return mkTplTagX("div", { baseVariant }, [img, svg]);
    });
    const hover = mkVariant({ name: "hover", selectors: [":hover"] });
    const imgVs = ensureVariantSetting(img, [hover]);
    imgVs.attrs = { ...imgVs.attrs, src: ref(hoverPhoto) };
    const svgVs = ensureVariantSetting(svg, [hover]);
    svgVs.attrs = { ...svgVs.attrs, outerHTML: ref(hoverIcon) };
    expect(used(component)).toEqual([
      "photo",
      "hoverPhoto",
      "icon",
      "hoverIcon",
    ]);
  });

  it("ignores an icon's src and a picture's outerHTML", () => {
    const photo = addAsset("photo", ImageAssetType.Picture);
    const icon = addAsset("icon", ImageAssetType.Icon);
    const component = addComponent((baseVariant) =>
      mkTplTagX("div", { baseVariant }, [
        mkTplTagX("img", {
          type: TplTagType.Image,
          baseVariant,
          attrs: { outerHTML: ref(icon) },
        }),
        mkTplTagX("svg", {
          type: TplTagType.Image,
          baseVariant,
          attrs: { src: ref(photo) },
        }),
      ]),
    );
    expect(used(component)).toEqual([]);
  });

  it("finds background images in rule sets, variant settings and mixins", () => {
    const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((name) =>
      addAsset(name, ImageAssetType.Picture),
    );
    const mixin = tplMgr.addMixin("bg mixin");
    mixin.rs.values = { ...mixin.rs.values, background: background(e) };
    let child!: TplTag;
    const component = addComponent((baseVariant) => {
      child = mkTplTagX("div", {
        baseVariant,
        styles: { background: background(b, c) },
      });
      return mkTplTagX(
        "div",
        { baseVariant, styles: { background: background(a) } },
        [child],
      );
    });
    const hover = mkVariant({ name: "hover", selectors: [":hover"] });
    const vs = ensureVariantSetting(child, [hover]);
    vs.rs.values = { ...vs.rs.values, background: background(d, a) };
    vs.rs.mixins = [...vs.rs.mixins, mixin];
    expect(used(component)).toEqual(["a", "b", "c", "e", "d"]);
  });

  it("finds background images of dependencies but not unknown ones", () => {
    const local = addAsset("local", ImageAssetType.Picture);
    const depSite = createSite();
    const depAsset = new TplMgr({ site: depSite }).addImageAsset({
      name: "fromDep",
      type: ImageAssetType.Picture,
    });
    site.projectDependencies = [
      new ProjectDependency({
        name: "Dep",
        pkgId: "dep-pkg-id",
        projectId: "dep-project-id",
        version: "0.0.1",
        uuid: "dep-uuid",
        site: depSite,
      }),
    ];
    const unknown = new TplMgr({ site: createSite() }).addImageAsset({
      name: "unknown",
      type: ImageAssetType.Picture,
    });
    const component = addComponent((baseVariant) =>
      mkTplTagX("div", {
        baseVariant,
        styles: { background: background(unknown, depAsset, local) },
      }),
    );
    expect(used(component)).toEqual(["fromDep", "local"]);
  });

  it("dedupes assets across tpls, in first-seen order", () => {
    const [a, b, c] = ["a", "b", "c"].map((name) =>
      addAsset(name, ImageAssetType.Picture),
    );
    const icon = addAsset("icon", ImageAssetType.Icon);
    const component = addComponent((baseVariant) =>
      mkTplTagX("div", { baseVariant, styles: { background: background(b) } }, [
        mkImg(baseVariant, a),
        mkIcon(baseVariant, icon),
        mkImg(baseVariant, b),
        mkTplTagX("div", {
          baseVariant,
          styles: { background: background(c, a) },
        }),
        mkIcon(baseVariant, icon),
        mkImg(baseVariant, c),
      ]),
    );
    expect(used(component)).toEqual(["b", "a", "icon", "c"]);
  });

  it("updates cached assets after background, mixin, and site asset edits", () => {
    const a = addAsset("a", ImageAssetType.Picture);
    const b = addAsset("b", ImageAssetType.Picture);
    const mixin = tplMgr.addMixin("background");
    mixin.rs.values = { background: background(a) };
    const component = addComponent((baseVariant) =>
      mkTplTagX("div", { baseVariant }),
    );
    const rs = ensureVariantSetting(component.tplTree, [
      component.variants[0],
    ]).rs;
    rs.mixins = [mixin];
    const recorder = new ChangeRecorder({ site });
    try {
      expect(used(component)).toEqual(["a"]);
      recorder.withRecording(() => {
        mixin.rs.values = { background: background(b) };
      });
      expect(used(component)).toEqual(["b"]);
      recorder.withRecording(() => {
        rs.values = { background: background(a) };
      });
      expect(used(component)).toEqual(["b", "a"]);
      recorder.withRecording(() => {
        mixin.rs.values = {};
        site.imageAssets = [a];
      });
      expect(used(component)).toEqual(["a"]);
      recorder.withRecording(() => {
        site.imageAssets = [a, b];
        mixin.rs.values = { background: background(b) };
      });
      expect(used(component)).toEqual(["b", "a"]);
    } finally {
      recorder.dispose();
    }
  });

  it("finds the icons of a component made only of icons", () => {
    const [x, y] = ["x", "y"].map((name) =>
      addAsset(name, ImageAssetType.Icon),
    );
    const component = addComponent((baseVariant) =>
      mkTplTagX("svg", {
        type: TplTagType.Image,
        baseVariant,
        attrs: { outerHTML: ref(x) },
        // An icon's background images aren't counted
        styles: { background: background(y) },
      }),
    );
    expect(used(component)).toEqual(["x"]);
    const empty = addComponent((baseVariant) =>
      mkTplTagX("div", { baseVariant }),
    );
    expect(used(empty)).toEqual([]);
  });
});

it("validates image references in the starter project", () => {
  const site = generateSiteFromBundle(_bundle as [string, Bundle][]);
  assertSiteInvariants(site);
});
