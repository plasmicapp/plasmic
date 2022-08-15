/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import * as fragment from '../fragments'

export const CheckoutLineUpdate = /* GraphQL */ `
  mutation CheckoutLineUpdate($checkoutId: ID!, $lineItems: [CheckoutLineInput!]!) {
    checkoutLinesUpdate(checkoutId: $checkoutId, lines: $lineItems) {
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
