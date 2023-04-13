import {
  ComponentMeta,
  ControlExtras,
} from "@plasmicapp/host/registerComponent";
import { ColumnConfig } from "../field-mappings";
import { Registerable, registerComponentHelper } from "../utils";
import { ControlContextData, RichTable, RichTableProps } from "./RichTable";

export * from "./RichTable";
export default RichTable;

function ensureNumber(x: number | string): number {
  return x as number;
}

const rowDataType = (displayName: string, control?: any) =>
  ({
    type: "function" as any,
    displayName,
    control,
    argNames: ["currentItem"],
    argValues: (_props: any, ctx: any) => [ctx?.data?.[0]],
  } as any);

function getDefaultValueHint(field: keyof ColumnConfig) {
  return (
    _props: RichTableProps,
    contextData: ControlContextData | null,
    { path }: ControlExtras
  ): any => contextData?.mergedFields[ensureNumber(path.slice(-2)[0])][field];
}

const dataTableMeta: ComponentMeta<RichTableProps> = {
  name: "hostless-rich-table",
  displayName: "Table",
  defaultStyles: {
    width: "stretch",
  },
  props: {
    data: {
      type: "dataSourceOpData" as any,
      description: "The data to display in the table",
    },

    defaultSize: {
      type: "choice",
      options: ["large", "middle", "small"],
      defaultValueHint: "large",
    },

    // TODO
    // pagination: {
    //   type: "boolean",
    //   defaultValueHint: true,
    // },

    pageSize: {
      type: "number",
      defaultValueHint: 20,
    },

    fields: {
      type: "array",
      hidden: (ps) => !ps.data,
      unstable__keyFunc: (x) => x.key,
      unstable__minimalValue: (_props, contextData) =>
        contextData?.minimalFullLengthFields,
      unstable__canDelete: (_item: any, _props, ctx, { path }) =>
        !ctx?.mergedFields[ensureNumber(path.slice(-1)[0])].fieldId,
      itemType: {
        type: "object",
        nameFunc: (_item: any, _props, ctx, { path }) =>
          ctx?.mergedFields[ensureNumber(path.slice(-1)[0])].title,
        fields: {
          key: {
            type: "string",
            hidden: () => true,
          },
          fieldId: {
            type: "choice",
            displayName: "Field name",
            readOnly: true,
            options: (_props, ctx) =>
              (ctx?.schema?.fields ?? []).map((f) => f.id),
            hidden: (_props, ctx, { path: _controlPath }) =>
              !(_controlPath.slice(-1)[0] in (ctx?.schema?.fields ?? {})),
          },
          title: {
            type: "string",
            displayName: "Title",
            defaultValueHint: getDefaultValueHint("title"),
          },
          dataType: {
            type: "choice",
            displayName: "Data type",
            options: ["auto", "number", "string", "boolean"],
            defaultValueHint: getDefaultValueHint("dataType"),
          },
          expr: rowDataType("Customize data"),
          // TODO
          // isEditableExpr: rowDataType("Is editable", {
          //   type: "boolean",
          //   defaultValueHint: false,
          // }),
          // disableSorting: {
          //   type: "boolean",
          //   displayName: "Disable sorting",
          //   defaultValueHint: getDefaultValueHint("disableSorting"),
          // },
          // sortByExpr: rowDataType("Sort by"),
          isHidden: {
            type: "boolean",
            displayName: "Is hidden",
            defaultValueHint: getDefaultValueHint("isHidden"),
          },
        },
      },
    },

    hideSearch: {
      type: "boolean",
      advanced: true,
    },

    hideExports: {
      type: "boolean",
      advanced: true,
    },

    hideDensity: {
      type: "boolean",
      advanced: true,
    },

    hideColumnPicker: {
      type: "boolean",
      advanced: true,
    },
  },
  importName: "RichTable",
  importPath: "@plasmicpkgs/plasmic-rich-components",
};

export function registerRichTable(loader?: Registerable) {
  registerComponentHelper(loader, RichTable, dataTableMeta);
}
