/* eslint-disable */
import * as types from "./graphql";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
const documents = {
  "\n  fragment cart on Cart {\n    id\n    createdAt\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              ...productVariant\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n":
    types.CartFragmentDoc,
  "\n  fragment collection on Collection {\n    id\n    title\n    handle\n    image {\n      ...image\n    }\n  }\n":
    types.CollectionFragmentDoc,
  "\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n":
    types.ImageFragmentDoc,
  "\n  fragment productVariant on ProductVariant {\n    id\n    sku\n    title\n    availableForSale\n    requiresShipping\n    selectedOptions {\n      name\n      value\n    }\n    image {\n      ...image\n    }\n    price {\n      amount\n      currencyCode\n    }\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n  }\n":
    types.ProductVariantFragmentDoc,
  "\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    productType\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          ...productVariant\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n    vendor\n  }\n":
    types.ProductFragmentDoc,
  "\n  fragment seo on SEO {\n    description\n    title\n  }\n":
    types.SeoFragmentDoc,
  "\n  mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {\n    cartLinesAdd(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n":
    types.AddToCartDocument,
  "\n  mutation createCart($lines: [CartLineInput!]) {\n    cartCreate(input: { lines: $lines }) {\n      cart {\n        ...cart\n      }\n    }\n  }\n":
    types.CreateCartDocument,
  "\n  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n    cartLinesUpdate(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n":
    types.EditCartItemsDocument,
  "\n  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {\n    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {\n      cart {\n        ...cart\n      }\n    }\n  }\n":
    types.RemoveFromCartDocument,
  "\n  mutation customerActivateByUrl($activationUrl: URL!, $password: String!) {\n    customerActivateByUrl(activationUrl: $activationUrl, password: $password) {\n      customer {\n        id\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n":
    types.CustomerActivateByUrlDocument,
  "\n  query getSiteCollections($first: Int!) {\n    collections(first: $first) {\n      edges {\n        node {\n          ...collection\n          products(first: $first) {\n            edges {\n              node {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetSiteCollectionsDocument,
  "\n  query getAllProductVendors($first: Int = 250, $cursor: String) {\n    products(first: $first, after: $cursor) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n      }\n      edges {\n        node {\n          vendor\n        }\n        cursor\n      }\n    }\n  }\n":
    types.GetAllProductVendorsDocument,
  '\n  query getAllProducts(\n    $first: Int = 250\n    $query: String = ""\n    $sortKey: ProductSortKeys = RELEVANCE\n    $reverse: Boolean = false\n  ) {\n    products(\n      first: $first\n      sortKey: $sortKey\n      reverse: $reverse\n      query: $query\n    ) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n      }\n      edges {\n        node {\n          ...product\n        }\n      }\n    }\n  }\n':
    types.GetAllProductsDocument,
  "\n  query getCart($cartId: ID!) {\n    cart(id: $cartId) {\n      ...cart\n    }\n  }\n":
    types.GetCartDocument,
  "\n  query getProductsFromCollection(\n    $categoryId: ID!\n    $first: Int = 250\n    $sortKey: ProductCollectionSortKeys = RELEVANCE\n    $reverse: Boolean = false\n  ) {\n    node(id: $categoryId) {\n      id\n      ... on Collection {\n        ...collection\n        products(first: $first, sortKey: $sortKey, reverse: $reverse) {\n          edges {\n            node {\n              ...product\n            }\n          }\n        }\n      }\n    }\n  }\n":
    types.GetProductsFromCollectionDocument,
  "\n  query getSiteCollection($id: ID, $handle: String, $first: Int = 1) {\n    collection(id: $id, handle: $handle) {\n      ...collection\n      products(first: $first) {\n        edges {\n          node {\n            id\n          }\n        }\n      }\n    }\n  }\n":
    types.GetSiteCollectionDocument,
  "\n  query getProductBySlug($slug: String!) {\n    productByHandle(handle: $slug) {\n      ...product\n    }\n  }\n":
    types.GetProductBySlugDocument,
  "\n  query getProductById($id: ID!) {\n    product(id: $id) {\n      ...product\n    }\n  }\n":
    types.GetProductByIdDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment cart on Cart {\n    id\n    createdAt\n    checkoutUrl\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    lines(first: 100) {\n      edges {\n        node {\n          id\n          quantity\n          cost {\n            totalAmount {\n              amount\n              currencyCode\n            }\n          }\n          merchandise {\n            ... on ProductVariant {\n              ...productVariant\n              product {\n                ...product\n              }\n            }\n          }\n        }\n      }\n    }\n    totalQuantity\n  }\n"
): typeof import("./graphql").CartFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment collection on Collection {\n    id\n    title\n    handle\n    image {\n      ...image\n    }\n  }\n"
): typeof import("./graphql").CollectionFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment image on Image {\n    url\n    altText\n    width\n    height\n  }\n"
): typeof import("./graphql").ImageFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment productVariant on ProductVariant {\n    id\n    sku\n    title\n    availableForSale\n    requiresShipping\n    selectedOptions {\n      name\n      value\n    }\n    image {\n      ...image\n    }\n    price {\n      amount\n      currencyCode\n    }\n    compareAtPrice {\n      amount\n      currencyCode\n    }\n  }\n"
): typeof import("./graphql").ProductVariantFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment product on Product {\n    id\n    handle\n    availableForSale\n    title\n    productType\n    description\n    descriptionHtml\n    options {\n      id\n      name\n      values\n    }\n    priceRange {\n      maxVariantPrice {\n        amount\n        currencyCode\n      }\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    variants(first: 250) {\n      edges {\n        node {\n          ...productVariant\n        }\n      }\n    }\n    featuredImage {\n      ...image\n    }\n    images(first: 20) {\n      edges {\n        node {\n          ...image\n        }\n      }\n    }\n    seo {\n      ...seo\n    }\n    tags\n    updatedAt\n    vendor\n  }\n"
): typeof import("./graphql").ProductFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment seo on SEO {\n    description\n    title\n  }\n"
): typeof import("./graphql").SeoFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  mutation addToCart($cartId: ID!, $lines: [CartLineInput!]!) {\n    cartLinesAdd(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n"
): typeof import("./graphql").AddToCartDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  mutation createCart($lines: [CartLineInput!]) {\n    cartCreate(input: { lines: $lines }) {\n      cart {\n        ...cart\n      }\n    }\n  }\n"
): typeof import("./graphql").CreateCartDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  mutation editCartItems($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n    cartLinesUpdate(cartId: $cartId, lines: $lines) {\n      cart {\n        ...cart\n      }\n    }\n  }\n"
): typeof import("./graphql").EditCartItemsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  mutation removeFromCart($cartId: ID!, $lineIds: [ID!]!) {\n    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {\n      cart {\n        ...cart\n      }\n    }\n  }\n"
): typeof import("./graphql").RemoveFromCartDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  mutation customerActivateByUrl($activationUrl: URL!, $password: String!) {\n    customerActivateByUrl(activationUrl: $activationUrl, password: $password) {\n      customer {\n        id\n      }\n      customerAccessToken {\n        accessToken\n        expiresAt\n      }\n      customerUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n"
): typeof import("./graphql").CustomerActivateByUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getSiteCollections($first: Int!) {\n    collections(first: $first) {\n      edges {\n        node {\n          ...collection\n          products(first: $first) {\n            edges {\n              node {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n"
): typeof import("./graphql").GetSiteCollectionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getAllProductVendors($first: Int = 250, $cursor: String) {\n    products(first: $first, after: $cursor) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n      }\n      edges {\n        node {\n          vendor\n        }\n        cursor\n      }\n    }\n  }\n"
): typeof import("./graphql").GetAllProductVendorsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '\n  query getAllProducts(\n    $first: Int = 250\n    $query: String = ""\n    $sortKey: ProductSortKeys = RELEVANCE\n    $reverse: Boolean = false\n  ) {\n    products(\n      first: $first\n      sortKey: $sortKey\n      reverse: $reverse\n      query: $query\n    ) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n      }\n      edges {\n        node {\n          ...product\n        }\n      }\n    }\n  }\n'
): typeof import("./graphql").GetAllProductsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getCart($cartId: ID!) {\n    cart(id: $cartId) {\n      ...cart\n    }\n  }\n"
): typeof import("./graphql").GetCartDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getProductsFromCollection(\n    $categoryId: ID!\n    $first: Int = 250\n    $sortKey: ProductCollectionSortKeys = RELEVANCE\n    $reverse: Boolean = false\n  ) {\n    node(id: $categoryId) {\n      id\n      ... on Collection {\n        ...collection\n        products(first: $first, sortKey: $sortKey, reverse: $reverse) {\n          edges {\n            node {\n              ...product\n            }\n          }\n        }\n      }\n    }\n  }\n"
): typeof import("./graphql").GetProductsFromCollectionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getSiteCollection($id: ID, $handle: String, $first: Int = 1) {\n    collection(id: $id, handle: $handle) {\n      ...collection\n      products(first: $first) {\n        edges {\n          node {\n            id\n          }\n        }\n      }\n    }\n  }\n"
): typeof import("./graphql").GetSiteCollectionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getProductBySlug($slug: String!) {\n    productByHandle(handle: $slug) {\n      ...product\n    }\n  }\n"
): typeof import("./graphql").GetProductBySlugDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query getProductById($id: ID!) {\n    product(id: $id) {\n      ...product\n    }\n  }\n"
): typeof import("./graphql").GetProductByIdDocument;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
