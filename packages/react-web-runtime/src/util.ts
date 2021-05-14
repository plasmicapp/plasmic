import { createPlasmicElementProxy } from "@plasmicapp/react-web";

/**
 * A jsx shim that just calls into createPlasmicElementProxy.  Eventually, should
 * instead be using react/jsx-runtime to do the right thing.
 */
export function jsxShim(
  type: React.ElementType<any>,
  props: any,
  key?: string
) {
  const { children, ...restProps } = props;
  restProps["key"] = key;
  return createPlasmicElementProxy(
    type,
    restProps,
    ...(Array.isArray(children) ? children : children ? [children] : [])
  );
}
