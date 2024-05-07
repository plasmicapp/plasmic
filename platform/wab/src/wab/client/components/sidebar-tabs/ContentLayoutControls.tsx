import {
  AlignmentGridControl,
  getFlexLabel,
  getGridLocation,
} from "@/wab/client/components/sidebar-tabs/FlexContainerControls";
import {
  LabeledStyleDimItemRow,
  SectionSeparator,
} from "@/wab/client/components/sidebar/sidebar-helpers";
import { ExpsProvider } from "@/wab/client/components/style-controls/StyleComponent";
import { TokenType } from "@/wab/commons/StyleToken";
import { observer } from "mobx-react";
import React from "react";

export const ContentLayoutContainerControls = observer(
  function ContentLayoutContainerControls(props: {
    expsProvider: ExpsProvider;
  }) {
    return (
      <>
        <AlignmentGridControl
          xProp="justify-items"
          xOptions={makeContentLayoutAlignmentOptions("x")}
          yProp="align-content"
          yOptions={makeContentLayoutAlignmentOptions("y")}
          arrangement="column"
          containerStyles={{
            display: "grid",
          }}
        />
        <SectionSeparator className="mv-m" />
        <LabeledStyleDimItemRow
          label={"Gap"}
          styleName="grid-row-gap"
          tokenType={TokenType.Spacing}
          dimOpts={{
            allowedUnits: ["px"],
            min: 0,
            dragScale: "10",
          }}
        />
      </>
    );
  }
);

const xValues = ["flex-start", "center", "flex-end", "stretch"] as const;

const yValues = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
  "space-around",
  "space-between",
  "space-evenly",
] as const;

function makeContentLayoutAlignmentOptions(axis: "x" | "y") {
  const values = axis === "x" ? xValues : yValues;
  return values.map((value) => ({
    value,
    label: getFlexLabel({
      value,
      direction: axis === "x" ? "horizontal" : "vertical",
      reverse: false,
    }),
    ...getGridLocation({
      value,
      axis,
      reverse: false,
    }),
  }));
}
