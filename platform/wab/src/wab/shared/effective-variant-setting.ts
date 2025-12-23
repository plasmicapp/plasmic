import L from "lodash";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { computed, isObservable, makeObservable } from "mobx";

import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { DeepReadonly, DeepReadonlyArray } from "@/wab/commons/types";
import {
  ReadonlyIRuleSetHelpersX,
  readonlyRSH,
} from "@/wab/shared/RuleSetHelpers";
import {
  getAncestorSlotArg,
  getAncestorTplSlot,
  getTplSlotForParam,
  isSlot,
  isTypographyNode,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import {
  VariantCombo,
  isBaseVariant,
  isGlobalVariant,
  tryGetVariantSetting,
} from "@/wab/shared/Variants";
import { arrayReversed } from "@/wab/shared/collections";
import {
  arrayEq,
  arrayEqIgnoreOrder,
  assert,
  ensure,
  isTruthy,
  withoutNils,
} from "@/wab/shared/common";
import { clone } from "@/wab/shared/core/exprs";
import { inheritableTypographyCssProps } from "@/wab/shared/core/style-props";
import {
  cloneRuleSet,
  createExpandedRuleSetMerger,
  createRuleSetMerger,
  expandRuleSets,
  tplMatchThemeStyle,
} from "@/wab/shared/core/styles";
import {
  cloneArgs,
  cloneAttrs,
  cloneColumnsConfig,
  cloneDataRep,
  cloneRichText,
  fixTextChildren,
  getOwnerSite,
  getRichTextContent,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  reconnectChildren,
} from "@/wab/shared/core/tpls";
import {
  ArgSource,
  AttrSource,
  ColumnsConfigSource,
  ParentTplStyleSource,
  SlotSource,
  ThemeSource,
  ThemeTagSource,
  VariantSettingSource,
  VisibilitySource,
} from "@/wab/shared/defined-indicator";
import { makeLayoutAwareRuleSet } from "@/wab/shared/layoututils";
import {
  Arg,
  Component,
  CustomCode,
  Expr,
  ObjectPath,
  Param,
  Rep,
  RuleSet,
  Site,
  TplComponent,
  TplNode,
  Variant,
  VariantSetting,
  ensureKnownTplComponent,
  isKnownVariantsRef,
} from "@/wab/shared/model/classes";
import { makeReadonlySizeAwareExpProxy } from "@/wab/shared/sizingutils";
import {
  VariantComboSorter,
  isAncestorCombo,
  makeVariantComboSorter,
  sortedVariantSettingStack,
} from "@/wab/shared/variant-sort";
import {
  getVariantSettingVisibility,
  hasVisibilitySetting,
} from "@/wab/shared/visibility-utils";

/**
 * Data structure for parent Tpl style inheritance information.
 * Contains all fields from ParentTplStyleSource except type, prop, and value,
 * plus a styleValues record containing all inheritable CSS properties.
 */
type ParentTplStyleData = (
  | Omit<ParentTplStyleSource, "prop" | "value">
  | Omit<SlotSource, "prop" | "value">
) & {
  styleValues: Record<string, string>;
};

/**
 * Extracts inheritable typography CSS properties from a RuleSetHelper.
 * Only returns properties that are set (non-empty values).
 *
 * @param rsh - The RuleSetHelper to extract styles from
 * @returns Record of CSS property names to their values
 */
function getInheritableStyles(
  rsh: ReadonlyIRuleSetHelpersX
): Record<string, string> {
  const inheritableValues: Record<string, string> = {};
  for (const prop of inheritableTypographyCssProps) {
    if (rsh.has(prop)) {
      const value = rsh.getRaw(prop);
      if (value) {
        inheritableValues[prop] = value;
      }
    }
  }
  return inheritableValues;
}

/**
 * A class that helps with reading VariantSettings from a stack of
 * VariantSettings. It will merge things like args or rulse sets across the
 * VariantSettings inheritance.
 */
export class EffectiveVariantSetting {
  private activeVariants: Variant[];
  private vsh: VariantedStylesHelper;

  constructor(
    private tpl: TplNode,
    public variantSettings: VariantSetting[],
    private site?: Site,
    activeVariants?: Variant[]
  ) {
    if (isObservable(tpl)) {
      makeObservable(this, {
        rs: computed,
        dataRep: computed,
        dataCond: computed,
        attrs: computed,
        args: computed,
        text: computed,
        columnsConfig: computed,
        parentArgSlotVs: computed,
        parentSlotVs: computed,
        themeRsh: computed,
        potentialPropSources: computed,
        parentStyleValues: computed,
      });
    }

    if (activeVariants) {
      activeVariants = activeVariants.filter((v) => !isBaseVariant(v));
      assert(
        variantSettings.every((vs) =>
          isAncestorCombo(activeVariants!, vs.variants)
        ),
        "Variants in vsetting are expected to be ancestor combo of active variants"
      );
      this.activeVariants = [...activeVariants];
    } else {
      this.activeVariants = [
        ...new Set(this.variantSettings.flatMap((vs) => vs.variants)),
      ];
    }

    this.vsh = new VariantedStylesHelper(
      site,
      this.activeVariants.filter((v) => isGlobalVariant(v))
    );
  }

  /**
   * Array of Args merged across VariantSettings stack
   */
  get args(): DeepReadonlyArray<Arg> {
    const vss = this.variantSettings;
    if (vss.length === 0) {
      return [];
    } else if (vss.length === 1) {
      return vss[0].args;
    }
    const seen = new Map<Param, Arg>();
    for (const vs of this.variantSettings) {
      for (const arg of vs.args) {
        seen.set(arg.param, arg);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * attrs dict merged across VariantSettings stack
   */
  get attrs(): Readonly<Record<string, DeepReadonly<Expr>>> {
    const attrs: Record<string, Expr> = {};
    for (const vs of this.variantSettings) {
      for (const key in vs.attrs) {
        attrs[key] = vs.attrs[key];
      }
    }
    return attrs;
  }

  get dataCond(): DeepReadonly<CustomCode | ObjectPath> | undefined | null {
    for (const vs of arrayReversed(this.variantSettings)) {
      if (vs.dataCond) {
        return vs.dataCond;
      }
    }
    return undefined;
  }

  get dataRep(): DeepReadonly<Rep> | undefined | null {
    for (const vs of arrayReversed(this.variantSettings)) {
      if (vs.dataRep) {
        return vs.dataRep;
      }
    }
    return undefined;
  }

  /**
   * RuleSetMerger across VariantSettings.rs
   */
  private _rsh(
    opts: {
      includeTheme?: boolean;
      includeParentTpl?: boolean;
      includeMixins?: boolean;
    } = { includeTheme: true, includeParentTpl: false, includeMixins: true }
  ): ReadonlyIRuleSetHelpersX {
    const rulesets = this.getEffectiveRuleSets(opts);
    const expanded = opts.includeMixins ? expandRuleSets(rulesets) : rulesets;
    return makeReadonlySizeAwareExpProxy(
      createRuleSetMerger(expanded, this.tpl),
      this.tpl
    );
  }

  rsh = () => {
    return this._rsh({
      includeTheme: false,
      includeParentTpl: false,
    });
  };

  rshWithTheme = () => {
    return this._rsh({
      includeTheme: true,
      includeParentTpl: false,
    });
  };

  rshWithThemeAndParentStyle = () => {
    return this._rsh({
      includeTheme: true,
      includeParentTpl: true,
    });
  };

  rshWithoutMixins = () => {
    return this._rsh({
      includeTheme: false,
      includeParentTpl: false,
      includeMixins: false,
    });
  };

  get rs(): RuleSet {
    const reversed = arrayReversed(this.variantSettings.map((vs) => vs.rs));
    return new RuleSet({
      // later vs overrides earlier vs
      values: Object.assign(
        {},
        ...this.variantSettings.map((vs) => vs.rs.values)
      ),
      mixins: L.uniq(L.flatten(reversed.map((rs) => rs.mixins))),
      animations: L.uniq(L.flatten(reversed.map((rs) => rs.animations ?? []))),
    });
  }

  private getEffectiveRuleSets(
    opts: {
      includeTheme?: boolean;
      includeParentTpl?: boolean;
      includeMixins?: boolean;
    } = { includeTheme: true, includeParentTpl: false, includeMixins: true }
  ): DeepReadonlyArray<RuleSet> {
    const site = this.site;
    const vsettings = this.variantSettings;
    const tpl = this.tpl;
    const self = this;

    const rss: RuleSet[] = [];
    // Lowest priority is the theme default style ruleset
    if (opts.includeTheme) {
      const activeTheme = site ? site.activeTheme : undefined;
      if (activeTheme) {
        if (isTypographyNode(tpl)) {
          rss.push(
            self.vsh.getActiveVariantedRuleSet(activeTheme.defaultStyle)
          );
        }
      }
    }

    // Next priority is parent Tpl inheritance (CSS inheritance from parent containers)
    // This now includes slot inheritance as slots are treated as parent Tpls
    if (opts.includeParentTpl) {
      const parentTplRuleSet = self.getParentTplRuleSet();
      if (parentTplRuleSet) {
        rss.push(parentTplRuleSet);
      }
    }

    // Theme tag styles have higher priority than parent Tpl
    if (opts.includeTheme) {
      const activeTheme = site ? site.activeTheme : undefined;
      if (activeTheme) {
        // Default tag style.
        if (isTplTag(tpl)) {
          const tagStyles = L.sortBy(
            activeTheme.styles.filter((s) =>
              tplMatchThemeStyle(s, tpl, vsettings)
            ),
            // Selectors with no pseudo-class first.
            (s) => s.selector.split(":").length
          );
          for (const tagStyle of tagStyles) {
            rss.push(self.vsh.getActiveVariantedRuleSet(tagStyle.style));
          }
        }
      }
    }

    // Finally, the styles set directly on this node are highest precedence
    for (const vs of vsettings) {
      const rs = makeLayoutAwareRuleSet(vs.rs, isBaseVariant(vs.variants));
      rss.push(
        opts.includeMixins
          ? rs
          : new RuleSet({
              values: rs.values,
              mixins: [],
              animations: rs.animations,
            })
      );
    }

    return rss;
  }

  getTextSource(viewCtx: ViewCtx): Array<VariantSettingSource> | undefined {
    const vsettings = this.variantSettings;
    const stack = new Array<VariantSettingSource>();
    for (const vs of vsettings) {
      if (vs.text) {
        stack.push({
          type: "text" as const,
          combo: vs.variants,
          value: ensure(
            getRichTextContent(vs.text, viewCtx),
            "Unable to get richtext content from text"
          ),
        });
      }
    }
    return stack.length > 0 ? stack : undefined;
  }

  /**
   * Returns a bunch of potential sources where a style prop value may
   * come from.  Meant to be used by getPropSource(), but without
   * the source prop you are looking for, so that its result is
   * cacheable and reusable across all props.
   */
  get potentialPropSources() {
    const self = this;
    const tpl = this.tpl;
    function* genSources() {
      const themeRsh = self.themeRsh;
      if (themeRsh) {
        yield { type: "theme", rsh: themeRsh } as const;
      }

      // Parent Tpl inheritance has the lowest priority - it's CSS inheritance
      // which should be overridden by any directly-set styles (themeTag, mixins, etc.)
      if (isTypographyNode(tpl)) {
        yield { type: "parentTpl" } as const;
      }

      const themeTagStyles = self.themeTagStyles;
      for (const themeTagStyle of themeTagStyles) {
        yield { type: "themeTag", ...themeTagStyle } as const;
      }

      for (const vs of self.variantSettings) {
        // A tpl may also get styles from its mixins
        for (const mixin of vs.rs.mixins) {
          const mixinRsh = createExpandedRuleSetMerger(
            makeLayoutAwareRuleSet(mixin.rs, false),
            tpl
          );
          yield {
            type: "mixin",
            combo: vs.variants,
            mixin: mixin,
            rsh: mixinRsh,
          } as const;
        }

        // Finally, a tpl can get styles that are set on itself.  These styles
        // may be directly set, or derived from other directly-set styles
        const rsh = readonlyRSH(vs.rs, tpl);
        const derivedRsh = readonlyRSH(
          makeLayoutAwareRuleSet(vs.rs, isBaseVariant(vs.variants)),
          tpl
        );
        yield {
          type: "tpl",
          combo: vs.variants,
          rsh,
          derivedRsh,
        } as const;
      }
    }

    return [...genSources()];
  }

  /**
   * Cached array of parent Tpl nodes with their computed style values.
   * Traverses from closest to furthest parent, crossing slot boundaries and
   * component boundaries as needed (matching the rendered DOM structure).
   * Extracts inheritable properties from each parent's RuleSet (computed styles
   * from all sources: direct styles, mixins, themes, etc.).
   *
   * Stores the activeVariants used for each parent so the UI can reconstruct
   * the RSH independently (important for cross-component inheritance).
   *
   * This is a MobX computed property, so the parent traversal and style computation
   * is cached and only re-computed when the parent tree or activeVariants change.
   */
  get parentStyleValues(): ParentTplStyleData[] {
    const result: ParentTplStyleData[] = [];

    /**
     * Queue item representing a traversal context.
     * Each item tracks:
     * - tpl: The node whose parent hierarchy we're exploring
     * - activeVariants: The variants active in this context (changes across slot boundaries)
     * - tplComponent: The TplComponent context when traversing through external component's tpls via slots
     */
    interface QueueItem {
      tpl: TplNode;
      activeVariants: Variant[];
      tplComponent?: TplComponent;
    }

    const queue: QueueItem[] = [
      {
        tpl: this.tpl,
        activeVariants: this.activeVariants,
      },
    ];

    while (queue.length > 0) {
      const item = queue.shift()!;

      // Traverse up the direct parent chain collecting inheritable styles from each ancestor.
      // Stop at TplComponent boundaries since components encapsulate their internal styles and apply root resets.
      let parent = item.tpl.parent;
      while (parent && !isTplComponent(parent)) {
        const effectiveVs = getEffectiveVariantSetting(
          parent,
          item.activeVariants
        );

        if (isTplSlot(parent)) {
          // If this tpl is a descendant of a TplSlot (which means it is a
          // default content), then it may also inherit css styles from the
          // TplSlot.
          const slotRsh = effectiveVs.rsh();
          const inheritableValues = getInheritableStyles(slotRsh);
          if (Object.keys(inheritableValues).length > 0) {
            result.push({
              type: "slot",
              parentTpl: parent,
              styleValues: inheritableValues,
              activeVariants: item.activeVariants,
              param: parent.param,
            });
          }
        } else {
          const rsh = effectiveVs.rshWithTheme();
          const inheritableValues = getInheritableStyles(rsh);

          if (Object.keys(inheritableValues).length > 0) {
            result.push({
              type: "parentTplStyle",
              parentTpl: parent,
              styleValues: inheritableValues,
              activeVariants: item.activeVariants,
              tplComponent: item.tplComponent,
            });
          }
        }

        parent = parent.parent;
      }

      // Check if this tpl is used as slot content (passed into a component's instance slot).
      // If so, it should inherit styles from the TplSlot or its parent hierarchy.
      const parentArgSlotVs = getParentArgSlotVs(item.tpl, item.activeVariants);
      if (parentArgSlotVs) {
        // Collect styles directly set on the TplSlot element itself. These styles apply to all content passed into this slot.
        const slotEffectiveVs = getEffectiveVariantSetting(
          parentArgSlotVs.slot,
          parentArgSlotVs.slotVs.activeVariants
        );
        const slotRsh = slotEffectiveVs.rsh();
        const slotInheritableValues = getInheritableStyles(slotRsh);

        if (Object.keys(slotInheritableValues).length > 0) {
          result.push({
            type: "slot",
            parentTpl: parentArgSlotVs.slot,
            styleValues: slotInheritableValues,
            activeVariants: parentArgSlotVs.slotVs.activeVariants,
            tplComponent: parentArgSlotVs.tplComponent,
            param: parentArgSlotVs.arg.param,
          });
        }

        // Continue inheritance traversal from the TplSlot's context.
        // This also handles nested slots (when a slot is itself inside another component's slot).
        queue.push({
          tpl: parentArgSlotVs.slot,
          activeVariants: parentArgSlotVs.slotVs.activeVariants,
          tplComponent: parentArgSlotVs.tplComponent,
        });
      }
    }

    return result;
  }

  /**
   * Gets the parent Tpl that provides an inherited CSS property value.
   * Only returns a source if the property is inheritable (typography CSS props).
   * Traverses up the parent chain until it finds a parent with the property set,
   * stopping at component boundaries.
   *
   * Uses the cached parentStyleValues computed property for optimal performance.
   * Includes the activeVariants that were used for computing the parent's styles,
   * allowing the UI to reconstruct the RSH independently.
   *
   * @param prop - The CSS property to look for
   * @returns ParentTplStyleSource or SlotSource or SlotSelectionSource if found, undefined otherwise
   */
  getInheritableTplStyleSource(
    prop: string
  ): ParentTplStyleSource | SlotSource | undefined {
    // Only inheritable properties can come from parent Tpls
    if (!inheritableTypographyCssProps.includes(prop)) {
      return undefined;
    }

    // Find the closest parent that has this property set
    // parentStyleValues is ordered from closest to furthest
    for (const parentStyleValue of this.parentStyleValues) {
      if (prop in parentStyleValue.styleValues) {
        const { styleValues, ...rest } = parentStyleValue;
        const value = styleValues[prop];

        return {
          ...rest,
          prop,
          value,
        };
      }
    }

    return undefined;
  }

  /**
   * Creates a RuleSet containing all inheritable CSS properties from parent Tpls.
   * Walks up the parent chain and merges all style attributes, with closer ancestors
   * overriding further ones.
   * Only works for typography nodes and stops at component boundaries.
   *
   * Uses the cached parentStyleValues computed property for optimal performance.
   *
   * @returns RuleSet with inherited properties, or undefined if none found
   */
  private getParentTplRuleSet(): RuleSet | undefined {
    // Only typography nodes can inherit CSS properties
    if (!isTypographyNode(this.tpl)) {
      return undefined;
    }

    // parentStyleValues is ordered from closest to furthest
    // Process from furthest to closest (reverse order) so closer parents override
    // Note: parentStyleValues already contains only inheritable properties
    const inheritedValues = [...this.parentStyleValues]
      .reverse()
      .reduce(
        (acc, { styleValues }) => Object.assign(acc, styleValues),
        {} as Record<string, string>
      );

    // Only return a RuleSet if we found any inherited properties
    if (Object.keys(inheritedValues).length > 0) {
      return new RuleSet({
        values: inheritedValues,
        mixins: [],
        animations: [],
      });
    }

    return undefined;
  }

  getPropSource(prop: string): Array<VariantSettingSource> | undefined {
    const site = this.site;
    const tpl = this.tpl;
    const variantSettings = this.variantSettings;
    const self = this;

    const potentialSources = this.potentialPropSources;

    function* genPropSources() {
      for (const candidate of potentialSources) {
        if (candidate.type === "theme") {
          if (candidate.rsh.has(prop)) {
            yield {
              type: "theme",
              theme: ensure(
                ensure(site, "Site is expected to be not null").activeTheme,
                "Site should have an active theme"
              ),
              value: ensure(
                candidate.rsh.getRaw(prop),
                "Prop is expected to have a value"
              ),
              prop,
            } as ThemeSource;
          }
        } else if (candidate.type === "themeTag") {
          assert(isTplTag(tpl), "Non-TplTag can't use themeTag as prop source");
          if (candidate.rsh.has(prop)) {
            yield {
              type: "themeTag",
              selector: candidate.selector,
              theme: ensure(
                ensure(site, "Site is expected to be not null").activeTheme,
                "Site should have an active theme"
              ),
              value: ensure(
                candidate.rsh.getRaw(prop),
                "Prop is expected to have a value"
              ),
              prop,
            } as ThemeTagSource;
          }
        } else if (candidate.type === "parentTpl") {
          // This is a marker to check for parent Tpl inheritance
          // Parent Tpl styles have lower priority than mixins and direct styles
          // but higher priority than slots
          if (isTypographyNode(tpl)) {
            const parentTplSource = self.getInheritableTplStyleSource(prop);
            if (parentTplSource) {
              yield parentTplSource;
            }
          }
        } else if (candidate.type === "mixin") {
          if (candidate.rsh.has(prop)) {
            yield {
              type: "mixin" as const,
              combo: candidate.combo,
              mixin: candidate.mixin,
              value: ensure(
                candidate.rsh.getRaw(prop),
                "Prop is expected to have a value"
              ),
              prop,
            };
          }
        } else if (candidate.type === "tpl") {
          if (prop === "animation") {
            // Special handling for animations - look in the variant setting's animations array
            const vs = variantSettings.find((variantSetting) =>
              arrayEqIgnoreOrder(variantSetting.variants, candidate.combo)
            );

            // There are three possible cases here for animations
            // 1. animations.length exists means we have added an animation in a given variant combo, we want to yield style
            // 2. animations prop is empty list [] in a given variant combo, we want to yield style to depict animation is overridden to empty state in target variant combo.
            // 3. animations props is null, refers to no overrides, we don't want to yield style in this case so it can inherit from "otherVariants" source.
            if (vs && isTruthy(vs.rs.animations)) {
              yield {
                type: "style" as const,
                combo: candidate.combo,
                value:
                  vs.rs.animations
                    .map((anim) => anim.sequence.name)
                    .join(", ") ?? "No animations",
                prop,
                animations: vs.rs.animations,
              };
            }
          } else if (candidate.rsh.has(prop)) {
            yield {
              type: "style" as const,
              combo: candidate.combo,
              value: ensure(
                candidate.rsh.getRaw(prop),
                "Prop is expected to have a value"
              ),
              prop,
            };
          } else if (candidate.derivedRsh.has(prop)) {
            yield {
              type: "style" as const,
              combo: candidate.combo,
              value: ensure(
                candidate.derivedRsh.getRaw(prop),
                "Prop is expected to have a value"
              ),
              prop,
              isDerived: true,
            };
          }
        }
      }
    }

    const sources = Array.from(genPropSources());
    return sources.length > 0 ? sources : undefined;
  }

  getAttrSource(attr: string): AttrSource[] | undefined {
    const vsettings = this.variantSettings;
    const attrSourceStack = vsettings
      .filter((vs) => !!vs.attrs[attr])
      .map((vs) => ({
        type: "attr" as const,
        combo: vs.variants,
        value: vs.attrs[attr],
        attr,
      }));
    return attrSourceStack.length > 0 ? attrSourceStack : undefined;
  }

  getArgSource(param: Param): ArgSource[] | undefined {
    const vsettings = this.variantSettings;
    const argSource = withoutNils(
      vsettings.map((vs) => {
        const arg = vs.args.find((a) => a.param === param);
        if (arg) {
          return {
            type: "arg" as const,
            combo: vs.variants,
            value: arg,
            component: ensureKnownTplComponent(this.tpl).component,
          };
        }
        return undefined;
      })
    );
    return argSource.length > 0 ? argSource : undefined;
  }

  getColumnsConfigSource(): ColumnsConfigSource[] | undefined {
    const vsettings = this.variantSettings;
    const sources = withoutNils(
      vsettings.map((vs) => {
        if (vs.columnsConfig) {
          return {
            type: "columnsConfig" as const,
            combo: vs.variants,
            value: `${
              vs.columnsConfig.breakUpRows ? "wrap" : "nowrap"
            } - [${vs.columnsConfig.colsSizes.join(", ")}]`,
          };
        }
        return undefined;
      })
    );
    return sources.length > 0 ? sources : undefined;
  }

  getVisibility() {
    return getVariantSettingVisibility(this);
  }

  getVisibilitySource(): VisibilitySource[] | undefined {
    const vsettings = this.variantSettings;
    const sources = withoutNils(
      vsettings.map((vs) => {
        if (hasVisibilitySetting(vs)) {
          return {
            type: "visibility" as const,
            combo: vs.variants,
            value: getVariantSettingVisibility(vs),
          };
        } else {
          return undefined;
        }
      })
    );
    return sources.length > 0 ? sources : undefined;
  }

  // Return whether the given variantCombo has the highest priority. Maybe not
  // be the target variantCombo. For example, you may target `base`, but a
  // non-base variant is pinned.
  comboHasHighestPriority(variantCombo: VariantCombo) {
    return arrayEq(
      ensure(
        L.last(this.variantSettings),
        "variantSettings should not be empty"
      ).variants,
      variantCombo
    );
  }

  /**
   *  Rich text node merged across all VariantSettings.
   */
  get text() {
    for (const vs of arrayReversed(this.variantSettings)) {
      if (!!vs.text) {
        return vs.text;
      }
    }
    return undefined;
  }

  get columnsConfig() {
    for (const vs of arrayReversed(this.variantSettings)) {
      if (!!vs.columnsConfig) {
        return vs.columnsConfig;
      }
    }
    return undefined;
  }

  get parentArgSlotVs() {
    return getParentArgSlotVs(this.tpl, this.activeVariants);
  }

  get parentSlotVs() {
    return getParentSlotVs(this.tpl, this.activeVariants);
  }

  get themeRsh() {
    const site = this.site;
    const activeTheme = site ? site.activeTheme : undefined;
    if (activeTheme) {
      return createExpandedRuleSetMerger(activeTheme.defaultStyle.rs, this.tpl);
    }
    return undefined;
  }

  get themeTagStyles() {
    if (!isTplTag(this.tpl)) {
      return [];
    }

    const activeTheme = this.site?.activeTheme;
    if (!activeTheme) {
      return [];
    }

    const tpl = this.tpl;
    const vs = this.variantSettings;
    const tagStyles = L.sortBy(
      activeTheme.styles.filter((s) => tplMatchThemeStyle(s, tpl, vs)),
      // Selectors with no pseudo-class first.
      (s) => s.selector.split(":").length
    );

    return tagStyles.map((s) => ({
      selector: s.selector,
      rsh: createExpandedRuleSetMerger(s.style.rs, tpl),
    }));
  }
}

/**
 * Returns the EffectiveVariantSetting for the argument `tpl` when the list
 * of argument `activeVariants` are active.  This list of active variants may
 * be a combination of tpl owner component's variants and global variants; an
 * empty list implies only the base variant is active.  activeVariants does not
 * have to represent one "combo"; multiple component variants can appear in the
 * list of activeVariants, for example.  The total ordering of VariantSettings
 * is used when multiple variants are supplied.
 */
export function getEffectiveVariantSetting(
  tpl: TplNode,
  activeVariants: VariantCombo,
  sorter?: VariantComboSorter
) {
  const component = $$$(tpl).tryGetOwningComponent();
  if (component) {
    const site = getOwnerSite(component);
    const vsettings = sortedVariantSettingStack(
      tpl.vsettings,
      activeVariants,
      sorter ?? makeVariantComboSorter(site, component)
    );
    return new EffectiveVariantSetting(tpl, vsettings, site, activeVariants);
  } else {
    // This is a top-level frame root TplComponent.  There's only ever one vsetting,
    // and it's always active.
    return new EffectiveVariantSetting(tpl, tpl.vsettings);
  }
}

/**
 * Like getEffectiveVariantSetting, but without the VariantSetting
 * actually corresponding to the argument combo
 */
export function getEffectiveVariantSettingExcept(
  tpl: TplNode,
  variantCombo: VariantCombo
) {
  const component = $$$(tpl).tryGetOwningComponent();
  if (component) {
    const vs = tryGetVariantSetting(tpl, variantCombo);
    const site = getOwnerSite(component);
    const vsettings = sortedVariantSettingStack(
      tpl.vsettings,
      variantCombo,
      makeVariantComboSorter(site, component)
    );
    return new EffectiveVariantSetting(
      tpl,
      vsettings.filter((vss) => vss !== vs),
      site,
      variantCombo
    );
  } else {
    // This is a top-level frame root TplComponent
    return new EffectiveVariantSetting(tpl, tpl.vsettings);
  }
}

/**
 * Insertable templates come from a different Site and Component
 * We'll just manually specify which component and site into the sorter
 * @param tpl
 * @param activeVariants
 * @returns
 */
export function getEffectiveVariantSettingForInsertable(
  tpl: TplNode,
  activeVariants: Variant[],
  component: Component,
  site: Site
): EffectiveVariantSetting {
  const vsettings = sortedVariantSettingStack(
    tpl.vsettings,
    activeVariants,
    makeVariantComboSorter(site, component)
  );
  return new EffectiveVariantSetting(tpl, vsettings, site, activeVariants);
}

export function getActiveVariantsInArg(
  component: Component,
  args: DeepReadonlyArray<Arg>
) {
  return args.flatMap((arg) => {
    return isKnownVariantsRef(arg.expr) ? arg.expr.variants : [];
  });
}

/**
 * If the argument tpl is used in a SlotSelection, then returns info
 * about the corresponding TplSlot.  `activeVariants` refers to the
 * variants activated for the owning component of the tpl.
 */
function getParentArgSlotVs(tpl: TplNode, activeVariants: Variant[]) {
  const parentSlotArg = getAncestorSlotArg(tpl);
  if (parentSlotArg) {
    // This tpl is a descendant of some SlotSelection, so it is being
    // used as a slot prop for some component.  We look into that
    // component's corresponding TplSlot, and try to figure out what
    // styles are set on that TplSlot (and thus may be applied to us
    // via css inheritance)

    const parentTplComponent = parentSlotArg.tplComponent;
    const parentSlotArgTplSlot = getTplSlotForParam(
      parentTplComponent.component,
      parentSlotArg.arg.param
    );
    if (parentSlotArgTplSlot) {
      // `tpl` is in a SlotSelection for `parentTplComponent`.  They both
      // belong to the same component, so we can look up the effective
      // variant setting of the parent `TplComponent` by the same
      // `activeVariants`.
      const parentTplComponentVs = getEffectiveVariantSetting(
        parentTplComponent,
        activeVariants
      );

      // Variants that are active for the elements inside TplComponent.component
      // are the variants active via args passed to the TplComponent and also
      // any global variants that are in activeVariants
      const activeParentVariants = [
        ...getActiveVariantsInArg(
          parentTplComponent.component,
          parentTplComponentVs.args
        ),
        ...activeVariants.filter((v) => isGlobalVariant(v)),
      ];

      const parentTplSlotVs = getEffectiveVariantSetting(
        parentSlotArgTplSlot,
        activeParentVariants
      );
      return {
        tplComponent: parentTplComponent,
        arg: parentSlotArg.arg,
        slot: parentSlotArgTplSlot,
        slotVs: parentTplSlotVs,
      };
    }
  }
  return undefined;
}

function getParentSlotVs(tpl: TplNode, activeVariants: Variant[]) {
  // get the parent TplSlot without crossing a TplComponent boundary
  const parentTplSlot = getAncestorTplSlot(tpl, false);
  if (parentTplSlot) {
    const parentTplVs = getEffectiveVariantSetting(
      parentTplSlot,
      activeVariants
    );
    return {
      slot: parentTplSlot,
      slotVs: parentTplVs,
    };
  }
  return undefined;
}

/**
 * Copies attrs, rs, args, dataCond, dataRep from the argument effectiveVs
 * onto the argument targetVs, overwriting the current settings in targetVs.
 */
export function adaptEffectiveVariantSetting(
  tpl: TplNode,
  targetVs: VariantSetting,
  effectiveVs: EffectiveVariantSetting,
  shouldFixText: boolean = true
) {
  assert(
    tpl.vsettings.includes(targetVs),
    "Variant settings is detached from node"
  );

  // Make a copy of attrs.
  targetVs.attrs = cloneAttrs(effectiveVs.attrs);

  targetVs.rs = cloneRuleSet(effectiveVs.rs);

  // Make a copy of args. This will copy the activated variants and slot
  // content of TplComponents (but we must also make sure to only copy
  // slot args to the base variant).
  const isBase = isBaseVariant(targetVs.variants);
  targetVs.args = cloneArgs(
    effectiveVs.args
      .filter((arg) => !isSlot(arg.param) || isBase)
      .map((arg) => {
        return new Arg({
          param: arg.param as Param,
          expr: arg.expr,
        });
      })
  );
  targetVs.text = effectiveVs.text
    ? cloneRichText(effectiveVs.text)
    : undefined;

  if (effectiveVs.dataCond) {
    targetVs.dataCond = clone(effectiveVs.dataCond);
  }

  if (effectiveVs.dataRep) {
    targetVs.dataRep = cloneDataRep(effectiveVs.dataRep);
  }

  targetVs.columnsConfig = cloneColumnsConfig(effectiveVs.columnsConfig);

  if (shouldFixText) {
    if (isTplTextBlock(tpl)) {
      fixTextChildren(tpl);
    }
  }
  // We might have lost parent pointers after cloning
  reconnectChildren(tpl);

  // Intentionally ignoring all other members of VariantSetting for now!
}

/**
 * Returns the variants that have been turned on through args for
 * TplComponent in the argument variantCombo
 * @param tpl
 * @param variantCombo
 */
export function getTplComponentActiveVariants(
  tpl: TplComponent,
  variantCombo: VariantCombo
) {
  const effectiveVs = getEffectiveVariantSetting(tpl, variantCombo);
  return getTplComponentActiveVariantsByVs(tpl, effectiveVs);
}
/**
 * Returns the variants that have been turned on through args for
 * TplComponent by reading from the argument effectiveVs
 */
export function getTplComponentActiveVariantsByVs(
  tpl: TplComponent,
  effectiveVs: EffectiveVariantSetting
) {
  return getActiveVariantsInArg(tpl.component, effectiveVs.args);
}
