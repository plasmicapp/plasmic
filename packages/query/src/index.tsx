import { mutateKeys } from "./query-data";
export { useSWRConfig } from "swr";
export {
  addLoadingStateListener,
  HeadMetadataContext,
  isPlasmicPrepass,
  PlasmicPrepassContext,
  PlasmicQueryDataProvider,
  useMutablePlasmicQueryData,
  usePlasmicDataConfig,
  usePlasmicQueryData,
  wrapLoadingFetcher,
} from "./query-data";
export type {
  HeadMetadata,
  LoadingStateListener,
  SWRResponse,
} from "./query-data";

if (typeof window !== "undefined") {
  const root = window as any;
  const maybeExistingMutateAllKeys = root.__SWRMutateAllKeys;
  root.__SWRMutateAllKeys = (invalidateKey?: string) => {
    mutateKeys(invalidateKey);
    if (typeof maybeExistingMutateAllKeys === "function") {
      maybeExistingMutateAllKeys(invalidateKey);
    }
  };
}
