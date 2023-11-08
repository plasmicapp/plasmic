import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface DataSelectorPropTypeProps {
  dataSelector: string;
}

export function DataSelectorPropType(props: DataSelectorPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerDataSelectorPropType() {
  registerComponent(DataSelectorPropType, {
    name: "test-data-selector-prop-type",
    displayName: "Data Selector Prop Type",
    props: {
      dataSelector: {
        type: "dataSelector",
        data: {
          firstName: "foo",
          lastName: "bar",
          address: {
            country: "Brazil",
            state: "Sao Paulo",
          },
        },
      },
    },
    importName: "DataSelectorPropType",
    importPath: "../code-components/DataSelectorPropType",
  });
}
