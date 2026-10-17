import type { JSONSchema7 } from "ai";
import { z } from "zod";

/**
 * Copilot tool output models tag every object with a `__type`, which XML output needs
 * for element names. In JSON most tags are implied by position (every `props` item is a
 * Prop). The value walker keeps a tag when an object sits in a union and matches a
 * tagged option; values under unknown schemas are left untouched. The published JSON
 * Schema keeps every `__type` property but makes it optional, accepting both forms.
 */
const TYPE_TAG = "__type";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unwraps schema modifiers down to the type the value is shaped by. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodBranded
  ) {
    return unwrap(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrap(schema.removeDefault());
  }
  if (schema instanceof z.ZodCatch) {
    return unwrap(schema.removeCatch());
  }
  if (schema instanceof z.ZodLazy) {
    return unwrap(schema.schema);
  }
  if (schema instanceof z.ZodEffects) {
    return unwrap(schema.innerType());
  }
  if (schema instanceof z.ZodPipeline) {
    return unwrap(schema._def.out);
  }
  return schema;
}

/** The union option whose `__type` literal matches `value`'s tag, if any. */
function matchTaggedOption(
  options: readonly z.ZodTypeAny[],
  value: Record<string, unknown>,
): z.ZodTypeAny | undefined {
  for (const option of options) {
    const inner = unwrap(option);
    if (inner instanceof z.ZodDiscriminatedUnion) {
      const match = matchTaggedOption(inner.options, value);
      if (match) {
        return match;
      }
    } else if (inner instanceof z.ZodObject) {
      const tag = inner.shape[TYPE_TAG];
      if (tag instanceof z.ZodLiteral && tag.value === value[TYPE_TAG]) {
        return inner;
      }
    }
  }
  return undefined;
}

/**
 * Removes `__type` from objects in `value` whose type `schema` already implies, keeping
 * it on union members. `value` must match `schema` (as validated tool output does);
 * parts under `z.any()` are left as is.
 */
export function stripImpliedTypeTags(
  schema: z.ZodTypeAny,
  value: unknown,
): unknown {
  return strip(schema, value, false);
}

function strip(
  schema: z.ZodTypeAny,
  value: unknown,
  keepTag: boolean,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  const inner = unwrap(schema);
  if (inner instanceof z.ZodDiscriminatedUnion || inner instanceof z.ZodUnion) {
    const option = isPlainObject(value)
      ? matchTaggedOption(inner.options, value)
      : undefined;
    return option ? strip(option, value, true) : value;
  }
  if (inner instanceof z.ZodArray && Array.isArray(value)) {
    return value.map((item) => strip(inner.element, item, false));
  }
  if (inner instanceof z.ZodRecord && isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        strip(inner.valueSchema, v, false),
      ]),
    );
  }
  if (inner instanceof z.ZodObject && isPlainObject(value)) {
    const shape: z.ZodRawShape = inner.shape;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => keepTag || k !== TYPE_TAG)
        .map(([k, v]) => [k, shape[k] ? strip(shape[k], v, false) : v]),
    );
  }
  return value;
}

/**
 * Keeps every `__type` property (including its literal constraint) but removes it
 * from required lists. This accepts both tagged and untagged output regardless of
 * union nesting or `$ref` extraction, without duplicating the value walker's rules.
 */
export function stripImpliedTypeTagsFromJsonSchema(
  schema: JSONSchema7,
): JSONSchema7 {
  return stripJsonSchema(schema) as JSONSchema7;
}

function stripJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripJsonSchema);
  }
  if (!isPlainObject(node)) {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [
      key,
      key === "required" && Array.isArray(child)
        ? child.filter((name) => name !== TYPE_TAG)
        : stripJsonSchema(child),
    ]),
  );
}
