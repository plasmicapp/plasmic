import registerComponent, {
    ComponentMeta,
  } from "@plasmicapp/host/registerComponent";
  import { Divider, DividerProps } from "@chakra-ui/react";
  import { Registerable } from "./registerable";

export const dividerMeta: ComponentMeta<DividerProps>={
  name: "Divider",
  importPath: "@chakra-ui/react",
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

  export function registerDivider(loader?: Registerable,  customDividerMeta?: ComponentMeta<DividerProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(Divider, customDividerMeta ?? dividerMeta);
  }
  