import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  buildCustomCodePlasmicQuery,
  getCustomFunctionParams,
  getInvalidFunctionArgs,
  wrapPlasmicQueryFetch,
} from "@/wab/shared/core/custom-functions";
import { ExprCtx } from "@/wab/shared/core/exprs";
import { InvalidArg } from "@/wab/shared/core/invalid-arg";
import { customFunctionId } from "@/wab/shared/core/query-ids";
import {
  CustomCode,
  CustomFunctionExpr,
  isKnownCustomCode,
} from "@/wab/shared/model/classes";
import type {
  PlasmicQuery,
  QueryComponentNode,
  QueryExecutionContext,
} from "@plasmicapp/data-sources";
import {
  _StatefulQueryResult as StatefulQueryResult,
  _StatefulQueryState as StatefulQueryState,
  usePlasmicQueries,
} from "@plasmicapp/data-sources";
import type { CustomFunctionRegistration } from "@plasmicapp/host";
import type { SWRResponse } from "@plasmicapp/query";
import { usePlasmicDataConfig } from "@plasmicapp/query";
import React from "react";

interface CustomFunctionOpArgs {
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
  queryState: StatefulQueryState<T> | undefined;
  swrResponse: Pick<SWRResponse<T>, "mutate">;
  invalidArgs: Record<string, InvalidArg> | undefined;
}

function isCustomCodeOpArgs(args: ServerQueryOpArgs): args is CustomCodeOpArgs {
  return "code" in args && isKnownCustomCode(args.code);
}

// NOOP_QUERY is used when we don't want to execute anything, but we still
// need to supply valid inputs for usePlasmicQueries, since it renders a
// different number of hooks depending on the number of queries.
const NOOP_QUERY: PlasmicQuery = {
  id: "__noop__",
  fn: async () => undefined,
  args: () => [],
};

/**
 * Runs a server query op (CustomFunctionExpr or CustomCode) for the Studio editor.
 *
 * The fetch uses `studioCtx.executeServerQuery` so preview, modal, and the canvas all share
 * one cache entry per query id/args. This ensures non-deterministic/stateful functions execute
 * once per refresh and show identical results.
 */
export function useServerQueryOp(
  args: ServerQueryOpArgs | undefined
): ServerQueryOpResult<unknown> {
  const studioCtx = useStudioCtx();
  const wrapFetch = studioCtx.executeServerQuery;
  const env = args?.env ?? {};
  const envRef = React.useRef(env);
  envRef.current = env;

  // Unpack args into stable values for the useMemo deps array.
  // Common:
  let fnId: string;
  // Custom code:
  let code: string | undefined;
  // Custom function:
  let fnReg: CustomFunctionRegistration | undefined;
  let expr: CustomFunctionExpr | undefined;
  let exprCtx: ExprCtx | undefined;
  let currGlobalThis: typeof globalThis | undefined;

  if (!args) {
    fnId = NOOP_QUERY.id;
    // everything remains undefined
  } else if (isCustomCodeOpArgs(args)) {
    fnId = args.fnId;
    code = args.code.code;
  } else {
    expr = args.expr;
    exprCtx = args.exprCtx;
    currGlobalThis = args.currGlobalThis;
    fnId = customFunctionId(args.expr.func);
    fnReg = studioCtx.getRegisteredFunction(args.expr.func);
  }

  // Memoized so stable inputs (e.g. the modal's executeArgs snapshot) don't
  // re-evaluate params on every render; the sidebar previews rebuild `env`
  // from canvas data, so validation recomputes there as that data changes.
  const invalidArgs = React.useMemo(() => {
    if (!expr || !exprCtx || !fnReg) {
      return undefined;
    }
    try {
      const fnArgs = getCustomFunctionParams(
        expr,
        env,
        exprCtx,
        currGlobalThis
      );
      return getInvalidFunctionArgs(fnArgs, expr.func, fnReg.meta.params);
    } catch {
      return undefined;
    }
  }, [env, fnReg, expr, exprCtx, currGlobalThis]);
  const hasInvalidArgs = !!invalidArgs;

  const queryTree = React.useMemo((): QueryComponentNode => {
    let query: PlasmicQuery;
    if (fnId === NOOP_QUERY.id) {
      // No args supplied.
      query = NOOP_QUERY;
    } else if (code !== undefined) {
      query = buildCustomCodePlasmicQuery(
        fnId,
        code,
        () => envRef.current ?? {}
      );
    } else if (fnReg && expr && exprCtx && !hasInvalidArgs) {
      query = {
        id: fnId,
        fn: fnReg.function,
        args: ({ $q, $props, $ctx, $state }: QueryExecutionContext) =>
          getCustomFunctionParams(
            expr!,
            {
              ...(envRef.current ?? {}),
              $q: { ...(envRef.current?.$q ?? {}), ...$q },
              $props,
              $ctx,
              $state,
            },
            exprCtx!,
            currGlobalThis
          ),
      };
    } else {
      // Missing registration or has invalid args.
      query = NOOP_QUERY;
    }

    return {
      type: "component",
      queries: {
        [fnId]:
          query === NOOP_QUERY
            ? NOOP_QUERY
            : wrapPlasmicQueryFetch(query, wrapFetch),
      },
      propsContext: {},
      stateSpecs: [],
      children: [],
    };
  }, [
    fnId,
    hasInvalidArgs,
    code,
    fnReg,
    expr,
    exprCtx,
    currGlobalThis,
    wrapFetch,
  ]);

  const $queries = usePlasmicQueries(queryTree, {
    $ctx: env.$ctx ?? {},
    $props: env.$props ?? {},
    $state: env.$state ?? {},
  });

  // $query is a mutable object and will not trigger React updates as normal,
  // so we secretly use the internal state which is guaranteed to change.
  const $query =
    fnId === NOOP_QUERY.id
      ? undefined
      : ($queries[fnId] as StatefulQueryResult);
  const queryState = $query?.current;

  const { mutate } = usePlasmicDataConfig();
  const swrResponse = React.useMemo(
    () => ({
      mutate: async () => {
        const key = $query?.current.key;
        if (!key) {
          return undefined;
        }
        // Clear the shared studio execution cache first, since revalidation invokes the
        // wrapped fetcher, which otherwise resolves to the cached promise for this key.
        studioCtx.mutateDataOp(key);
        return mutate(key);
      },
    }),
    [$query, mutate, studioCtx]
  );

  return {
    queryState,
    swrResponse,
    invalidArgs,
  };
}
