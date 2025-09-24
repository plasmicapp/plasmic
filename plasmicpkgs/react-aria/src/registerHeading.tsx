import React from "react";
import type { HeadingProps } from "react-aria-components";
import { Heading } from "react-aria-components";
import { COMMON_STYLES, createIdProp } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export interface BaseHeadingProps extends HeadingProps {}

export function BaseHeading({ children, ...rest }: BaseHeadingProps) {
  return (
    <Heading {...rest} style={COMMON_STYLES}>
      {children}
    </Heading>
  );
}

const HEADING_COMPONENT_NAME = makeComponentName("heading");

/** @deprecated Use Plasmic's built-in `Text` component instead */
export function registerHeading(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseHeading>
) {
  return registerComponentHelper(
    loader,
    BaseHeading,
    {
      name: HEADING_COMPONENT_NAME,
      displayName: "Aria Heading (deprecated)",
      importPath: "@plasmicpkgs/react-aria/skinny/registerHeading",
      importName: "BaseHeading",
      defaultStyles: {
        fontSize: "20px",
        fontWeight: "bold",
        marginBottom: "10px",
      },
      props: {
        id: createIdProp("Heading"),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: {
            type: "text",
            value: "Heading",
          },
        },
        slot: {
          type: "string",
          defaultValue: "title",
          hidden: () => true,
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
