// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Paintbrush2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Paintbrush2SvgIcon(props: Paintbrush2SvgIconProps) {
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
          "M12.789 8.736l3.408-3.408c.72-.72 1.857-.749 2.54-.065.684.683.655 1.82-.065 2.54l-3.435 3.434"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M15.666 11.666l-3.332-3.333a2 2 0 00-2.743-.08L8.75 9 15 15.25l.747-.84a2 2 0 00-.08-2.744zM9 10l-4.25 2.75 6.5 6.5L14 15m-7 0l1.25-1.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Paintbrush2SvgIcon;
/* prettier-ignore-end */
