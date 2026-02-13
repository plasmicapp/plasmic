import {
  getExportedComponentName,
  makeDefaultExternalPropsName,
  makePlasmicComponentName,
  makeTaggedPlasmicImport,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ExportOpts } from "@/wab/shared/codegen/types";
import { ExprCtx, asCode, stripParens } from "@/wab/shared/core/exprs";
import { Component, CustomFunctionExpr } from "@/wab/shared/model/classes";
import { groupBy } from "lodash";

export const SERVER_QUERIES_VAR_NAME = "$serverQueries";

export const MK_PATH_FROM_ROUTE_AND_PARAMS_SER = `
function mkPathFromRouteAndParams(
  route: string,
  params: Record<string, string | string[] | undefined>
) {
  if (!params) {
    return route;
  }
  let path = route;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      path = path.replace(\`[\${key}]\`, value);
    } else if (Array.isArray(value)) {
      if (path.includes(\`[[...\${key}]]\`)) {
        path = path.replace(\`[[...\${key}]]\`, value.join("/"));
      } else if (path.includes(\`[...\${key}]\`)) {
        path = path.replace(\`[...\${key}]\`, value.join("/"));
      }
    }
  }
  return path;
}`;

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

export function makePlasmicQueryImports(ctx: SerializerBaseContext) {
  if (ctx.useRSC || !ctx.hasServerQueries) {
    return "";
  }

  return `import {
  useMutablePlasmicQueryData,
} from "@plasmicapp/query";`;
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

export function serializeMetadataPropType(propTypeName: string) {
  return `export interface ${propTypeName} {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}`;
}

export function serializeMakeAppRouterPageCtx(
  ctx: SerializerBaseContext,
  propTypeName: string
) {
  const pageMeta = ctx.component.pageMeta;
  if (!pageMeta) {
    return serializeMetadataPropType(propTypeName);
  }
  return `${MK_PATH_FROM_ROUTE_AND_PARAMS_SER}

${serializeMetadataPropType(propTypeName)}

export async function makeAppRouterPageCtx({ params, searchParams }: ${propTypeName}) {
  const pageRoute = "${pageMeta.path}";
  const pageParams = (await params) ?? {};
  const pagePath = mkPathFromRouteAndParams(pageRoute, pageParams);

  const ctx = {
    pageRoute,
    pagePath,
    params: pageParams,
    query: (await searchParams) ?? {},
  };
  return ctx;
}`;
}

export function makeServerQueryImports(
  ctx: SerializerBaseContext,
  componentName: string
) {
  const { component, exportOpts } = ctx;

  const importNames = ["makeAppRouterPageCtx", "generateDynamicMetadata"];
  if (ctx.hasServerQueries) {
    importNames.push("create$Queries", "createQueries");
  }
  const imports = makeTaggedPlasmicImport(
    importNames,
    `${exportOpts.relPathFromImplToManagedDir}/${
      ctx.useRSC ? makePlasmicServerRscComponentName(component) : componentName
    }`,
    component.uuid,
    ctx.useRSC ? "rscServer" : "render"
  );
  return imports;
}
