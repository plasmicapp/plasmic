import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { serializeCustomFunctionsAndLibs } from "@/wab/shared/codegen/react-p/custom-functions";
import { getDataSourcesPackageName } from "@/wab/shared/codegen/react-p/data-sources";
import {
  makeDefaultExternalPropsName,
  makePlasmicComponentName,
  makeTaggedPlasmicImport,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  SERVER_QUERIES_VAR_NAME,
  makeComponentTypeImport,
  makeLoaderServerFunctionFileName,
  makePlasmicClientRscComponentFileName,
  makePlasmicClientRscComponentName,
  makePlasmicServerRscComponentFileName,
  makePlasmicServerRscComponentName,
  serializeServerQueryCustomFunctionArgs,
} from "@/wab/shared/codegen/react-p/server-queries/serializer";
import { isServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { ComponentExportOutput, ExportOpts } from "@/wab/shared/codegen/types";
import { toVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";

export function getRscMetadata(
  ctx: SerializerBaseContext
): ComponentExportOutput["rscMetadata"] {
  if (!isPageComponent(ctx.component) || !ctx.useRSC) {
    return undefined;
  }

  return {
    pageWrappers: {
      server: {
        module: serializeServerQueriesServerWrapper(ctx, ctx.exportOpts),
        fileName: makePlasmicServerRscComponentFileName(ctx.component),
      },
      client: {
        module: serializeServerQueriesClientWrapper(ctx, ctx.exportOpts),
        fileName: makePlasmicClientRscComponentFileName(ctx.component),
      },
    },
    serverQueriesExecFunc: serializeServerQueriesFetchFunction(ctx),
  };
}

function serializeServerQueriesServerWrapper(
  ctx: SerializerBaseContext,
  opts: ExportOpts
) {
  const { component } = ctx;

  assert(isPageComponent(component), "Expected page component");

  const componentName = makePlasmicServerRscComponentName(component);
  const componentPropsName = `${componentName}Props`;
  const clientComponentName = makePlasmicClientRscComponentName(component);
  const genPropsName = makeDefaultExternalPropsName(component);
  const { module: executeServerQueriesModule } =
    serializeServerQueriesFetchFunction(ctx);

  return `
import * as React from "react";
${makeComponentTypeImport(opts, component)}

${makeTaggedPlasmicImport(
  clientComponentName,
  makePlasmicClientRscComponentFileName(component),
  component.uuid,
  "rscClient"
)}

${executeServerQueriesModule}

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
}

type ${componentPropsName} = ${genPropsName} & {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function ${componentName}(props: ${componentPropsName}) {
  const { params, searchParams, ...rest} = props;

  const pageRoute = "${component.pageMeta.path}";
  const pageParams = (await params) ?? {};
  const pagePath = mkPathFromRouteAndParams(pageRoute, pageParams);

  const $ctx = {
    pageRoute,
    pagePath,
    params: pageParams,
  };

  const ${SERVER_QUERIES_VAR_NAME} = await executeServerQueries($ctx);

  return (
    <${clientComponentName}
      {...rest}
      ${SERVER_QUERIES_VAR_NAME}={${SERVER_QUERIES_VAR_NAME}}
    />
  )
}
  `;
}

function serializeServerQueriesClientWrapper(
  ctx: SerializerBaseContext,
  opts: ExportOpts
) {
  const { component } = ctx;

  const componentName = makePlasmicClientRscComponentName(component);
  const plasmicComponentName = makePlasmicComponentName(component);
  const defaultPropsName = makeDefaultExternalPropsName(component);

  return `
"use client";

import * as React from "react";
${makeComponentTypeImport(opts, component, { includePlasmicComponent: true })}

export function ${componentName}(props: ${defaultPropsName}) {
  return (
    <${plasmicComponentName} {...props} />
  )
}
`;
}

export function serializeUseDollarServerQueries(ctx: SerializerBaseContext) {
  // We don't need to generate this hook if we're using RSC or if we don't have server queries
  if (ctx.useRSC || !ctx.hasServerQueries) {
    return "";
  }

  const { component } = ctx;
  const serverQueries = component.serverQueries.filter(
    isServerQueryWithOperation
  );

  return `
function useDollarServerQueries($ctx: any, $queries: any) {
  return {
    ${serverQueries
      .map(
        (query) => `${toVarName(query.name)}: usePlasmicServerQuery({
        id: "${customFunctionId(query.op.func)}",
        fn: $$.${query.op.func.importName},
        execParams: () => [${serializeServerQueryCustomFunctionArgs(
          query.op,
          ctx.exprCtx
        )}],
        }),`
      )
      .join("\n")}
  };
}
`;
}

function serializeServerQueriesFetchFunction(ctx: SerializerBaseContext) {
  const serverQueries = ctx.component.serverQueries.filter(
    isServerQueryWithOperation
  );

  const { customFunctionsAndLibsImport, serializedCustomFunctionsAndLibs } =
    serializeCustomFunctionsAndLibs(ctx);

  const module = `
${customFunctionsAndLibsImport}

${serializedCustomFunctionsAndLibs}

import { executeServerQuery, mkPlasmicUndefinedServerProxy, ServerQuery } from "${getDataSourcesPackageName()}";

export async function executeServerQueries($ctx: any) {
  const $queries: Record<string, any> = {
    ${serverQueries
      .map(
        (query) => `${toVarName(query.name)}: mkPlasmicUndefinedServerProxy(),`
      )
      .join("\n")}
  };

  const serverQueries: Record<string, ServerQuery> = {
    ${serverQueries
      .map(
        (query) => `
      ${toVarName(query.name)}: {
        id: "${customFunctionId(query.op.func)}",
        fn: $$.${query.op.func.importName},
        execParams: () => [${serializeServerQueryCustomFunctionArgs(
          query.op,
          ctx.exprCtx
        )}],
      },`
      )
      .join("\n")}
  };

  do {
    await Promise.all(
      Object.keys(serverQueries).map(async (key) => {
        $queries[key] = await executeServerQuery(serverQueries[key]);
        if (!$queries[key].data.isUndefinedServerProxy) {
          delete serverQueries[key];
        }
      })
    );
  } while (
    Object.values($queries).some((value) => value.data?.isUndefinedServerProxy)
  );

  return $queries;
}
`;

  return {
    module,
    fileName: makeLoaderServerFunctionFileName(ctx.component),
  };
}
