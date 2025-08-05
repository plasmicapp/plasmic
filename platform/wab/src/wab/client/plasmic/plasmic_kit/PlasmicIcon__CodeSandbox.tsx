/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CodeSandboxIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CodeSandboxIcon(props: CodeSandboxIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M4.75 8L12 4.75 19.25 8 12 11.25 4.75 8zm0 8L12 19.25 19.25 16m0-8v8M4.75 8v8M12 11.5V19"
        }
      ></path>
    </svg>
  );
}

export default CodeSandboxIcon;
/* prettier-ignore-end */
