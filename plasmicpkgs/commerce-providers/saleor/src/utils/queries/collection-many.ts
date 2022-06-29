/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const CollectionMany = /* GraphQL */ `
  query CollectionMany( $channel: String = "default-channel") {
    collections(first:100, channel: $channel) {
      edges {
        node {
          id
          name
          slug
        }
      }
    }
  }
`
