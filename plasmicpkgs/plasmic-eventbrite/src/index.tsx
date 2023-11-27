import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Eventbrite, EventbriteMeta } from "./eventbrite";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
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

  _registerComponent(Eventbrite, EventbriteMeta);
}
export * from "./eventbrite";
