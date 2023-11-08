// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PencilsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PencilsvgIcon(props: PencilsvgIconProps) {
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
          "M4.75 19.25l4.25-1 9.95-9.95a1 1 0 000-1.413L17.112 5.05a1 1 0 00-1.414 0L5.75 15l-1 4.25zm9.273-12.21l3 3"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PencilsvgIcon;
/* prettier-ignore-end */
