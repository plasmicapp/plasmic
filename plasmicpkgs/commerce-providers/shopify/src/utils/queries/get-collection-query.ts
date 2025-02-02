import { graphql } from "../graphql/gen";

export const getCollectionQueryById = graphql(`
  query getSiteCollection($id: ID, $handle: String, $first: Int = 1) {
    collection(id: $id, handle: $handle) {
      ...collection
      products(first: $first) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);
