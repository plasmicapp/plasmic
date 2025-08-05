/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RadioFalseIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RadioFalseIcon(props: RadioFalseIconProps) {
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
        d={"M12 19a7 7 0 100-14 7 7 0 000 14zm0 2a9 9 0 100-18 9 9 0 000 18z"}
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default RadioFalseIcon;
/* prettier-ignore-end */
