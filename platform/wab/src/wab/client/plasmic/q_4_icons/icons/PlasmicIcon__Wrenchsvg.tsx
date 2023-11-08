// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WrenchsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WrenchsvgIcon(props: WrenchsvgIconProps) {
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
          "M14.464 8.95a1 1 0 010-1.414l2.37-2.37a4.25 4.25 0 00-5.67 5.67l-6 6a1.414 1.414 0 102 2l6.001-6.001a4.25 4.25 0 005.68-5.648L16.48 9.55a1 1 0 01-1.414 0l-.602-.601z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default WrenchsvgIcon;
/* prettier-ignore-end */
