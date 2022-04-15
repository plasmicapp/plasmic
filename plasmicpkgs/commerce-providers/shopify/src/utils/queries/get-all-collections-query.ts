import { collectionFieldsFragment } from "./get-collection-query"

/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
const getSiteCollectionsQuery = /* GraphQL */ `
  query getSiteCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          ...collectionFieldsFragment
        }
      }
    }
  }

  ${collectionFieldsFragment}
`
export default getSiteCollectionsQuery
