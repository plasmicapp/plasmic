/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckTrueIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckTrueIcon(props: CheckTrueIconProps) {
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
          "M18 10a8 8 0 00-8 8v28a8 8 0 008 8h28a8 8 0 008-8V18a8 8 0 00-8-8H18zm27.155 10.367a2 2 0 01.478 2.788L31.539 43.081a2.5 2.5 0 01-4.075.01l-7.091-9.928a2 2 0 113.255-2.325l5.864 8.21 12.875-18.203a2 2 0 012.788-.478z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CheckTrueIcon;
/* prettier-ignore-end */
