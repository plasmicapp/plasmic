// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TwittersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TwittersvgIcon(props: TwittersvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
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
        d={
          "M9.31 18.25c5.472 0 8.464-4.81 8.464-8.98 0-.233.166-.44.378-.536.728-.33 1.673-1.235.697-2.756-.646.348-1.177.538-1.889.766-1.126-1.27-3.01-1.331-4.209-.136-.772.77-1.1 1.919-.86 3.015-2.392-.127-5.193-1.887-6.704-3.86-.789 1.443-.386 3.288.921 4.215a2.828 2.828 0 01-1.35-.395v.04c0 1.503.999 2.796 2.386 3.094a2.8 2.8 0 01-1.343.054c.39 1.285 2.079 2.728 3.352 2.753a5.758 5.758 0 01-3.695 1.354c-.237 0-.473-.015-.708-.045a8.073 8.073 0 004.56 1.415v.002z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TwittersvgIcon;
/* prettier-ignore-end */
