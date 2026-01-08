import { customFunctionId } from "@/wab/shared/code-components/code-components";
import { serializeCustomFunctionsAndLibs } from "@/wab/shared/codegen/react-p/custom-functions";
import { getDataSourcesPackageName } from "@/wab/shared/codegen/react-p/data-sources";
import { serializeGenerateMetadataFunction } from "@/wab/shared/codegen/react-p/page-metadata";
import {
  makeDefaultExternalPropsName,
  makePlasmicComponentName,
  makeTaggedPlasmicImport,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import {
  MK_PATH_FROM_ROUTE_AND_PARAMS_SER,
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

  const generateMetadataFunc = serializeGenerateMetadataFunction(ctx);

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
    generateMetadataFunc,
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

  return `
/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";
${makeComponentTypeImport(opts, component)}

${makeTaggedPlasmicImport(
  clientComponentName,
  makePlasmicClientRscComponentFileName(component),
  component.uuid,
  "rscClient"
)}

import { executeServerQueries } from "./${makeLoaderServerFunctionFileName(
    component
  ).replace(".tsx", "")}";
${MK_PATH_FROM_ROUTE_AND_PARAMS_SER}

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
    query: searchParams,
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
  // We don't need to generate this hook if we don't have server queries
  if (!ctx.hasServerQueries) {
    return "";
  }

  const { component } = ctx;
  const serverQueries = component.serverQueries.filter(
    isServerQueryWithOperation
  );

  return `
function useDollarServerQueries(
  $ctx: any,
  $queries: any,
  fallbackDataObject: Record<string, any> = {}
) {
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
        }, fallbackDataObject?.["${toVarName(query.name)}"]?.data),`
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

  const serverQueriesDeclaration = `
    const serverQueries: Record<string, ServerQuery<(typeof $$)[keyof typeof $$]>> = {
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
  `;

  const usesSearchParams = serverQueriesDeclaration.includes("$ctx.query");

  const module = `
${customFunctionsAndLibsImport}

${serializedCustomFunctionsAndLibs}

import { executeServerQuery, mkPlasmicUndefinedServerProxy, ServerQuery, makeQueryCacheKey } from "${getDataSourcesPackageName()}";

export async function executeServerQueries($ctx: any) {
  ${usesSearchParams ? "await $ctx.query;" : ""}

  ${serverQueriesDeclaration}

  const queryVarToKey: Record<string, string> = {};
  const $queries: Record<string, any> = {};

  for (const key of Object.keys(serverQueries)) {
    const sq = serverQueries[key];
    const params = sq.execParams();
    const cacheKey = makeQueryCacheKey(sq.id, params);
    queryVarToKey[key] = cacheKey;
    $queries[cacheKey] = mkPlasmicUndefinedServerProxy();
  }

  do {
    await Promise.all(
      Object.keys(serverQueries).map(async (key) => {
        const cacheKey = queryVarToKey[key];
        $queries[cacheKey] = await executeServerQuery(serverQueries[key]);
        if (!$queries[cacheKey].data?.isUndefinedServerProxy) {
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
