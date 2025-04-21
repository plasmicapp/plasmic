/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ExpandIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ExpandIcon(props: ExpandIconProps) {
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
          "M8.293 6.793a1 1 0 001.414 1.414L11 6.914v10.172l-1.293-1.293a1 1 0 00-1.414 1.414L12 20.914l3.707-3.707a1 1 0 00-1.414-1.414L13 17.086V6.914l1.293 1.293a1 1 0 101.414-1.414L12 3.086 8.293 6.793z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default ExpandIcon;
/* prettier-ignore-end */
