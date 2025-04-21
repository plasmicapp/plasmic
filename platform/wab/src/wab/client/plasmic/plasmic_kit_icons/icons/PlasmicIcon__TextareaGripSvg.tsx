/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TextareaGripSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TextareaGripSvgIcon(props: TextareaGripSvgIconProps) {
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
          "M18.72 6.22a.75.75 0 111.06 1.06l-12.5 12.5a.75.75 0 01-1.06-1.06l12.5-12.5zm1.06 6a.75.75 0 00-1.06 0l-6.5 6.5a.75.75 0 101.06 1.06l6.5-6.5a.75.75 0 000-1.06zM20 19a1 1 0 11-2 0 1 1 0 012 0z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default TextareaGripSvgIcon;
/* prettier-ignore-end */
