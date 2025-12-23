import {
  Config,
  Field,
  FieldOrGroup,
  JsonGroup,
  JsonItem,
  Utils as QbUtils,
} from "@react-awesome-query-builder/antd";

export function getEmptyTree(
  config: Config,
  opts?: {
    appendFirstField?: boolean;
  }
) {
  const firstRule: JsonItem = {
    id: QbUtils.uuid(),
    type: "rule",
    properties: {
      field: null,
      operator: null,
      value: [],
      valueSrc: [],
    },
  };
  const group: JsonGroup = {
    id: QbUtils.uuid(),
    type: "group",
    properties: {
      conjunction: "AND",
    },
    children1: [firstRule],
  };

  if (opts?.appendFirstField) {
    const firstField = getFirstAvailableField(config);
    if (firstField) {
      firstRule.properties.field = firstField.field.fieldName || firstField.key;
      firstRule.properties.operator =
        config.types[firstField.field.type].defaultOperator;
    }
  }

  return group;
}

function getFirstAvailableField(
  config: Config
): { key: string; field: Field } | undefined {
  for (const [key, field] of Object.entries(config.fields)) {
    if (isSimpleField(field)) {
      return { key, field };
    }
  }
  return undefined;
}

/**
 * Returns true if the field is a simple primitive type, like "text".
 * Non-simple fields have type like "!group" or "!struct".
 */
export function isSimpleField(x: FieldOrGroup): x is Field {
  return !x.type.startsWith("!");
}
