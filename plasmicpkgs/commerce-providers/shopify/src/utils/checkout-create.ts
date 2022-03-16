/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - Added sameSite and secure to the cookie options to allow third-party cookies.
	    We need this to make work on the studio
*/
import Cookies from 'js-cookie'

import {
  SHOPIFY_CHECKOUT_ID_COOKIE,
  SHOPIFY_CHECKOUT_URL_COOKIE,
  SHOPIFY_COOKIE_EXPIRE,
} from '../const'

import checkoutCreateMutation from './mutations/checkout-create'
import {
  CheckoutCreatePayload,
  CheckoutLineItemInput,
  Mutation,
  MutationCheckoutCreateArgs,
} from '../schema'
import { FetcherOptions } from '@plasmicpkgs/commerce'

export const checkoutCreate = async (
  fetch: <T = any, B = Body>(options: FetcherOptions<B>) => Promise<T>,
  lineItems: CheckoutLineItemInput[]
): Promise<CheckoutCreatePayload> => {
  const { checkoutCreate } = await fetch<Mutation, MutationCheckoutCreateArgs>({
    query: checkoutCreateMutation,
    variables: {
      input: { lineItems },
    },
  })

  const checkout = checkoutCreate?.checkout
  if (checkout) {
    const checkoutId = checkout?.id
    const options: Cookies.CookieAttributes = {
      expires: SHOPIFY_COOKIE_EXPIRE,
      sameSite: "none",
      secure: true
    }
    Cookies.set(SHOPIFY_CHECKOUT_ID_COOKIE, checkoutId, options);
    if (checkout?.webUrl) {
      Cookies.set(SHOPIFY_CHECKOUT_URL_COOKIE, checkout.webUrl, options)
    }
  }

  return checkoutCreate!
}

export default checkoutCreate
