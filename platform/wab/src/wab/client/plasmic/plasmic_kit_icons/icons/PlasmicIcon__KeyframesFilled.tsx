/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type KeyframesFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KeyframesFilledIcon(props: KeyframesFilledIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M8 4a2.599 2.599 0 00-2 .957l-4.355 5.24a2.847 2.847 0 00-.007 3.598l4.368 5.256C6.505 19.651 7.23 20 8 20a2.6 2.6 0 002-.957l4.355-5.24a2.847 2.847 0 00.007-3.598L9.994 4.949A2.593 2.593 0 008 4zm8.382.214a1 1 0 011.32.074l.084.094 4.576 5.823c.808.993.848 2.396.13 3.419l-.12.158-4.586 5.836a1 1 0 01-1.644-1.132l.072-.104 4.596-5.85a.844.844 0 00.06-.978l-.07-.1-4.586-5.836a1 1 0 01.168-1.404z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M12.382 4.214a1 1 0 011.32.074l.084.094 4.576 5.823c.808.993.848 2.396.13 3.419l-.12.158-4.586 5.836a1 1 0 01-1.644-1.132l.072-.104 4.596-5.85a.844.844 0 00.06-.978l-.07-.1-4.586-5.836a1 1 0 01.168-1.404z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default KeyframesFilledIcon;
/* prettier-ignore-end */
