/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SlackIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SlackIcon(props: SlackIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M5.02 15.154a2.506 2.506 0 01-3.006 2.448 2.51 2.51 0 01-1.822-3.42 2.508 2.508 0 012.318-1.546h2.51v2.518zm1.264 6.279a2.517 2.517 0 002.49 2.13 2.52 2.52 0 002.49-2.13v-6.28a2.515 2.515 0 00-2.49-2.904 2.52 2.52 0 00-2.49 2.905v6.279zm4.98-16.36V2.566A2.517 2.517 0 008.248.049a2.52 2.52 0 00-1.811 3.482 2.518 2.518 0 002.395 1.503l2.43.04zM2.46 6.337A2.52 2.52 0 00.327 8.825a2.516 2.516 0 002.133 2.488h6.284a2.52 2.52 0 002.906-2.488 2.516 2.516 0 00-1.83-2.422c-.35-.1-.717-.122-1.076-.066H2.46zm16.372 4.976h2.51a2.522 2.522 0 002.43-1.466 2.516 2.516 0 00-1.777-3.513 2.521 2.521 0 00-3.034 2.51l-.13 2.469zm-1.265-8.797a2.517 2.517 0 00-2.514-2.36 2.52 2.52 0 00-2.515 2.36v6.279a2.514 2.514 0 001.514 2.469 2.521 2.521 0 003.515-2.469V2.516zm-4.94 16.449v2.508a2.516 2.516 0 003.006 2.48 2.52 2.52 0 001.985-1.976 2.515 2.515 0 00-1.07-2.587 2.522 2.522 0 00-1.4-.425h-2.52zm8.804-1.264a2.52 2.52 0 002.361-2.513 2.517 2.517 0 00-2.36-2.512h-6.285a2.522 2.522 0 00-2.678 2.512 2.516 2.516 0 002.678 2.513h6.284z"
        }
      ></path>
    </svg>
  );
}

export default SlackIcon;
/* prettier-ignore-end */
