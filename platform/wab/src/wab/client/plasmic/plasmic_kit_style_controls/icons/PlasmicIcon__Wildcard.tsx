/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WildcardIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WildcardIcon(props: WildcardIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 17 17"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        d={"M2.5 8.5h12m-6-6v12m-4.243-1.757l8.486-8.486m-8.486 0l8.486 8.486"}
      ></path>
    </svg>
  );
}

export default WildcardIcon;
/* prettier-ignore-end */
