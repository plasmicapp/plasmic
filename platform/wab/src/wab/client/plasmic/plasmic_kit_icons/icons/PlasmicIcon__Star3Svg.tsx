/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Star3SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Star3SvgIcon(props: Star3SvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M8.001.063s-.105 4.465 1.684 6.253C11.473 8.105 15.937 8 15.937 8s-4.464-.105-6.252 1.684C7.896 11.472 8 15.937 8 15.937s.105-4.465-1.684-6.253C4.53 7.895.064 8 .064 8s4.465.105 6.253-1.684C8.106 4.528 8.001.063 8.001.063z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Star3SvgIcon;
/* prettier-ignore-end */
