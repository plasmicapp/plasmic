// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MovesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MovesvgIcon(props: MovesvgIconProps) {
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
          "M12 4.75l-1.25 1.5h2.5L12 4.75zm0 14.5l-1.25-1.5h2.5L12 19.25zM19.25 12l-1.5-1.25v2.5l1.5-1.25zm-14.5 0l1.5-1.25v2.5L4.75 12zM12 5v14.25M19 12H4.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default MovesvgIcon;
/* prettier-ignore-end */
