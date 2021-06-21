/**
 * We don't actually make use of the global variant React contexts generated
 * in the bundle.  That's because we would have to wait until the data is
 * loaded before we can set up the context providers, but setting up context
 * providers will mutate the React tree and invalidate all the children. That means
 * once data comes in, we'll re-render the React tree from the providers down
 * in a way that will lose all existing React state.  Therefore, instead,
 * we always have a single context provided -- the PlasmicRootContext -- and we
 * create these fake useGlobalVariant() hooks that just read from that
 * PlasmicRootContext.  This allows us to have a stable React tree before and
 * after the data load.
 */

import { InternalPlasmicComponentLoader } from './loader';
import { usePlasmicRootContext } from './PlasmicRootProvider';

export function createUseGlobalVariant(name: string, projectId: string) {
  return () => {
    const rootContext = usePlasmicRootContext();
    if (!rootContext) {
      return undefined;
    }

    const loader = rootContext.loader as InternalPlasmicComponentLoader;
    const spec = [
      ...loader.getGlobalVariants(),
      ...(rootContext.globalVariants ?? []),
    ].find(
      (spec) =>
        spec.name === name && (!spec.projectId || spec.projectId === projectId)
    );
    return spec ? spec.value : undefined;
  };
}
