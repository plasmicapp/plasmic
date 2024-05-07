import { ActionButton } from "@/wab/client/components/QueryBuilder/Components/ActionButton";
import { BooleanEditor } from "@/wab/client/components/QueryBuilder/Components/BooleanEditor";
import { FieldPicker } from "@/wab/client/components/QueryBuilder/Components/FieldPicker";
import { GroupHeader } from "@/wab/client/components/QueryBuilder/Components/GroupHeader";
import { OperatorPicker } from "@/wab/client/components/QueryBuilder/Components/OperatorPicker";
import { RowActionsGroup } from "@/wab/client/components/QueryBuilder/Components/RowActionsGroup";
import {
  AntdConfig,
  Builder,
  BuilderProps,
} from "@react-awesome-query-builder/antd";
import L from "lodash";
import React from "react";

// https://github.com/ukrbublik/react-awesome-query-builder/blob/master/modules/config/default.js
// https://github.com/ukrbublik/react-awesome-query-builder/blob/master/modules/config/basic.js

const BASE_CONFIG = AntdConfig; // BasicConfig; // AntdConfig;
const isReadOnlyMode = false;

export const QueryBuilderConfig = L.merge({}, BASE_CONFIG, {
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
    // Settings - https://github.com/ukrbublik/react-awesome-query-builder/blob/master/CONFIG.adoc

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

    ...(isReadOnlyMode
      ? {
          immutableGroupsMode: true,
          immutableFieldsMode: true,
          immutableOpsMode: true,
          immutableValuesMode: true,
          canReorder: false,
          canRegroup: false,
        }
      : {}),
  },

  widgets: {
    boolean: {
      factory: BooleanEditor,
      // There is only one operator for the boolean values (equals), hide it and show the boolean editor only.
      hideOperator: true,
    },
  },
} as typeof BASE_CONFIG);

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
