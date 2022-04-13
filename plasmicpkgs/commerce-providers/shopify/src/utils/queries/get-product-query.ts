/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: Added query by product id
*/

const productFieldsFragment = `
  fragment productFields on Product {
    id
    handle
    availableForSale
    title
    productType
    vendor
    description
    descriptionHtml
    options {
      id
      name
      values
    }
    priceRange {
      maxVariantPrice {
        amount
        currencyCode
      }
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 250) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          title
          sku
          availableForSale
          requiresShipping
          selectedOptions {
            name
            value
          }
          priceV2 {
            amount
            currencyCode
          }
          compareAtPriceV2 {
            amount
            currencyCode
          }
        }
      }
    }
    images(first: 250) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          originalSrc
          altText
          width
          height
        }
      }
    }
  }
`

export const getProductQueryBySlug = /* GraphQL */ `
  query getProductBySlug($slug: String!) {
    productByHandle(handle: $slug) {
      ...productFields
    }
  }

  ${productFieldsFragment}
`


export const getProductQueryById = /* GraphQL */ `
  query getProductById($id: ID!) {
    product(id: $id) {
      ...productFields
    }
  }

  ${productFieldsFragment}
`

export default getProductQueryBySlug;