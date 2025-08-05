/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EyeClosedIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeClosedIcon(props: EyeClosedIconProps) {
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
          "M55.857 20.743a2 2 0 10-3.714-1.486c-7.33 18.324-32.957 18.324-40.286 0a2 2 0 10-3.714 1.486c1.18 2.95 2.763 5.5 4.638 7.647l-6.195 6.196a2 2 0 002.828 2.828l6.231-6.23a25.078 25.078 0 007.891 4.413l-2.463 8.868a2 2 0 103.854 1.07l2.483-8.938c3.032.537 6.148.537 9.18 0l2.483 8.938a2 2 0 103.854-1.07l-2.463-8.868a25.056 25.056 0 007.89-4.414l6.232 6.231a2 2 0 002.828-2.828L51.22 28.39c1.875-2.147 3.457-4.696 4.638-7.647z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default EyeClosedIcon;
/* prettier-ignore-end */
