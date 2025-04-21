/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BorderDottedIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BorderDottedIcon(props: BorderDottedIconProps) {
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
          "M5.25 12a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm3 0a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm3.75-.75a.75.75 0 100 1.5.75.75 0 000-1.5zm2.25.75a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm3.75-.75a.75.75 0 100 1.5.75.75 0 000-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BorderDottedIcon;
/* prettier-ignore-end */
