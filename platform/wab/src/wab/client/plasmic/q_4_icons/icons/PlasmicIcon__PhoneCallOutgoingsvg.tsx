// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PhoneCallOutgoingsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PhoneCallOutgoingsvgIcon(props: PhoneCallOutgoingsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M8.893 4.75H6.068c-.728 0-1.318.59-1.318 1.318 0 7.28 5.902 13.182 13.182 13.182.728 0 1.318-.59 1.318-1.318v-2.825l-3.107-2.071-1.611 1.61c-.28.28-.698.368-1.05.186a11.093 11.093 0 01-2.518-1.796 8.726 8.726 0 01-1.836-2.542c-.16-.34-.067-.733.199-1l1.637-1.637L8.893 4.75zm10.357 0l-4.5 4.5m4.5-1v-3.5h-3.5"
        }
      ></path>
    </svg>
  );
}

export default PhoneCallOutgoingsvgIcon;
/* prettier-ignore-end */
