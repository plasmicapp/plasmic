// Borrowed from Appsmith

import { isPrimitive } from "@/wab/common";
import { ApiAppUser } from "@/wab/shared/ApiSchema";
import {
  isBoolean,
  isFunction,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from "lodash";

export const DATA_BIND_REGEX = /{{([\s\S]*?)}}/;

const PLASMIC_UNDEFINED = "__PLASMIC_UNDEFINED";

export const isDynamicValue = (value: string): boolean =>
  DATA_BIND_REGEX.test(value);

export function getDynamicStringSegments(dynamicString: string): string[] {
  let stringSegments: string[] = [];
  const indexOfDoubleParanStart = dynamicString.indexOf("{{");
  if (indexOfDoubleParanStart === -1) {
    return [dynamicString];
  }
  //{{}}{{}}}
  const firstString = dynamicString.substring(0, indexOfDoubleParanStart);
  firstString && stringSegments.push(firstString);
  let rest = dynamicString.substring(
    indexOfDoubleParanStart,
    dynamicString.length
  );
  //{{}}{{}}}
  let sum = 0;
  for (let i = 0; i <= rest.length - 1; i++) {
    const char = rest[i];
    const prevChar = rest[i - 1];

    if (char === "{") {
      sum++;
    } else if (char === "}") {
      sum--;
      if (prevChar === "}" && sum === 0) {
        stringSegments.push(rest.substring(0, i + 1));
        rest = rest.substring(i + 1, rest.length);
        if (rest) {
          stringSegments = stringSegments.concat(
            getDynamicStringSegments(rest)
          );
          break;
        }
      }
    }
  }
  if (sum !== 0 && dynamicString !== "") {
    return [dynamicString];
  }
  return stringSegments;
}

// Currently only considering the access of some property of the currentUser object
const CURRENT_USER_FIELDS_REGEX =
  /^\s*\(currentUser\.(id|email|externalId|roleId|roleOrder|roleName|(properties\.(?!\d)[\w]+)|(customProperties\.(?!\d)[\w]+))\)\s*$/;
const CURRENT_USER_FIELD_EXTRACT_REGEX =
  /currentUser\.(id|email|roleId|externalId|roleOrder|roleName|(properties\.(?!\d)[\w]+)|(customProperties\.(?!\d)[\w]+))/;

export function isCurrentUserBinding(binding: string) {
  return CURRENT_USER_FIELDS_REGEX.test(binding);
}

export function isCurrentUserCustomPropertiesBinding(binding: string) {
  return binding.includes("currentUser.customProperties.");
}

/**
 * getDynamicBindings("Hello {{ $ctx.hello + $ctx.bye }} zz{{$ctx.ok}}") =>
 * {
 *   "stringSegments":[
 *     "Hello ","{{ $ctx.hello + $ctx.bye }}"," zz","{{$ctx.ok}}"
 *   ],
 *   "jsSnippets":[
 *     ""," $ctx.hello + $ctx.bye ","","$ctx.ok"
 *   ]
 * }
 */
export const getDynamicBindings = (
  dynamicString: string
): { stringSegments: string[]; jsSnippets: string[] } => {
  // Protect against bad string parse
  if (!dynamicString || !isString(dynamicString)) {
    return { stringSegments: [], jsSnippets: [] };
  }
  const sanitisedString = dynamicString.trim();
  let stringSegments: string[], paths: string[];
  // Get the {{binding}} bound values
  stringSegments = getDynamicStringSegments(sanitisedString);
  // Get the "binding" path values
  paths = stringSegments.map((segment) => {
    const length = segment.length;
    const matches = isDynamicValue(segment);
    if (matches) {
      return segment.substring(2, length - 2);
    }
    return "";
  });
  return { stringSegments: stringSegments, jsSnippets: paths };
};

export function getDynamicSnippets(dynamicString: string) {
  const { jsSnippets } = getDynamicBindings(dynamicString);
  return jsSnippets.filter((x) => x.length > 0);
}

export function getDynamicSnippetsForExpr(dynamicString: string) {
  return getDynamicSnippets(dynamicString).filter(
    (x) => !isCurrentUserBinding(x)
  );
}

export function getDynamicSnippetsForJsonExpr(dynamicJson: any) {
  return getDynamicSnippetsInJson(dynamicJson).filter(
    (x) => !isCurrentUserBinding(x)
  );
}

function getDynamicSnippetsInJson(dynamicJson: any): string[] {
  if (isString(dynamicJson)) {
    return getDynamicSnippets(dynamicJson);
  } else if (isPrimitive(dynamicJson)) {
    return [];
  } else if (Array.isArray(dynamicJson)) {
    return dynamicJson.flatMap((val) => getDynamicSnippetsInJson(val));
  } else if (dynamicJson instanceof Object) {
    return Object.entries(dynamicJson).flatMap(([k, v]) => [
      ...getDynamicSnippets(k),
      ...getDynamicSnippetsInJson(v),
    ]);
  } else {
    return [];
  }
}

export type DataSourceUser = Partial<ApiAppUser>;

export function extractValueFromCurrentUser(
  currentUser: DataSourceUser | undefined,
  binding: string
) {
  if (!currentUser) {
    return undefined;
  }
  const bindingRegexExec = CURRENT_USER_FIELD_EXTRACT_REGEX.exec(
    binding.substring(2, binding.length - 2)
  );
  if (!bindingRegexExec) {
    return undefined;
  }
  const bindingParts = bindingRegexExec[0].split(".");
  const bindingType = bindingParts[1];
  const bindingKey = bindingParts[2];
  switch (bindingType) {
    case "email":
      return currentUser.email;
    case "externalId":
      return currentUser.externalId;
    case "roleId":
      return currentUser.roleId;
    case "roleOrder":
      return currentUser.roleOrder;
    case "roleName":
      return currentUser.roleName;
    case "properties":
      return currentUser.properties?.[bindingKey];
    case "customProperties":
      return currentUser.customProperties?.[bindingKey];
    default:
      return undefined;
  }
}

export const templateSubstituteDynamicValues = (
  binding: string,
  subBindings: string[],
  subValues: unknown[]
): string => {
  // Replace the string with the data tree values
  let finalValue = binding;
  subBindings.forEach((b, i) => {
    let value = subValues[i];
    if (Array.isArray(value) || isObject(value)) {
      value = JSON.stringify(value);
    }
    try {
      if (typeof value === "string" && JSON.parse(value)) {
        value = value.replace(/\\([\s\S])|(")/g, "\\$1$2");
      }
    } catch (e) {
      // do nothing
    }
    finalValue = finalValue.replace(b, `${value}`);
  });
  return finalValue;
};

export const smartSubstituteDynamicValues = (
  binding: string,
  subBindings: string[],
  subValues: unknown[]
): string => {
  // We are not using `removeQuotesFromBindings` (which could aceppt both
  // {"blah": {{yup}}} and {"blah": "{{yup}}"} formats) because it breaks
  // templated strings (e.g., {"blah": "prefix-{{yup}}"}) as we would need
  // to know whether the expression is within a string or not.
  let finalBinding = binding;
  subBindings.forEach((b, i) => {
    const value = subValues[i];
    switch (getType(value)) {
      case Types.NUMBER:
      case Types.BOOLEAN:
      case Types.NULL:
        // Direct substitution
        // If finalBinding is in the format {"blah": "{{yup}}"} we need to
        // remove the quotes to avoid treating these types as strings.
        // However, if finalBinding is in the format {"blah": "prefix-{{yup}}"},
        // these values will be treated as a string
        if (finalBinding.includes(`"${b}"`)) {
          finalBinding = finalBinding.replace(`"${b}"`, `${value}`);
        } else {
          finalBinding = finalBinding.replace(b, `${value}`);
        }
        break;
      case Types.UNDEFINED:
        // Direct substitution
        // Since undefined is not a valid JSON, substitute for our placeholder
        if (finalBinding.includes(`"${b}"`)) {
          finalBinding = finalBinding.replace(
            `"${b}"`,
            `"${PLASMIC_UNDEFINED}"`
          );
        } else {
          finalBinding = finalBinding.replace(b, `${value}`);
        }
        break;
      case Types.STRING:
        // JSON.stringify string to escape any unsupported characters
        finalBinding = finalBinding.replace(
          b,
          `${JSON.stringify(value).slice(1, -1)}`
        );
        break;
      case Types.ARRAY:
      case Types.OBJECT:
        // Stringify and substitute.
        // If finalBinding is in the format {"blah": "{{yup}}"} we need to
        // remove the quotes to avoid treating objects/arrays as strings.
        // However, if finalBinding is in the format {"blah": "prefix-{{yup}}"},
        // the object/array will be treated as a string
        if (finalBinding.includes(`"${b}"`)) {
          finalBinding = finalBinding.replace(
            `"${b}"`,
            JSON.stringify(value, null, 2)
          );
        } else {
          finalBinding = finalBinding.replace(
            b,
            JSON.stringify(value, null, 2)
          );
        }
        break;
      case Types.FUNCTION:
      case Types.UNKNOWN:
        break;
    }
  });
  return finalBinding;
};

const getType = (value: unknown) => {
  if (isString(value)) {
    return Types.STRING;
  }
  if (isNumber(value)) {
    return Types.NUMBER;
  }
  if (isBoolean(value)) {
    return Types.BOOLEAN;
  }
  if (Array.isArray(value)) {
    return Types.ARRAY;
  }
  if (isFunction(value)) {
    return Types.FUNCTION;
  }
  if (isObject(value)) {
    return Types.OBJECT;
  }
  if (isUndefined(value)) {
    return Types.UNDEFINED;
  }
  if (isNull(value)) {
    return Types.NULL;
  }
  return Types.UNKNOWN;
};

enum Types {
  URL = "URL",
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  OBJECT = "OBJECT",
  ARRAY = "ARRAY",
  FUNCTION = "FUNCTION",
  UNDEFINED = "UNDEFINED",
  NULL = "NULL",
  UNKNOWN = "UNKNOWN",
}

export function withCurrentUserValues(
  binding: string,
  subBindings: string[],
  values: unknown[],
  currentUser: DataSourceUser | undefined
) {
  const expandedValues: unknown[] = [];
  let valuesIdx = 0;
  for (let i = 0; i < subBindings.length; i++) {
    const b = subBindings[i];
    if (isCurrentUserBinding(b.substring(2, b.length - 2))) {
      expandedValues.push(extractValueFromCurrentUser(currentUser, b));
    } else {
      expandedValues.push(values[valuesIdx]);
      valuesIdx++;
    }
  }
  return expandedValues;
}

export function substitutePlaceholder(value: unknown) {
  return value === PLASMIC_UNDEFINED ? undefined : value;
}

const QUOTED_BINDING_REGEX = /["']({{[\s\S]*?}})["']/g;
/**
 * Removes quotation around binding expressions. For example, if my
 * binding looks like:
 *
 *   {"hello": "{{currentItem.name}}"}
 *
 * Then that is transformed into
 *
 *   {"hello": {{currentItem.name}}}
 *
 * and if you use it with the smartSubstituteDynamicValues() or
 * parameterSubstituteDynamicValues, both of which will JSON.stringify() their
 * binding values, then you end up with the correct:
 *
 *   {"hello": "name"}
 */
export function removeQuotesFromBindings(binding: string) {
  return binding.replace(QUOTED_BINDING_REGEX, (original, firstGroup) => {
    return firstGroup;
  });
}
