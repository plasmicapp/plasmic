import {
  getCommerceProvider as getCoreCommerceProvider,
  useCommerce as useCoreCommerce,
} from '@plasmicpkgs/commerce'
import { getCommercetoolsProvider, CommercetoolsProvider, CommercetoolsCredentials } from './provider'

export type { CommercetoolsProvider }

export const useCommerce = () => useCoreCommerce<CommercetoolsProvider>()

export const getCommerceProvider = (creds: CommercetoolsCredentials, locale: string) => 
  getCoreCommerceProvider(getCommercetoolsProvider(creds, locale))

