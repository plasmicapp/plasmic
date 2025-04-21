/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RowAlignCenterIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RowAlignCenterIcon(props: RowAlignCenterIconProps) {
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
          "M8 6a2 2 0 100 4h48a2 2 0 100-4H8zm0 48a2 2 0 100 4h48a2 2 0 100-4H8zm14-28a2 2 0 012-2h4a2 2 0 012 2v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V26zm14-2a2 2 0 00-2 2v12a2 2 0 002 2h4a2 2 0 002-2V26a2 2 0 00-2-2h-4z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default RowAlignCenterIcon;
/* prettier-ignore-end */
