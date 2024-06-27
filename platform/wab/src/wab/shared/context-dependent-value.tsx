// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ControlExtras } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { swallow } from "@/wab/shared/common";
import { ContextDependentConfig } from "@plasmicapp/host";

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
