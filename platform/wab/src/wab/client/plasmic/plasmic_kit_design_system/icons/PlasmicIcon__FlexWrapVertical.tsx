/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FlexWrapVerticalIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlexWrapVerticalIcon(props: FlexWrapVerticalIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 18 18"}
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
          "M3 12.5a.5.5 0 111 0v.5a2 2 0 004 0V5a3 3 0 016 0v3.349l1.084-1.626a.5.5 0 01.832.554L13.5 10.901l-2.416-3.624a.5.5 0 11.832-.554L13 8.349v-3.35A2 2 0 109 5v8a3 3 0 01-6 0v-.5zM3 3a.5.5 0 111 0v6.5a.5.5 0 01-1 0V3zm10 9.5a.5.5 0 011 0v3a.5.5 0 11-1 0v-3z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FlexWrapVerticalIcon;
/* prettier-ignore-end */
