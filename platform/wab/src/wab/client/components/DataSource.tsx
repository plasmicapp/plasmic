// This is a skeleton starter React component generated by Plasmic.
// This file is owned by you, feel free to edit as you see fit.
import * as React from "react";
import {
  DefaultDataSourceProps,
  PlasmicDataSource,
} from "@/wab/client/plasmic/plasmic_kit_data_queries/PlasmicDataSource";

// Your component props start with props for variants and slots you defined
// in Plasmic, but you can add more here, like event handlers that you can
// attach to named nodes in your component.
//
// If you don't want to expose certain variants or slots as a prop, you can use
// Omit to hide them:
//
// interface DataSourceProps extends Omit<DefaultDataSourceProps, "hideProps1"|"hideProp2"> {
//   // etc.
// }
//
// You can also stop extending from DefaultDataSourceProps altogether and have
// total control over the props for your component.
interface DataSourceProps extends DefaultDataSourceProps {
  onClick: () => void;
}

function DataSource(props: DataSourceProps) {
  return <PlasmicDataSource {...props} />;
}

export default DataSource;