// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MicrophoneMutesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MicrophoneMutesvgIcon(props: MicrophoneMutesvgIconProps) {
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
          "M15.25 8.5V8a3.25 3.25 0 00-6.5 0v3.18c0 .047 0 .092.004.139.024.378.2 2.212 1.277 2.478m8.219-1.047s-.25 4.5-6.25 4.5c-.342 0-.666-.015-.972-.042M5.75 12.75s.105 1.891 1.814 3.222M12 17.75v1.5m6.25-13.5l-12.5 12.5"
        }
      ></path>
    </svg>
  );
}

export default MicrophoneMutesvgIcon;
/* prettier-ignore-end */
