/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AreaInputIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AreaInputIcon(props: AreaInputIconProps) {
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
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M26 6h1c1.883 0 3.686.76 5 2.11A6.976 6.976 0 0137 6h1a2 2 0 110 4h-1a3.003 3.003 0 00-3 3v24a3.003 3.003 0 003 3h1a2 2 0 010 4h-1a6.976 6.976 0 01-5-2.11A6.977 6.977 0 0127 44h-1a2 2 0 110-4h1a3.003 3.003 0 003-3V13a3.003 3.003 0 00-3-3h-1a2 2 0 110-4z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M50 16a6 6 0 016 6v28a6 6 0 01-6 6H14a6 6 0 01-6-6V22a6 6 0 016-6h10a2 2 0 110 4H14a2 2 0 00-2 2v28a2 2 0 002 2h36a2 2 0 002-2V22a2 2 0 00-2-2H40a2 2 0 110-4h10z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default AreaInputIcon;
/* prettier-ignore-end */
