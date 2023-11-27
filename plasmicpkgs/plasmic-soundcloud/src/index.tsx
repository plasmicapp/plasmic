import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext from "@plasmicapp/host/registerGlobalContext";
import { SoundCloud, SoundCloudMeta } from "./soundcloud";

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

  _registerComponent(SoundCloud, SoundCloudMeta);
}

export * from "./soundcloud";
