/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Trash2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Trash2Icon(props: Trash2IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      viewBox={"0 0 24 24"}
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
        fill={"currentColor"}
        d={
          "M7.5625 1C7.5625 0.447716 8.01022 0 8.5625 0H14.4375C14.9898 0 15.4375 0.447715 15.4375 1V1.33334H20C21.1046 1.33334 22 2.22877 22 3.33334V4H1V3.33334C1 2.22877 1.89543 1.33334 3 1.33334H7.5625V1ZM3.625 6.66666H19.375L18.1325 23.0755C18.093 23.597 17.6584 24 17.1354 24H5.86464C5.34165 24 4.90698 23.597 4.8675 23.0755L3.625 6.66666ZM10.1875 10.6667L7.5625 10.6667V20L10.1875 20V10.6667ZM15.4375 10.6667H12.8125V20L15.4375 20V10.6667Z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default Trash2Icon;
/* prettier-ignore-end */
