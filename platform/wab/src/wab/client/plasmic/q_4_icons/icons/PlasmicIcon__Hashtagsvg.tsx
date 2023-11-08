// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HashtagsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HashtagsvgIcon(props: HashtagsvgIconProps) {
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
          "M10.25 4.75l-2.5 14.5m8.5-14.5l-2.5 14.5m5.5-10.5H5.75m12.5 6.5H4.75"
        }
      ></path>
    </svg>
  );
}

export default HashtagsvgIcon;
/* prettier-ignore-end */
