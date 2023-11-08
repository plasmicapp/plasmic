// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FigmasvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FigmasvgIcon(props: FigmasvgIconProps) {
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
          "M12 9.667H9.333a2.333 2.333 0 010-4.667H12v4.667zm0 4.666H9.333a2.333 2.333 0 110-4.666H12v4.666zM10 19h-.667a2.333 2.333 0 010-4.667H12V17a2 2 0 01-2 2zm2-9.333h2.667a2.333 2.333 0 000-4.667H12v4.667z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.333 14.333h.334a2.333 2.333 0 100-4.666h-.334a2.333 2.333 0 000 4.666z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FigmasvgIcon;
/* prettier-ignore-end */
