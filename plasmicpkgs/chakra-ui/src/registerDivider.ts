import { DividerProps } from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const dividerMeta: ComponentMeta<DividerProps> = {
  ...getComponentNameAndImportMeta("Divider"),
  props: {
    orientation: {
      type: "choice",
      options: ["vertical", "horizontal"],
    },
    variant: {
      type: "choice",
      options: ["solid", "dashed"],
    },
  },
};
