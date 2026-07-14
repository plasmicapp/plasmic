import { isNonNil } from "@/wab/shared/common";
import {
  StatefulQueryResult,
  unwrapStatefulQueryResult,
} from "@/wab/shared/core/custom-functions";
import {
  DataPickerOpts,
  dataPickerShouldHideKey,
  getVariableType,
} from "@/wab/shared/data-picker/data-picker-types";
import {
  DataContextJson,
  DataPathJson,
} from "@/wab/shared/web-exporter/schema";
import { mkMetaName } from "@plasmicapp/host";

export type DataContextScope = "element" | "root";

export interface BuildDataContextOpts {
  componentUuid: string;
  elementUuid?: string;
  scope: DataContextScope;
  /** Names of the component's own ComponentDataQueries (the $queries
   * namespace, the legacy integrations). Used to filter $queries for
   * root-scope output so we don't leak ancestor queries. */
  componentDataQueryNames?: string[];
  /** Names of the component's own ComponentServerQueries (the $q namespace).
   * Used to filter $q for root-scope output. */
  componentServerQueryNames?: string[];
  maxDepth?: number;
  maxKeysPerObject?: number;
  maxArrayItems?: number;
  valueMaxLength?: number;
  /** Ceiling on the total number of emitted DataPath nodes across the whole tree. */
  maxTotalPaths?: number;
}

// Deep enough to reach the fields of a query: $q.name.data[0].field
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_KEYS = 500;
const DEFAULT_MAX_ARRAY_ITEMS = 10;
const DEFAULT_VALUE_MAX_LENGTH = 200;
const DEFAULT_MAX_TOTAL_PATHS = 1000;

const PICKER_OPTS: DataPickerOpts = { showAdvancedFields: false };

/**
 * Build the canonical JSON model for a CanvasEnv record: a `DataContext` whose
 * `paths` mirror the env as a tree of typed `DataPath` nodes.
 */
export function buildDataContextResource(
  env: Record<string, unknown>,
  opts: BuildDataContextOpts
): DataContextJson {
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxKeys = opts.maxKeysPerObject ?? DEFAULT_MAX_KEYS;
  const maxArray = opts.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS;
  const valueMax = opts.valueMaxLength ?? DEFAULT_VALUE_MAX_LENGTH;
  const maxTotalPaths = opts.maxTotalPaths ?? DEFAULT_MAX_TOTAL_PATHS;

  const preparedEnv =
    opts.scope === "root"
      ? prepareRootEnv(
          env,
          opts.componentDataQueryNames,
          opts.componentServerQueryNames
        )
      : { ...env };
  unwrapServerQueries(preparedEnv);

  const paths = buildPathNodes(preparedEnv, [], {
    maxDepth,
    maxKeys,
    maxArray,
    valueMax,
    seen: new Set(),
    currentDepth: 0,
    budget: { remaining: maxTotalPaths }, // Shared across the whole walk
  });

  return {
    __type: "DataContext",
    componentUuid: opts.componentUuid,
    scope: opts.scope,
    ...(opts.elementUuid ? { elementUuid: opts.elementUuid } : {}),
    paths,
  };
}

/**
 * Filter $queries and $q to entries owned by this component to avoid leaking ancestor queries.
 */
function prepareRootEnv(
  env: Record<string, unknown>,
  componentDataQueryNames: string[] | undefined,
  componentServerQueryNames: string[] | undefined
): Record<string, unknown> {
  const rest = { ...env } as Record<string, any>;
  if ("$queries" in rest && componentDataQueryNames) {
    rest.$queries = filterByName(rest.$queries, componentDataQueryNames);
  }
  if ("$q" in rest && componentServerQueryNames) {
    rest.$q = filterByName(rest.$q, componentServerQueryNames);
  }
  return rest;
}

/**
 * Replace each $q StatefulQueryResult with a plain {data, isLoading, error}
 * snapshot to avoid serializing internals matching prepareEnvForDataPicker().
 */
function unwrapServerQueries(env: Record<string, unknown>): void {
  const dollarQ = env.$q;
  if (!isNonNil(dollarQ) || typeof dollarQ !== "object") {
    return;
  }
  env.$q = Object.fromEntries(
    Object.entries(dollarQ as Record<string, unknown>).map(([name, query]) => [
      name,
      isStatefulQueryResult(query)
        ? // Keep isLoading to differentiate a timed-out query from one that
          // settled with undefined data.
          { ...unwrapStatefulQueryResult(query), isLoading: query.isLoading }
        : query,
    ])
  );
}

function isStatefulQueryResult(query: unknown): query is StatefulQueryResult {
  return (
    isNonNil(query) &&
    typeof (query as { getDoneResult?: unknown }).getDoneResult === "function"
  );
}

function filterByName(
  bag: Record<string, unknown> | undefined,
  ownedNames: string[]
): Record<string, unknown> {
  if (!bag) {
    return {};
  }
  const owned = new Set(ownedNames);
  return Object.fromEntries(
    Object.entries(bag).filter(([name]) => owned.has(name))
  );
}

interface BuildCtx {
  maxDepth: number;
  maxKeys: number;
  maxArray: number;
  valueMax: number;
  seen: Set<unknown>;
  currentDepth: number;
  budget: { remaining: number };
}

/**
 * Walk an object into the list of `DataPath` nodes for its (visible) keys,
 * appending a `...` marker node when keys are dropped past `maxKeys` or the
 * global node budget.
 */
function buildPathNodes(
  obj: Record<string, unknown>,
  pathPrefix: (string | number)[],
  ctx: BuildCtx
): DataPathJson[] {
  const allKeys = Object.keys(obj).filter(
    (key) => !dataPickerShouldHideKey(key, obj, pathPrefix, PICKER_OPTS)
  );
  const nodes: DataPathJson[] = [];
  let emitted = 0;
  for (const key of allKeys) {
    if (emitted >= ctx.maxKeys || ctx.budget.remaining <= 0) {
      break;
    }
    ctx.budget.remaining--;
    nodes.push(buildPathNode(key, obj[key], pathPrefix, obj, ctx));
    emitted++;
  }
  if (emitted < allKeys.length) {
    nodes.push({
      __type: "DataPath",
      name: "…",
      truncated: true,
      omittedCount: allKeys.length - emitted,
    });
  }
  return nodes;
}

function buildPathNode(
  name: string | number,
  value: unknown,
  pathPrefix: (string | number)[],
  parent: Record<string, unknown> | undefined,
  ctx: BuildCtx
): DataPathJson {
  const type = getVariableType(value);
  const node: DataPathJson = { __type: "DataPath", name: String(name), type };

  if (parent) {
    const meta = parent[mkMetaName(String(name))] as
      | { label?: string }
      | undefined;
    if (meta?.label) {
      node.label = meta.label;
    }
  }

  // React elements and functions: type only, no value.
  if (type === "react-element" || type === "function") {
    return node;
  }

  if (type === "object" || type === "array") {
    if (ctx.seen.has(value)) {
      node.truncated = true;
      node.reason = "circular";
      return node;
    }
    if (ctx.currentDepth >= ctx.maxDepth) {
      node.truncated = true;
      return node;
    }
    const nextCtx: BuildCtx = {
      ...ctx,
      currentDepth: ctx.currentDepth + 1,
      seen: new Set(ctx.seen).add(value),
    };
    let children: DataPathJson[] = [];
    if (type === "array") {
      const arr = (value as unknown[]) ?? [];
      node.length = arr.length;
      let emitted = 0;
      for (const item of arr) {
        if (emitted >= ctx.maxArray || nextCtx.budget.remaining <= 0) {
          break;
        }
        nextCtx.budget.remaining--;
        children.push(
          buildPathNode(
            emitted,
            item,
            [...pathPrefix, name],
            undefined,
            nextCtx
          )
        );
        emitted++;
      }
      if (emitted < arr.length) {
        children.push({
          __type: "DataPath",
          name: "…",
          truncated: true,
          omittedCount: arr.length - emitted,
        });
      }
    } else {
      const child = (value as Record<string, unknown>) ?? {};
      children = buildPathNodes(child, [...pathPrefix, name], nextCtx);
    }
    if (children.length > 0) {
      node.children = children;
    }
    return node;
  }

  // Primitive: try to stringify a short value.
  const rendered = renderPrimitive(value, ctx.valueMax);
  if (rendered !== undefined) {
    node.value = rendered;
  }
  return node;
}

function renderPrimitive(value: unknown, maxLen: number): string | undefined {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return undefined;
  }
  if (serialized === undefined) {
    return String(value);
  }
  if (serialized.length > maxLen) {
    return serialized.slice(0, maxLen - 1) + "…";
  }
  return serialized;
}
