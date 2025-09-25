import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerToken from "@plasmicapp/host/registerToken";

import { CookieConsent } from "./cookie-consent";
import { CookieConsentMeta, registerTokens } from "./cookie-consent-meta";

export function registerAll(loader?: {
  registerComponent: typeof registerComponent;
  registerToken: typeof registerToken;
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

  // Register tokens first
  registerTokens(loader);

  // Then register component
  _registerComponent(CookieConsent, CookieConsentMeta);
}

export * from "./cookie-consent";
