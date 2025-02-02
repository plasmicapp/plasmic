import { graphql } from "../graphql/gen";

export const cartFragment = graphql(`
  fragment cart on Cart {
    id
    createdAt
    checkoutUrl
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              ...productVariant
              product {
                ...product
              }
            }
          }
        }
      }
    }
    totalQuantity
  }
`);
