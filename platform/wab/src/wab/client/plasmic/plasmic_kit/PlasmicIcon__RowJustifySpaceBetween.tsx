/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RowJustifySpaceBetweenIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RowJustifySpaceBetweenIcon(
  props: RowJustifySpaceBetweenIconProps
) {
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
          "M10 8a2 2 0 10-4 0v48a2 2 0 104 0V8zm48 0a2 2 0 10-4 0v48a2 2 0 104 0V8zM14 18a2 2 0 012-2h4a2 2 0 012 2v28a2 2 0 01-2 2h-4a2 2 0 01-2-2V18zm30-2a2 2 0 00-2 2v28a2 2 0 002 2h4a2 2 0 002-2V18a2 2 0 00-2-2h-4z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default RowJustifySpaceBetweenIcon;
/* prettier-ignore-end */
