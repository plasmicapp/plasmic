import { assert, ensure, substringOccurrencesCount } from "@/wab/common";
import {
  DATA_SOURCE_QUERY_BUILDER_CONFIG,
  GenericDataSource,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  buildQueryBuilderConfig,
  Filters,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  getDynamicStringSegments,
  isDynamicValue,
} from "@/wab/shared/dynamic-bindings";
import { Utils as QbUtils } from "@react-awesome-query-builder/antd";

export function buildSqlStringForFilterTemplateArg(
  source: GenericDataSource,
  template: string
) {
  // We need to temporarily replace the dynamic expressions in order to parse
  // the JSON, as the string might be an invalid JSON. Since the expression
  // might be anywhere in the JSON (possibly inside a string, possibly not),
  // the only values that we can replace them with are numbers, so we need
  // to find digits that don't occur in the string! :/
  const bindings = getDynamicStringSegments(template).filter((seg) =>
    isDynamicValue(seg)
  );
  let substitutedTemplate = template;
  const bindingCodes = bindings.map((binding) => {
    let bindingCode = "";
    while (
      !bindingCode ||
      substitutedTemplate.includes(bindingCode) ||
      substringOccurrencesCount(
        substitutedTemplate.replace(binding, bindingCode),
        bindingCode
      ) !== 1
    ) {
      // Random 10-digit number
      bindingCode = `${Math.floor((1 << 30) * Math.random())}`;
    }
    substitutedTemplate = substitutedTemplate.replace(binding, bindingCode);
    return bindingCode;
  });
  // Fix types from our custom types to normal types
  substitutedTemplate = substitutedTemplate.replace(
    /"valueType":\["(boolean|number|datetime|select|date)-custom"\]/g,
    '"valueType":["$1"]'
  );
  const unquotedFilter = JSON.parse(substitutedTemplate) as Filters;
  // Add quotes for columns in filter to fix upper cases
  let treeTemplate = JSON.stringify(unquotedFilter.tree);
  const quotedFields = Object.entries(unquotedFilter.fields).reduce(
    (quotedKeysObj, [key, value]) => {
      const quotedKey = `"${key}"`;
      const regex = new RegExp(`"field":"(${key})"`, "g");
      treeTemplate = treeTemplate.replace(regex, `"field":"\\"$1\\""`);
      quotedKeysObj[quotedKey] = value;
      return quotedKeysObj;
    },
    {}
  );
  const builderConfig = buildQueryBuilderConfig(
    DATA_SOURCE_QUERY_BUILDER_CONFIG[source.source],
    quotedFields
  );
  const tree = JSON.parse(treeTemplate);
  let sql = tree
    ? // We don't do `QbUtils.checkTree` because it may remove the dynamic
      // expressions!
      QbUtils.sqlFormat(QbUtils.loadTree(tree), builderConfig)
    : unquotedFilter
    ? QbUtils.sqlFormat(
        ensure(
          QbUtils.loadFromJsonLogic(unquotedFilter, builderConfig),
          () => `Failed to parse JSON Logic`
        ),
        builderConfig
      )
    : undefined;
  bindingCodes.forEach((bindingCode, i) => {
    if (sql) {
      assert(
        substringOccurrencesCount(sql, bindingCode) === 1,
        () => `Couldn't find binding code ${bindingCode} in SQL string: ${sql}`
      );
      sql = sql.replace(bindingCode, bindings[i]);
    }
  });
  return sql;
}
