// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StoreIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StoreIcon(props: StoreIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
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
          "M4.5 12.834h7c.736 0 1.334-.597 1.334-1.334V5.456c0-.19-.041-.379-.12-.552l-.359-.789a1.333 1.333 0 00-1.213-.782H4.859c-.523 0-.998.306-1.214.782l-.359.789c-.078.173-.12.361-.12.552V11.5c0 .737.598 1.334 1.334 1.334z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M6.333 5.167c0 .828-.666 1.666-1.666 1.666-1 0-1.5-.838-1.5-1.666m9.666 0c0 .828-.5 1.666-1.5 1.666s-1.666-.838-1.666-1.666m0 0C9.667 5.995 9 6.833 8 6.833s-1.667-.838-1.667-1.666M6.5 10.5c0-.737.597-1.334 1.333-1.334h.333c.737 0 1.334.597 1.334 1.333v2.334h-3v-2.334z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default StoreIcon;
/* prettier-ignore-end */
