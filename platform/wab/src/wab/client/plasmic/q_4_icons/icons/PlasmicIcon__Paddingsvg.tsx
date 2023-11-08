// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PaddingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaddingsvgIcon(props: PaddingsvgIconProps) {
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
          "M17.25 19.25H6.75a2 2 0 01-2-2V6.75a2 2 0 012-2h10.5a2 2 0 012 2v10.5a2 2 0 01-2 2z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8.75 10.375V9.75a1 1 0 011-1h.625M8.75 13.625v.625a1 1 0 001 1h.625m4.875-1.625v.625a1 1 0 01-1 1h-.625m1.625-4.875V9.75a1 1 0 00-1-1h-.625"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PaddingsvgIcon;
/* prettier-ignore-end */
