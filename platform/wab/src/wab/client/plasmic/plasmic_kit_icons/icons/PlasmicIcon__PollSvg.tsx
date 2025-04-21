/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PollSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PollSvgIcon(props: PollSvgIconProps) {
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
          "M12.75 7h6.5m-6.5 10h6.5M7 9.25a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zm0 10a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z"
        }
      ></path>
    </svg>
  );
}

export default PollSvgIcon;
/* prettier-ignore-end */
