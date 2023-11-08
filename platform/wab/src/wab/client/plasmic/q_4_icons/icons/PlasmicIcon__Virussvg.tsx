// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VirussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VirussvgIcon(props: VirussvgIconProps) {
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
          "M16.25 12a4.25 4.25 0 11-8.5 0 4.25 4.25 0 018.5 0zm-5.5-7.25h2.5m-2.5 14.5h2.5M12 5v2.25m0 9.5V19m4.243-13.01l1.767 1.767M5.99 16.243l1.767 1.767M16.95 7.05l-1.591 1.591m-6.718 6.718l-1.59 1.59M19.25 10.75v2.5m-14.5-2.5v2.5M19 12h-2.25m-9.5 0H5m13.01 4.243l-1.767 1.767M7.757 5.99L5.99 7.757m10.96 9.193l-1.591-1.591M8.641 8.641l-1.59-1.59"
        }
      ></path>
    </svg>
  );
}

export default VirussvgIcon;
/* prettier-ignore-end */
