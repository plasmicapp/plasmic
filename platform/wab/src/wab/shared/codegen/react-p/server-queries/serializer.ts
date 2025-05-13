import {
  getExportedComponentName,
  makeDefaultExternalPropsName,
  makePlasmicComponentName,
  makeTaggedPlasmicImport,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { isServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { ExprCtx, asCode, stripParens } from "@/wab/shared/core/exprs";
import { Component, CustomFunctionExpr } from "@/wab/shared/model/classes";
import { groupBy } from "lodash";

export const SERVER_QUERIES_VAR_NAME = "$serverQueries";

export function makePlasmicServerRscComponentName(component: Component) {
  return `Plasmic${getExportedComponentName(component)}Server`;
}

export function makePlasmicClientRscComponentName(component: Component) {
  return `Client${getExportedComponentName(component)}`;
}

export function makeLoaderServerFunctionFileName(component: Component) {
  return `__loader_rsc_${getExportedComponentName(component)}.tsx`;
}

export function makePlasmicServerRscComponentFileName(component: Component) {
  return `${makePlasmicServerRscComponentName(component)}.tsx`;
}

export function makePlasmicClientRscComponentFileName(component: Component) {
  return `${makePlasmicClientRscComponentName(component)}.tsx`;
}

export function makeServerQueryClientDollarQueryInit(
  ctx: SerializerBaseContext
) {
  if (ctx.hasServerQueries) {
    return `...useDollarServerQueries($ctx, $queries, $props?.${SERVER_QUERIES_VAR_NAME} ?? {})`;
  }

  return undefined;
}

function makeServerQueryOpType(op: CustomFunctionExpr) {
  return `Awaited<ReturnType<typeof ${op.func.importName}>>`;
}

export function makePlasmicQueryImports(ctx: SerializerBaseContext) {
  if (ctx.useRSC || !ctx.hasServerQueries) {
    return "";
  }

  return `import {
  useMutablePlasmicQueryData,
} from "@plasmicapp/query";`;
}

export function serializeServerQueryEntryType(component: Component) {
  if (component.serverQueries.length === 0) {
    return null;
  }

  return `
${SERVER_QUERIES_VAR_NAME}?: {
${component.serverQueries
  .filter(isServerQueryWithOperation)
  .map(
    (query) => `${toVarName(query.name)}: ${makeServerQueryOpType(query.op)};`
  )
  .join("\n")}
};
`.trim();
}

export function serializeServerQueryArgPropType(component: Component) {
  if (component.serverQueries.length === 0) {
    return null;
  }

  return jsLiteral(SERVER_QUERIES_VAR_NAME);
}

export function serializeServerQueryCustomFunctionArgs(
  op: CustomFunctionExpr,
  exprCtx: ExprCtx
) {
  const argsMap = groupBy(op.args, (arg) => arg.argType.argName);
  return op.func.params
    .map((param) => {
      const mappedArg = argsMap[param.argName];
      if (!mappedArg) {
        return "undefined";
      }

      return stripParens(asCode(mappedArg[0].expr, exprCtx).code);
    })
    .join(", ");
}

export function makeComponentTypeImport(
  exportOpts: ExportOpts,
  component: Component,
  opts?: {
    includePlasmicComponent?: boolean;
  }
) {
  const plasmicComponentName = makePlasmicComponentName(component);
  const genPropsName = makeDefaultExternalPropsName(component);

  const imports = [
    ...(opts?.includePlasmicComponent ? [plasmicComponentName] : []),
    genPropsName,
  ];

  const path = [
    exportOpts.relPathFromImplToManagedDir,
    makePlasmicComponentName(component),
  ].join("/");

  return makeTaggedPlasmicImport(imports, path, component.uuid, "render");
}
