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
import { tryParseAsObjectPath } from "@/wab/shared/eval/expression-parser";
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
  /** Object paths to select specific subtrees, e.g. "$state", "$q.orders.data[0].id". */
  paths?: string[];
}

/** A requested path that could not be parsed or resolved. */
export interface InvalidDataContextPath {
  path: string;
  message: string;
}

export interface BuildDataContextResult {
  resource: DataContextJson;
  invalidPaths: InvalidDataContextPath[];
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
export function buildDataContextResourceResult(
  env: Record<string, unknown>,
  opts: BuildDataContextOpts
): BuildDataContextResult {
  const preparedEnv =
    opts.scope === "root"
      ? prepareRootEnv(
          env,
          opts.componentDataQueryNames,
          opts.componentServerQueryNames
        )
      : { ...env };
  unwrapServerQueries(preparedEnv);

  const ctx: BuildCtx = {
    maxDepth: opts.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxKeysPerObject: opts.maxKeysPerObject ?? DEFAULT_MAX_KEYS,
    maxArrayItems: opts.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS,
    valueMaxLength: opts.valueMaxLength ?? DEFAULT_VALUE_MAX_LENGTH,
    remaining: opts.maxTotalPaths ?? DEFAULT_MAX_TOTAL_PATHS,
    seen: new Set(),
    currentDepth: 0,
  };
  const result = opts.paths
    ? selectPaths(preparedEnv, opts.paths, ctx)
    : { paths: buildAllPaths(preparedEnv, [], ctx), invalidPaths: [] };

  return {
    resource: {
      __type: "DataContext",
      componentUuid: opts.componentUuid,
      scope: opts.scope,
      ...(opts.elementUuid && { elementUuid: opts.elementUuid }),
      paths: result.paths,
    },
    invalidPaths: result.invalidPaths,
  };
}

/**
 * Resolve each requested object path against the prepared env, returning one top-level
 * `DataPath` per resolved selection and collecting failures. Each returned node is
 * identified by `name`, which has the full path string, so callers match by name.
 * Dedupes, resets depth at each selection, and shares a node budget across all selections.
 */
interface SelectPathsResult {
  paths: DataPathJson[];
  invalidPaths: InvalidDataContextPath[];
}

function selectPaths(
  env: Record<string, unknown>,
  requestedPaths: string[],
  ctx: BuildCtx
): SelectPathsResult {
  const nodes: DataPathJson[] = [];
  const invalidPaths: InvalidDataContextPath[] = [];
  let omittedCount = 0;
  for (const rawPath of [...new Set(requestedPaths)]) {
    const segments = tryParseAsObjectPath(rawPath);
    if (!segments || segments.length === 0) {
      invalidPaths.push(invalidPath(rawPath, "invalid path syntax."));
      continue;
    }
    const resolved = resolvePath(env, segments);
    if (!resolved.found) {
      invalidPaths.push(invalidPath(rawPath, "path not found."));
      continue;
    }
    if (ctx.remaining <= 0) {
      omittedCount++;
      continue;
    }
    ctx.remaining--;
    const node = buildPathNode(
      segments[segments.length - 1],
      resolved.value,
      segments.slice(0, -1),
      resolved.parent,
      ctx
    );
    node.name = rawPath;
    nodes.push(node);
  }
  if (omittedCount > 0) {
    nodes.push({
      __type: "DataPath",
      name: "…",
      truncated: true,
      omittedCount,
    });
  }
  return { paths: nodes, invalidPaths };
}

/**
 * Walk `segments` from the env root. Every object segment must be a visible property,
 * and every array must be a valid integer index.
 */
function resolvePath(
  env: Record<string, unknown>,
  segments: (string | number)[]
):
  | { found: true; value: unknown; parent: Record<string, unknown> | undefined }
  | { found: false } {
  let current: unknown = env;
  let parent: Record<string, unknown> | undefined;
  const pathPrefix: (string | number)[] = [];
  for (const seg of segments) {
    if (!isNonNil(current) || typeof current !== "object") {
      return { found: false };
    }
    if (Array.isArray(current)) {
      if (
        typeof seg !== "number" ||
        !Number.isInteger(seg) ||
        seg < 0 ||
        seg >= current.length
      ) {
        return { found: false };
      }
      parent = undefined;
      current = current[seg];
    } else {
      const obj = current as Record<string, unknown>;
      const key = String(seg);
      if (
        !Object.prototype.hasOwnProperty.call(obj, key) ||
        dataPickerShouldHideKey(key, obj, pathPrefix, PICKER_OPTS)
      ) {
        return { found: false };
      }
      parent = obj;
      current = obj[key];
    }
    pathPrefix.push(seg);
  }
  return { found: true, value: current, parent };
}

function invalidPath(path: string, reason: string): InvalidDataContextPath {
  return { path, message: `Invalid data-context path "${path}": ${reason}` };
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

/**
 * Sizing options from `BuildDataContextOpts` with defaults, plus mutable walk state.
 */
interface BuildCtx
  extends Required<
    Pick<
      BuildDataContextOpts,
      "maxDepth" | "maxKeysPerObject" | "maxArrayItems" | "valueMaxLength"
    >
  > {
  /** Remaining node budget (from `maxTotalPaths`). */
  remaining: number;
  seen: Set<unknown>;
  currentDepth: number;
}

/**
 * Walk an object into the list of `DataPath` nodes for all its (visible) keys,
 * appending a `...` marker node when keys are dropped past `maxKeysPerObject`
 * or the global node budget.
 */
function buildAllPaths(
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
    if (emitted >= ctx.maxKeysPerObject || ctx.remaining <= 0) {
      break;
    }
    ctx.remaining--;
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
    ctx.seen.add(value);
    ctx.currentDepth++;
    let children: DataPathJson[] = [];
    if (type === "array") {
      const arr = (value as unknown[]) ?? [];
      node.length = arr.length;
      let emitted = 0;
      for (const item of arr) {
        if (emitted >= ctx.maxArrayItems || ctx.remaining <= 0) {
          break;
        }
        ctx.remaining--;
        children.push(
          buildPathNode(emitted, item, [...pathPrefix, name], undefined, ctx)
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
      children = buildAllPaths(child, [...pathPrefix, name], ctx);
    }
    ctx.currentDepth--;
    ctx.seen.delete(value);
    if (children.length > 0) {
      node.children = children;
    }
    return node;
  }

  // Primitive: try to stringify a short value.
  const rendered = renderPrimitive(value, ctx.valueMaxLength);
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
