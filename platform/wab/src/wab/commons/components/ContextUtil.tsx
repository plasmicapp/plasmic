import { capitalizeFirst } from "@/wab/strs";
import * as React from "react";
import {
  buildWrapperName,
  getComponentName,
  UnwrappableComponent,
} from "./HocUtil";

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Returns an HOC that, given a Component, will inject the
 * Context.Consumer's value as a prop of of that component.
 * `propKey` is the name of that prop.
 */
export function withConsumer<PropName extends string, PropType>(
  Consumer: React.ComponentType<React.ConsumerProps<PropType>>,
  propKey: PropName
) {
  type InjectedProps = { [key in PropName]?: PropType };
  type PublicProps<T extends InjectedProps> = Omit<T, keyof InjectedProps>;
  return function <InnerProps extends InjectedProps>(
    Component: React.ComponentClass<InnerProps>
  ): React.ComponentClass<PublicProps<InnerProps>> {
    return class extends UnwrappableComponent<PublicProps<InnerProps>> {
      static displayName = buildWrapperName(
        `with${getComponentName(Consumer, capitalizeFirst(propKey))}`,
        Component
      );
      render() {
        return (
          <Consumer>
            {(injected) => {
              const injectedProps = { [propKey]: injected } as InjectedProps;
              const otherProps = this.props as PublicProps<InnerProps>;
              const props = Object.assign(
                {},
                otherProps,
                injectedProps
              ) as InnerProps;
              return <Component ref={this.setInnerRef} {...(props as any)} />;
            }}
          </Consumer>
        );
      }
    };
  };
}

/**
 * Creates a HOC that wraps a node with a Context Provider.
 *
 * ```tsx
 * const providesYourContext = withProvider(YourContext.Provider);
 * function YourComponent() {
 *   return providesYourContext(yourContextValue)(
 *     <YourContent />
 *   );
 * }
 * ```
 */
export function withProvider<PropType>(
  Provider: React.ComponentType<React.ProviderProps<PropType>>
) {
  return function (value: PropType, key?: string) {
    return function (children: React.ReactNode) {
      return (
        <Provider value={value} key={key}>
          {children}
        </Provider>
      );
    };
  };
}
