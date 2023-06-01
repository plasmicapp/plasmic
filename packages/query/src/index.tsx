import { mutateKeys } from './query-data';
export { useSWRConfig } from 'swr';

export {
  addLoadingStateListener,
  LoadingStateListener,
  PlasmicPrepassContext,
  PlasmicQueryDataProvider,
  SWRResponse,
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
  usePlasmicQueryData,
  wrapLoadingFetcher,
  isPlasmicPrepass,
} from './query-data';

if (typeof window !== 'undefined') {
  const root = window as any;
  const maybeExistingMutateAllKeys = root.__SWRMutateAllKeys;
  root.__SWRMutateAllKeys = (invalidateKey?: string) => {
    mutateKeys(invalidateKey);
    if (typeof maybeExistingMutateAllKeys === 'function') {
      maybeExistingMutateAllKeys(invalidateKey);
    }
  };
}
