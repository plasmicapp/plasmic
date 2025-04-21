/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FlexWrapHorizontalIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlexWrapHorizontalIcon(props: FlexWrapHorizontalIconProps) {
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
          "M12.5 3a.5.5 0 100 1h.5a2 2 0 010 4H5a3 3 0 000 6h3.349l-1.626 1.084a.5.5 0 00.554.832l3.624-2.416-3.624-2.416a.5.5 0 10-.554.832L8.349 13h-3.35A2 2 0 115 9h8a3 3 0 000-6h-.5zM3 3a.5.5 0 100 1h6.5a.5.5 0 000-1H3zm9.5 10a.5.5 0 000 1h3a.5.5 0 100-1h-3z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FlexWrapHorizontalIcon;
/* prettier-ignore-end */
