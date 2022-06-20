/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: Add export data
*/
export * from "./registerable";
export { localProvider, data };
export type { LocalProvider };
import {
  getCommerceProvider,
  useCommerce as useCoreCommerce,
} from "@plasmicpkgs/commerce";
import data from "./data.json";
import { localProvider, LocalProvider } from "./provider";

export const CommerceProvider = getCommerceProvider(localProvider);

export const useCommerce = () => useCoreCommerce<LocalProvider>();
