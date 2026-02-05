import type { Field } from "@react-awesome-query-builder/core";
import type { RulesLogic } from "json-logic-js";
import type { ContentTypeField, ContentTypeSchema } from "./schema";
import { capitalize } from "./utils";

/**
 * Convert Contentful field type to query builder field configuration
 */
function contentfulSchemaFieldToQueryBuilderField(
  field: ContentTypeField
): Field | undefined {
  switch (field.type) {
    case "Integer":
    case "Number":
      return {
        label: capitalize(field.name),
        type: "number",
        operators: [
          "equal",
          "not_equal",
          "less",
          "less_or_equal",
          "greater",
          "greater_or_equal",
          "is_null",
          "is_not_null",
        ],
      };

    case "Boolean":
      return {
        label: capitalize(field.name),
        type: "boolean",
      };

    case "Date":
      return {
        label: capitalize(field.name),
        type: "datetime",
        operators: [
          "equal",
          "not_equal",
          "less",
          "less_or_equal",
          "greater",
          "greater_or_equal",
          "is_null",
          "is_not_null",
        ],
      };

    case "Symbol":
    case "Text":
      return {
        label: capitalize(field.name),
        type: "text",
        operators: ["equal", "not_equal", "like", "is_null", "is_not_null"],
      };

    default:
      return undefined;
  }
}

/**
 * Build query builder config from content type schema
 */
export function schemaToQueryBuilderConfig(schema: ContentTypeSchema) {
  const fields: Record<string, Field> = {};

  for (const field of schema.fields) {
    const qbField = contentfulSchemaFieldToQueryBuilderField(field);
    if (qbField) {
      fields[field.id] = qbField;
    }
  }

  return {
    fields,
    conjunctions: {
      AND: {
        label: "All",
      },
      // OR explicitly omitted - not supported by Contentful API
    },
    settings: {
      showNot: false,
      maxNesting: 1,
      canRegroup: false,
      canLeaveEmptyGroup: false,
    },
  };
}

/**
 * Maps JsonLogic to Contentful API filters format.
 *
 * See also:
 * - https://www.contentful.com/developers/docs/references/content-delivery-api/
 */
export function rulesLogicToContentfulFilters(
  logic: RulesLogic | undefined
): Record<string, any> {
  if (logic === null || logic === undefined) {
    return {};
  } else if (typeof logic !== "object") {
    throw new Error(`unexpected logic: ${JSON.stringify(logic)}`);
  } else if ("and" in logic) {
    // Handle AND - flatten to multiple parameters
    // Contentful supports implicit AND between all query parameters
    return logic["and"].reduce((acc: Record<string, any>, condition: any) => {
      return { ...acc, ...rulesLogicToContentfulFilters(condition) };
    }, {});
  } else if ("or" in logic) {
    // OR is not supported by Contentful API
    throw new Error(
      "Contentful API does not support OR operations. Please restructure your query using only AND conditions."
    );
  } else if ("!" in logic) {
    // NOT is not supported by Contentful API
    throw new Error(
      "Contentful API does not support NOT operations. Please use field-level negation operators like 'not_equal' ([ne]) instead."
    );
  } else if ("==" in logic) {
    const [{ var: field }, operand] = logic["=="] as [{ var: string }, unknown];
    if (operand === null) {
      return { [`fields.${field}[exists]`]: "false" };
    }
    return {
      [`fields.${field}`]: operand,
    };
  } else if ("!=" in logic) {
    const [{ var: field }, operand] = logic["!="] as [{ var: string }, unknown];
    if (operand === null) {
      return { [`fields.${field}[exists]`]: "true" };
    }
    return {
      [`fields.${field}[ne]`]: operand,
    };
  } else if ("in" in logic) {
    // Map in operator to Contentful filters format:
    // JsonLogic: { "in": ["searchText", { "var": "fieldName" }] }
    // Contentful filters: { "fields.fieldName[match]": "searchText" }
    const [operand, { var: field }] = logic["in"] as [string, { var: string }];
    return {
      [`fields.${field}[match]`]: operand,
    };
  } else {
    // Map JsonLogic comparison operators to Contentful filters format:
    // JsonLogic: { "<=": [{ "var": "age" }, 18] }
    // Contentful filters: { "fields.age[lte]": 18 }
    const [key, value] = Object.entries(logic)[0];
    const apiOp: string | undefined = operatorMapping[key];
    if (apiOp) {
      const [{ var: field }, operand] = value as [{ var: string }, unknown];
      return { [`fields.${field}[${apiOp}]`]: operand };
    }

    throw new Error(`unexpected logic: ${JSON.stringify(logic)}`);
  }
}

/** Maps JsonLogic operator to Contentful filter operator. */
const operatorMapping: Record<string, string> = {
  "<": "lt",
  "<=": "lte",
  ">": "gt",
  ">=": "gte",
};
