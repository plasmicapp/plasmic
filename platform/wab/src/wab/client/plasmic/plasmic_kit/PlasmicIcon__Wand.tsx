/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WandIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WandIcon(props: WandIconProps) {
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
          "M17 4.75C17 5.897 15.897 7 14.75 7 15.897 7 17 8.103 17 9.25 17 8.103 18.103 7 19.25 7 18.103 7 17 5.897 17 4.75zm0 10c0 1.147-1.103 2.25-2.25 2.25 1.147 0 2.25 1.103 2.25 2.25 0-1.147 1.103-2.25 2.25-2.25-1.147 0-2.25-1.103-2.25-2.25zm-8-7C9 9.917 6.917 12 4.75 12 6.917 12 9 14.083 9 16.25 9 14.083 11.083 12 13.25 12 11.083 12 9 9.917 9 7.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WandIcon;
/* prettier-ignore-end */
