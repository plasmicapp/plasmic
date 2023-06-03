import { ComponentMeta, PropType } from "@plasmicapp/host/registerComponent";
import { buildFieldsPropType, getFieldSubprops } from "../field-mappings";
import { maybe, Registerable, registerComponentHelper } from "../utils";
import { ListColumnConfig, RichList, RichListProps, Role } from "./RichList";
import {
  commonProps,
  dataProp,
  onRowClickProp,
  rowActionsProp,
} from "../common-prop-types";

export * from "./RichList";
export default RichList;

function roleProp({
  role,
  singular = false,
  advanced = false,
  displayName,
}: {
  role: Role;
  singular?: boolean;
  advanced?: boolean;
  displayName?: string;
}): PropType<RichListProps> {
  return singular
    ? {
        type: "object",
        displayName,
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
    : buildFieldsPropType<ListColumnConfig, RichListProps>({
        displayName,
        advanced,
        noTitle: true,
        canChangeField: true,
        minimalValue: (_props, contextData) =>
          (contextData?.minimalFullLengthFields ?? []).filter(
            (f) => f.role === role
          ),
      });
}

const richListMeta: ComponentMeta<RichListProps> = {
  name: "hostless-rich-list",
  displayName: "Data List",
  defaultStyles: {
    width: "stretch",
    padding: "16px",
    maxHeight: "100%",
  },
  props: {
    data: dataProp(),

    type: {
      type: "choice",
      options: [
        { value: "list", label: "List" },
        { value: "grid", label: "Grid" },
      ],
      defaultValueHint: "list",
    },

    header: {
      type: "slot",
      hidePlaceholder: true,
    },
    footer: {
      type: "slot",
      hidePlaceholder: true,
    },

    title: roleProp({ role: "title" }),
    content: roleProp({ role: "content" }),
    image: roleProp({ role: "image", singular: true }),
    subtitle: roleProp({
      role: "subtitle",
      displayName: "Subtitle",
      advanced: true,
    }),
    // Haven't styled these yet!
    // beforeTitle: roleProp({ role: "beforeTitle", advanced: true }),
    // afterTitle: roleProp({ role: "afterTitle", advanced: true }),

    linkTo: {
      type: "function",
      control: {
        type: "href",
      },
      argNames: ["currentItem"],
      argValues: (_props: any, ctx: any) => [ctx?.data?.[0]],
    } as any,

    onRowClick: onRowClickProp(),
    rowActions: rowActionsProp(),

    bordered: {
      type: "boolean",
      defaultValue: true,
      hidden: (ps) => (ps.type ?? "list") !== "list",
    },

    ...commonProps(),
  },
  importName: "RichList",
  importPath: "@plasmicpkgs/plasmic-rich-components",
};

export function registerRichList(loader?: Registerable) {
  registerComponentHelper(loader, RichList, richListMeta);
}
