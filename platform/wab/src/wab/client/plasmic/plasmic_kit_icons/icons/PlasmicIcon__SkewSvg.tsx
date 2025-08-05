/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SkewSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SkewSvgIcon(props: SkewSvgIconProps) {
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
          "M9.25 5.23l-2.116-.44c-1.236-.256-2.384.75-2.384 2.086V12m4.5-6.77v13.54m0-13.54l6 1.319m-6 12.221l-2.116.44c-1.236.256-2.384-.749-2.384-2.086V12m4.5 6.77l6-1.319m0-10.902l2.43.567c.917.215 1.57 1.078 1.57 2.076V12m-4-5.451V17.45m0 0l2.43-.567c.917-.215 1.57-1.078 1.57-2.076V12m-14.5 0h14.5"
        }
      ></path>
    </svg>
  );
}

export default SkewSvgIcon;
/* prettier-ignore-end */
