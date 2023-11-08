// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UnsetIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UnsetIcon(props: UnsetIconProps) {
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
        d={"M10 11H5v2h5v-2zm9 0h-5v2h5v-2z"}
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default UnsetIcon;
/* prettier-ignore-end */
