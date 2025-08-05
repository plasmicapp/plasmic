/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type QuestionMarkSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function QuestionMarkSvgIcon(props: QuestionMarkSvgIconProps) {
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
          "M8.249 7a4.25 4.25 0 115.678 5.789C12.943 13.29 12 14.145 12 15.25M12 19v.25"
        }
      ></path>
    </svg>
  );
}

export default QuestionMarkSvgIcon;
/* prettier-ignore-end */
