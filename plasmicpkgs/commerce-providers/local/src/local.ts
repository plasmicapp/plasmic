/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/local/src
  Changes: None
*/
export * from "./registerable";
import {
  getCommerceProvider,
  useCommerce as useCoreCommerce,
} from '@plasmicpkgs/commerce'
import { localProvider, LocalProvider } from './provider'

export { localProvider }
export type { LocalProvider }

export const CommerceProvider = getCommerceProvider(localProvider)

export const useCommerce = () => useCoreCommerce<LocalProvider>()
