import React, { ReactElement } from "react";
import { SimpleBar, SimpleBarProps } from "../simple-bar/SimpleBar";
import { SimpleLine, SimpleLineProps } from "../simple-line/SimpleLine";
import {
  SimpleScatter,
  SimpleScatterProps,
} from "../simple-scatter/SimpleScatter";

export type SimpleChartProps = {
  type?: "bar" | "line" | "scatter";
} & (SimpleBarProps | SimpleLineProps | SimpleScatterProps);

export function SimpleChart(props: SimpleChartProps): ReactElement {
  switch (props.type ?? "bar") {
    case "bar":
      return <SimpleBar {...(props as any)} />;
    case "line":
      return <SimpleLine {...(props as any)} />;
    case "scatter":
      return <SimpleScatter {...(props as any)} />;
  }
}
