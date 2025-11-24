import type {
  Config,
  Field,
  FieldOrGroup,
} from "@react-awesome-query-builder/core";
import type { RulesLogic } from "json-logic-js";
import { ApiCmsTable, CmsFieldMeta, CmsMetaType } from "./schema";

/**
 * Maps Plasmic CMS table to react-awesome-query-builder config.
 *
 * The result will be handled by {@link rulesLogicToCmsWhere}.
 * Make sure it supports all operators defined here.
 */
export function cmsTableToQueryBuilderConfig(
  table: ApiCmsTable
): Pick<Config, "fields"> {
  const qbFields: { [key: string]: FieldOrGroup } = {
    _id: {
      type: "text",
      label: "System ID",
      operators: ["equal", "not_equal"],
    },
  };
  for (const field of table.schema.fields) {
    const qbField = cmsFieldToQueryBuilderField(field);
    if (qbField) {
      qbFields[field.identifier] = qbField;
    }
  }
  return {
    fields: qbFields,
  };
}

function cmsFieldToQueryBuilderField(field: CmsFieldMeta): Field | undefined {
  const label = field.label || field.identifier;
  switch (field.type) {
    case CmsMetaType.TEXT:
    case CmsMetaType.LONG_TEXT:
    case CmsMetaType.REF: {
      return {
        type: "text",
        label,
        operators: ["equal", "not_equal", "regex"],
      };
    }
    case CmsMetaType.NUMBER: {
      return {
        type: "number",
        label,
        operators: [
          "equal",
          "not_equal",
          "less",
          "less_or_equal",
          "greater",
          "greater_or_equal",
        ],
      };
    }
    case CmsMetaType.BOOLEAN: {
      return {
        type: "boolean",
        label,
      };
    }
    case CmsMetaType.DATE_TIME: {
      return {
        type: "datetime",
        label,
        operators: [
          "equal",
          "not_equal",
          "less",
          "less_or_equal",
          "greater",
          "greater_or_equal",
        ],
      };
    }
    case CmsMetaType.ENUM: {
      return {
        type: "select",
        label,
        listValues: field.options,
        operators: ["select_equals", "select_not_equals", "select_any_in"],
      };
    }

    // Following types do not support filtering
    case CmsMetaType.COLOR:
    case CmsMetaType.FILE:
    case CmsMetaType.IMAGE:
    case CmsMetaType.LIST:
    case CmsMetaType.OBJECT:
    case CmsMetaType.RICH_TEXT:
      return;
  }
}

/**
 * Maps JsonLogic to Plasmic CMS API where query.
 *
 * See also:
 * - https://docs.plasmic.app/learn/plasmic-cms-api-reference/#filter-query
 * - makeSqlCondition in cms-util.ts
 */
export function rulesLogicToCmsWhere(logic: RulesLogic | undefined): any {
  if (logic === null || logic === undefined) {
    return undefined;
  } else if (typeof logic !== "object") {
    throw new Error(`unexpected logic: ${JSON.stringify(logic)}`);
  } else if ("and" in logic) {
    return {
      $and: logic["and"].map(rulesLogicToCmsWhere),
    };
  } else if ("or" in logic) {
    return {
      $or: logic["or"].map(rulesLogicToCmsWhere),
    };
  } else if ("!" in logic) {
    return {
      $not: rulesLogicToCmsWhere(logic["!"]),
    };
  } else if ("==" in logic) {
    const [{ var: field }, operand] = logic["=="] as [{ var: string }, unknown];
    return {
      [field]: operand,
    };
  } else if ("!=" in logic) {
    const [{ var: field }, operand] = logic["!="] as [{ var: string }, unknown];
    return {
      $not: { [field]: operand },
    };
  } else {
    // Map JsonLogic to Plasmic CMS where query:
    // JsonLogic: { "<=": [{ "var": "age" }, 18] }
    // CMS where: { "$lt": { "age": 18 } }
    const [key, value] = Object.entries(logic)[0];
    const apiOp: string | undefined = operatorMapping[key];
    if (apiOp) {
      const [{ var: field }, operand] = value as [{ var: string }, unknown];
      return { [field]: { [apiOp]: operand } };
    }

    throw new Error(`unexpected logic: ${JSON.stringify(logic)}`);
  }
}

/** Maps JsonLogic operator to Plasmic CMS operator. */
const operatorMapping: Record<string, string> = {
  "<": "$lt",
  "<=": "$le",
  ">": "$gt",
  ">=": "$ge",
  in: "$in",
  regex: "$regex",
};
