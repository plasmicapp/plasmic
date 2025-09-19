import {
  VariantGroupType,
  isBaseRuleVariant,
  isBaseVariant,
  isCodeComponentVariant,
  isStandaloneVariantGroup,
  isValidComboForToken,
} from "@/wab/shared/Variants";
import { getContextGlobalVariantsWithVariantedTokens } from "@/wab/shared/codegen/react-p/global-variants";
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
  makeStyleTokensClassNames,
  makeWabInstanceClassName,
  makeWabTextClassName,
  projectStyleCssImportName,
  shortPlasmicPrefix,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ExportOpts, TargetEnv } from "@/wab/shared/codegen/types";
import {
  ensureJsIdentifier,
  jsLiteral,
  sortedDict,
  toClassName,
  toJsIdentifier,
} from "@/wab/shared/codegen/util";
import { ensure, tuple, withoutNils } from "@/wab/shared/common";
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
import { sortBy, uniqBy } from "lodash";
import { shouldUsePlasmicImg } from "src/wab/shared/codegen/react-p/image";
import type { SetRequired } from "type-fest";

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

/**
 * Returns object properties for CSS modules, string literals for regular CSS
 */
export function serializeClassExpr(
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">,
  name: string,
  importName = projectStyleCssImportName
) {
  return exportOpts?.stylesOpts?.scheme === "css-modules"
    ? `${importName}.${name}`
    : jsLiteral(name);
}

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
      unconditionalClassExprs.push(serializeClassExpr(ctx.exportOpts, name));
    }

    if (isTplTextBlock(node)) {
      unconditionalClassExprs.push(
        serializeClassExpr(ctx.exportOpts, makeWabTextClassName(ctx.exportOpts))
      );
    }

    if (isTplTextBlock(node.parent) && isTagInline(node.tag)) {
      unconditionalClassExprs.push(
        serializeClassExpr(
          ctx.exportOpts,
          makeDefaultInlineClassName(ctx.exportOpts)
        )
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

  const resetName = makeRootResetClassName(
    ctx.projectConfig.projectId,
    ctx.exportOpts
  );

  unconditionalClassExprs.push(serializeClassExpr(ctx.exportOpts, resetName));

  if (includeTagStyles) {
    unconditionalClassExprs.push(
      serializeClassExpr(ctx.exportOpts, `${resetName}_tags`)
    );
  }

  unconditionalClassExprs.push(
    serializeClassExpr(
      ctx.exportOpts,
      makePlasmicDefaultStylesClassName(ctx.exportOpts)
    )
  );
  unconditionalClassExprs.push(
    serializeClassExpr(
      ctx.exportOpts,
      makePlasmicMixinsClassName(ctx.exportOpts)
    )
  );

  const cssProjectDependencies = uniqBy(
    ctx.siteCtx.cssProjectDependencies,
    "projectName"
  );

  if (ctx.projectConfig.styleTokensProviderBundle) {
    // Add main project useStyleTokens()
    unconditionalClassExprs.push(makeStyleTokensClassNames());
  } else {
    unconditionalClassExprs.push(
      serializeClassExpr(
        ctx.exportOpts,
        makePlasmicTokensClassName(ctx.projectConfig.projectId, ctx.exportOpts)
      )
    );

    unconditionalClassExprs.push(
      ...withoutNils(
        cssProjectDependencies.map((dep) =>
          serializeClassExpr(
            ctx.exportOpts,
            makePlasmicTokensClassName(dep.projectId, ctx.exportOpts),
            makeCssProjectImportName(dep.projectName)
          )
        )
      )
    );

    // Context global variants require className to render their CSS changes.
    // Screen variants are rendered through media query
    const contextGlobalVariantCombos =
      getContextGlobalVariantsWithVariantedTokens(ctx.site).map((v) => [v]);

    if (contextGlobalVariantCombos.length > 0) {
      const sorter = makeGlobalVariantComboSorter(ctx.site);
      sortedVariantCombos(contextGlobalVariantCombos, sorter).forEach((vc) => {
        let comboClassNameExpr: string;
        if (ctx.exportOpts.stylesOpts.scheme === "css-modules") {
          // If we're using css modules, we need to make sure we reference
          // the right css import
          const depMap = ctx.componentGenHelper.siteHelper.objToDepMap();
          ensure(
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
          tuple(comboClassNameExpr, ctx.variantComboChecker(vc, true))
        );
      });
    }
  }

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
