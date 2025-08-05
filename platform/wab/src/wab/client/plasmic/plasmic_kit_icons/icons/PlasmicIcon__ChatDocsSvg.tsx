/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ChatDocsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChatDocsSvgIcon(props: ChatDocsSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox="0 0 500 500"
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g transform="matrix(1, 0, 0, 1, 41.58675, -3.612537)">
        <path
          d="M 173.662 386.744 L 425.441 386.744 C 439.854 386.744 451.552 374.896 451.552 360.288 L 451.552 37.799 C 451.552 23.19 439.854 11.343 425.441 11.343 L -7.839 11.343 C -22.253 11.343 -33.951 23.19 -33.951 37.799 L -33.951 360.467 C -33.951 375.076 -22.253 386.924 -7.839 386.924 L 42.516 386.924 L 10.852 491.261 L 159.356 391.078 C 163.603 388.259 168.579 386.744 173.662 386.744 Z"
          style={{ fill: "none", stroke: "currentColor", strokeWidth: 20 }}
        />
        <g transform="matrix(0.948247, 0, 0, 0.937339, -33.950581, 11.342917)">
          <rect
            x="240"
            y="110.88"
            width="32"
            height="186.128"
            fill="currentColor"
            style={{ strokeWidth: 10 }}
          />
          <path
            d="M408,318.576l-22.512-10.048c-0.576-0.256-61.584-26.4-122.544,2.896L256,314.752l-6.944-3.328 c-61.408-29.536-121.936-3.152-122.544-2.896L104,318.576v-217.52l8.96-4.384c61.84-30.336,122.72-11.248,143.04-3.2 c20.336-8.048,81.184-27.12,143.04,3.2l8.96,4.384L408,318.576L408,318.576z M186.144,265.408c21.152,0,45.232,3.52,69.84,14.032 c47.872-20.448,93.728-14.384,120-7.6V121.424c-57.216-22.768-112.4,3.568-112.992,3.824L256,128.672l-6.992-3.408 c-1.136-0.528-56.416-26.272-113.008-3.824v150.4C148.768,268.544,166.144,265.408,186.144,265.408z"
            fill="currentColor"
            style={{ strokeWidth: 10 }}
          />
        </g>
      </g>
    </svg>
  );
}

export default ChatDocsSvgIcon;
/* prettier-ignore-end */
