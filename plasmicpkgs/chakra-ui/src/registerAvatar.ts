import {
  AvatarBadgeProps,
  AvatarGroupProps,
  AvatarProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const avatarBadgeMeta: ComponentMeta<AvatarBadgeProps> = {
  ...getComponentNameAndImportMeta("AvatarBadge", "Avatar"),
  props: {
    boxSize: {
      type: "string",
      defaultValue: "1.25em",
    },
    bg: {
      type: "string",
      defaultValue: "green.500",
    },
    borderColor: "string",
  },
};

export const avatarMeta: ComponentMeta<AvatarProps> = {
  ...getComponentNameAndImportMeta("Avatar", "AvatarGroup"),
  props: {
    name: {
      type: "string",
      defaultValue: "Kola Tioluwani",
    },
    src: {
      type: "string",
      defaultValue: "https://bit.ly/dan-abramov",
    },
    size: {
      type: "choice",
      options: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "full"],
    },
    loading: {
      type: "choice",
      options: ["eager", "lazy"],
    },
    showBorder: "boolean",
    children: {
      type: "slot",
      hidePlaceholder: true,
      allowedComponents: [getPlasmicComponentName("AvatarBadge")],
      defaultValue: {
        type: "component",
        name: getPlasmicComponentName("AvatarBadge"),
      },
    },
  },
};

export const avatarGroupMeta: ComponentMeta<AvatarGroupProps> = {
  ...getComponentNameAndImportMeta("AvatarGroup"),
  props: {
    size: {
      type: "choice",
      options: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "full"],
    },
    max: {
      type: "number",
      description: "The maximum number of avatars to show before truncating.",
    },
    spacing: {
      type: "string",
      defaultValue: "-0.75rem",
    },
    children: {
      type: "slot",
      allowedComponents: [getPlasmicComponentName("Avatar")],
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Dan Abrahmov",
            src: "https://bit.ly/dan-abramov",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Kola Tioluwani",
            src: "https://bit.ly/tioluwani-kolawole",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Kent Dodds",
            src: "https://bit.ly/kent-c-dodds",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Ryan Florence",
            src: "https://bit.ly/ryan-florence",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Prosper Otemuyiwa",
            src: "https://bit.ly/prosper-baba",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Christian Nwamba",
            src: "https://bit.ly/code-beast",
          },
        },
        {
          type: "component",
          name: getPlasmicComponentName("Avatar"),
          props: {
            name: "Segun Adebayo",
            src: "https://bit.ly/sage-adebayo",
          },
        },
      ],
    },
  },
};
