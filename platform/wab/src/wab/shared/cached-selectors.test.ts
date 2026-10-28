import { getTplSlots } from "@/wab/shared/SlotUtils";
import {
  cachedExprsInSite,
  componentToDeepReferenced,
  componentToElementNames,
  componentToReferenced,
  componentToReferencers,
  componentToTplComponents,
  componentToUsedMixins,
  deepComponentToReferencers,
  findNonEmptyCombos,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import { arrayWithout } from "@/wab/shared/collections";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { ChangeRecorder } from "@/wab/shared/core/observable-model";
import { createSite } from "@/wab/shared/core/sites";
import {
  flattenTpls,
  isTplComponent,
  mkTplComponent,
  mkTplTagX,
} from "@/wab/shared/core/tpls";
import mobx from "@/wab/shared/import-mobx";
import {
  Component,
  Site,
  TplTag,
  Variant,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
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
