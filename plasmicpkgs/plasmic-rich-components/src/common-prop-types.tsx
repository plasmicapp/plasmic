import { PropType } from "@plasmicapp/host/registerComponent";
import { capitalize } from "./common";
import {
  BaseColumnConfig,
  FieldfulProps,
  buildFieldsPropType,
  getFieldSubprops,
} from "./field-mappings";
import { maybe } from "./utils";

export function roleProp<P extends FieldfulProps<any>>({
  role,
  singular = false,
  advanced = false,
  displayName,
}: {
  role: string;
  singular?: boolean;
  advanced?: boolean;
  displayName?: string;
}): PropType<P> {
  return singular
    ? {
        type: "object",
        displayName: displayName || `${capitalize(role)} field`,
        advanced,
        hidden: (ps) => !ps.data,
        nameFunc: (item) =>
          maybe(item, (i) =>
            i.isHidden ? "Hidden" : i.fieldId || "Custom value"
          ),
        fields: getFieldSubprops({
          canChangeField: true,
          noTitle: true,
        }),
        defaultValueHint: (_props, contextData) =>
          (contextData?.minimalFullLengthFields ?? []).find(
            (f) => f.role === role
          ),
      }
    : buildFieldsPropType<BaseColumnConfig, P>({
        displayName: displayName || `${capitalize(role)} fields`,
        advanced,
        noTitle: true,
        canChangeField: true,
        minimalValue: (_props, contextData) =>
          (contextData?.minimalFullLengthFields ?? []).filter(
            (f) => f.role === role
          ),
      });
}

export function dataProp<T>(): PropType<T> {
  return {
    type: "dataSourceOpData" as any,
    description: "The data to display",
  };
}

export function commonProps<T>(): Record<string, PropType<T>> {
  return {
    pagination: {
      type: "boolean",
      advanced: true,
      defaultValueHint: true,
    },

    pageSize: {
      type: "number",
      defaultValueHint: 10,
      advanced: true,
    },

    hideSearch: {
      type: "boolean",
      description: "Hides the search toolbar",
      advanced: true,
    },
  };
}

export function rowActionsProp<T>(): PropType<T> {
  return {
    type: "array",
    displayName: "Row actions",
    advanced: true,
    itemType: {
      type: "object",
      nameFunc: (item) => item.label,
      fields: {
        type: {
          type: "choice",
          options: ["item", "menu"],
          defaultValue: "item",
        },
        label: {
          type: "string",
          displayName: "Action label",
        },
        children: {
          type: "array",
          displayName: "Menu items",
          itemType: {
            type: "object",
            fields: {
              label: {
                type: "string",
                displayName: "Action label",
              },
              onClick: {
                type: "eventHandler",
                argTypes: [
                  { name: "rowKey", type: "string" },
                  { name: "row", type: "object" },
                ],
              },
            },
          },
          hidden: (_ps, _ctx, { item }) => item.type !== "menu",
        },
        onClick: {
          type: "eventHandler",
          displayName: "Action",
          argTypes: [
            { name: "rowKey", type: "string" },
            { name: "row", type: "object" },
          ],
          hidden: (_ps, _ctx, { item }) => item.type !== "item",
        },
      },
    },
  };
}

export function onRowClickProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    displayName: "On row clicked",
    argTypes: [
      { name: "rowKey", type: "string" },
      { name: "row", type: "object" },
      { name: "event", type: "object" },
    ],
  };
}
