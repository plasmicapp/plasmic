import { Badge, BadgeProps } from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";

export const badgeMeta: ComponentMeta<BadgeProps> = {
  name: "Badge",
  importPath: "@chakra-ui/react",
  props: {
    colorScheme: {
      type: "choice",
      options: [
        "whiteAlpha",
        "blackAlpha",
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "teal",
        "blue",
        "cyan",
        "purple",
        "pink",
        "linkedin",
        "facebook",
        "messenger",
        "whatsapp",
        "twitter",
        "telegram",
      ],
      defaultValue: "gray",
    },
    variant: {
      type: "choice",
      options: ["solid", "subtle", "outline"],
      defaultValue: "subtle",
    },
  },
};

export function registerBadge(
  loader?: Registerable,
  customBadgeMeta?: ComponentMeta<BadgeProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Badge, customBadgeMeta ?? badgeMeta);
}
