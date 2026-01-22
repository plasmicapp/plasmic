import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  commonProps,
  dataProp,
  onRowClickProp,
  roleProp,
  rowActionsProp,
} from "../common-prop-types";
import { Registerable, registerComponentHelper } from "../utils";
import { RichList, RichListProps } from "./RichList";

export * from "./RichList";
export default RichList;
const richListMeta: CodeComponentMeta<RichListProps> = {
  name: "hostless-rich-list",
  displayName: "Data List",
  defaultStyles: {
    width: "stretch",
    padding: "16px",
    maxHeight: "100%",
  },
  defaultDisplay: "block",
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
  importPath: "@plasmicpkgs/plasmic-rich-components/skinny/rich-list",
};

export function registerRichList(loader?: Registerable) {
  registerComponentHelper(loader, RichList, richListMeta);
}
