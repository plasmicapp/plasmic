/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - Added storeDomain and accessToken parameters.
*/
import {
  getCommerceProvider as getCoreCommerceProvider,
  useCommerce as useCoreCommerce,
} from '@plasmicpkgs/commerce'
import { getShopifyProvider, ShopifyProvider } from './provider'

export type { ShopifyProvider }

export const useCommerce = () => useCoreCommerce<ShopifyProvider>()

export const getCommerceProvider = (storeDomain: string, accessToken: string) => 
  getCoreCommerceProvider(getShopifyProvider(storeDomain, accessToken))

