/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ColumnAlignBaselineIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColumnAlignBaselineIcon(props: ColumnAlignBaselineIconProps) {
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
          "M8 58a2 2 0 01-2-2V8a2 2 0 114 0v48a2 2 0 01-2 2zm48 0a2 2 0 01-2-2V8a2 2 0 114 0v48a2 2 0 01-2 2zm-26-6a2 2 0 104 0V42h14a2 2 0 002-2v-4a2 2 0 00-2-2H34v-4h4a2 2 0 002-2v-4a2 2 0 00-2-2h-4V12a2 2 0 10-4 0v10h-4a2 2 0 00-2 2v4a2 2 0 002 2h4v4H16a2 2 0 00-2 2v4a2 2 0 002 2h14v10z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ColumnAlignBaselineIcon;
/* prettier-ignore-end */
