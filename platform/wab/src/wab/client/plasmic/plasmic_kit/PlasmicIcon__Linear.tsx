/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LinearIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LinearIcon(props: LinearIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
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
          "M6 5a1 1 0 11-2 0 1 1 0 012 0zm14 14a1 1 0 11-2 0 1 1 0 012 0zm-1.28-7.78a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l7.5-7.5zm-5.94-7a.75.75 0 00-1.06 0l-7.5 7.5a.75.75 0 101.06 1.06l7.5-7.5a.75.75 0 000-1.06zm5.94 0a.75.75 0 111.06 1.06l-14.5 14.5a.75.75 0 01-1.06-1.06l14.5-14.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default LinearIcon;
/* prettier-ignore-end */
