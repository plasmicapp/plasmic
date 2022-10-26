import { mutateAllKeys } from './query-data';

export {
  PlasmicPrepassContext,
  PlasmicQueryDataProvider,
  SWRResponse,
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
  usePlasmicQueryData,
} from './query-data';

if (typeof window !== 'undefined') {
  const root = window as any;
  const maybeExistingMutateAllKeys = root.__SWRMutateAllKeys;
  root.__SWRMutateAllKeys = () => {
    mutateAllKeys();
    if (typeof maybeExistingMutateAllKeys === 'function') {
      maybeExistingMutateAllKeys();
    }
  };
}
