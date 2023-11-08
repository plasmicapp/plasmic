// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type InformationsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function InformationsvgIcon(props: InformationsvgIconProps) {
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
        strokeWidth={"2"}
        d={"M12 13v2"}
      ></path>

      <circle cx={"12"} cy={"9"} r={"1"} fill={"currentColor"}></circle>

      <circle
        cx={"12"}
        cy={"12"}
        r={"7.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>
    </svg>
  );
}

export default InformationsvgIcon;
/* prettier-ignore-end */
