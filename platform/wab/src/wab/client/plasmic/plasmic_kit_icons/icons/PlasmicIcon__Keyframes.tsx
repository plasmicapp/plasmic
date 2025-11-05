/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type KeyframesIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KeyframesIcon(props: KeyframesIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M9.225 18.412A1.595 1.595 0 018 19c-.468 0-.914-.214-1.225-.588l-4.361-5.248a1.844 1.844 0 010-2.328l4.361-5.248A1.595 1.595 0 018 5c.468 0 .914.214 1.225.588l4.361 5.248a1.844 1.844 0 010 2.328l-4.361 5.248zM17 5l4.586 5.836a1.844 1.844 0 010 2.328L17 19"
        }
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M13 5l4.586 5.836a1.844 1.844 0 010 2.328L13 19"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default KeyframesIcon;
/* prettier-ignore-end */
