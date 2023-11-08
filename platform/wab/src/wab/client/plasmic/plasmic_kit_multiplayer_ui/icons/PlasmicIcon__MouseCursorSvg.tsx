// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MouseCursorSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MouseCursorSvgIcon(props: MouseCursorSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 34 34"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g filter={"url(#joOPTMkQ-a)"}>
        <path
          d={"M11 23.02V7l11.59 11.62h-6.78L11 23.02z"}
          fill={"#fff"}
        ></path>

        <path
          d={"M12 9.41V20.6l3.4-3.01h4.76L12 9.41z"}
          fill={"currentColor"}
        ></path>
      </g>

      <defs>
        <filter
          id={"joOPTMkQ-a"}
          x={"9"}
          y={"7"}
          width={"15.59"}
          height={"20.02"}
          filterUnits={"userSpaceOnUse"}
          colorInterpolationFilters={"sRGB"}
        >
          <feFlood floodOpacity={"0"} result={"BackgroundImageFix"}></feFlood>

          <feColorMatrix
            in={"SourceAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
            result={"hardAlpha"}
          ></feColorMatrix>

          <feOffset dy={"2"}></feOffset>

          <feGaussianBlur stdDeviation={"1"}></feGaussianBlur>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"}
          ></feColorMatrix>

          <feBlend
            mode={"normal"}
            in2={"BackgroundImageFix"}
            result={"effect1_dropShadow_327_870"}
          ></feBlend>

          <feBlend
            mode={"normal"}
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_327_870"}
            result={"shape"}
          ></feBlend>
        </filter>
      </defs>
    </svg>
  );
}

export default MouseCursorSvgIcon;
/* prettier-ignore-end */
