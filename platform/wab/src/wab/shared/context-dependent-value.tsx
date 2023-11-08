import { ContextDependentConfig } from "@plasmicapp/host";
import { ControlExtras } from "../client/components/sidebar-tabs/PropEditorRow";
import { swallow } from "../common";

export function getContextDependentValue<P>(
  contextDependentValue:
    | P
    | ContextDependentConfig<typeof componentPropValues, P>
    | undefined,
  componentPropValues: any,
  ccContextData: any,
  extras: ControlExtras
) {
  return (
    swallow(() =>
      typeof contextDependentValue === "function"
        ? (contextDependentValue as (props, ctx, extras) => P)(
            componentPropValues ?? {},
            ccContextData,
            extras
          )
        : contextDependentValue
    ) ?? undefined
  );
}
