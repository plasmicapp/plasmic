import * as React from 'react';
import { ComponentLookupSpec } from './loader';

export function useForceUpdate() {
  const [, setTick] = React.useState(0);
  const update = React.useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}

export function useStableLookupSpec(spec: ComponentLookupSpec) {
  return useStableLookupSpecs(spec)[0];
}

export function useStableLookupSpecs(...specs: ComponentLookupSpec[]) {
  const [stableSpecs, setStableSpecs] = React.useState(specs);

  React.useEffect(() => {
    if (
      specs.length !== stableSpecs.length ||
      specs.some((s, i) => !areLookupSpecsEqual(s, stableSpecs[i]))
    ) {
      setStableSpecs(specs);
    }
  }, [specs, stableSpecs]);
  return stableSpecs;
}

function areLookupSpecsEqual(
  spec1: ComponentLookupSpec,
  spec2: ComponentLookupSpec
) {
  if (spec1 === spec2) {
    return true;
  }
  if (typeof spec1 !== typeof spec2) {
    return false;
  }

  const fullSpec1 = getFullLookupSpec(spec1);
  const fullSpec2 = getFullLookupSpec(spec2);
  return (
    fullSpec1.name === fullSpec2.name &&
    fullSpec1.projectId === fullSpec2.projectId
  );
}

function getFullLookupSpec(spec: ComponentLookupSpec) {
  if (typeof spec === 'string') {
    return { name: spec };
  } else {
    return spec;
  }
}

export function useIsMounted(): () => boolean {
  const ref = React.useRef<boolean>(false);
  const isMounted = React.useCallback(() => ref.current, []);

  React.useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);

  return isMounted;
}
