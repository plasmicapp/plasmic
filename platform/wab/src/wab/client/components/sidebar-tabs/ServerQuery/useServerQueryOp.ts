import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  buildCustomCodePlasmicQuery,
  getCustomFunctionParams,
  wrapPlasmicQueryFetch,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import {
  CustomCode,
  CustomFunctionExpr,
  isKnownCustomCode,
} from "@/wab/shared/model/classes";
import type {
  QueryComponentNode,
  QueryExecutionContext,
} from "@plasmicapp/data-sources";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  makeQueryCacheKey,
  unstable_usePlasmicQueries as usePlasmicQueries,
} from "@plasmicapp/data-sources";
import type { SWRResponse } from "@plasmicapp/query";
import { usePlasmicDataConfig } from "@plasmicapp/query";
import React from "react";

interface CustomFunctionOpArgs {
  fnId: string;
  fn: (...args: any[]) => any;
  expr: CustomFunctionExpr;
  env: Record<string, any>;
  exprCtx: ExprCtx;
  currGlobalThis?: typeof globalThis;
}

export interface CustomCodeOpArgs {
  fnId: string;
  code: CustomCode;
  env: Record<string, any>;
}

export type ServerQueryOpArgs = CustomFunctionOpArgs | CustomCodeOpArgs;

export interface ServerQueryOpResult<T> {
  queryState: StatefulQueryState<T>;
  swrResponse: Pick<SWRResponse<T>, "mutate">;
}

function isCustomCodeOpArgs(args: ServerQueryOpArgs): args is CustomCodeOpArgs {
  return "code" in args && isKnownCustomCode(args.code);
}

/**
 * Runs a server query op (CustomFunctionExpr or CustomCode) for the Studio editor.
 *
 * The fetch uses `studioCtx.executeServerQuery` so preview, modal, and the canvas all share
 * one cache entry per query id/args. This ensures non-deterministic/stateful functions execute
 * once per refresh and show identical results.
 */
export function useServerQueryOp(
  args: ServerQueryOpArgs
): ServerQueryOpResult<unknown> {
  // Stable across renders (a bound StudioCtx method), so it's a safe useMemo dep.
  const wrapFetch = useStudioCtx().executeServerQuery;

  const { fnId, env } = args;
  const code = isCustomCodeOpArgs(args) ? args.code : undefined;
  const fn = isCustomCodeOpArgs(args) ? undefined : args.fn;
  const expr = isCustomCodeOpArgs(args) ? undefined : args.expr;
  const exprCtx = isCustomCodeOpArgs(args) ? undefined : args.exprCtx;
  const currGlobalThis = isCustomCodeOpArgs(args)
    ? undefined
    : args.currGlobalThis;

  const { mutate } = usePlasmicDataConfig();

  const rootProps = env.$props ?? {};
  const rootCtx = env.$ctx ?? {};
  const rootState: Record<string, unknown> | null = env.$state ?? null;
  const envRef = React.useRef(env);
  envRef.current = env;

  const queryTree = React.useMemo((): QueryComponentNode => {
    const query = code
      ? buildCustomCodePlasmicQuery(fnId, code.code, () => envRef.current)
      : {
          id: fnId,
          fn: fn!,
          args: ({ $q, $props, $ctx, $state }: QueryExecutionContext) =>
            expr
              ? getCustomFunctionParams(
                  expr,
                  {
                    ...(envRef.current ?? {}),
                    $q: { ...(envRef.current?.$q ?? {}), ...$q },
                    $props,
                    $ctx,
                    $state,
                  },
                  exprCtx!,
                  currGlobalThis
                )
              : [],
        };
    return {
      type: "component",
      // Wrap both branches through the shared studio cache, keyed by the node's id.
      queries: { [fnId]: wrapPlasmicQueryFetch(query, wrapFetch) },
      propsContext: {},
      stateSpecs: [],
      children: [],
    };
  }, [fnId, fn, expr, exprCtx, currGlobalThis, code, wrapFetch]);

  const $queries = usePlasmicQueries(queryTree, rootCtx, rootProps, rootState);
  const swrResponse = React.useMemo(
    () => ({
      mutate: async () => {
        const params = expr
          ? getCustomFunctionParams(
              expr,
              {
                ...(envRef.current ?? {}),
                $q: { ...(envRef.current?.$q ?? {}), ...$queries },
                $props: rootProps,
                $ctx: rootCtx,
              },
              exprCtx!,
              currGlobalThis
            )
          : [];
        return mutate(makeQueryCacheKey(fnId, params));
      },
    }),
    [rootProps, rootCtx, expr, exprCtx, fnId, mutate, $queries, currGlobalThis]
  );

  // $query is a mutable object and will not trigger React updates as normal,
  // so we secretly use the internal state which is guaranteed to change.
  const $query = $queries[fnId];
  const queryState = ($query as StatefulQueryResult)
    .current as StatefulQueryState;
  return {
    queryState,
    swrResponse,
  };
}
