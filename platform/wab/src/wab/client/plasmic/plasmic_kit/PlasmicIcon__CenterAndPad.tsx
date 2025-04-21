/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CenterAndPadIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CenterAndPadIcon(props: CenterAndPadIconProps) {
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
          "M13 10a2 2 0 012 2v5.875A2.125 2.125 0 0112.875 20H7a2 2 0 110-4h4v-4a2 2 0 012-2zm4 14a2 2 0 012-2h26a2 2 0 012 2v16a2 2 0 01-2 2H19a2 2 0 01-2-2V24zm-2 28a2 2 0 11-4 0v-4H7a2 2 0 110-4h5.875c1.174 0 2.125.951 2.125 2.125V52zm36-42a2 2 0 00-2 2v5.875c0 1.174.951 2.125 2.125 2.125H57a2 2 0 100-4h-4v-4a2 2 0 00-2-2zm-2 42a2 2 0 104 0v-4h4a2 2 0 100-4h-5.875A2.125 2.125 0 0049 46.125V52z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CenterAndPadIcon;
/* prettier-ignore-end */
