import { ActionButton } from "@/wab/client/components/QueryBuilder/Components/ActionButton";
import { BooleanEditor } from "@/wab/client/components/QueryBuilder/Components/BooleanEditor";
import { FieldPicker } from "@/wab/client/components/QueryBuilder/Components/FieldPicker";
import { GroupHeader } from "@/wab/client/components/QueryBuilder/Components/GroupHeader";
import { OperatorPicker } from "@/wab/client/components/QueryBuilder/Components/OperatorPicker";
import { RowActionsGroup } from "@/wab/client/components/QueryBuilder/Components/RowActionsGroup";
import { mergeSane } from "@/wab/shared/common";
import {
  AntdConfig,
  BasicConfig,
  Builder,
  BuilderProps,
  Config,
  CoreConjunctions,
} from "@react-awesome-query-builder/antd";
import L from "lodash";
import React from "react";
import type { PartialDeep } from "type-fest";

// See config docs here: https://github.com/ukrbublik/react-awesome-query-builder/blob/master/CONFIG.adoc
// See base configs here:
// - https://github.com/ukrbublik/react-awesome-query-builder/blob/master/packages/core/modules/config/default.js
// - https://github.com/ukrbublik/react-awesome-query-builder/blob/master/packages/core/modules/config/index.js
// - https://github.com/ukrbublik/react-awesome-query-builder/blob/master/packages/antd/modules/config/index.jsx
export const QueryBuilderConfig = L.merge({}, AntdConfig, {
  conjunctions: {
    AND: { label: "all" },
    OR: { label: "any" },
  },

  operators: {
    equal: { label: "is" },
    not_equal: { label: "is not" },
    less: { label: "<" },
    less_or_equal: { label: "≤" },
    greater: { label: ">" },
    greater_or_equal: { label: "≥" },
    select_equals: { label: "is" },
    select_not_equals: { label: "is not" },
    select_any_in: { label: "is any of" },
    select_not_any_in: { label: "is not any of" },
  },

  settings: {
    // Show the header even if there is only one conjunction
    // (by default, RAQB hides it, because its purpose is to allow conjunction selection)
    forceShowConj: true,
    // Override the react components
    renderField: (props) => (!props ? <></> : <FieldPicker {...props} />),
    renderOperator: (props) => (!props ? <></> : <OperatorPicker {...props} />),
    renderConjs: (props) => (!props ? <></> : <GroupHeader {...props} />),
    renderButton: (props) => (!props ? <></> : <ActionButton {...props} />),
    renderButtonGroup: (props) =>
      !props ? <></> : <RowActionsGroup {...props} />,

    // Render the group actions as the last item in the group
    groupActionsPosition: "bottomLeft",

    // Disable the ability to move items across groups
    canRegroup: false,

    // Automatically delete empty groups after deleting their last nested rule
    canLeaveEmptyGroup: false,

    // Ant Design Components size
    renderSize: "small",
  },

  widgets: {
    boolean: {
      factory: BooleanEditor,
      // There is only one operator for the boolean values (equals), hide it and show the boolean editor only.
      hideOperator: true,
    },
  },
} as BasicConfig);

export function createQueryBuilderConfig(
  overrideConfig?: PartialDeep<Config>,
  opts?: {
    readonly?: boolean;
  }
): Config {
  const base = mergeSane({}, QueryBuilderConfig, {
    // Add custom operators.
    // Note an operator like `any_in` doesn't seem easy to build,
    // since react-awesome-query-builder doesn't have a built-in array widget.
    operators: {
      regex: {
        label: "matches regex",
        jsonLogic: "regex",
      },
    },
    // Add custom operators to their expected respective types.
    types: {
      text: {
        widgets: {
          text: {
            operators: [
              ...(QueryBuilderConfig.types.text.widgets.text.operators ?? []),
              "regex",
            ],
          },
        },
      },
    },
  } as PartialDeep<Config>);

  // Override base default valueSourcesInfo manually because L.merge won't.
  // The new default for is values only.
  base.settings.valueSourcesInfo = {
    value: { label: "Value" }, // ALLOW literal values
    // field: { label: "Field" }, // DISALLOW field references
    // func: { label: "Function" }, // DISALLOW functions
  };

  // Override conjunctions manually if provided, because L.merge won't delete keys.
  // This allows CMS packages to disable OR/NOT operators by omitting them.
  if (overrideConfig?.conjunctions) {
    // RAQB types for conjunctions are wrong and always require OR/NOT.
    base.conjunctions = overrideConfig.conjunctions as CoreConjunctions;
  }

  return L.merge(
    base,
    overrideConfig as Config,
    opts?.readonly
      ? {
          settings: {
            immutableGroupsMode: true,
            immutableFieldsMode: true,
            immutableOpsMode: true,
            immutableValuesMode: true,
            canReorder: false,
            canRegroup: false,
          },
        }
      : undefined
  );
}

export function AwesomeBuilder(props: BuilderProps) {
  return (
    <div className="query-builder-container">
      <div className="query-builder qb-lite">
        <Builder
          {...props}
          config={{
            ...props.config,
            settings: { ...props.config?.settings, fieldLabel: "" },
          }}
        />
      </div>
    </div>
  );
}
