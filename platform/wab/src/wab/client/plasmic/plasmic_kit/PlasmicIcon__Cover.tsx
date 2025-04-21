/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CoverIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CoverIcon(props: CoverIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M19 6.5H5v9h7.172L16 11.672l3 3V6.5zm-9.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>

      <path
        fill={"currentColor"}
        d={"M2 3.5h20v14h-3v3h-9l3-3h-2.828l-3 3H5v-3H2v-14zm19 1v12H3v-12h18z"}
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default CoverIcon;
/* prettier-ignore-end */
