/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/saleor/src
  Changes: None 
*/

export const PageOne = /* GraphQL */ `
  query PageOne($id: ID!) {
    page(id: $id) {
      id
      title
      slug
    }
  }
`
