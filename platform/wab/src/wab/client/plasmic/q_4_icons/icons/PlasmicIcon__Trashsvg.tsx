// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrashsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrashsvgIcon(props: TrashsvgIconProps) {
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
          "M6.75 7.75l.841 9.673a2 2 0 001.993 1.827h4.832a2 2 0 001.993-1.827l.841-9.673m-7.5-.25v-.75a2 2 0 012-2h.5a2 2 0 012 2v.75M5 7.75h14"
        }
      ></path>
    </svg>
  );
}

export default TrashsvgIcon;
/* prettier-ignore-end */
