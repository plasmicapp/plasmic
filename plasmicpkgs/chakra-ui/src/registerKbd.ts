import { Kbd, KbdProps } from "@chakra-ui/react";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import { getComponentNameAndImportMeta } from "./utils";

export const kbdMeta: CodeComponentMeta<KbdProps> = {
  ...getComponentNameAndImportMeta("Kbd", undefined, {
    displayName: "Chakra-UI Keyboard Key",
  }),
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

export function registerKbd(
  loader?: Registerable,
  customKbdMeta?: CodeComponentMeta<KbdProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Kbd, customKbdMeta ?? kbdMeta);
}
