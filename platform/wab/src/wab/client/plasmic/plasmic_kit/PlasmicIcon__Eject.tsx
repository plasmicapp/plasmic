/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EjectIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EjectIcon(props: EjectIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
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
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M5.146 13.806A.75.75 0 005.75 15h12.5a.75.75 0 00.604-1.194l-6.25-8.5a.75.75 0 00-1.208 0l-6.25 8.5zM12 7.016l4.768 6.484H7.232L12 7.016zM5.75 17.5a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H5.75z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default EjectIcon;
/* prettier-ignore-end */
