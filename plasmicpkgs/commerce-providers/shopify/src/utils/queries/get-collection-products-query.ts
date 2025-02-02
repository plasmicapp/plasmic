import { graphql } from "../graphql/gen";

export const getCollectionProductsQuery = graphql(`
  query getProductsFromCollection(
    $categoryId: ID!
    $first: Int = 250
    $sortKey: ProductCollectionSortKeys = RELEVANCE
    $reverse: Boolean = false
  ) {
    node(id: $categoryId) {
      id
      ... on Collection {
        ...collection
        products(first: $first, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
              ...product
            }
          }
        }
      }
    }
  }
`);
