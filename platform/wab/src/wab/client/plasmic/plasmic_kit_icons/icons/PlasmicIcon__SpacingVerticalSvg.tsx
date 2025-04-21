/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SpacingVerticalSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpacingVerticalSvgIcon(props: SpacingVerticalSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M19.25 4a.75.75 0 01.75.75v1.5A2.75 2.75 0 0117.25 9H6.75A2.75 2.75 0 014 6.25v-1.5a.75.75 0 011.5 0v1.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-1.5a.75.75 0 01.75-.75zm-2 11A2.75 2.75 0 0120 17.75v1.5a.75.75 0 01-1.5 0v-1.5c0-.69-.56-1.25-1.25-1.25H6.75c-.69 0-1.25.56-1.25 1.25v1.5a.75.75 0 01-1.5 0v-1.5A2.75 2.75 0 016.75 15h10.5zm-2-2.25a.75.75 0 000-1.5h-6.5a.75.75 0 000 1.5h6.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SpacingVerticalSvgIcon;
/* prettier-ignore-end */
