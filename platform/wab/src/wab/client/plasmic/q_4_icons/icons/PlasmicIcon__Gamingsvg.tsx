// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GamingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GamingsvgIcon(props: GamingsvgIconProps) {
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
          "M9 17.94l1.365-2.215a1 1 0 01.851-.475h1.565a1 1 0 01.853.478l1.344 2.198c.744 1.23 2.147 1.722 3.298.936a2.235 2.235 0 00.949-2.178l-.91-6.043a3.047 3.047 0 00-.58-1.396A3.244 3.244 0 0015 7.75H9.006a3.244 3.244 0 00-2.724 1.48 3.045 3.045 0 00-.588 1.403l-.919 6.06c-.129.852.244 1.7.959 2.18 1.143.77 2.543.314 3.266-.934zM12 7.5V4.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.5 12a.5.5 0 11-1 0 .5.5 0 011 0zm6 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GamingsvgIcon;
/* prettier-ignore-end */
