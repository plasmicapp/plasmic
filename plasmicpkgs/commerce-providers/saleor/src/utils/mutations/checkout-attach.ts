/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const CheckoutAttach = /* GraphQl */ `
  mutation CheckoutAttach($checkoutId: ID!) {
    checkoutCustomerAttach(checkoutId: $checkoutId) {
      errors {
        message
      }
      checkout {
        id
      }
    }
  }
`
