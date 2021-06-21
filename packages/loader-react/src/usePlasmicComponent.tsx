import * as React from 'react';
import { ComponentLookupSpec } from './loader';
import { usePlasmicRootContext } from './PlasmicRootProvider';
import { useForceUpdate, useIsMounted, useStableLookupSpec } from './utils';

/**
 * Hook that fetches and returns a React component for rendering the argument
 * Plasmic component.  Returns undefined if the component data is still
 * being fetched.
 *
 * @param opts.forceOriginal if you used PlasmicComponentLoader.registerComponent,
 *   then normally usePlasmicComponent will return the registered component.
 *   You can set forceOriginal to true if you want to return the Plasmic-generated
 *   component instead.
 */
export function usePlasmicComponent<P extends React.ComponentType = any>(
  spec: ComponentLookupSpec,
  opts: { forceOriginal?: boolean } = {}
) {
  const rootContext = usePlasmicRootContext();
  if (!rootContext) {
    throw new Error(
      `You can only use usePlasmicComponent if wrapped in <PlasmicRootProvider />`
    );
  }

  const loader = rootContext.loader;
  const lookup = loader.getLookup();

  const component = lookup.hasComponent(spec)
    ? lookup.getComponent(spec, opts)
    : undefined;

  const stableSpec = useStableLookupSpec(spec);
  const isMounted = useIsMounted();
  const forceUpdate = useForceUpdate();

  React.useEffect(() => {
    if (!component) {
      (async () => {
        await loader.fetchComponentData(stableSpec);
        if (isMounted()) {
          forceUpdate();
        }
      })();
    }
  }, [component, stableSpec]);

  return component as P;
}
