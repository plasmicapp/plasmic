import { tokenTypes } from "@/wab/commons/StyleToken";
import {
  STATE_ACCESS_TYPES,
  STATE_VARIABLE_TYPES,
} from "@/wab/shared/core/states";
import { z } from "zod";

/**
 * The schema every AI tool returns: the serialized resources it produced or
 * read, plus optional human-readable status messages.
 */
export function outputResultSchema(resultSchema: z.ZodTypeAny) {
  return z.object({
    __type: z.literal("OutputResult"),
    messages: z
      .array(z.string())
      .optional()
      .describe("Human-readable status messages from the tool, if any."),
    results: z
      .array(resultSchema)
      .describe("Serialized resources, each self-describing via `__type`."),
  });
}

/**
 * Build the `OutputResult` envelope a tool returns: the resources it produced or
 * read, plus optional human-readable status messages.
 */
export function outputResult<T extends ReadResultJson>(
  results: T[],
  messages?: string[]
): { __type: "OutputResult"; messages?: string[]; results: T[] } {
  return {
    __type: "OutputResult",
    ...(messages && messages.length > 0 ? { messages } : {}),
    results,
  };
}

/** Build the canonical JSON model for an invalid/missing resource. */
export function serializeInvalidResource(
  uuid: string,
  type: InvalidResourceJson["type"],
  message: string
): InvalidResourceJson {
  return { __type: "InvalidResource", type, uuid, message };
}

/** Any standalone resource that `read` can return. */
export function readResultSchema() {
  return z.discriminatedUnion("__type", [
    projectSchema(),
    componentSchema(),
    elementSchema(),
    tokenSchema(),
    animationSchema(),
    dataContextSchema(),
    invalidResourceSchema(),
  ]);
}
export type ReadResultJson = z.infer<ReturnType<typeof readResultSchema>>;

export function componentResultSchema() {
  return z.discriminatedUnion("__type", [
    componentSchema(),
    invalidResourceSchema(),
  ]);
}

export function tokenResultSchema() {
  return z.discriminatedUnion("__type", [
    tokenSchema(),
    invalidResourceSchema(),
  ]);
}

export function animationResultSchema() {
  return z.discriminatedUnion("__type", [
    animationSchema(),
    invalidResourceSchema(),
  ]);
}

export function projectSchema() {
  return z.object({
    __type: z.literal("Project"),
    id: z.string().describe("Project id."),
    components: z
      .array(componentSummarySchema())
      .optional()
      .describe("All components (own + imported), when requested."),
    screenBreakpoints: z
      .array(screenBreakpointSchema())
      .optional()
      .describe("Active screen breakpoints, when requested."),
    globalVariantGroups: z
      .array(globalVariantGroupSchema())
      .optional()
      .describe("Global variant groups (own + imported), when requested."),
    tokens: z
      .array(tokenSchema())
      .optional()
      .describe("Style tokens (own + imported), when requested."),
    animations: z
      .array(animationSummarySchema())
      .optional()
      .describe("Animation sequences (own + imported), when requested."),
    dataQueryFunctions: dataQueryFunctionsSchema()
      .optional()
      .describe(
        "Installed and installable custom functions usable by createDataQuery, when requested."
      ),
    importedProjects: z
      .array(importedProjectSchema())
      .describe("Imported (direct dependency) projects; always included."),
  });
}
export type ProjectJson = z.infer<ReturnType<typeof projectSchema>>;

/**
 * Project-listing entry: the full component minus its heavy nested fields, with
 * pageMeta reduced to just its path.
 */
export function componentSummarySchema() {
  return componentSchema()
    .omit({
      props: true,
      variants: true,
      states: true,
      baseVariantTplTree: true,
      variantSettings: true,
      pageMeta: true,
    })
    .extend({
      pageMeta: pageMetaSchema()
        .pick({ __type: true, path: true })
        .optional()
        .describe("Page route, present for pages."),
    });
}
export type ComponentSummaryJson = z.infer<
  ReturnType<typeof componentSummarySchema>
>;

export function componentSchema() {
  return z.object({
    __type: z.literal("Component"),
    name: z.string().describe("Component name."),
    uuid: z.string().describe("Component UUID."),
    type: z
      .enum(["plain", "page", "code", "frame"])
      .describe("Component kind."),
    pageMeta: pageMetaSchema()
      .optional()
      .describe("Page metadata, present for pages."),
    fromProject: z
      .string()
      .optional()
      .describe("Imported project id, present only for imported components."),
    props: z
      .array(propSchema())
      .describe("Component props (non-variant params)."),
    variants: z
      .array(variantDefSchema())
      .describe("Component variant definitions (group + element variants)."),
    states: z
      .array(stateSchema())
      .optional()
      .describe("Component state variables ($state), when any exist."),
    baseVariantTplTree: z
      .string()
      .describe("Base-variant tpl tree as HTML markup."),
    variantSettings: z
      .array(variantOverrideSchema())
      .optional()
      .describe("Per-variant style/attr overrides."),
  });
}
export type ComponentJson = z.infer<ReturnType<typeof componentSchema>>;

export function pageMetaSchema() {
  return z.object({
    __type: z.literal("PageMeta"),
    path: z.string().optional().describe("Route path."),
    params: z
      .record(z.string(), z.string())
      .optional()
      .describe("Default values for path params."),
    query: z
      .record(z.string(), z.string())
      .optional()
      .describe("Default values for query params."),
    title: z.string().optional().describe("Page title / og:title."),
    description: z
      .string()
      .optional()
      .describe("Meta description for SEO and social previews."),
    canonical: z.string().optional().describe("Canonical URL."),
    openGraphImage: z.string().optional().describe("Open Graph image URL."),
  });
}
export type PageMetaJson = z.infer<ReturnType<typeof pageMetaSchema>>;

export function propSchema() {
  return z.object({
    __type: z.literal("Prop"),
    name: z.string().describe("Prop name."),
    uuid: z.string().describe("Prop UUID."),
    type: z
      .string()
      .describe(
        'Prop type, e.g. "text", "boolean", "number", "href", "enum", or a variant-group options string.'
      ),
    options: z
      .array(z.string())
      .optional()
      .describe("Allowed values, present for enum/choice props."),
    default: z.any().optional().describe("Default value (real typed value)."),
  });
}
export type PropJson = z.infer<ReturnType<typeof propSchema>>;

export function stateSchema() {
  return z.object({
    __type: z.literal("State"),
    name: z
      .string()
      .describe(
        'Variable name, as accessed via `$state` (implicit states use a dotted path, e.g. "myInput.value").'
      ),
    uuid: z
      .string()
      .describe("State UUID (the UUID of the state's value param)."),
    variableType: z
      .enum(STATE_VARIABLE_TYPES)
      .describe('Value type. "variant" states back a component variant group.'),
    accessType: z
      .enum(STATE_ACCESS_TYPES)
      .describe(
        "private: internal only; readonly: parent components can read it; writable: exposed as a prop (controlled-component style)."
      ),
    initialValue: z
      .union([z.any(), exprSchema()])
      .optional()
      .describe(
        "Initial value: the real typed value when statically known, otherwise a serialized dynamic expression."
      ),
    onChangeProp: z
      .string()
      .optional()
      .describe(
        "Change-handler prop name, present for public (non-private) states."
      ),
    elementUuid: z
      .string()
      .optional()
      .describe(
        "Present for implicit states: UUID of the element (component instance or input tag) whose state this mirrors."
      ),
  });
}
export type StateJson = z.infer<ReturnType<typeof stateSchema>>;

/**
 * A dynamic expression, serialized structurally. Only the expression classes
 * related state initial values are covered at the moment (CustomCode, ObjectPath,
 * TemplatedString).
 */

export type ExprJson =
  | CustomCodeExprJson
  | ObjectPathExprJson
  | TemplatedStringExprJson;

export type CustomCodeExprJson = {
  __type: "CustomCode";
  code: string;
  fallback?: ExprJson;
};
export type ObjectPathExprJson = {
  __type: "ObjectPath";
  path: (string | number)[];
  fallback?: ExprJson;
};
export type TemplatedStringExprJson = {
  __type: "TemplatedString";
  text: (string | CustomCodeExprJson | ObjectPathExprJson)[];
};

// Single instances so the recursive `z.lazy` reference below resolves to the
// same object every time. Otherwise, zod-to-json-schema can't detect
// recursion.
const fallbackSchema: z.ZodType<ExprJson | undefined> = z
  .lazy(() => exprSchema())
  .optional()
  .describe("Fallback expression used when evaluation fails.");

const customCodeExprSchema = z.object({
  __type: z.literal("CustomCode"),
  code: z.string().describe("JS expression over $-vars."),
  fallback: fallbackSchema,
});
const objectPathExprSchema = z.object({
  __type: z.literal("ObjectPath"),
  path: z
    .array(z.union([z.string(), z.number()]))
    .describe(
      'Member-access path, e.g. ["$ctx", "params", "slug"] for $ctx.params.slug.'
    ),
  fallback: fallbackSchema,
});
const templatedStringExprSchema = z.object({
  __type: z.literal("TemplatedString"),
  text: z
    .array(z.union([z.string(), customCodeExprSchema, objectPathExprSchema]))
    .describe("Interleaved literal strings and expression parts."),
});
const exprSchemaSingleton = z.discriminatedUnion("__type", [
  customCodeExprSchema,
  objectPathExprSchema,
  templatedStringExprSchema,
]);

export function exprSchema() {
  return exprSchemaSingleton;
}

export function variantDefSchema() {
  return z.discriminatedUnion("__type", [
    componentVariantDefSchema(),
    elementVariantDefSchema(),
  ]);
}
export type VariantDefJson = z.infer<ReturnType<typeof variantDefSchema>>;

export function componentVariantDefSchema() {
  return z.object({
    __type: z.literal("ComponentVariant"),
    variant: variantSchema().describe("Variant identity."),
    type: z
      .enum(["single", "multi", "boolean"])
      .describe(
        "Variant group kind: single (one-of-many), multi (any-of-many), or boolean (standalone)."
      ),
    group: z.string().describe("Owning variant group name."),
  });
}

export function elementVariantDefSchema() {
  return z.object({
    __type: z.literal("ElementVariant"),
    variant: variantSchema().describe("Variant identity."),
    elementUuid: z
      .string()
      .describe("UUID of the element this style variant targets."),
  });
}

export function variantOverrideSchema() {
  return z.object({
    __type: z.literal("VariantOverride"),
    variant: variantSchema().describe("The variant these overrides apply to."),
    elements: z
      .array(elementOverrideSchema())
      .describe("Per-element overrides activated by this variant."),
  });
}
export type VariantOverrideJson = z.infer<
  ReturnType<typeof variantOverrideSchema>
>;

/** A single element's style/attr overrides under one variant. */
export function elementOverrideSchema() {
  return z.object({
    __type: z.literal("ElementOverride"),
    uuid: z.string().describe("Target element (TplNode) UUID."),
    styles: z
      .record(z.string(), z.string())
      .optional()
      .describe("CSS property overrides for this element under this variant."),
    attrs: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        "HTML attribute overrides for this element under this variant."
      ),
  });
}
export type ElementOverrideJson = z.infer<
  ReturnType<typeof elementOverrideSchema>
>;

/** A standalone element read (a tpl subtree). */
export function elementSchema() {
  return z.object({
    __type: z.literal("Element"),
    baseVariantTplTree: z
      .string()
      .describe("The element's subtree as HTML markup."),
  });
}
export type ElementJson = z.infer<ReturnType<typeof elementSchema>>;

export function tokenSchema() {
  return z.object({
    __type: z.literal("Token"),
    name: z.string().describe("Token name."),
    uuid: z.string().describe("Token UUID."),
    type: z
      .enum(tokenTypes)
      .describe("Token type, determining which CSS properties it applies to."),
    fromProject: z
      .string()
      .optional()
      .describe("Imported project id, present only for imported tokens."),
    value: tokenValuesSchema().describe(
      "Token values: base value (+ resolved alias) and per-variant values."
    ),
    override: z
      .object({
        __type: z.literal("TokenOverride"),
        value: tokenValuesSchema().describe("Override values."),
      })
      .optional()
      .describe("Local override of this imported/registered token."),
  });
}
export type TokenJson = z.infer<ReturnType<typeof tokenSchema>>;

/** A token's values: base value (+ resolved alias) and per-variant values. */
export function tokenValuesSchema() {
  return z.object({
    __type: z.literal("TokenValues"),
    value: z
      .string()
      .optional()
      .describe("Base CSS value or `var(--token-...)`."),
    resolvedValue: z
      .string()
      .optional()
      .describe(
        "Dereferenced value, present only when `value` is a token ref."
      ),
    variantedValues: z
      .array(variantedValueSchema())
      .optional()
      .describe("Per-global-variant values."),
  });
}
export type TokenValuesJson = z.infer<ReturnType<typeof tokenValuesSchema>>;

/** A per-global-variant-combination value override. */
export function variantedValueSchema() {
  return z.object({
    __type: z.literal("VariantedValue"),
    variantUuids: z
      .array(z.string())
      .describe(
        "Global-variant UUIDs whose combination this value applies to (order-independent)."
      ),
    value: z.string().describe("CSS value for this variant combination."),
    resolvedValue: z
      .string()
      .optional()
      .describe(
        "Dereferenced value, present only when `value` is a token ref."
      ),
  });
}
export type VariantedValueJson = z.infer<
  ReturnType<typeof variantedValueSchema>
>;

export function animationSchema() {
  return z.object({
    __type: z.literal("Animation"),
    name: z.string().describe("Animation name."),
    uuid: z.string().describe("Animation UUID."),
    fromProject: z
      .string()
      .optional()
      .describe("Imported project id, present only for imported animations."),
    keyframesRule: z
      .string()
      .optional()
      .describe("Full CSS @keyframes rule (omitted in minimal listings)."),
  });
}
export type AnimationJson = z.infer<ReturnType<typeof animationSchema>>;

/** Project-listing entry: the animation minus its keyframes body. */
export function animationSummarySchema() {
  return animationSchema().omit({ keyframesRule: true });
}
export type AnimationSummaryJson = z.infer<
  ReturnType<typeof animationSummarySchema>
>;

export function invalidResourceSchema() {
  return z.object({
    __type: z.literal("InvalidResource"),
    type: z
      .enum([
        "Component",
        "Token",
        "Element",
        "Variant",
        "VariantedValue",
        "VariantGroup",
        "Animation",
        "Prop",
        "State",
        "DataContext",
      ])
      .describe(
        "Kind of resource that could not be found (matches its __type)."
      ),
    uuid: z.string().describe("The requested (missing) resource UUID."),
    message: z.string().describe("Human-readable explanation."),
  });
}
export type InvalidResourceJson = z.infer<
  ReturnType<typeof invalidResourceSchema>
>;

/**
 * The runtime data available to dynamic values / custom code at a component or
 * page root (`scope: "root"`) or at a specific element (`scope: "element"`).
 * The env is walked into a tree of typed `DataPath` nodes: `$props`, `$state`,
 * `$ctx`, `$queries`, `$q`, etc. and their nested fields.
 */
export function dataContextSchema() {
  return z.object({
    __type: z.literal("DataContext"),
    componentUuid: z
      .string()
      .describe("UUID of the component/page the context was read from."),
    scope: z
      .enum(["root", "element"])
      .describe(
        "`root` for the component/page-level context, `element` for a specific element's context."
      ),
    elementUuid: z
      .string()
      .optional()
      .describe("UUID of the element, present only for `element` scope."),
    paths: z
      .array(dataPathSchema())
      .describe(
        "Top-level data paths available in this context (e.g. $props, $state, $queries, $q, $ctx)."
      ),
  });
}
export type DataContextJson = z.infer<ReturnType<typeof dataContextSchema>>;

/**
 * One node in a data-context tree: a named path with its variable type and,
 * for primitives, a short stringified preview. Objects/arrays nest via
 * `children`; oversized or cyclic branches are flagged `truncated`. A synthetic
 * `name: "…"` node marks where sibling keys/items were omitted for size.
 */
export type DataPathJson = {
  __type: "DataPath";
  name: string;
  type?: string;
  label?: string;
  value?: string;
  length?: number;
  truncated?: boolean;
  reason?: string;
  omittedCount?: number;
  children?: DataPathJson[];
};

// Single instance so the recursive `z.lazy` reference below resolves to the same
// object every time. Otherwise zod-to-json-schema can't detect recursion.
let dataPathSchemaSingleton: z.ZodType<DataPathJson> | undefined;

export function dataPathSchema(): z.ZodType<DataPathJson> {
  if (dataPathSchemaSingleton) {
    return dataPathSchemaSingleton;
  }
  dataPathSchemaSingleton = z.object({
    __type: z.literal("DataPath"),
    name: z
      .string()
      .describe("Path segment: an object key, array index, or `…` marker."),
    type: z
      .string()
      .optional()
      .describe(
        'Variable type, e.g. "string", "number", "boolean", "object", "array", "react-element", "function". Absent on `…` markers.'
      ),
    label: z
      .string()
      .optional()
      .describe("Human-friendly label from the data-picker metadata, if any."),
    value: z
      .string()
      .optional()
      .describe(
        "Short JSON-encoded preview of a primitive value (may be truncated)."
      ),
    length: z
      .number()
      .optional()
      .describe("Number of items, present for arrays."),
    truncated: z
      .boolean()
      .optional()
      .describe("True when this branch was cut off (depth, size, or cycle)."),
    reason: z
      .string()
      .optional()
      .describe('Why the branch was truncated, e.g. "circular".'),
    omittedCount: z
      .number()
      .optional()
      .describe("Number of omitted sibling keys/items, on a `…` marker."),
    children: z
      .array(z.lazy(() => dataPathSchema()))
      .optional()
      .describe("Nested paths, present for non-empty objects and arrays."),
  }) as z.ZodType<DataPathJson>;
  return dataPathSchemaSingleton;
}

export function screenBreakpointSchema() {
  return z.object({
    __type: z.literal("ScreenBreakpoint"),
    name: z.string().describe("Breakpoint variant name."),
    uuid: z.string().describe("Breakpoint variant UUID."),
    minWidth: z.number().optional().describe("Min width in px, if set."),
    maxWidth: z.number().optional().describe("Max width in px, if set."),
  });
}
export type ScreenBreakpointJson = z.infer<
  ReturnType<typeof screenBreakpointSchema>
>;

export function globalVariantGroupSchema() {
  return z.object({
    __type: z.literal("GlobalVariantGroup"),
    name: z.string().describe("Global variant group name."),
    uuid: z.string().describe("Global variant group UUID."),
    fromProject: z
      .string()
      .optional()
      .describe("Imported project id, present only for imported groups."),
    variants: z.array(variantSchema()).describe("Variants in this group."),
  });
}
export type GlobalVariantGroupJson = z.infer<
  ReturnType<typeof globalVariantGroupSchema>
>;

/** A variant identity (name + uuid). */
export function variantSchema() {
  return z.object({
    __type: z.literal("Variant"),
    name: z.string().describe("Variant name."),
    uuid: z.string().describe("Variant UUID."),
  });
}
export type VariantJson = z.infer<ReturnType<typeof variantSchema>>;

/** A reference to an imported (direct dependency) project. */
export function importedProjectSchema() {
  return z.object({
    __type: z.literal("ImportedProject"),
    id: z.string().describe("Imported project id."),
    name: z.string().describe("Imported project name."),
  });
}
export type ImportedProjectJson = z.infer<
  ReturnType<typeof importedProjectSchema>
>;

/** Custom functions usable in data queries: installed and installable. */
export function dataQueryFunctionsSchema() {
  return z.object({
    __type: z.literal("DataQueryFunctions"),
    installed: z
      .array(installedFunctionSchema())
      .describe("Custom functions already registered in the project."),
    installable: z
      .array(installableFunctionSchema())
      .describe(
        "Custom functions available from hostless packages not yet installed."
      ),
  });
}
export type DataQueryFunctionsJson = z.infer<
  ReturnType<typeof dataQueryFunctionsSchema>
>;

export function installedFunctionSchema() {
  return z.object({
    __type: z.literal("InstalledFunction"),
    id: z
      .string()
      .describe("Stable function id, used to bind the function to a query."),
    displayName: z.string().optional(),
    namespace: z.string().optional(),
    importPath: z.string().optional(),
    description: z.string().optional(),
    isQuery: z.boolean(),
    isMutation: z.boolean(),
    params: z.array(functionParamSchema()).describe("Function parameters."),
  });
}
export type InstalledFunctionJson = z.infer<
  ReturnType<typeof installedFunctionSchema>
>;

export function functionParamSchema() {
  return z.object({
    __type: z.literal("FunctionParam"),
    name: z.string(),
    type: z.string().describe("Param type tag."),
    displayName: z.string().optional(),
    description: z.string().optional(),
    defaultValue: z.string().optional(),
    options: z
      .string()
      .optional()
      .describe("Comma-separated choices, for choice params."),
  });
}
export type FunctionParamJson = z.infer<ReturnType<typeof functionParamSchema>>;

export function installableFunctionSchema() {
  return z.object({
    __type: z.literal("InstallableFunction"),
    id: z
      .string()
      .describe("Stable id used to install and bind via createDataQuery."),
    displayName: z.string(),
    packageProjectId: z.string().optional(),
    description: z.string().optional(),
  });
}
export type InstallableFunctionJson = z.infer<
  ReturnType<typeof installableFunctionSchema>
>;
