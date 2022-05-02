/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import * as fragment from '../fragments'

export const CheckoutLineDelete = /* GraphQL */ `
  mutation CheckoutLineDelete($checkoutId: ID!, $lineId: ID!) {
    checkoutLineDelete(checkoutId: $checkoutId, lineId: $lineId) {
      errors {
        code
        field
        message
      }
      checkout {
        ...CheckoutDetails
      }
    }
  }
  ${fragment.CheckoutDetails}
`
