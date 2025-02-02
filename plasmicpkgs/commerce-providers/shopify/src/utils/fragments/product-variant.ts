import { graphql } from "../graphql/gen";

export const productVariantFragment = graphql(`
  fragment productVariant on ProductVariant {
    id
    sku
    title
    availableForSale
    requiresShipping
    selectedOptions {
      name
      value
    }
    image {
      ...image
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
  }
`);
