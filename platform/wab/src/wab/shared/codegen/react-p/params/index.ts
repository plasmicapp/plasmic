import { ProjectId } from "@/wab/shared/ApiSchema";
import { makeSerializedClassNameRef } from "@/wab/shared/codegen/react-p/class-names";
import {
  makeArgPropsName,
  makeArgsTypeName,
  makePlasmicIsPreviewRootComponent,
  makeVariantMembersTypeName,
  makeVariantPropsName,
  makeVariantsArgTypeName,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  jsLiteral,
  paramToVarName,
  toJsIdentifier,
  toVarName,
} from "@/wab/shared/codegen/util";
import {
  serializeVariantArgsGroupType,
  serializeVariantGroupMembersType,
  serializeVariantsArgsTypeContent,
} from "@/wab/shared/codegen/variants";
import { assert } from "@/wab/shared/common";
import {
  findVariantGroupForParam,
  getNonVariantParams,
  getParamNames,
} from "@/wab/shared/core/components";
import {
  extractReferencedParam,
  getRawCode,
  tryExtractJson,
} from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { ParamExportType } from "@/wab/shared/core/lang";
import { isOnChangeParam } from "@/wab/shared/core/states";
import { makeStyleExprClassName } from "@/wab/shared/core/styles";
import { DevFlagsType } from "@/wab/shared/devflags";
import {
  LocalizableStringSource,
  makeLocalizationStringKey,
} from "@/wab/shared/localization";
import {
  Component,
  Expr,
  Param,
  isKnownFunctionType,
  isKnownImageAssetRef,
  isKnownStateParam,
  isKnownStyleExpr,
} from "@/wab/shared/model/classes";
import { isImageType, wabToTsType } from "@/wab/shared/model/model-util";
import { getSerializedImgSrcForAsset } from "src/wab/shared/codegen/react-p/image";

export function getExternalParams(ctx: SerializerBaseContext) {
  const argParams = getArgParams(ctx);
  const vgParams = getGenableVariantParams(ctx);
  return [...argParams, ...vgParams].filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType === ParamExportType.External
  );
}

export function serializeArgsDefaultValues(ctx: SerializerBaseContext) {
  const argParams = getArgParams(ctx);
  const defaults: Record<string, string> = {};
  for (const param of argParams) {
    if (
      !isKnownStateParam(param) &&
      !isOnChangeParam(param, ctx.component) &&
      param.defaultExpr
    ) {
      const varName = paramToVarName(ctx.component, param);
      defaults[varName] = serializeNonParamExpr(ctx, param.defaultExpr, {
        forCodeComponent: false,
        localizable: param.isLocalizable,
        source: {
          type: "default-param-expr",
          projectId: ctx.projectConfig.projectId as ProjectId,
          site: ctx.site,
          component: ctx.component,
          attr: varName,
        },
      });
    }
  }
  return `{
    ${Object.entries(defaults)
      .map(([key, value]) => `"${key}": ${value},`)
      .join("\n")}
  }`;
}

/**
 * Generates typescript type definition for the component's variants arguments
 */
export function serializeVariantsArgsType(ctx: SerializerBaseContext) {
  const vgs = getGenableVariantGroups(ctx);
  const name = makeVariantsArgTypeName(ctx.component);
  return `
    export type ${makeVariantMembersTypeName(ctx.component)} = {
      ${vgs
        .map(
          (vg) =>
            `${toVarName(
              vg.param.variable.name
            )}: ${serializeVariantGroupMembersType(vg)};`
        )
        .join("\n")}
    };
    export type ${name} = ${serializeVariantsArgsTypeContent(vgs)};
    type VariantPropType = keyof ${name};
    export const ${makeVariantPropsName(
      ctx.component
    )} = new Array<VariantPropType>(${getParamNames(
    ctx.component,
    vgs.map((p) => p.param)
  )
    .map(jsLiteral)
    .join()});
  `;
}

function getArgsTypeContent(ctx: SerializerBaseContext) {
  const params = getArgParams(ctx);
  return params.length === 0
    ? "{}"
    : `{
    ${params
      .map(
        (p) =>
          `"${paramToVarName(ctx.component, p)}"?: ${serializeParamType(
            ctx.component,
            p,
            ctx.projectFlags
          )}`
      )
      .join(";\n")}
  }`;
}

export function serializeArgsType(ctx: SerializerBaseContext) {
  const name = makeArgsTypeName(ctx.component);
  return `
    export type ${name} = ${getArgsTypeContent(ctx)};
    type ArgPropType = keyof ${name};
    export const ${makeArgPropsName(ctx.component)} = new Array<ArgPropType>(
      ${
        ctx.exportOpts.shouldTransformWritableStates
          ? `"${makePlasmicIsPreviewRootComponent()}", `
          : ""
      }
      ${[
        ...getParamNames(ctx.component, getArgParams(ctx)).map(jsLiteral),
      ].join()});
  `;
}

/**
 * Outputs the typescript type for the argument Param
 */
export function serializeParamType(
  component: Component,
  param: Param,
  projectFlags: DevFlagsType
) {
  const variantGroup = findVariantGroupForParam(component, param);
  if (variantGroup) {
    // This param corresponds to a VariantGroup, so it's typed to the
    // VariantGroup's members
    return serializeVariantArgsGroupType(variantGroup);
  } else if (isImageType(param.type) && projectFlags.usePlasmicImg) {
    return `React.ComponentProps<typeof PlasmicImg__>["src"]`;
  } else if (isKnownFunctionType(param.type)) {
    return `(${param.type.params
      .map(
        (arg) =>
          `${toJsIdentifier(arg.argName)}: ${wabToTsType(arg.type, true)}`
      )
      .join(", ")}) => void`;
  } else {
    return `${wabToTsType(param.type, true)}`;
  }
}

export function getGenableVariantGroups(ctx: SerializerBaseContext) {
  return ctx.component.variantGroups.filter(
    (vg) =>
      vg.variants.length > 0 &&
      (ctx.exportOpts.forceAllProps ||
        vg.param.exportType !== ParamExportType.ToolsOnly)
  );
}

export function getGenableVariantParams(ctx: SerializerBaseContext) {
  return getGenableVariantGroups(ctx).map((vg) => vg.param);
}

export function getArgParams(ctx: SerializerBaseContext) {
  const params = getNonVariantParams(ctx.component);
  return params.filter(
    (p) =>
      ctx.exportOpts.forceAllProps || p.exportType !== ParamExportType.ToolsOnly
  );
}

export function serializeNonParamExpr(
  ctx: SerializerBaseContext,
  expr: Expr,
  opts: {
    forCodeComponent: boolean;
    localizable: boolean;
    source: LocalizableStringSource;
  }
) {
  const param = extractReferencedParam(ctx.component, expr);
  assert(
    !param,
    "serializeExpr can not be used with exprs referencing component params"
  );
  if (
    isKnownImageAssetRef(expr) &&
    expr.asset.type === ImageAssetType.Picture
  ) {
    return getSerializedImgSrcForAsset(expr.asset, ctx, opts.forCodeComponent);
  } else if (isKnownStyleExpr(expr)) {
    const className = makeStyleExprClassName(expr);
    return makeSerializedClassNameRef(ctx, className);
  } else if (ctx.projectFlags.usePlasmicTranslation && opts.localizable) {
    const lit = tryExtractJson(expr);
    if (lit && typeof lit === "string") {
      const key = makeLocalizationStringKey(lit, opts.source, {
        keyScheme: ctx.exportOpts.localization?.keyScheme ?? "content",
        tagPrefix: ctx.exportOpts.localization?.tagPrefix,
      });
      return `($translator?.(${jsLiteral(key)}) ?? ${jsLiteral(lit)})`;
    } else {
      return getRawCode(expr, ctx.exprCtx, {
        fallbackSerializer: (fallback) =>
          serializeNonParamExpr(ctx, fallback, opts),
      });
    }
  } else {
    return getRawCode(expr, ctx.exprCtx, {
      fallbackSerializer: (fallback) =>
        serializeNonParamExpr(ctx, fallback, opts),
    });
  }
}
