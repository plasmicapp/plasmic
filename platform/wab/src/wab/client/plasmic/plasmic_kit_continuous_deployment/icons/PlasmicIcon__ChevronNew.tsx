// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronNewIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronNewIcon(props: ChevronNewIconProps) {
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
          "M5.845 9.595a.75.75 0 011.06 0L12 14.689l5.095-5.094a.75.75 0 111.06 1.06L12 16.811l-6.155-6.156a.75.75 0 010-1.06z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ChevronNewIcon;
/* prettier-ignore-end */
