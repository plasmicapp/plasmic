import { DividerProps } from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import { getComponentNameAndImportMeta } from "./utils";

export const dividerMeta: CodeComponentMeta<DividerProps> = {
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
