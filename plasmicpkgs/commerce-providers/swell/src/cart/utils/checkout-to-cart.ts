/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import { CommerceError } from '@plasmicpkgs/commerce'
import { CartType } from '@plasmicpkgs/commerce'

import {
  CheckoutLineItemsAddPayload,
  CheckoutLineItemsRemovePayload,
  CheckoutLineItemsUpdatePayload,
  Maybe,
} from '../../schema'
import { normalizeCart } from '../../utils'
export type CheckoutPayload =
  | CheckoutLineItemsAddPayload
  | CheckoutLineItemsUpdatePayload
  | CheckoutLineItemsRemovePayload

const checkoutToCart = (checkoutPayload?: Maybe<CheckoutPayload>): CartType.Cart => {
  if (!checkoutPayload) {
    throw new CommerceError({
      message: 'Invalid response from Swell',
    })
  }
  return normalizeCart(checkoutPayload as any)
}

export default checkoutToCart
