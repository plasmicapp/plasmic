/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Icon4IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon4Icon(props: Icon4IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 36 36"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M10.746 21.521c1.668 0 7.43 4.345 7.427 9.701.003 5.358-14.853 5.358-14.854-.001.001-5.356 5.76-9.7 7.427-9.7z"
        }
        fill={"#99AAB5"}
      ></path>

      <path
        d={
          "M8.541 25.182c8.839 8.84 17.337 5.163 20.033 2.469 2.695-2.696-.158-9.916-6.371-16.129C15.988 5.308 8.767 2.455 6.072 5.15 3.377 7.845-.299 16.343 8.541 25.182z"
        }
        fill={"#CCD6DD"}
      ></path>

      <path
        d={
          "M12.443 21.278c6.214 6.214 13.434 9.066 16.13 6.372 2.695-2.696-.158-9.916-6.37-16.129C15.987 5.308 8.766 2.455 6.072 5.15c-2.696 2.695.157 9.916 6.37 16.128z"
        }
        fill={"#66757F"}
      ></path>

      <path
        d={
          "M22.202 11.521a1.138 1.138 0 010 1.607l-7.233 7.231a1.136 1.136 0 11-1.607-1.607l7.232-7.231a1.137 1.137 0 011.608 0z"
        }
        fill={"#CCD6DD"}
      ></path>

      <path
        d={
          "M23.809 9.915a2.274 2.274 0 11-3.217 3.214 2.274 2.274 0 013.217-3.214z"
        }
        fill={"#CCD6DD"}
      ></path>

      <path
        d={
          "M28.287 13.078l-.051-.001a1 1 0 01-.95-1.048c.002-.016.064-2.157-1.58-3.8-1.637-1.637-3.771-1.579-3.8-1.58a1 1 0 11-.1-1.997c.122-.012 3.028-.123 5.314 2.163 2.287 2.288 2.17 5.191 2.164 5.314a1 1 0 01-.997.949z"
        }
        fill={"#FFAC33"}
      ></path>

      <path
        d={
          "M31.846 12.522a1 1 0 01-.943-1.331c.034-.107.893-2.876-2.195-5.963-3.126-3.127-6.126-2.414-6.252-2.382a1.003 1.003 0 01-1.216-.715.995.995 0 01.701-1.217c.17-.046 4.205-1.077 8.181 2.901 4.016 4.014 2.726 7.876 2.668 8.039-.144.41-.531.668-.944.668z"
        }
        fill={"#FFAC33"}
      ></path>

      <path
        d={
          "M10.914 32.521c-2.9 0-5.543-.658-7.566-1.737-.008.146-.029.29-.029.438.001 5.359 14.857 5.359 14.854.001 0-.09-.015-.177-.018-.266-1.977.976-4.496 1.564-7.24 1.564z"
        }
        fill={"#66757F"}
      ></path>
    </svg>
  );
}

export default Icon4Icon;
/* prettier-ignore-end */
