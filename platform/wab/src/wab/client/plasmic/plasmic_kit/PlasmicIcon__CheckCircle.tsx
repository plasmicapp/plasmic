/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckCircleIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckCircleIcon(props: CheckCircleIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M12 21a9 9 0 100-18 9 9 0 000 18zm-1.75-4.212l8.164-8.164L17 7.21l-6.75 6.75L7 10.71l-1.414 1.414 4.664 4.664z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default CheckCircleIcon;
/* prettier-ignore-end */
