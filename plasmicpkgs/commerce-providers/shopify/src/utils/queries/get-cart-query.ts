import { graphql } from "../graphql/gen";

export const getCartQuery = graphql(`
  query getCart($cartId: ID!) {
    cart(id: $cartId) {
      ...cart
    }
  }
`);
