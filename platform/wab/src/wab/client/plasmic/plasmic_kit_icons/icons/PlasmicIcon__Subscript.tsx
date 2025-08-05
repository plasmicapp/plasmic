/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SubscriptIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SubscriptIcon(props: SubscriptIconProps) {
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
          "M19.25 19.25h-1.594a.899.899 0 01-.75-1.393.652.652 0 01.187-.173l1.8-1.198a.68.68 0 00.187-.173c.445-.645-.009-1.563-.827-1.563H16.75m-4.5-10l-7.5 14.5m0-14.5l7.5 14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SubscriptIcon;
/* prettier-ignore-end */
