/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const PageMany = /* GraphQL */ `
  query PageMany($first: Int = 100) {
    pages(first: $first) {
      edges {
        node {
          id
          title
          slug
        }
      }
    }
  }
`
