// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DragGripIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DragGripIcon(props: DragGripIconProps) {
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
        d={
          "M21 21a5 5 0 110-10 5 5 0 010 10zm0 16a5 5 0 110-10 5 5 0 010 10zm0 16a5 5 0 110-10 5 5 0 010 10zm22-32a5 5 0 110-10 5 5 0 010 10zm0 16a5 5 0 110-10 5 5 0 010 10zm0 16a5 5 0 110-10 5 5 0 010 10z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default DragGripIcon;
/* prettier-ignore-end */
