/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ColumnWrapStartIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColumnWrapStartIcon(props: ColumnWrapStartIconProps) {
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
          "M8 58a2 2 0 01-2-2V8a2 2 0 114 0v48a2 2 0 01-2 2zm48 0a2 2 0 01-2-2V8a2 2 0 114 0v48a2 2 0 01-2 2zM14 14a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2h-4a2 2 0 01-2-2v-8zm14-2a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2v-8a2 2 0 00-2-2h-4zM14 30a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2h-4a2 2 0 01-2-2v-8zm14-2a2 2 0 00-2 2v8a2 2 0 002 2h4a2 2 0 002-2v-8a2 2 0 00-2-2h-4zM14 46a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2h-4a2 2 0 01-2-2v-8z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ColumnWrapStartIcon;
/* prettier-ignore-end */
