/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RestIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RestIcon(props: RestIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 543.232 543.232"}
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
        d={
          "M85.972 416.447c5.838 9.139 15.716 14.133 25.814 14.133a30.432 30.432 0 0016.444-4.816c14.241-9.102 18.409-28.023 9.309-42.26L66.915 272.953l70.631-110.54c9.1-14.241 4.933-33.158-9.309-42.258-14.248-9.095-33.158-4.933-42.259 9.309L4.815 256.478a30.593 30.593 0 000 32.95l81.157 127.019zm329.03 9.309a30.426 30.426 0 0016.444 4.816c10.092 0 19.976-4.986 25.813-14.131l81.158-127.014a30.593 30.593 0 000-32.95l-81.151-127.014c-9.095-14.248-28.03-18.416-42.259-9.309-14.241 9.1-18.409 28.023-9.309 42.258l70.631 110.54-70.637 110.545c-9.099 14.235-4.931 33.159 9.31 42.259zM165.667 492.6a30.558 30.558 0 0013.213 3.018c11.401 0 22.35-6.402 27.613-17.375L391.979 91.452c7.307-15.239.881-33.519-14.357-40.82-15.245-7.307-33.52-.881-40.821 14.357l-185.492 386.79c-7.307 15.239-.881 33.52 14.358 40.821z"
        }
      ></path>
    </svg>
  );
}

export default RestIcon;
/* prettier-ignore-end */
