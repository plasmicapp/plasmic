import { buildFieldsPropType } from "../field-mappings";
import { Registerable, registerComponentHelper } from "../utils";
import {
  DetailsColumnConfig,
  RichDetails,
  RichDetailsProps,
} from "./RichDetails";

export * from "./RichDetails";

export function registerRichDetails(loader?: Registerable) {
  registerComponentHelper(loader, RichDetails, {
    name: "hostless-rich-details",
    displayName: "Data details",
    defaultStyles: {
      width: "stretch",
      maxHeight: "100%",
    },
    props: {
      data: {
        type: "dataSourceOpData" as any,
        description: "The data to display",
      },
      fields: buildFieldsPropType<DetailsColumnConfig, RichDetailsProps>({
        fieldTypes: {
          span: {
            type: "number",
            displayName: "Number of columns to span",
            defaultValueHint: 1,
          },
        },
      }),
      layout: {
        displayName: "Layout",
        type: "choice",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
        defaultValueHint: "horizontal",
      },
      column: {
        displayName: "Items per row",
        type: "number",
        description: "Number of items to display per row",
        defaultValueHint: 2,
      },
      size: {
        displayName: "Spacing",
        type: "choice",
        options: [
          { value: "small", label: "Small" },
          { value: "middle", label: "Medium" },
          { value: "default", label: "Large" },
        ],
        defaultValueHint: "default",
      },
      bordered: {
        displayName: "Show borders?",
        type: "boolean",
        defaultValue: true,
      },
    },
    importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-details",
    importName: "RichDetails",
  });
}
