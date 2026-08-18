import { ApiDataSource } from "@/wab/shared/ApiSchema";
import { extractStringLiteralsFromCode } from "@/wab/shared/eval/expression-parser";
import {
  CustomCode,
  DataSourceOpExpr,
  DataSourceTemplate,
  ObjectPath,
  TemplatedString,
  isKnownCustomCode,
  isKnownTemplatedString,
} from "@/wab/shared/model/classes";
import { isString } from "lodash";

/**
 * Legacy `$queries` run server-side through the integration proxy, `$q` queries run
 * from wherever the page renders. Only plain HTTP/GraphQL integrations can safely use
 * fetch on the client, so migratability is decided here.
 */
const MIGRATABLE_SOURCE_TYPES = ["http", "graphql"];

export function isMigratableSourceType(sourceType: string): boolean {
  return MIGRATABLE_SOURCE_TYPES.includes(sourceType);
}

export interface LegacyQueryMigrationCheck {
  migratable: boolean;
  blockers: string[];
  warnings: string[];
}

export function checkLegacyQueryMigratable(
  op: DataSourceOpExpr | null | undefined,
  source: ApiDataSource | undefined,
  invalidationRefCount: number,
  readsLegacyQueries: string[],
  sourceError?: unknown
): LegacyQueryMigrationCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!op) {
    blockers.push("The query has no operation configured yet.");
    return { migratable: false, blockers, warnings };
  }

  if (!source) {
    blockers.push(
      isForbiddenError(sourceError)
        ? "You don't have access to the workspace that owns this integration, so its configuration " +
            "can't be checked. Ask a workspace admin for viewer access, then reopen the project."
        : "The integration this query uses could not be loaded, so its endpoint is unknown."
    );
    return { migratable: false, blockers, warnings };
  }

  if (!isMigratableSourceType(source.source)) {
    blockers.push(
      `${source.source} integrations run on Plasmic's server and have no client-side equivalent; ` +
        `only ${MIGRATABLE_SOURCE_TYPES.join(
          "/"
        )} integrations can be migrated.`
    );
  }

  const baseUrl = source.settings?.baseUrl;
  if (typeof baseUrl !== "string" || !baseUrl) {
    blockers.push(
      "The integration's base URL is not visible, so the request URL can't be reconstructed."
    );
  } else {
    if (isInsecureBaseUrl(baseUrl)) {
      blockers.push(
        "The integration's base URL is not https. Studio and published pages load over https, " +
          "and browsers block insecure requests from https pages, so the migrated query would " +
          "fail to fetch."
      );
    }
    if (baseUrlHasSensitiveText(baseUrl)) {
      blockers.push(
        "The integration's base URL looks like it embeds credentials. The proxy keeps the base URL " +
          "on Plasmic's server now, but a migrated query could include it in client code."
      );
    }
  }

  if (op.roleId) {
    blockers.push(
      "The query is role-gated. New data queries have no role, so migrating drops access check."
    );
  }

  if (op.cacheKey && !isBlankTemplatedString(op.cacheKey)) {
    blockers.push(
      "The query is assigned to a query group. Interactions can refresh groups by name, and " +
        "the migrated query would no longer be in the group, so refreshes would silently stop updating it."
    );
  }

  if (invalidationRefCount > 0) {
    blockers.push(
      "An interaction refreshes this query after a mutation. All migrated fetch queries " +
        "share one refresh key, so the refresh would re-run every one of them " +
        "instead of just this query. Retarget those interactions (e.g. to refresh all queries) first."
    );
  }

  if (source.hasPrivateConfig) {
    blockers.push(
      "The integration has server-side credentials or default headers. Those are applied by the proxy and " +
        "would be lost — and any replacement would have to send them from the browser, where they are readable by end users."
    );
  }

  const sensitiveArgs = findSensitiveOpArgs(op);
  if (sensitiveArgs.length > 0) {
    blockers.push(
      `Some of the query's args might have credentials (${sensitiveArgs.join(
        ", "
      )}). The proxy sends those from Plasmic's server today; a migrated query would send them ` +
        "from the browser, where end users can read them."
    );
  }

  if (readsLegacyQueries.length > 0) {
    warnings.push(
      `The query builds its request from legacy queries (${readsLegacyQueries.join(
        ", "
      )}). Migrated queries run before legacy ones, so this one returns no data ` +
        "until those are migrated too."
    );
  }

  const browserOwnedHeaders = findBrowserOwnedHeaders(op);
  if (browserOwnedHeaders.length > 0) {
    blockers.push(
      `The query sets the ${browserOwnedHeaders.join(", ")} header(s). ` +
        "Browsers drop or replace those on requests made from page code, so the " +
        "migrated request would not match what the proxy sends today."
    );
  }

  return { migratable: blockers.length === 0, blockers, warnings };
}

function isForbiddenError(err: unknown): boolean {
  return (err as { statusCode?: number } | undefined)?.statusCode === 403;
}

/**
 * commonHeaders entry the HTTP/GraphQL integration form prefills, which shouldn't
 * read as privately configured. Any other hidden header changes request/response
 * behavior, so it counts as private config.
 */
export function isGeneratedDefaultHeader(
  header: string,
  value: unknown
): boolean {
  return (
    header.toLowerCase() === "content-type" && value === "application/json"
  );
}

export function generatedDefaultHeaders(
  commonHeaders: unknown
): Record<string, string> {
  if (
    !commonHeaders ||
    typeof commonHeaders !== "object" ||
    Array.isArray(commonHeaders)
  ) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(commonHeaders).filter(([header, value]) =>
      isGeneratedDefaultHeader(header, value)
    )
  );
}

/**
 * Op args that might have auth data, which the proxy keeps server-side. All
 * arg literal text is scanned, secrets can be anywhere.
 */
function findSensitiveOpArgs(op: DataSourceOpExpr): string[] {
  return Object.entries(op.templates)
    .filter(
      ([name, template]) =>
        hasSensitiveWord(name) ||
        hasSensitiveWord(templateLiteralText(template)) ||
        (name === HEADERS_ARG && hasUnrecognizedHeader(template))
    )
    .map(([name]) => name);
}

/** Both the http and the graphql ops name their header dict `headers`. */
const HEADERS_ARG = "headers";

/**
 * Safe header names a browser fetch sends as written. A token is random text that
 * no word list catches, so every other header the op sends counts as sensitive.
 */
const RECOGNIZED_HEADER_NAMES = new Set([
  "accept",
  "accept-language",
  "cache-control",
  "content-language",
  "content-type",
]);

/**
 * Headers the browser owns. fetch drops Accept-Charset and sends Accept-Encoding/User-Agent,
 * so a migrated request can't carry the proxy's values for them.
 */
const BROWSER_OWNED_HEADER_NAMES = new Set([
  "accept-charset",
  "accept-encoding",
  "user-agent",
]);

/** Stands in for a dynamic binding so the dict around it still parses. */
const DYNAMIC_HEADER_PART = "__dynamic__";

/** The header names a `headers` dict sends, or undefined if unreadable. */
function headerNames(template: DataSourceTemplate): string[] | undefined {
  const value = template.value;
  const text = isKnownTemplatedString(value)
    ? value.text
        .map((part) => (isString(part) ? part : DYNAMIC_HEADER_PART))
        .join("")
    : value;
  if (!isString(text) || text.trim() === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Not a readable dict, so what it sends is unknown.
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  return Object.keys(parsed).map((name) => name.trim().toLowerCase());
}

/** Whether a `headers` dict sends anything but the known header names. */
function hasUnrecognizedHeader(template: DataSourceTemplate): boolean {
  const names = headerNames(template);
  return (
    !names ||
    names.some(
      (name) =>
        !RECOGNIZED_HEADER_NAMES.has(name) &&
        !BROWSER_OWNED_HEADER_NAMES.has(name)
    )
  );
}

/** The browser-owned headers the op sends, which get their own blocker. */
function findBrowserOwnedHeaders(op: DataSourceOpExpr): string[] {
  const template = op.templates[HEADERS_ARG];
  if (!template) {
    return [];
  }
  return [
    ...new Set(
      (headerNames(template) ?? []).filter((name) =>
        BROWSER_OWNED_HEADER_NAMES.has(name)
      )
    ),
  ];
}

/** Words that mean "credential", e.g. `Authorization`, `access_token`, `key`. */
const SENSITIVE_WORDS = [
  "auth",
  "authorization",
  "authentication",
  "token",
  "key",
  "secret",
  "password",
  "passwd",
  "pwd",
  "credential",
  "cookie",
  "signature",
  "session",
  "bearer",
];

/** Qualifiers run together with one of those in a single word, e.g. `apikey`. */
const SENSITIVE_PREFIXES = [
  "api",
  "app",
  "access",
  "auth",
  "client",
  "private",
  "public",
  "secret",
  "user",
  "x",
];

/**
 * One whole word, plus an optional qualifier and a plural/`id` tail so `apiKeys` and
 * `sessionId` count. Matching words rather than substrings keeps ordinary text like
 * `hockey` from reading as a credential.
 */
const SENSITIVE_WORD_RE = new RegExp(
  `^(?:${SENSITIVE_PREFIXES.join("|")})?(?:${SENSITIVE_WORDS.join(
    "|"
  )})(?:e?s|ids?)?$`
);

/** Splits on non-letters and camelCase humps: `X-Api-Key` -> `x`, `api`, `key`. */
function textWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word !== "");
}

function hasSensitiveWord(text: string): boolean {
  return textWords(text).some((word) => SENSITIVE_WORD_RE.test(word));
}

function isInsecureBaseUrl(baseUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }
  return (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHost(url.hostname))
  );
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "[::1]" ||
    /^127(\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * The proxy keeps the base URL server-side, so it can carry credentials,
 * e.g. (`https://user:pass@host`), or keys baked into the path/query.
 *
 * Any base URL query string counts, including params in a hidden prefix is
 * a likely spot for a secret.
 */
function baseUrlHasSensitiveText(baseUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return hasSensitiveWord(baseUrl);
  }
  return (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    hasSensitiveWord(url.pathname)
  );
}

/**
 * The host of a base URL, without the userinfo/path/query a secret can hide in.
 */
export function redactBaseUrl(baseUrl: string): string {
  try {
    const { protocol, host } = new URL(baseUrl);
    return host ? `${protocol}//${host}/(redacted)` : "(redacted)";
  } catch {
    return "(redacted)";
  }
}

/** Clearing the query-group editor can leave a TemplatedString with only empty text. */
function isBlankTemplatedString(ts: TemplatedString): boolean {
  return ts.text.every((part) => isString(part) && part.trim() === "");
}

/**
 * The template's literal text. Dynamic bindings are substituted into the value at
 * request time, so their literal text counts as the template's too.
 */
function templateLiteralText(template: DataSourceTemplate): string {
  const value = template.value;
  return [
    isKnownTemplatedString(value) ? exprLiteralText(value) : value ?? "",
    ...Object.values(template.bindings ?? {}).map(exprLiteralText),
  ].join(" ");
}

/** The literal text an expr contributes: template text and string literals in code. */
function exprLiteralText(expr: TemplatedString | CustomCode | ObjectPath) {
  if (isKnownTemplatedString(expr)) {
    return expr.text
      .map((part) => (isString(part) ? part : exprLiteralText(part)))
      .join(" ");
  }
  if (isKnownCustomCode(expr)) {
    try {
      return extractStringLiteralsFromCode(expr.code).join(" ");
    } catch {
      // Unparseable, so scan the raw code rather than assume it holds no secret.
      return expr.code;
    }
  }
  return "";
}
