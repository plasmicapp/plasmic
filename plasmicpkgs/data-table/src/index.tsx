import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import {
  DataTable,
  TableValue,
  DataTableProps,
  TableValueProps,
} from "./DataTable";

export * from "./DataTable";
export default DataTable;

const dataTableValueMeta: ComponentMeta<TableValueProps> = {
  name: "hostless-data-table-value",
  displayName: "Table Value",
  parentComponentName: "hostless-data-table",
  props: {},
  importName: "TableValue",
  importPath: "",
};

const dataTableMeta: ComponentMeta<DataTableProps> = {
  name: "hostless-data-table",
  displayName: "Data Table",
  props: {
    data: {
      type: "dataSourceOpData" as any,
      description: "The data to display in the table",
    },

    children: {
      type: "slot",
      defaultValue: {
        type: "component",
        name: "hostless-data-table-value",
      },
    },

    size: {
      type: "choice",
      options: ["large", "middle", "small"],
      defaultValueHint: "large",
    },

    pagination: {
      type: "boolean",
      defaultValueHint: true,
    },

    columns: {
      type: "choice",
      options: (_props, schema) => {
        if (!schema) {
          return [];
        }
        return schema.fields.map((f) => ({
          label: f.label || f.id,
          value: f.id,
        }));
      },
      multiSelect: true,
    },
  },

  importName: "TableWrapper",
  importPath: "DataTable",
};

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: ComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  _registerComponent(DataTable, dataTableMeta);
  _registerComponent(TableValue, dataTableValueMeta);
}
