// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrashCansvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrashCansvgIcon(props: TrashCansvgIconProps) {
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
          "M19.25 6.5c0 .966-3.246 1.75-7.25 1.75S4.75 7.466 4.75 6.5 7.996 4.75 12 4.75s7.25.784 7.25 1.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4.75 6.75l1.461 9.132a4 4 0 003.95 3.368h3.678a4 4 0 003.95-3.368L19.25 6.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TrashCansvgIcon;
/* prettier-ignore-end */
