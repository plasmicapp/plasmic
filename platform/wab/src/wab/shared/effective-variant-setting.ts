import L from "lodash";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { computed, isObservable, makeObservable } from "mobx";

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
import { SlotSelection } from "@/wab/shared/core/slots";
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
  isTplTag,
  isTplTextBlock,
  reconnectChildren,
} from "@/wab/shared/core/tpls";
import {
  ArgSource,
  AttrSource,
  ColumnsConfigSource,
  SlotSelectionSource,
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
      includeSlot?: boolean;
    } = { includeTheme: true, includeSlot: false }
  ): ReadonlyIRuleSetHelpersX {
    const rulesets = this.getEffectiveRuleSets(opts);
    const expanded = expandRuleSets(rulesets);
    return makeReadonlySizeAwareExpProxy(
      createRuleSetMerger(expanded, this.tpl),
      this.tpl
    );
  }

  rsh = () => {
    return this._rsh({ includeTheme: false, includeSlot: false });
  };

  rshWithTheme = () => {
    return this._rsh({ includeTheme: true, includeSlot: false });
  };

  rshWithThemeSlot = () => {
    return this._rsh({ includeTheme: true, includeSlot: true });
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
      includeSlot?: boolean;
    } = { includeTheme: true, includeSlot: false }
  ): DeepReadonlyArray<RuleSet> {
    const site = this.site;
    const vsettings = this.variantSettings;
    const tpl = this.tpl;
    const self = this;

    const rss: RuleSet[] = [];
    // Lowest priority is the theme ruleset
    if (opts.includeTheme) {
      const activeTheme = site ? site.activeTheme : undefined;
      if (activeTheme) {
        if (isTypographyNode(tpl)) {
          rss.push(
            self.vsh.getActiveVariantedRuleSet(activeTheme.defaultStyle)
          );
        }

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

    if (opts.includeSlot && isTypographyNode(tpl)) {
      // next priority is the slot styling that we get from css inheritance.
      // They only apply if this tpl is a descendant of a TplSlot or a
      // slot arg
      const parentArgSlotVs = self.parentArgSlotVs;
      if (parentArgSlotVs) {
        // We are a descendant of a slot arg, so the ruleset on the
        // corresponding TplSlot (in a different Component!) will apply
        for (const rs of parentArgSlotVs.slotVs.getEffectiveRuleSets({
          includeTheme: false,
          includeSlot: true,
        })) {
          rss.push(rs);
        }
      }

      const parentSlotVs = self.parentSlotVs;
      if (parentSlotVs) {
        // We are a descendant of a TplSlot, so the ruleset on that
        // TplSlot (in this Component) will apply.  This has higher
        // precedence than parentArgSlotVs, because it is lower in the
        // tree, as `getParentSlotVs` doesn't traverse across ancestor
        // TplComponents.
        for (const rs of parentSlotVs.slotVs.getEffectiveRuleSets({
          includeTheme: false,
          includeSlot: true,
        })) {
          rss.push(rs);
        }
      }
    }

    // Finally, the styles set directly on this node are highest precedence
    for (const vs of vsettings) {
      rss.push(makeLayoutAwareRuleSet(vs.rs, isBaseVariant(vs.variants)));
    }

    return rss;
  }

  getTextSource(): Array<VariantSettingSource> | undefined {
    const vsettings = this.variantSettings;
    const stack = new Array<VariantSettingSource>();
    for (const vs of vsettings) {
      if (vs.text) {
        stack.push({
          type: "text" as const,
          combo: vs.variants,
          value: ensure(
            getRichTextContent(vs.text),
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

      const themeTagStyles = self.themeTagStyles;
      for (const themeTagStyle of themeTagStyles) {
        yield { type: "themeTag", ...themeTagStyle } as const;
      }

      if (isTypographyNode(tpl)) {
        // If this tpl is a descendant of an arg, then that arg slot
        // may also apply some styling, which we will get via css inheritance
        const parentArgSlotVs = self.parentArgSlotVs;
        if (parentArgSlotVs) {
          yield { type: "parentArgSlotVs", parentArgSlotVs } as const;
        }

        // If this tpl is a descendant of a TplSlot (which means it is a
        // default content), then it may also inherit css styles from the
        // TplSlot.
        const parentSlotVs = self.parentSlotVs;
        if (parentSlotVs) {
          yield { type: "parentSlotVs", parentSlotVs } as const;
        }
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

  getPropSource(prop: string): Array<VariantSettingSource> | undefined {
    const site = this.site;
    const tpl = this.tpl;
    const variantSettings = this.variantSettings;

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
        } else if (candidate.type === "parentArgSlotVs") {
          // parentArgSlotVs corresponds to a TplSlot in a _different_ component,
          // and this tpl is a descendant of a tree that is passed as an arg to that
          // TplComponent.  That TplSlot may also have a long lineage of styles,
          // but we will just show the last one.
          const lastSource = L.last(
            candidate.parentArgSlotVs.slotVs.getPropSource(prop) || []
          );
          if (lastSource) {
            if (lastSource.type === "mixin" || lastSource.type === "style") {
              yield {
                ...lastSource,
                sel: new SlotSelection({
                  tpl: candidate.parentArgSlotVs.tplComponent,
                  slotParam: candidate.parentArgSlotVs.arg.param,
                }),
                slotCombo: lastSource.combo,
                type: "sel" as const,
              } as SlotSelectionSource;
            } else if (lastSource.type === "sel") {
              yield lastSource;
            }
          }
        } else if (candidate.type === "parentSlotVs") {
          // If this tpl is a descendant of a TplSlot (which means it is a
          // default content), then it may also inherit css styles from the
          // TplSlot.
          const lastSource = L.last(
            candidate.parentSlotVs.slotVs.getPropSource(prop) || []
          );
          if (lastSource) {
            if (lastSource.type === "mixin" || lastSource.type === "style") {
              yield {
                ...lastSource,
                param: candidate.parentSlotVs.slot.param,
                type: "slot" as const,
              } as SlotSource;
            } else if (lastSource.type === "sel") {
              yield lastSource;
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
