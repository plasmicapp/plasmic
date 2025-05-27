import type { Opaque } from "type-fest";
import z, { RefinementCtx } from "zod";

export function zOpaqueString<T extends Opaque<string, unknown>>() {
  return z.string().transform((x) => x as T);
}

/** JSON.parse a z.string() and safeParse it to another schema. */
export function zParseJson<Output>(
  schema: z.Schema
): (json: string, ctx: RefinementCtx) => Output | Promise<Output> {
  return (json, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "String must be JSON",
      });
      return z.NEVER;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue(issue);
      }
      return z.NEVER;
    }

    return result.data;
  };
}
