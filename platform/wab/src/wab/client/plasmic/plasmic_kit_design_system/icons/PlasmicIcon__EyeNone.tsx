/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EyeNoneIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeNoneIcon(props: EyeNoneIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M13.414 10.586a2 2 0 10-2.828 2.828l40 40a2 2 0 102.828-2.828l-40-40zm13.483 21.968a1.025 1.025 0 00-.467-.265c-6.181-1.61-11.742-5.954-14.573-13.032a2 2 0 00-3.714 1.486c1.18 2.95 2.763 5.5 4.638 7.647l-6.195 6.196a2 2 0 002.828 2.828l6.231-6.23a25.075 25.075 0 007.891 4.413l-2.463 8.868a2 2 0 103.854 1.07l2.483-8.938c.474.084.951.155 1.43.213.896.108 1.363-.95.725-1.588l-2.668-2.668zm13.697 2.383a.977.977 0 001.05.223 25.008 25.008 0 006.71-3.977l6.232 6.231a2 2 0 002.828-2.828L51.22 28.39c1.875-2.147 3.458-4.696 4.638-7.647a2 2 0 10-3.714-1.486c-2.532 6.331-7.249 10.475-12.64 12.43-.721.262-.964 1.195-.422 1.737l1.513 1.513z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default EyeNoneIcon;
/* prettier-ignore-end */
