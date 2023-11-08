import { usePluginContext } from "@graphiql/react";
import React from "react";

function useRenderGqlPlugin(
  pluginTitle: "Documentation Explorer" | "GraphiQL Explorer"
) {
  const pluginContext = usePluginContext();
  const PluginContent = pluginContext?.plugins.find(
    (plugin) => plugin.title === pluginTitle
  )?.content;
  return <>{PluginContent ? <PluginContent /> : null}</>;
}

export function GqlComponents() {
  const content = useRenderGqlPlugin("GraphiQL Explorer");
  return content;
}

export function GqlDoc() {
  const content = useRenderGqlPlugin("Documentation Explorer");
  return content;
}
