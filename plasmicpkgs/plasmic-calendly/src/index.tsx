import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {
  CalendlyCornerPopup,
  CalendlyCornerPopupMeta,
  CalendlyInlineWidget,
  CalendlyInlineWidgetMeta,
} from "./calendly";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: CodeComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  _registerComponent(CalendlyInlineWidget, CalendlyInlineWidgetMeta);
  _registerComponent(CalendlyCornerPopup, CalendlyCornerPopupMeta);
}

export * from "./calendly";
