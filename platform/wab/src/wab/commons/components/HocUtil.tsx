import * as React from "react";

/**
 * A helper Component for HOCs that wrap other Components but want to
 * be able to expose the ref for those Components.
 *
 * If your HOC returns a class that extends from this class, then your
 * user can do something like this:
 *
 *   // Wrap a Component in your HOC
 *   const ref = React.createRef();
 *   const Wrapped = withHOC(Component);
 *   ...
 *   // Pass your Ref as ref prop to the Wrapped component
 *   <Wrapped ref={ref}/>
 *   ...
 *   // with your instance of Wrapped, you can get the instance of wrapped
 *   // Component with getWrappedRef()
 *   ref.current.getWrappedRef()
 *
 * NOTE: Ideally we should be using React.forwardRef() instead of this for
 * forwarding refs, but I (Chung) could not get it to work :-/
 */
export class UnwrappableComponent<P, S = {}> extends React.Component<P, S> {
  private innerRef: any | null;

  /**
   * Returns the wrapped component.  Note that if the wrapped Component is also
   * an UnwrappableComponent, then getWrappedRef() is called recursively until
   * we come to a non-wrapping Component.
   */
  getWrappedRef() {
    if (!this.innerRef) {
      return null;
    }

    if (this.innerRef.getWrappedRef) {
      return this.innerRef.getWrappedRef();
    } else {
      return this.innerRef;
    }
  }

  protected setInnerRef = (ref: any) => {
    this.innerRef = ref;
  };
}

export function getComponentName(
  Component: React.ComponentType<any>,
  defaultName: string = "Component"
) {
  return Component.displayName || Component.name || defaultName;
}

export function buildWrapperName(
  wrapper: string,
  WrappedComponent: React.ComponentClass<any>
) {
  const componentName = getComponentName(WrappedComponent);
  return `${wrapper}(${componentName})`;
}
