import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface GraphQLPropTypeProps {
  data: {
    query: string;
    variables?: Record<string, any>;
  };
}

export function GraphQLPropType(props: GraphQLPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerGraphQLPropType() {
  registerComponent(GraphQLPropType, {
    name: "test-graphql-prop-type",
    displayName: "GraphQL Prop Type",
    props: {
      data: {
        type: "code",
        lang: "graphql",
        endpoint: "https://rickandmortyapi.com/graphql",
      },
    },
    importName: "GraphQLPropType",
    importPath: "../code-components/GraphQLPropType",
  });
}
