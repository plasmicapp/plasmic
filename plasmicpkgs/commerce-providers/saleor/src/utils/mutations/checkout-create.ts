/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

import * as fragment from '../fragments'

export const CheckoutCreate = /* GraphQL */ `
  mutation CheckoutCreate {
    checkoutCreate(input: { email: "customer@example.com", lines: [], channel: "default-channel" }) {
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
