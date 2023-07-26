import React from "react";
import { Avatar } from "antd";
import { Registerable, registerComponentHelper } from "./utils";
import { usePlasmicLink } from "@plasmicapp/host";

export function AntdAvatar({
  letters,
  href,
  target,
  ...props
}: React.ComponentProps<typeof Avatar> & {
  letters?: string;
  href?: string;
  target?: boolean;
}) {
  const avatar = <Avatar {...props} children={props.children || letters} />;
  const PlasmicLink = usePlasmicLink();
  return href ? (
    <PlasmicLink href={href} target={target ? "_blank" : undefined}>
      {avatar}
    </PlasmicLink>
  ) : (
    avatar
  );
}

export function AntdAvatarGroup(
  props: React.ComponentProps<typeof Avatar.Group>
) {
  return <Avatar.Group {...props} />;
}

export function registerAvatar(loader?: Registerable) {
  registerComponentHelper(loader, AntdAvatar, {
    name: "plasmic-antd5-avatar",
    displayName: "Avatar",
    props: {
      href: {
        type: "href",
        displayName: "Link to",
        description: "Destination to link to",
      },
      target: {
        type: "boolean",
        displayName: "Open in new tab",
        hidden: (ps) => !ps.href,
      },
      letters: {
        type: "string",
        description: "Letters to show",
        defaultValue: "AB",
      },
      src: {
        type: "imageUrl",
        description: "Image to display",
      },
      size: {
        type: "choice",
        options: ["small", "default", "large"],
        description: "Set the size of avatar",
        defaultValueHint: "default",
      },
      shape: {
        type: "choice",
        options: ["circle", "round"],
        description: "Set the avatar shape",
        defaultValueHint: "square",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerAvatar",
    importName: "AntdAvatar",
  });
}

export function registerAvatarGroup(loader?: Registerable) {
  registerComponentHelper(loader, AntdAvatarGroup, {
    name: "plasmic-antd5-avatar-group",
    displayName: "AvatarGroup",
    props: {
      children: {
        type: "slot",
        defaultValue: [1, 2, 3, 4].map((user) => ({
          type: "component",
          name: "plasmic-antd5-tooltip",
          props: {
            titleText: "User " + user,
            children: {
              type: "component",
              name: "plasmic-antd5-avatar",
              props: {
                letters: `U${user}`,
              },
            },
          },
        })),
      },
      maxCount: {
        type: "number",
        description: "Max avatars to show",
        defaultValue: 2,
      },
      size: {
        type: "choice",
        options: ["small", "default", "large"],
        description: "Default size of avatars",
        defaultValueHint: "default",
      },
      maxPopoverPlacement: {
        type: "choice",
        advanced: true,
        options: ["top", "bottom"],
        defaultValueHint: "top",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerAvatar",
    importName: "AntdAvatarGroup",
  });
}
