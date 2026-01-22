import registerComponent, {
  CodeComponentMeta,
} from '@plasmicapp/host/registerComponent';

import {
  TabButton,
  TabButtonMeta,
  TabContent,
  TabContentMeta,
  TabUnderline,
  TabUnderlineMeta,
  TabsContainer,
  TabsContainerMeta,
} from './tabs';

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

  _registerComponent(TabsContainer, TabsContainerMeta);
  _registerComponent(TabUnderline, TabUnderlineMeta);
  _registerComponent(TabButton, TabButtonMeta);
  _registerComponent(TabContent, TabContentMeta);
}

export * from './tabs';
