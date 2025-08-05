/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PlusIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PlusIcon(props: PlusIconProps) {
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
          "M32 12a2 2 0 00-2 2v16H14a2 2 0 100 4h16v16a2 2 0 104 0V34h16a2 2 0 100-4H34V14a2 2 0 00-2-2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default PlusIcon;
/* prettier-ignore-end */
