/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TreeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TreeIcon(props: TreeIconProps) {
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
          "M3.75 6.75A.75.75 0 014.5 6H15a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75zM6 12a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12zm3 4.5A.75.75 0 009 18h10.5a.75.75 0 000-1.5H9z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default TreeIcon;
/* prettier-ignore-end */
