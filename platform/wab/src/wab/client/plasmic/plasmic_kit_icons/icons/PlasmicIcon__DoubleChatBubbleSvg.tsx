/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DoubleChatBubbleSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DoubleChatBubbleSvgIcon(props: DoubleChatBubbleSvgIconProps) {
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
        d={
          "M9.992 14.51c2.794 0 5.241-1.514 5.241-4.88 0-3.366-2.447-4.88-5.241-4.88-2.795 0-5.242 1.514-5.242 4.88 0 1.236.33 2.223.886 2.976.202.273.16.91-.002 1.21-.386.715.343 1.499 1.136 1.317.593-.136 1.215-.32 1.76-.566a1.22 1.22 0 01.636-.103c.27.03.546.046.826.046z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M18.809 10.026a.75.75 0 10-1.163.948l1.163-.948zm-.462 6.58l.603.445-.603-.445zm-2.894 1.96l-.31.684.31-.683zm1.76.567l.168-.73-.168.73zm-2.397-.669l.085.746-.085-.746zm-3.836-1.57a.75.75 0 00-.885 1.212l.885-1.212zm7.369.921l-.66.356.66-.356zm1.634-4.185c0-1.472-.423-2.682-1.174-3.604l-1.163.948c.505.62.837 1.483.837 2.656h1.5zm-1.033 3.421c.664-.898 1.033-2.046 1.033-3.421h-1.5c0 1.098-.291 1.923-.74 2.53l1.207.891zm-3.806 2.199c.607.275 1.281.472 1.902.614l.335-1.462c-.566-.13-1.136-.3-1.618-.518l-.62 1.366zm-1.153.01c.307 0 .61-.017.91-.05l-.169-1.49a6.587 6.587 0 01-.74.04v1.5zm-3.896-1.154c1.095.8 2.483 1.154 3.896 1.154v-1.5c-1.178 0-2.232-.297-3.01-.866l-.886 1.212zm5.668-.223a1.965 1.965 0 00-1.03-.164l.168 1.49a.464.464 0 01.243.04l.62-1.365zm1.926.288c.019.035.017.053.015.063a.164.164 0 01-.042.08.29.29 0 01-.281.088l-.335 1.462a1.79 1.79 0 001.738-.556c.41-.462.588-1.174.225-1.849l-1.32.712zm.054-2.01c-.251.34-.288.777-.281 1.058.007.303.072.665.227.952l1.32-.712c.002.004-.011-.021-.025-.083a1.032 1.032 0 01-.023-.193.71.71 0 01.012-.159c.009-.04.012-.02-.023.027l-1.207-.89z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default DoubleChatBubbleSvgIcon;
/* prettier-ignore-end */
