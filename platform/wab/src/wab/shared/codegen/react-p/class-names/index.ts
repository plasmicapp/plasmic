import {
  VariantGroupType,
  isBaseRuleVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isScreenVariant,
  isStandaloneVariantGroup,
  isValidComboForToken,
} from "@/wab/shared/Variants";
import {
  NodeNamer,
  getExportedComponentName,
  makeCssProjectImportName,
  makeDefaultInlineClassName,
  makeDefaultStyleClassNameBase,
  makePlasmicDefaultStylesClassName,
  makePlasmicMixinsClassName,
  makePlasmicTokensClassName,
  makeRootResetClassName,
  makeWabInstanceClassName,
  makeWabTextClassName,
  shortPlasmicPrefix,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  extractUsedGlobalVariantCombosForTokens,
  extractUsedTokensForComponents,
} from "@/wab/shared/codegen/style-tokens";
import { TargetEnv } from "@/wab/shared/codegen/types";
import {
  ensureJsIdentifier,
  jsLiteral,
  sortedDict,
  toClassName,
  toJsIdentifier,
} from "@/wab/shared/codegen/util";
import { assert, ensure, tuple, withoutNils } from "@/wab/shared/common";
import { isTagInline } from "@/wab/shared/core/rich-text-util";
import {
  defaultStyleClassNames,
  hasClassnameOverride,
} from "@/wab/shared/core/styles";
import {
  isTplCodeComponent,
  isTplComponent,
  isTplTag,
  isTplTextBlock,
  summarizeTpl,
} from "@/wab/shared/core/tpls";
import {
  Component,
  ComponentVariantGroup,
  TplNode,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { JsIdentifier } from "@/wab/shared/utils/regex-js-identifier";
import {
  makeGlobalVariantComboSorter,
  sortedVariantCombos,
} from "@/wab/shared/variant-sort";
import L, { sortBy } from "lodash";
import { shouldUsePlasmicImg } from "src/wab/shared/codegen/react-p/image";

export function makeCssClassNameForVariantCombo(
  variantCombo: Variant[],
  opts: {
    targetEnv: TargetEnv;
    prefix?: string;
    superComp?: Component;
  }
): JsIdentifier | "" {
  const isBase = isBaseVariant(variantCombo);
  if (isBase || variantCombo.length == 0) {
    return "";
  }
  const { targetEnv, prefix, superComp } = opts;

  variantCombo = sortBy(variantCombo, (v) => v.uuid);
  return ensureJsIdentifier(
    `${prefix ?? ""}${variantCombo
      .map((variant) => {
        if (targetEnv === "loader") {
          return variant.uuid.slice(0, 5);
        }
        const variantName = toJsIdentifier(variant.name);
        if (!variant.parent) {
          let keys: string[] | null | undefined;
          if (isCodeComponentVariant(variant)) {
            keys = variant.codeComponentVariantKeys;
          } else {
            keys = variant.selectors;
          }

          if (!keys?.length) {
            throw new Error(
              "Error naming variant. Requires either a parent or non-empty list of selectors/variant keys."
            );
          }

          return `${variantName}__${keys
            .map((key) => toJsIdentifier(key))
            .join("__")}`;
        }

        const group = variant.parent;
        const isStandalone = isStandaloneVariantGroup(group);
        let parentName = toJsIdentifier(group.param.variable.name);
        if (
          superComp &&
          superComp.variantGroups.includes(group as ComponentVariantGroup)
        ) {
          parentName = ensureJsIdentifier(
            `${toClassName(superComp.name)}__${parentName}`
          );
        }

        switch (variant.parent.type) {
          default:
            throw new Error("Unknown variant group");
          case VariantGroupType.Component:
            return ensureJsIdentifier(
              isStandalone ? parentName : `${parentName}_${variantName}`
            );
          case VariantGroupType.GlobalScreen:
          case VariantGroupType.GlobalUserDefined:
            return ensureJsIdentifier(
              isStandalone
                ? `global_${parentName}`
                : `global_${parentName}_${variantName}`
            );
        }
      })
      .join("_")}`
  );
}

export function makeCssClassName(
  component: Component,
  node: TplNode,
  vs: VariantSetting,
  nodeNamer: NodeNamer,
  opts: {
    targetEnv: TargetEnv;
    useSimpleClassname?: boolean;
  }
): JsIdentifier {
  const nodeName = nodeNamer(node);
  const namePart = nodeName
    ? toJsIdentifier(nodeName)
    : toJsIdentifier(summarizeTpl(node));
  const { targetEnv, useSimpleClassname } = opts;

  // We only need to include base rule variants in the class name, as
  // non-base-rule variants are invoked via mediaQuery or css selectors
  // instead.
  const variants = vs.variants.filter((v) => isBaseRuleVariant(v));

  const isBase = isBaseVariant(variants);
  const variantPart = makeCssClassNameForVariantCombo(variants, {
    targetEnv,
    superComp: component.superComp ?? undefined,
  });

  const uniqId = toJsIdentifier(
    `${node.uuid.substring(0, 5)}${
      isBase
        ? ""
        : sortBy(variants, (v) => v.uuid)
            .map((v) => v.uuid.substring(0, 5))
            .join("_")
    }`
  );

  // We don't use a unique ID only if there's a node name, and useSimpleClassname
  // is true.
  const idPart = nodeName && useSimpleClassname ? "" : `__${uniqId}`;

  const localClassName = `${namePart}${variantPart}${idPart}`;
  if (targetEnv === "loader") {
    // Use shortest unique id possible
    return ensureJsIdentifier(`${shortPlasmicPrefix}${uniqId}`);
  }
  return ensureJsIdentifier(
    useSimpleClassname
      ? localClassName
      : `${getExportedComponentName(component)}__${localClassName}`
  );
}

function shouldReferenceByClassName(vs: VariantSetting) {
  // If there are variants in the combo that are not base rule variants, like
  // :hover, then we don't need to reference this VariantSetting by name
  // in className; instead, it'll be triggered by generated css selectors.
  return vs.variants.every((v) => isBaseRuleVariant(v));
}

const makeCssClassExprsForVariantedTokens = (ctx: SerializerBaseContext) => {
  const { component, variantComboChecker } = ctx;
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];

  const cssProjectDependencies = L.uniqBy(
    ctx.siteCtx.cssProjectDependencies,
    "projectName"
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicDefaultStylesClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicDefaultStylesClassName(ctx.exportOpts))
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicMixinsClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicMixinsClassName(ctx.exportOpts))
  );

  unconditionalClassExprs.push(
    useCssModules
      ? `projectcss.${makePlasmicTokensClassName(ctx.exportOpts)}`
      : jsLiteral(makePlasmicTokensClassName(ctx.exportOpts))
  );
  unconditionalClassExprs.push(
    ...withoutNils(
      cssProjectDependencies.map((dep) =>
        useCssModules
          ? `${makeCssProjectImportName(
              dep.projectName
            )}.${makePlasmicTokensClassName(ctx.exportOpts)}`
          : undefined
      )
    )
  );

  const tokens = new Set([
    ...extractUsedTokensForComponents(ctx.site, [component], {
      expandMixins: true,
      derefTokens: true,
    }),
    ...ctx.componentGenHelper.siteHelper.usedTokensForTheme(),
  ]);

  const globalVariantCombos = extractUsedGlobalVariantCombosForTokens(
    ctx.site,
    tokens
  );
  // Screen variants are rendered through media query
  const nonScreenGlobalVariantCombos = Array.from(globalVariantCombos)
    .map((vc) => vc.filter((v) => !isScreenVariant(v)))
    .filter((vc) => vc.length > 0);
  if (nonScreenGlobalVariantCombos.length > 0) {
    const sorter = makeGlobalVariantComboSorter(ctx.site);
    sortedVariantCombos(nonScreenGlobalVariantCombos, sorter).forEach((vc) => {
      let comboClassNameExpr: string;
      if (useCssModules) {
        // If we're using css modules, we need to make sure we reference
        // the right css import
        const depMap = ctx.componentGenHelper.siteHelper.objToDepMap();
        assert(
          isValidComboForToken(vc),
          "Can only build varianted combos with one variant"
        );
        const variant = vc[0];
        const variantGroup = ensure(
          variant.parent,
          "Global variants always have parent group"
        );
        const variantDep = depMap.get(variantGroup);
        const importName = variantDep
          ? makeCssProjectImportName(variantDep.name)
          : "projectcss";
        comboClassNameExpr = `[${importName}.${makeCssClassNameForVariantCombo(
          vc,
          { targetEnv: ctx.exportOpts.targetEnv }
        )}]`;
      } else {
        comboClassNameExpr = jsLiteral(
          `${makeCssClassNameForVariantCombo(vc, {
            targetEnv: ctx.exportOpts.targetEnv,
          })}`
        );
      }
      conditionalClassExprs.push(
        tuple(comboClassNameExpr, variantComboChecker(vc, true))
      );
    });
  }

  return { unconditionalClassExprs, conditionalClassExprs };
};

export function serializeClassNames(
  ctx: SerializerBaseContext,
  node: TplNode,
  orderedVsettings: VariantSetting[],
  additionalClassExpr?: string[]
) {
  const { component, nodeNamer, variantComboChecker } = ctx;
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];

  // It is important that the "base" styles, like defaultcss and projectcss,
  // are used first, because when you build css modules, they css rules will
  // be ordered by usage first (rather than import first)
  if (isTplTag(node)) {
    const tag = shouldUsePlasmicImg(node, ctx.projectFlags)
      ? "PlasmicImg"
      : node.tag;
    const defaultClassnames = useCssModules
      ? tag === "PlasmicImg"
        ? []
        : withoutNils([
            "all",
            hasClassnameOverride(node.tag) ? node.tag : undefined,
          ])
      : defaultStyleClassNames(
          makeDefaultStyleClassNameBase(ctx.exportOpts),
          tag
        );

    for (const name of defaultClassnames) {
      if (useCssModules) {
        unconditionalClassExprs.push(`projectcss.${name}`);
      } else {
        unconditionalClassExprs.push(jsLiteral(name));
      }
    }

    if (isTplTextBlock(node)) {
      unconditionalClassExprs.push(
        useCssModules
          ? `projectcss.${makeWabTextClassName(ctx.exportOpts)}`
          : jsLiteral(makeWabTextClassName(ctx.exportOpts))
      );
    }

    if (isTplTextBlock(node.parent) && isTagInline(node.tag)) {
      unconditionalClassExprs.push(
        useCssModules
          ? `projectcss.${makeDefaultInlineClassName(ctx.exportOpts)}`
          : jsLiteral(makeDefaultInlineClassName(ctx.exportOpts))
      );
    }
  } else if (isTplComponent(node)) {
    unconditionalClassExprs.push(
      jsLiteral(makeWabInstanceClassName(ctx.exportOpts))
    );
  }

  if (
    node === component.tplTree &&
    (isTplTag(node) || isTplCodeComponent(node))
  ) {
    // For root nodes of tag or code TplComponent, we tack on the root reset
    // classes. We don't need to do so for "plasmic" TplComponent because
    // _its_ root will have the root reset classes.
    const rootExprs = serializeComponentRootResetClasses(ctx, false);
    unconditionalClassExprs.push(...rootExprs.unconditionalClassExprs);
    conditionalClassExprs.push(...rootExprs.conditionalClassExprs);
  }

  for (const vs of orderedVsettings) {
    if (!shouldReferenceByClassName(vs)) {
      continue;
    }
    const generatedClass = makeCssClassName(component, node, vs, nodeNamer, {
      targetEnv: ctx.exportOpts.targetEnv,
      useSimpleClassname: useCssModules,
    });
    if (isBaseVariant(vs.variants)) {
      unconditionalClassExprs.push(
        useCssModules ? `sty.${generatedClass}` : jsLiteral(generatedClass)
      );
    } else {
      const key = useCssModules
        ? `[sty.${generatedClass}]`
        : jsLiteral(generatedClass);

      conditionalClassExprs.push(
        tuple(key, variantComboChecker(vs.variants, true))
      );
    }
  }

  if (additionalClassExpr) {
    unconditionalClassExprs.push(...withoutNils(additionalClassExpr));
  }

  return serializeClassNamesCall(
    unconditionalClassExprs,
    conditionalClassExprs
  );
}

export function serializeClassNamesCall(
  unconditionalClassExprs: string[],
  conditionalClassExprs: [string, string][]
) {
  const hasUnconditionals = unconditionalClassExprs.length > 0;
  const hasConditionals = conditionalClassExprs.length > 0;
  return `classNames(${unconditionalClassExprs.join(", ")}${
    hasUnconditionals && hasConditionals ? ", " : ""
  }${hasConditionals ? sortedDict(conditionalClassExprs) : ""})`;
}

export function serializeComponentRootResetClasses(
  ctx: SerializerBaseContext,
  includeTagStyles: boolean
) {
  const unconditionalClassExprs: string[] = [];
  const conditionalClassExprs: [string, string][] = [];
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  const resetName = makeRootResetClassName(ctx.projectConfig.projectId, {
    targetEnv: ctx.exportOpts.targetEnv,
    useCssModules,
  });
  unconditionalClassExprs.push(
    useCssModules ? `projectcss.${resetName}` : jsLiteral(resetName)
  );

  if (includeTagStyles) {
    unconditionalClassExprs.push(
      useCssModules
        ? `projectcss.${resetName}_tags`
        : jsLiteral(`${resetName}_tags`)
    );
  }

  const tokenClassExprs = makeCssClassExprsForVariantedTokens(ctx);
  unconditionalClassExprs.push(...tokenClassExprs.unconditionalClassExprs);
  conditionalClassExprs.push(...tokenClassExprs.conditionalClassExprs);

  return {
    conditionalClassExprs,
    unconditionalClassExprs,
  };
}

export function makeSerializedClassNameRef(
  ctx: SerializerBaseContext,
  className: string,
  importedStyleObj = "sty"
) {
  const useCssModules = ctx.exportOpts.stylesOpts.scheme === "css-modules";
  return useCssModules
    ? `${importedStyleObj}[${jsLiteral(className)}]`
    : jsLiteral(className);
}
