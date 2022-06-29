/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const ProductConnection = /* GraphQL */ `
  fragment ProductConnection on ProductCountableConnection {
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      node {
        id
        name
        description
        slug
        pricing {
          priceRange {
            start {
              net {
                amount
              }
            }
          }
        }
        media {
          url
          alt
        }
        variants {
          id
          name
          attributes {
            attribute {
              name
            }
            values {
              name
            }
          }
          pricing {
            price {
              net {
                amount
                currency
              }
            }
          }
        }
      }
    }
  }
`
