import {
  stripImpliedTypeTags,
  stripImpliedTypeTagsFromJsonSchema,
} from "@/wab/shared/copilot/type-tags";
import { zodSchema, type JSONSchema7 } from "ai";
import { z } from "zod";

const propSchema = z.object({ __type: z.literal("Prop"), name: z.string() });
const codeSchema = z.object({
  __type: z.literal("CustomCode"),
  code: z.string(),
});
const pathSchema = z.object({
  __type: z.literal("ObjectPath"),
  path: z.array(z.string()),
});
const exprSchema = z.discriminatedUnion("__type", [codeSchema, pathSchema]);
const componentSchema = z.object({
  __type: z.literal("Component"),
  props: z.array(propSchema),
  owner: propSchema.nullable().optional(),
  defaults: z.record(z.string(), z.union([z.any(), exprSchema])),
  text: z.array(z.union([z.string(), codeSchema, pathSchema])),
});
const resultSchema = z.object({
  __type: z.literal("OutputResult"),
  results: z.array(
    z.discriminatedUnion("__type", [
      componentSchema,
      z.object({ __type: z.literal("InvalidResource"), uuid: z.string() }),
    ]),
  ),
});

const templateSchema = z.object({
  __type: z.literal("TemplatedString"),
  text: z.string(),
});
const code = { __type: "CustomCode", code: "1 + 1" };
const template = { __type: "TemplatedString", text: "Hello" };
const reviewCases = [
  {
    name: "a primitive and one tagged option",
    schema: z.union([z.string(), codeSchema]),
    value: code,
  },
  {
    name: "a nested discriminated union",
    schema: z.union([
      codeSchema,
      z.discriminatedUnion("__type", [pathSchema, templateSchema]),
    ]),
    value: code,
  },
  {
    name: "a union whose earlier options become refs",
    schema: z.object({
      first: z.union([z.string(), codeSchema, pathSchema]),
      second: z.discriminatedUnion("__type", [
        codeSchema,
        pathSchema,
        templateSchema,
      ]),
    }),
    value: { first: code, second: template },
  },
];

describe("stripImpliedTypeTags", () => {
  it("keeps tags only on union members", () => {
    const value = resultSchema.parse({
      __type: "OutputResult",
      results: [
        {
          __type: "Component",
          props: [{ __type: "Prop", name: "title" }],
          owner: { __type: "Prop", name: "owner" },
          defaults: {
            title: "Hello",
            count: { __type: "CustomCode", code: "1 + 1" },
            raw: { __type: "NotAnExpr", nested: { __type: "Kept" } },
          },
          text: ["Hi ", { __type: "ObjectPath", path: ["$props", "name"] }],
        },
        { __type: "InvalidResource", uuid: "missing" },
      ],
    });
    expect(stripImpliedTypeTags(resultSchema, value)).toEqual({
      results: [
        {
          __type: "Component",
          props: [{ name: "title" }],
          owner: { name: "owner" },
          defaults: {
            title: "Hello",
            count: { __type: "CustomCode", code: "1 + 1" },
            // Values under z.any() are passed through untouched.
            raw: { __type: "NotAnExpr", nested: { __type: "Kept" } },
          },
          text: ["Hi ", { __type: "ObjectPath", path: ["$props", "name"] }],
        },
        { __type: "InvalidResource", uuid: "missing" },
      ],
    });
  });

  it.each(reviewCases)("keeps union tags for $name", ({ schema, value }) => {
    expect(stripImpliedTypeTags(schema, schema.parse(value))).toEqual(value);
  });

  it("handles recursive lazy schemas", () => {
    type Node = { __type: "Node"; children: Node[] };
    const nodeSchema: z.ZodType<Node> = z.lazy(() =>
      z.object({ __type: z.literal("Node"), children: z.array(nodeSchema) }),
    );
    expect(
      stripImpliedTypeTags(nodeSchema, {
        __type: "Node",
        children: [{ __type: "Node", children: [] }],
      }),
    ).toEqual({ children: [{ children: [] }] });
  });
});

describe("stripImpliedTypeTagsFromJsonSchema", () => {
  it.each([{ name: "nested resources", schema: resultSchema }, ...reviewCases])(
    "only makes type tags optional for $name",
    ({ schema: zod }) => {
      const original = zodSchema<unknown>(zod, { useReferences: true })
        .jsonSchema as JSONSchema7;
      const before = JSON.stringify(original);
      const schema = stripImpliedTypeTagsFromJsonSchema(original);
      let tags = 0;
      const check = (source: unknown, result: unknown) => {
        if (Array.isArray(source)) {
          expect(result).toHaveLength(source.length);
          source.forEach((item, i) => check(item, (result as unknown[])[i]));
        } else if (source && typeof source === "object") {
          const output = result as Record<string, unknown>;
          expect(Object.keys(output)).toEqual(Object.keys(source));
          for (const [key, value] of Object.entries(source)) {
            if (key === "required" && Array.isArray(value)) {
              expect(output[key]).not.toContain("__type");
              expect(output[key]).toEqual(
                value.filter((name) => name !== "__type"),
              );
            } else if (key === "__type") {
              tags++;
              expect(output[key]).toEqual(value);
            } else {
              check(value, output[key]);
            }
          }
        } else {
          expect(result).toEqual(source);
        }
      };
      check(original, schema);
      expect(tags).toBeGreaterThan(0);
      expect(JSON.stringify(original)).toBe(before);
    },
  );
});
