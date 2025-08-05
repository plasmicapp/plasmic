/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ZoomFitIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ZoomFitIcon(props: ZoomFitIconProps) {
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
          "M16 10H8v8a2 2 0 11-4 0V8.125C4 6.951 4.951 6 6.125 6H16a2 2 0 110 4zM8 54v-8a2 2 0 10-4 0v9.875C4 57.049 4.951 58 6.125 58H16a2 2 0 100-4H8zm48-44h-8a2 2 0 110-4h9.875C59.049 6 60 6.951 60 8.125V18a2 2 0 11-4 0v-8zm0 36a2 2 0 114 0v9.875A2.125 2.125 0 0157.875 58H48a2 2 0 110-4h8v-8z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M12 16a2 2 0 012-2h15a2 2 0 012 2v13a2 2 0 01-2 2H14a2 2 0 01-2-2V16zm2 17a2 2 0 00-2 2v13a2 2 0 002 2h15a2 2 0 002-2V35a2 2 0 00-2-2H14zm19-17a2 2 0 012-2h15a2 2 0 012 2v13a2 2 0 01-2 2H35a2 2 0 01-2-2V16zm2 17a2 2 0 00-2 2v13a2 2 0 002 2h15a2 2 0 002-2V35a2 2 0 00-2-2H35z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ZoomFitIcon;
/* prettier-ignore-end */
