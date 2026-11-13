import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { zParseJson } from "@/wab/shared/utils/zod-utils";
import { z } from "zod";

const componentPropsSchema = z
  .string()
  .transform(zParseJson(z.record(z.string(), z.unknown())));

const globalVariantsSchema = z.string().transform(
  zParseJson(
    z.array(
      z.object({
        name: z.string().min(1),
        projectId: z.string().optional(),
        value: z.union(
          [z.boolean(), z.number(), z.string(), z.array(z.string())],
          {
            errorMap: () => ({
              message: "Expected boolean, number, string, or string array",
            }),
          },
        ),
      }),
    ),
  ),
);

function parseQueryParam<T>(
  schema: z.ZodType<T, z.ZodTypeDef, string>,
  name: string,
  raw: unknown,
): T | undefined {
  if (!raw) {
    return undefined;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestError(`Invalid ${name} value`, {
      issues: result.error.issues.map(
        (issue) => `${[name, ...issue.path].join(".")}: ${issue.message}`,
      ),
    });
  }
  return result.data;
}

export function parseComponentProps(rawComponentProps?: unknown) {
  return parseQueryParam(
    componentPropsSchema,
    "componentProps",
    rawComponentProps,
  );
}

export function parseGlobalVariants(rawGlobalVariants?: unknown) {
  return parseQueryParam(
    globalVariantsSchema,
    "globalVariants",
    rawGlobalVariants,
  );
}
