// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LanguagesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LanguagesvgIcon(props: LanguagesvgIconProps) {
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
          "M12.75 19.25l3.25-6.5 3.25 6.5m-5.25-2h4M4.75 6.75h8.5M9 6.5V4.75m2.25 2s0 2.5-2 4.5-4.5 2-4.5 2"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.25 13.25s-2.5 0-4.5-2c-.404-.405-1-1.5-1-1.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LanguagesvgIcon;
/* prettier-ignore-end */
