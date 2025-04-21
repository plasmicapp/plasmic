/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FontIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FontIcon(props: FontIconProps) {
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
        d={
          "M9.185 8.212c.209 1.921.743 4.04.911 5.903m0 0c.203 2.241-.123 4.113-2.178 4.826-1.293.448-2.84-.435-2.652-1.79.093-.676.462-1.37 1.329-1.923.26-.166.554-.27.852-.356l2.649-.757zm0 0L14 13m5.25-8.25C15.5 10.25 8 4 4.75 11.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FontIcon;
/* prettier-ignore-end */
