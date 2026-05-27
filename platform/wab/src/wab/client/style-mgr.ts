import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  VariantCombo,
  isActiveVariantSetting,
  isBaseVariant,
  tryGetBaseVariantSetting,
} from "@/wab/shared/Variants";
import {
  componentToDeepReferenced,
  extractComponentVariantSettings,
  flattenComponent,
} from "@/wab/shared/cached-selectors";
import {
  ComponentGenHelper,
  SiteGenHelper,
} from "@/wab/shared/codegen/codegen-helpers";
import {
  assert,
  ensure,
  maybe,
  tuple,
  withoutNils,
  xSetDefault,
} from "@/wab/shared/common";
import {
  getComponentDisplayName,
  isCodeComponent,
  isContextCodeComponent,
} from "@/wab/shared/core/components";
import {
  finalStyleTokensForDep,
  siteFinalStyleTokensAllDeps,
} from "@/wab/shared/core/site-style-tokens";
import {
  allComponents,
  allImageAssets,
  allMixins,
  isFrameRootTplComponent,
  isTplAttachedToSite,
} from "@/wab/shared/core/sites";
import {
  CssVarResolver,
  genCanvasRules,
  generateAnimationPropValue,
  generateKeyframesRule,
  makeDefaultStylesRuleBodyFor,
  makeDefaultStylesRules,
  mkCssVarsRuleForCanvas,
  studioDefaultStylesClassNameBase,
  tplMatchThemeStyle,
} from "@/wab/shared/core/styles";
import {
  isComponentRoot,
  isTplComponent,
  isTplTag,
  isTplVariantable,
  tplChildren,
} from "@/wab/shared/core/tpls";
import {
  Animation,
  Component,
  Mixin,
  ProjectDependency,
  TplNode,
  VariantSetting,
  isKnownTplTag,
} from "@/wab/shared/model/classes";
import {
  ChangeSummary,
  CssVarsChangeType,
} from "@/wab/shared/model/model-change-util";
import {
  getDependentVariantSettings,
  makeVariantComboSorter,
  sortedVariantSettings,
} from "@/wab/shared/variant-sort";
import { sortBy } from "lodash";

// @ts-ignore
import reactWebCss from "!!raw-loader!../gen/static/styles/react-web-css.txt";
import { valKeyProp, valOwnerProp } from "@/wab/shared/canvas-constants";
import { walkDependencyTree } from "@/wab/shared/core/project-deps";

export interface UpsertStyleChanges {
  variantSettings?: ReadonlyArray<
    [
      VariantSetting,
      {
        tpl: TplNode;
        updateDependentVSs?: boolean;
        updateChildren?: boolean;
      }
    ]
  >;
  deletedVariantSettings?: ReadonlyArray<[VariantSetting, TplNode]>;
  resetCssVars?: boolean;
  regenMixins?: Map<
    Mixin,
    { updateDependentVSs?: boolean; updateTplChildren?: boolean }
  >;
  updatedDeps?: Set<ProjectDependency>;
  deletedDeps?: Set<ProjectDependency>;
  rulesReorderedComponents?: Set<Component>;
}

interface VersionedStyleText {
  version: number;
  styleText: string;
}

/**
 * StyleMgr manages updating the style sheets inside artboards. Note that
 * right now, we are putting all styles for all components into each
 * artboard, which means every artboard has the same set of style sheets.
 *
 * There are two times when we need to update styles:
 *
 * 1. When an artboard first loads; we need to bulk-update it with all the
 *    style sheets.
 * 2. When a tpl, token, mixin, etc are updated; we want to re-generate and
 *    update as little as possible for performance.
 *
 * The strategy here is that we will create one <style/> element per component,
 * and then one for default styles, and one for the css variables (tokens /
 * mixins).  When a tpl style is updated, we re-generate the whole text content
 * of the style sheet for that component, and set it as the new textContent of
 * the corresponding style element.
 *
 * Alternative approaches:
 * - We used to put everything into a single giant style sheet. However, that
 *   means once we have a large project with tons of components, updating a
 *   single tpl node's styles means wiping out and resetting the textContent
 *   of the style element.  For large projects, this can cause a huge layout /
 *   style recalculation taking 200+ms, which makes it quite slow for things like
 *   dragging to move or resize.
 * - We've also tried to specifically manage CSSStyleSheet rules via insertRule
 *   and deleteRule.  However, creating rules this way is slower than setting
 *   styleElement.textContent for the initial load, though it is faster for
 *   subsequent surgical updates of specific rules.  It also requires a lot of
 *   tricky maintenance of indexes etc to know exactly which rules to update
 *   and where to insert a new rule. If the current scheme of one style sheet
 *   per component is still not performant enough, we may switch to managing
 *   CSSRules directly instead.
 */
export class StyleMgr {
  /** Default styles, immutable */
  private defaultStylesRule: string;

  /** Latest style text for css variables */
  private varsStyleText: VersionedStyleText;

  /** ProjectDependencies don't ened to be versioned because they are immutable */
  private depToStyleText: WeakMap<ProjectDependency, string> = new WeakMap();

  /** Components whose componentToVsRules and componentToStyleText are out of sync */
  private dirtyComponents = new Set<Component>();

  /** Mapping from Component to its latest style text */
  private componentToStyleText: WeakMap<Component, VersionedStyleText> =
    new WeakMap();

  /**
   * Mapping from Component to its descendant VariantSettings and corresponding css rules.
   * We keep track of them so we don't have to re-generate the css rules for all VariantSettings
   * every time we need to update componentToStyleText
   */
  private componentToVsRules: WeakMap<
    Component,
    { vs: VariantSetting; rules: string[] }[]
  > = new WeakMap();

  /**
   * Mapping from Mixin to the tpl node and VariantSettings that reference it.
   * If a mixin gets updated, the corresponding VariantSettings will have their
   * css rules be re-generated.
   */
  private mixinToVs = new WeakMap<Mixin, Map<TplNode, Set<VariantSetting>>>();

  private upsertedVSs = new Set<VariantSetting>();

  /**
   * Tracks active animation previews by tpl uuid.
   * When animations are previewing, the corresponding animation preview rules
   * will be appended to the component's stylesheet during buildComponentStyleText.
   * Cleared automatically when animation ends or animation is being played for same tpl
   * in another variant.
   */
  private activeAnimationPreviews = new Map<
    string,
    {
      tpl: TplNode;
      valKey: string;
      animations: Animation[];
      /** The valOwner key used to scope the animation CSS selector to the specific frame */
      frameValOwnerKey: string;
    }
  >();

  constructor(private studioCtx: StudioCtx) {
    this.defaultStylesRule = [
      ...makeDefaultStylesRules(`${studioDefaultStylesClassNameBase}__`, {
        targetEnv: "canvas",
      }),

      // Within rich text, Slate creates a lot of p and span that don't have
      // their styles reset.  We reset them here, in case they were styled
      // by global css with custom app host.
      //
      // <p/> need to have `position: static` so that, when used in rich text, it
      // doesn't start a new stacking context, and background can be clipped to it.
      // Note that we only need this on canvas, because slate uses p; our generated
      // code does not.  <span/> does as well, but that's already baked into
      // makeDefaultStyleRuleBodyFor("span").
      //
      // We use :where() to guarantee 0 css-specificity so rich text elements
      // styles can be customized (e.g. on the right sidebar).
      `:where(.__wab_rich_text p) {
        ${makeDefaultStylesRuleBodyFor("*")}
        ${makeDefaultStylesRuleBodyFor("p")}
        position: static;
      }`,
      `:where(.__wab_rich_text span) {
        ${makeDefaultStylesRuleBodyFor("*")}
        ${makeDefaultStylesRuleBodyFor("span")}
      }`,
    ].join("\n");

    this.resetStyles({ resetDeps: true });
  }

  resetStyles(opts: { resetDeps?: boolean }) {
    assert(
      this.dirtyComponents.size === 0,
      () =>
        `StyleMgr can't reset styles due to dirty components: ${[
          ...this.dirtyComponents.keys(),
        ]
          .map((c) => getComponentDisplayName(c))
          .join(", ")}`
    );

    // Clear all active animation previews before resetting styles
    this.activeAnimationPreviews.clear();

    this.updateCssVarsRule();
    this.componentToStyleText = new WeakMap();
    this.componentToVsRules = new WeakMap();

    if (opts.resetDeps) {
      for (const dep of this.studioCtx.site.projectDependencies) {
        this.updateProjectDep(dep);
      }
    }

    assert(
      this.dirtyComponents.size === 0,
      () =>
        `resetStyles added dirty components: ${[...this.dirtyComponents.keys()]
          .map((c) => getComponentDisplayName(c))
          .join(", ")}`
    );
  }

  upsertStyles(changes: UpsertStyleChanges) {
    assert(
      this.dirtyComponents.size === 0,
      () =>
        `StyleMgr can't upsertStyles due to dirty components: ${[
          ...this.dirtyComponents.keys(),
        ]
          .map((c) => getComponentDisplayName(c))
          .join(", ")}`
    );
    assert(this.upsertedVSs.size === 0, () => `Found stale upsertedVSs`);

    if (changes.variantSettings) {
      changes.variantSettings.forEach(([vs, opts]) => {
        if (opts.updateChildren) {
          tplChildren(opts.tpl).forEach(
            (child) =>
              isTplVariantable(child) &&
              this.upsertDependentRuleSets(child, vs.variants)
          );
        }
        if (opts.updateDependentVSs) {
          this.upsertDependentRuleSets(opts.tpl, vs.variants);
        } else {
          this.upsertRuleSet(opts.tpl, vs);
        }
      });
    }

    if (changes.deletedVariantSettings) {
      changes.deletedVariantSettings.forEach(([vs, tpl]) =>
        this.deleteRuleSet(tpl, vs)
      );
    }

    if (changes.resetCssVars) {
      this.updateCssVarsRule();
    }

    if (changes.regenMixins) {
      this.updateRulesReferencesMixins(changes.regenMixins);
    }

    // We handle deletedDeps then updatedDeps, because if the list of deps
    // gets updated, it looks like we deleted them and then added them
    if (changes.deletedDeps) {
      changes.deletedDeps.forEach((dep) => this.depToStyleText.delete(dep));
    }

    if (changes.updatedDeps) {
      changes.updatedDeps.forEach((dep) => this.updateProjectDep(dep));
    }

    if (changes.rulesReorderedComponents) {
      changes.rulesReorderedComponents.forEach((comp) =>
        this.reorderRules(comp)
      );
    }

    this.buildDirtyComponentStyleTexts();
    assert(
      this.dirtyComponents.size === 0,
      () =>
        `upsertStyles added dirty components: ${[...this.dirtyComponents.keys()]
          .map((c) => getComponentDisplayName(c))
          .join(", ")}`
    );

    this.upsertedVSs.clear();
  }

  private upsertDependentRuleSets(tpl: TplNode, combo: VariantCombo) {
    getDependentVariantSettings(tpl.vsettings, combo).forEach((vs) =>
      this.upsertRuleSet(tpl, vs)
    );
  }

  /**
   * Given the document of an artboard frame, makes sure it has all the
   * right <style/> elements
   */
  upsertStyleSheets(doc: Document, rootComp: Component) {
    const site = this.studioCtx.site;

    let frag: DocumentFragment | undefined = undefined;

    const upsertStyleSheet = (
      id: string,
      styleText: string,
      version?: number
    ) => {
      let style = doc.getElementById(id);
      if (!style) {
        style = doc.createElement("style");
        style.id = id;
      }
      style.textContent = styleText;
      if (version !== undefined) {
        style["data-version"] = version;
      }
      if (!frag) {
        frag = doc.createDocumentFragment();
      }
      frag.appendChild(style);
    };

    upsertStyleSheet("plasmic-react-web", reactWebCss);
    upsertStyleSheet("plasmic-defaults", this.defaultStylesRule);

    for (const dep of site.projectDependencies) {
      upsertStyleSheet(
        `plasmic-dep-${dep.uuid}`,
        ensure(
          this.depToStyleText.get(dep),
          () =>
            `No styleText for dep ${dep.name} v${dep.version} (uuid: ${
              dep.uuid
            }). Only know of: ${site.projectDependencies
              .filter((d) => this.depToStyleText.has(d))
              .map((d) => `${d.name} v${d.version} (uuid: ${d.uuid})`)
              .join(", ")}`
        )
      );
    }

    upsertStyleSheet(
      "plasmic-vars",
      this.varsStyleText.styleText,
      this.varsStyleText.version
    );

    const neededComps = componentToDeepReferenced(rootComp, true);
    for (const comp of neededComps) {
      if (isCodeComponent(comp) || !site.components.includes(comp)) {
        continue;
      }
      const compStyle = this.getComponentStyleText(comp);
      upsertStyleSheet(
        `plasmic-comp-${comp.uuid}`,
        compStyle.styleText,
        compStyle.version
      );
    }

    if (frag) {
      doc.head.appendChild(frag);
    }
  }

  private buildDirtyComponentStyleTexts() {
    this.dirtyComponents.forEach((comp) => this.buildComponentStyleText(comp));
    this.dirtyComponents.clear();
  }

  private getComponentStyleText(component: Component) {
    const siteGenHelper = new SiteGenHelper(this.studioCtx.site, true);
    const compGenHelper = new ComponentGenHelper(siteGenHelper, undefined);
    if (!this.componentToStyleText.has(component)) {
      const site = this.studioCtx.site;
      assert(
        !isCodeComponent(component) && site.components.includes(component),
        () =>
          `Component ${getComponentDisplayName(component)} (uuid: ${
            component.uuid
          }) is not in site.components`
      );

      const vsRules = xSetDefault(this.componentToVsRules, component, () => []);
      for (const [vs, tpl] of extractComponentVariantSettings(
        site,
        component,
        true
      )) {
        this.updateMixinToRs(tpl, vs);
        vsRules.push({
          vs,
          rules: genCanvasRules(compGenHelper, tpl, vs),
        });
      }

      this.buildComponentStyleText(component);
    }
    return this.componentToStyleText.get(component)!;
  }

  private buildComponentStyleText(component: Component) {
    const vsRules = ensure(
      this.componentToVsRules.get(component),
      () =>
        `Missing VsRules for component ${getComponentDisplayName(
          component
        )} (uuid: ${component.uuid})`
    ).filter((vs) => isActiveVariantSetting(this.studioCtx.site, vs.vs));
    const existingVersion =
      maybe(this.componentToStyleText.get(component), (x) => x.version) ?? 0;

    let styleText = vsRules.flatMap((x) => x.rules).join("\n");

    // Append temporary animation preview rules if active for this component
    for (const [
      _key,
      animationPreview,
    ] of this.activeAnimationPreviews.entries()) {
      const tplComponent = $$$(animationPreview.tpl).tryGetOwningComponent();
      if (tplComponent === component) {
        const animationPreviewRules = this.generateAnimationPreviewRules(
          animationPreview.valKey,
          animationPreview.animations,
          animationPreview.frameValOwnerKey
        );
        styleText += "\n" + animationPreviewRules;
      }
    }

    this.componentToStyleText.set(component, {
      version: existingVersion + 1,
      styleText,
    });
  }

  private updateCssVarsRule() {
    const site = this.studioCtx.site;
    const styleText = mkCssVarsRuleForCanvas(
      site,
      siteFinalStyleTokensAllDeps(this.studioCtx.site),
      allMixins(this.studioCtx.site, { includeDeps: "all" }),
      // We include local themes as well as active themes from our deps,
      // because the user can choose to activate one of those themes instead.
      // We include transitive deps active theme as well, because the direct dependency might have component, which
      // could import component from its dependency. Consider the site dependency as CurrSite (A) -> B -> C
      // If A is using component from B which uses component from C, we would need to include Site C active theme as well.
      [
        ...site.themes,
        ...withoutNils(
          walkDependencyTree(site, "all").map((dep) => dep.site.activeTheme)
        ),
      ],
      site.imageAssets,
      site.activeTheme ?? null
    );
    this.varsStyleText = {
      styleText,
      version: (this.varsStyleText?.version ?? 0) + 1,
    };
  }

  private updateProjectDep(dep: ProjectDependency) {
    const site = dep.site;

    const siteHelper = new SiteGenHelper(site, true);

    const allRules: string[] = [];

    const allDepTokens = finalStyleTokensForDep(this.studioCtx.site, site, {
      includeTransitiveDeps: "all",
    });
    const allDepMixins = allMixins(site, { includeDeps: "all" });
    const allDepImageAssets = allImageAssets(site, { includeDeps: "all" });
    allRules.push(
      mkCssVarsRuleForCanvas(
        site,
        allDepTokens,
        allDepMixins,
        site.themes,
        allDepImageAssets,
        null
      )
    );

    // We bake in the css var references for the dep site's components,
    // since they cannot be changed from this project anyway, and
    // we need to bake in the theme styles as the var name for the
    // currently-active theme is hard-coded as --mixin-default-*,
    // which would conflict with this project's theme. However, we don't
    // add tokens and mixins to CssVarResolver to avoid resolving
    // --token-* and --mixin-* to values since that would break
    // varianted tokens and mixins.
    const resolver = new CssVarResolver(
      [],
      [],
      allDepImageAssets,
      site.activeTheme
    );

    const allDepComponents = allComponents(site, { includeDeps: "all" });
    for (const component of allDepComponents) {
      // Code component doesn't have any interesting rules.
      if (isCodeComponent(component)) {
        continue;
      }
      const compHelper = new ComponentGenHelper(siteHelper, resolver);
      for (const [vs, tpl] of extractComponentVariantSettings(
        site,
        component,
        true
      )) {
        allRules.push(...genCanvasRules(compHelper, tpl, vs));
      }
    }

    const text = allRules.join("\n");
    this.depToStyleText.set(dep, text);
  }

  private deleteRuleSet(tpl: TplNode, vs: VariantSetting) {
    const site = this.studioCtx.site;
    if (!isTplAttachedToSite(site, tpl)) {
      return;
    }
    const component = $$$(tpl).tryGetOwningComponent();
    if (!component) {
      assert(
        isFrameRootTplComponent(site, tpl) ||
          (isTplComponent(tpl) && isContextCodeComponent(tpl.component)),
        () => `No owningComponent found for Tpl ${tpl.uuid}`
      );
      return;
    }

    this.dirtyComponents.add(component);
    const vsRules = xSetDefault(this.componentToVsRules, component, () => []);
    const index = vsRules.findIndex((x) => x.vs === vs);
    if (index >= 0) {
      vsRules.splice(index, 1);
    }

    // Clean up any active animation preview for this tpl
    // to prevent race conditions when elements are deleted during animation playback
    const key = this.makeAnimationKey(tpl);
    if (this.activeAnimationPreviews.has(key)) {
      this.cleanupActiveAnimationPreview(key);
    }
  }

  private reorderRules(component: Component) {
    this.dirtyComponents.add(component);
    const vsRules = xSetDefault(this.componentToVsRules, component, () => []);
    const sorter = makeVariantComboSorter(this.studioCtx.site, component);
    const sortedVsRules = sortBy(vsRules, (vr) => sorter(vr.vs.variants));
    this.componentToVsRules.set(component, sortedVsRules);
  }

  private upsertRuleSet(tpl: TplNode, vs: VariantSetting) {
    if (this.upsertedVSs.has(vs)) {
      // We've already upserted this RuleSet
      return;
    }
    this.upsertedVSs.add(vs);
    const site = this.studioCtx.site;
    if (!isTplAttachedToSite(site, tpl)) {
      // Because we are asynchronously syncing the styles, by the time we get to here,
      // it's possible that some of the TplNodes in the summary have already been
      // detached.  We just skip updating them.

      // It is also possible that the VariantSettings have changed since being scheduled;
      // that's okay, as that just means we'll be using more updated VariantSettings.
      return;
    }

    const component = $$$(tpl).tryGetOwningComponent();
    if (!component) {
      assert(
        isFrameRootTplComponent(site, tpl) ||
          (isTplComponent(tpl) && isContextCodeComponent(tpl.component)),
        () => `No owningComponent found for Tpl ${tpl.uuid}`
      );
      return;
    }

    this.dirtyComponents.add(component);

    if (
      !this.componentToStyleText.has(component) &&
      !isCodeComponent(component) &&
      site.components.includes(component)
    ) {
      // This is our first time encountering this component!  So just generate
      // the entire component style.  This is possible if we were asked to upsert
      // some parts of this component, but had never had to generate styles for
      // this component before; for example, if I update the root size of component A,
      // and component B has instances of component A, we would be asked to upsert
      // styles for instances of component A in component B, before we've had to
      // even render an instance of component B to the user.
      this.getComponentStyleText(component);

      // We also record that we've done the work already for all the vs under
      // this component
      for (const [vs2, _tpl] of extractComponentVariantSettings(
        site,
        component,
        false
      )) {
        this.upsertedVSs.add(vs2);
      }
    } else {
      // Else, we just modify the specific rule that we are upserting
      this.updateMixinToRs(tpl, vs);

      const compGenHelper = new ComponentGenHelper(
        new SiteGenHelper(site, true),
        undefined
      );
      const rules = genCanvasRules(compGenHelper, tpl, vs);
      const vsRules = xSetDefault(this.componentToVsRules, component, () => []);

      const findVsIndex = (vss: VariantSetting) =>
        vsRules.findIndex((x) => x.vs === vss);

      const existingIndex = findVsIndex(vs);
      if (existingIndex >= 0) {
        // There's an existing place for this vs, so use it
        vsRules[existingIndex].rules = rules;
      } else {
        // Else, we need to figure out the right place for this vs.
        const sortedVsettings =
          tpl.vsettings.length === 1
            ? [tpl.vsettings[0]]
            : sortedVariantSettings(
                tpl.vsettings,
                makeVariantComboSorter(site, component)
              );
        const curVsIndex = sortedVsettings.findIndex((x) => x === vs);

        // We assesrt that the argument `vs` has already been added to `tpl.vsettings`.
        assert(curVsIndex >= 0, () => `vs is not in tpl.vsettings`);

        const nextVs = sortedVsettings
          .slice(curVsIndex + 1)
          .find((vss) => findVsIndex(vss) >= 0);
        const nextIndex = nextVs ? findVsIndex(nextVs) : undefined;
        if (nextIndex === undefined) {
          vsRules.push({ vs, rules });
        } else {
          vsRules.splice(nextIndex, 0, { vs, rules });
        }
      }
    }
  }

  private addToMixinToVs(mixin: Mixin, tpl: TplNode, vs: VariantSetting) {
    const tpl2vss = this.mixinToVs.get(mixin);
    if (!tpl2vss) {
      this.mixinToVs.set(mixin, new Map([tuple(tpl, new Set([vs]))]));
    } else {
      const vss = tpl2vss.get(tpl);
      if (!vss) {
        tpl2vss.set(tpl, new Set([vs]));
      } else {
        vss.add(vs);
      }
    }
  }

  private updateMixinToRs(tpl: TplNode, vs: VariantSetting) {
    for (const mixin of vs.rs.mixins) {
      this.addToMixinToVs(mixin, tpl, vs);
    }

    // For TplTags and base variants, there may also be dependency on
    // theme mixins, even if their rs doesn't explicitly reference them.
    if (isKnownTplTag(tpl) && isBaseVariant(vs.variants)) {
      const styles = this.studioCtx.site.activeTheme?.styles || [];
      for (const style of styles) {
        if (tplMatchThemeStyle(style, tpl, [vs])) {
          this.addToMixinToVs(style.style, tpl, vs);
        }
      }

      const defaultStyle = this.studioCtx.site.activeTheme?.defaultStyle;
      if (defaultStyle && isComponentRoot(tpl)) {
        // Theme mixin only applied on component root
        this.addToMixinToVs(defaultStyle, tpl, vs);
      }
    }
  }

  private updateRulesReferencesMixins(
    mixins: Map<
      Mixin,
      { updateDependentVSs?: boolean; updateTplChildren?: boolean }
    >
  ) {
    for (const [mixin, opts] of mixins) {
      const refs = this.fixAndGetMixinRefs(mixin);
      for (const [tpl, vss] of refs) {
        for (const vs of vss) {
          if (opts.updateTplChildren) {
            tplChildren(tpl).forEach(
              (child) =>
                isTplVariantable(child) &&
                this.upsertDependentRuleSets(child, vs.variants)
            );
          }
          if (opts.updateDependentVSs) {
            this.upsertDependentRuleSets(tpl, vs.variants);
          } else {
            this.upsertRuleSet(tpl, vs);
          }
        }
      }
    }
  }

  private fixAndGetMixinRefs(mixin: Mixin) {
    let tpl2vss = this.mixinToVs.get(mixin);
    if (mixin.forTheme) {
      // Mixins in theme (default styles or default tag styles) do not work
      // like other mixins; in particular, they're not in vs.rs.mixins and
      // don't need to be updated like the other ones.

      if (tpl2vss) {
        // If the mixin is in mixinToVs, we're already tracking its variant
        // settings.
        return Array.from(tpl2vss.entries());
      }

      const site = this.studioCtx.site;

      const isDefaultStyle = site.activeTheme?.defaultStyle.uuid === mixin.uuid;
      const style = (site.activeTheme?.styles || []).find(
        (s) => s.style.uuid === mixin.uuid
      );
      if (!style && !isDefaultStyle) {
        // Can't find a ThemeStyle corresponding to the given mixin.  Weird?
        return [];
      }

      // We have a new tag style, that we will apply to all matching TplTags
      // in site.
      tpl2vss = new Map<TplNode, Set<VariantSetting>>();
      for (const component of allComponents(site)) {
        if (style) {
          // If this is a selector-specific theme style (for <a/> etc),
          // then look for all elements that satisfy the selector.
          for (const tpl of flattenComponent(component)) {
            if (!isTplTag(tpl)) {
              continue;
            }
            // Theme styles only apply on the base variant
            const baseVs = tryGetBaseVariantSetting(tpl);
            if (!baseVs) {
              continue;
            }
            if (tplMatchThemeStyle(style, tpl, [baseVs])) {
              xSetDefault(tpl2vss, tpl, () => new Set()).add(baseVs);
            }
          }
        } else {
          // Else this is the default theme, which is only applied on
          // component root.
          const tpl = component.tplTree;
          if (isTplTag(tpl)) {
            const baseVs = tryGetBaseVariantSetting(tpl);
            if (baseVs) {
              xSetDefault(tpl2vss, tpl, () => new Set()).add(baseVs);
            }
          }
        }
      }
      this.mixinToVs.set(mixin, tpl2vss);

      return Array.from(tpl2vss.entries());
    } else {
      if (!tpl2vss) {
        return [];
      }

      const validRefs = Array.from(tpl2vss.entries())
        .map(([tpl, vss]) =>
          tuple(
            tpl,
            Array.from(vss).filter((vs) => vs.rs.mixins.includes(mixin))
          )
        )
        .filter(([_tpl, vss]) => vss.length > 0);

      this.mixinToVs.set(
        mixin,
        new Map(validRefs.map(([tpl, vss]) => tuple(tpl, new Set(vss))))
      );
      return validRefs;
    }
  }

  /**
   * Creates a unique key for tracking active animations based on tpl.
   */
  private makeAnimationKey(tpl: TplNode): string {
    return tpl.uuid;
  }

  /**
   * Check if there is an active animation preview for the given tpl.
   */
  hasActiveAnimationPreview(tpl: TplNode): boolean {
    const key = this.makeAnimationKey(tpl);
    return this.activeAnimationPreviews.has(key);
  }

  /**
   * Stop an active animation preview for the given tpl.
   */
  stopAnimationPreview(tpl: TplNode): void {
    const key = this.makeAnimationKey(tpl);
    this.cleanupActiveAnimationPreview(key);
  }

  /**
   * Stop all active animation previews. Called during major state transitions
   * like arena changes, focus mode changes, etc.
   */
  stopAllAnimationPreviews(): void {
    const keys = Array.from(this.activeAnimationPreviews.keys());
    for (const key of keys) {
      this.cleanupActiveAnimationPreview(key);
    }
  }

  /**
   * Generate CSS rules for animation preview including @keyframes and animation property.
   * @param valKey The valKey (data-plasmic-valkey) to target the element
   * @param animations The animations to preview
   * @param frameValOwnerKey valOwner key to scope the animation to a specific frame.
   *                 the selector is scoped to elements within that frame
   *                 to prevent animations from playing in other frames (e.g., different
   *                 screen variant frames that share the same base variant class).
   */
  private generateAnimationPreviewRules(
    valKey: string,
    animations: Animation[],
    frameValOwnerKey: string
  ): string {
    const rules: string[] = [];

    // Generate @keyframes rules
    animations.forEach((anim) => {
      rules.push(generateKeyframesRule(anim.sequence));
    });

    // Generate animation property rule with optional frame scoping
    const animationProp = generateAnimationPropValue(animations);
    if (animationProp) {
      const baseSelector = `[${valKeyProp}="${valKey}"]`;
      // Scope the selector to elements within that frame using frameValOwner
      // This prevents animations from playing in other frames that share the same
      // base variant class (e.g., when previewing base variant animation, it shouldn't
      // play in mobile variant frame which also has the base variant class).
      const selector = `[${valOwnerProp}="${frameValOwnerKey}"] ${baseSelector}`;
      rules.push(`${selector} { animation: ${animationProp}; }`);
    }

    return rules.join("\n");
  }

  /**
   * Play animation preview on the canvas by temporarily adding animation rules
   * to the component's stylesheet. The rules are automatically removed when
   * the animation completes.
   * @param tpl The TplNode to animate
   * @param animations The animations to preview. This should come from
   *        getAnimationsFromDefinedIndicatorType() which properly handles
   *        inherited animations from other variants (e.g., base variant).
   */
  async playAnimationPreview(tpl: TplNode, animations: Animation[]) {
    const focusedViewCtx = this.studioCtx.focusedViewCtx();
    if (!focusedViewCtx || animations.length === 0) {
      return;
    }

    const component = $$$(tpl).tryGetOwningComponent();
    if (!component) {
      return;
    }

    // Resolve the tpl to its ValNode to get the valKey (data-plasmic-valkey),
    // which is always present on the DOM element regardless of active variant.
    const vals = focusedViewCtx.maybeTpl2ValsInContext(tpl);
    if (vals.length === 0) {
      return;
    }
    const valKey = vals[0].key;

    // Get the valOwner (valKey of the frame's user root) to scope the animation
    // to this specific frame. This prevents the animation from playing in other
    // frames that may share the same base variant class.
    const frameValOwnerKey = ensure(
      focusedViewCtx.valState().maybeValUserRoot()?.valOwner,
      "ValOwner must exist"
    ).key;

    const key = this.makeAnimationKey(tpl);

    // Set the active animation preview in the Map
    const currentPreview = {
      tpl,
      valKey,
      animations,
      frameValOwnerKey,
    };
    this.activeAnimationPreviews.set(key, currentPreview);

    // Mark component dirty and rebuild with animation rules
    this.dirtyComponents.add(component);
    this.buildDirtyComponentStyleTexts();

    // Immediately update the DOM <style> element for focused viewCtx
    const document = focusedViewCtx.canvasCtx.doc();
    this.upsertStyleSheets(document, focusedViewCtx.component);

    // Sync styles to all frames so that any previous frame playing the same
    // tpl's animation picks up the rebuilt stylesheet (which no longer has
    // the old frame's animation rule).
    this.studioCtx.styleMgrBcast.syncStyles();
    this.studioCtx.animationChanged.dispatch();

    // Listen for animation end to clean up
    const selector = `[${valKeyProp}="${valKey}"]`;
    const animatedElement = document.querySelector(selector);

    if (animatedElement) {
      try {
        await Promise.all(
          animatedElement.getAnimations().map((animation) => animation.finished)
        );
      } catch (error) {
        // When an animation is cancelled the Promise rejects with AbortError.
        if (error.name !== "AbortError") {
          throw error;
        }
      }

      // Only clean up if this is still our current preview. A newer playAnimationPreview
      // call for the same tpl (e.g., in a different frame) may have replaced it.
      if (this.activeAnimationPreviews.get(key) === currentPreview) {
        this.cleanupActiveAnimationPreview(key);
      }
    }
  }

  /**
   * Stop and clean up the animation preview by clearing the active preview
   * and regenerating the component stylesheet without animation rules.
   */
  private cleanupActiveAnimationPreview(key: string) {
    const preview = this.activeAnimationPreviews.get(key);
    if (!preview) {
      return;
    }

    const { tpl } = preview;
    const component = $$$(tpl).tryGetOwningComponent();
    if (!component) {
      return;
    }

    // Clear the active animation preview from the Map
    this.activeAnimationPreviews.delete(key);

    // Mark component dirty and rebuild style text
    this.dirtyComponents.add(component);
    this.buildDirtyComponentStyleTexts();

    // Sync styles for all viewCtx asynchronously
    this.studioCtx.styleMgrBcast.syncStyles();
    // Dispatch animationChanged signal so AnimationSection can re-render and update its preview state for active animations
    this.studioCtx.animationChanged.dispatch();
  }
}

export function summaryToStyleChanges(
  summary: ChangeSummary
): UpsertStyleChanges | undefined {
  const resetCssVars = [
    CssVarsChangeType.CssVarsOnly,
    CssVarsChangeType.MixinRulesSpliced,
    CssVarsChangeType.ActiveThemeChanged,
  ].includes(summary.tokenOrMixinChangeType);
  if (
    summary.updatedRuleSets.size === 0 &&
    summary.deletedVariantSettings.size === 0 &&
    summary.regenMixins.size === 0 &&
    !resetCssVars &&
    summary.updatedDeps.size === 0 &&
    summary.deletedDeps.size === 0 &&
    summary.rulesReorderedComponents.size === 0
  ) {
    // Nothing to do!
    return undefined;
  }

  return {
    variantSettings: Array.from(summary.updatedRuleSets.entries()),
    deletedVariantSettings: Array.from(
      summary.deletedVariantSettings.entries()
    ),
    resetCssVars,
    regenMixins: summary.regenMixins,
    updatedDeps: summary.updatedDeps,
    deletedDeps: summary.deletedDeps,
    rulesReorderedComponents: summary.rulesReorderedComponents,
  };
}
