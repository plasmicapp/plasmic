import S from "@/wab/client/components/QueryBuilder/QueryBuilder.module.scss";
import "@/wab/client/components/QueryBuilder/QueryBuilder.scss";
import {
  AwesomeBuilder,
  createQueryBuilderConfig,
} from "@/wab/client/components/QueryBuilder/QueryBuilderConfig";
import { getEmptyTree } from "@/wab/client/components/QueryBuilder/query-builder-utils";
import {
  Config,
  ImmutableTree,
  Utils as QbUtils,
  Query,
} from "@react-awesome-query-builder/antd";
import cn from "classnames";
import type { RulesLogic } from "json-logic-js";
import React, { useMemo, useState } from "react";
import type { PartialDeep } from "type-fest";

export interface QueryBuilderPropEditorProps {
  /**
   * Config passed in from meta.
   *
   * We allow the user to pass in any serializable react-awesome-query-builder
   * config format.
   */
  config: PartialDeep<Config> | undefined;
  value: RulesLogic | undefined;
  onChange: (value: RulesLogic) => void;
  disabled?: boolean;
}

/**
 * An editor for queries like `name = "John" AND age >= 30`.
 * The consumer receives the query in the JsonLogic data format:
 * ```json
 * {
 *   "and": [
 *     { "==": [{ "var": "name" }, "John"] },
 *     { ">=": [{ "var": "age" }, 30] }
 *   ]
 * }
 * ```
 */
function QueryBuilderPropEditor_(
  { config, value, onChange, disabled = false }: QueryBuilderPropEditorProps,
  outerRef: React.Ref<HTMLDivElement>
) {
  const finalConfig = useMemo<Config>(() => {
    return createQueryBuilderConfig(config ?? { fields: {} }, {
      readonly: disabled,
    });
  }, [JSON.stringify(config)]);

  const [tree, setTree] = useState<ImmutableTree>(() => {
    let initialTree = QbUtils.loadFromJsonLogic(value, finalConfig);
    if (!initialTree) {
      initialTree = QbUtils.loadTree(getEmptyTree(finalConfig));
    }
    return initialTree;
  });

  return (
    <div
      className={cn("plasmic-query-builder-scope", S.plasmicQueryBuilderScope)}
      ref={outerRef}
    >
      <Query
        {...finalConfig}
        value={tree}
        onChange={(newTree) => {
          if (disabled) {
            return;
          }

          setTree(newTree);
          const result = QbUtils.jsonLogicFormat(newTree, finalConfig);
          if (result.errors && result.errors.length > 0) {
            console.error(result.errors);
          } else {
            onChange(result.logic as RulesLogic);
          }
        }}
        renderBuilder={AwesomeBuilder}
      />
    </div>
  );
}
export const QueryBuilderPropEditor = React.forwardRef(QueryBuilderPropEditor_);
