import registerComponent, {
    ComponentMeta,
  } from "@plasmicapp/host/registerComponent";
  import { Kbd, KbdProps } from "@chakra-ui/react";
  import { Registerable } from "./registerable";

export const kbdMeta: ComponentMeta<KbdProps>={
  name: "Kbd",
  importPath: "@chakra-ui/react",
  displayName: "Keyboard Key",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "⌘",
        },
      ],
    },
  },
};

  export function registerKbd(loader?: Registerable,  customKbdMeta?: ComponentMeta<KbdProps>
    ) {
    const doRegisterComponent: typeof registerComponent = (...args) =>
      loader ? loader.registerComponent(...args) : registerComponent(...args);
      doRegisterComponent(Kbd, customKbdMeta ?? kbdMeta);
  }
  