/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import {
  CommerceAPIConfig,
  getCommerceProvider as getCoreCommerceProvider,
  useCommerce as useCoreCommerce,
} from '@plasmicpkgs/commerce'
import { SWELL_CHECKOUT_ID_COOKIE, SWELL_COOKIE_EXPIRE, SWELL_CUSTOMER_TOKEN_COOKIE } from './const'
import { getSwellProvider, SwellProvider } from './provider'
import fetchApi from './utils/fetch-swell-api'

export type { SwellProvider }

export const getCommerceProvider = (storeId: string, publicKey: string) => 
  getCoreCommerceProvider(getSwellProvider(storeId, publicKey))

export const useCommerce = () => useCoreCommerce<SwellProvider>()


export interface SwellConfig extends CommerceAPIConfig {
  fetch: any
}

const config: SwellConfig = {
  locale: 'en-US',
  commerceUrl: '',
  apiToken: ''!,
  cartCookie: SWELL_CHECKOUT_ID_COOKIE,
  cartCookieMaxAge: SWELL_COOKIE_EXPIRE,
  fetch: fetchApi,
  customerCookie: SWELL_CUSTOMER_TOKEN_COOKIE,
}
