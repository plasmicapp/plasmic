import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import {

  CalendlyInlineWidget,
  CalendlyInlineWidgetMeta,
  CalendlyCornerPopup,
  CalendlyCornerPopupMeta,
} from "./calendly";


export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerGlobalContext: typeof registerGlobalContext;
}) {
  const _registerComponent = <T extends React.ComponentType<any>>(
    Component: T,
    defaultMeta: ComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(Component, defaultMeta);
    } else {
      registerComponent(Component, defaultMeta);
    }
  };

  if (loader) {
    _registerComponent(CalendlyInlineWidget, CalendlyInlineWidgetMeta);
    _registerComponent(CalendlyCornerPopup, CalendlyCornerPopupMeta);
  }
}

export * from "./calendly";