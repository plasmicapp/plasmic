/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EyeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeIcon(props: EyeIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
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
        d={"M32 40a8 8 0 100-16 8 8 0 000 16z"}
        fill={"currentColor"}
      ></path>

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M55.522 30.456c-8.98-20.608-38.063-20.608-47.044 0a3.88 3.88 0 000 3.088c8.98 20.608 38.063 20.608 47.044 0a3.881 3.881 0 000-3.088zM51.832 32c-7.605 17.333-32.06 17.333-39.664 0 7.605-17.333 32.06-17.333 39.663 0z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default EyeIcon;
/* prettier-ignore-end */
