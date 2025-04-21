/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ColumnAlignEndIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColumnAlignEndIcon(props: ColumnAlignEndIconProps) {
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
          "M6 56a2 2 0 104 0V8a2 2 0 10-4 0v48zm48 0a2 2 0 104 0V8a2 2 0 10-4 0v48zM36 42a2 2 0 01-2-2v-4a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H36zm-2-14a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H36a2 2 0 00-2 2v4z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ColumnAlignEndIcon;
/* prettier-ignore-end */
