/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LightBulbSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LightBulbSvgIcon(props: LightBulbSvgIconProps) {
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
          "M12 4.75C8.5 4.75 6.75 7.5 6.75 10c0 4 3 4.5 3 6v2.25a1 1 0 001 1h2.5a1 1 0 001-1V16c0-1.5 3-2 3-6 0-2.5-1.75-5.25-5.25-5.25zm-2 12h4"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LightBulbSvgIcon;
/* prettier-ignore-end */
