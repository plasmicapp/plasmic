/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FetchIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FetchIcon(props: FetchIconProps) {
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
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M8 32C8 18.745 18.745 8 32 8s24 10.745 24 24-10.745 24-24 24S8 45.255 8 32zm22-19.901C19.893 13.102 12 21.629 12 32c0 11.046 8.954 20 20 20s20-8.954 20-20c0-10.37-7.893-18.898-18-19.901v25.073l7.586-7.586a2 2 0 112.828 2.828L33.591 43.237a2.25 2.25 0 01-3.182 0L19.586 32.414a2 2 0 112.828-2.828L30 37.172V12.099z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FetchIcon;
/* prettier-ignore-end */
