export const simpleProductConnection = `
fragment simpleProductConnection on ProductConnection {
  edges {
    node {
      id
    }
  }
}
`;

export const collectionFieldsFragment = `
  fragment collectionFieldsFragment on Collection {
    id
    title
    handle,
    products(first: $first) {
      ...simpleProductConnection
    }
  }
  ${simpleProductConnection}
`;

export const getCollectionQueryById = /* GraphQL */ `
  query getSiteCollection($id: ID!, $first: Int = 1) {
    collection(id: $id) {
      ...collectionFieldsFragment
    }
  }
  ${collectionFieldsFragment}
`;
