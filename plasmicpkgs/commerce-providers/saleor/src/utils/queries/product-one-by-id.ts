export const ProductOneById = /* GraphQL */ `
  query ProductOneById($id: ID!, $channel: String = "default-channel") {
    product(id: $id, channel: $channel) {

      slug
      name
      description
      pricing {
        priceRange {
          start {
            net {
              amount
            }
          }
        }
      }
      variants {
        id
        name
        attributes {
          attribute {
            name
          }
          values {
            name
          }
        }
        pricing {
          price {
            net {
              amount
              currency
            }
          }
        }
      }
      media {
        url
        alt
      }
    }
  }`