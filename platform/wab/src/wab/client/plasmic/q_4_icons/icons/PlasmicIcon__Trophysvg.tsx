// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrophysvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrophysvgIcon(props: TrophysvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M7.75 4.75h8.5V11a4.25 4.25 0 01-8.5 0V4.75zm8.75 2h.104a2.646 2.646 0 01.904 5.133l-1.008.367m-9-5.5h-.104a2.646 2.646 0 00-.904 5.133l1.008.367M12 15.5V19m-3.25.25h6.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TrophysvgIcon;
/* prettier-ignore-end */
