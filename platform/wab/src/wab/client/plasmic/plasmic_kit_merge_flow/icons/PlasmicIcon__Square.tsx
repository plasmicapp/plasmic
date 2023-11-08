// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SquareIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareIcon(props: SquareIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 20 20"}
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
          "M14.375 16.042h-8.75c-.92 0-1.667-.747-1.667-1.667v-8.75c0-.92.747-1.667 1.667-1.667h8.75c.92 0 1.667.747 1.667 1.667v8.75c0 .92-.746 1.667-1.667 1.667z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.25"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SquareIcon;
/* prettier-ignore-end */
