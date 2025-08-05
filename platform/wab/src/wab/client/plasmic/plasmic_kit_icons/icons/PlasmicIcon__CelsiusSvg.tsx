/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CelsiusSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CelsiusSvgIcon(props: CelsiusSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M12.25 9.25V8.5a3.75 3.75 0 10-7.5 0v7a3.75 3.75 0 107.5 0v-.75m7-8.25a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CelsiusSvgIcon;
/* prettier-ignore-end */
