export const simpleProductConnection = `
fragment simpleProductConnection on ProductConnection {
  edges {
    node {
      id
    }
  }
}
`;

/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes:
  - Fetch image.
*/
export const collectionFieldsFragment = `
  fragment collectionFieldsFragment on Collection {
    id
    title
    handle
    image {
      originalSrc
      altText
      width
      height
    }
    products(first: $first) {
      ...simpleProductConnection
    }
  }
  ${simpleProductConnection}
`;

export const getCollectionQueryById = /* GraphQL */ `
  query getSiteCollection($id: ID, $handle: String, $first: Int = 1) {
    collection(id: $id, handle: $handle) {
      ...collectionFieldsFragment
    }
  }
  ${collectionFieldsFragment}
`;
