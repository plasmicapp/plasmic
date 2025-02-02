import { graphql } from "../graphql/gen";

export const getProductQueryBySlug = graphql(`
  query getProductBySlug($slug: String!) {
    productByHandle(handle: $slug) {
      ...product
    }
  }
`);

export const getProductQueryById = graphql(`
  query getProductById($id: ID!) {
    product(id: $id) {
      ...product
    }
  }
`);
