/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ColumnJustifyEndIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ColumnJustifyEndIcon(props: ColumnJustifyEndIconProps) {
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
          "M56 10a2 2 0 100-4H8a2 2 0 100 4h48zm0 48a2 2 0 100-4H8a2 2 0 100 4h48zM46 30a2 2 0 012 2v4a2 2 0 01-2 2H18a2 2 0 01-2-2v-4a2 2 0 012-2h28zm2 14a2 2 0 00-2-2H18a2 2 0 00-2 2v4a2 2 0 002 2h28a2 2 0 002-2v-4z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ColumnJustifyEndIcon;
/* prettier-ignore-end */
