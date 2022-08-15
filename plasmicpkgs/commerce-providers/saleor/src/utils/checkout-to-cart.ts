/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import { Cart } from '../types'
import { CommerceError } from '@plasmicpkgs/commerce'

import {
  CheckoutLinesAdd,
  CheckoutLinesUpdate,
  CheckoutCreate,
  CheckoutError,
  Checkout,
  Maybe,
  CheckoutLineDelete,
} from '../schema'

import { normalizeCart } from './normalize'
import throwUserErrors from './throw-user-errors'

export type CheckoutQuery = {
  checkout: Checkout
  errors?: Array<CheckoutError>
}

export type CheckoutPayload =
  | CheckoutLinesAdd
  | CheckoutLinesUpdate
  | CheckoutCreate
  | CheckoutQuery
  | CheckoutLineDelete

const checkoutToCart = (checkoutPayload?: Maybe<CheckoutPayload>): Cart | undefined => {
  if (!checkoutPayload) {
    throw new CommerceError({
      message: 'Missing checkout payload from response',
    })
  }

  const checkout = checkoutPayload?.checkout
  if (checkoutPayload?.errors?.length === 1 && checkoutPayload.errors[0].code === "PRODUCT_UNAVAILABLE_FOR_PURCHASE") {
    console.error(checkoutPayload.errors[0]);
    return undefined;
  }

  if (checkoutPayload?.errors) {
    throwUserErrors(checkoutPayload?.errors)
  }

  if (!checkout) {
    throw new CommerceError({
      message: 'Missing checkout object from response',
    })
  }

  return normalizeCart(checkout)
}

export default checkoutToCart
