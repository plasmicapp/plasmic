import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import type {ProductSortKeys} from '@shopify/hydrogen/storefront-api-types';
import {flattenConnection} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';

/**
 * Fetch a given set of products from the storefront API
 * @param count
 * @param query
 * @param reverse
 * @param sortKey
 * @returns Product[]
 * @see https://shopify.dev/api/storefront/2023-04/queries/products
 */
export async function loader({request, context: {storefront}}: LoaderArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const query = searchParams.get('query') ?? '';
  const sortKey =
    (searchParams.get('sortKey') as null | ProductSortKeys) ?? 'BEST_SELLING';

  let reverse = false;
  try {
    const _reverse = searchParams.get('reverse');
    if (_reverse === 'true') {
      reverse = true;
    }
  } catch (_) {
    // noop
  }

  let count = 4;
  try {
    const _count = searchParams.get('count');
    if (typeof _count === 'string') {
      count = parseInt(_count);
    }
  } catch (_) {
    // noop
  }

  const {products} = await storefront.query(API_ALL_PRODUCTS_QUERY, {
    variables: {
      count,
      query,
      reverse,
      sortKey,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
    cache: storefront.CacheLong(),
  });

  invariant(products, 'No data returned from top products query');

  return json({
    products: flattenConnection(products),
  });
}

const API_ALL_PRODUCTS_QUERY = `#graphql
  query ApiAllProducts(
    $query: String
    $count: Int
    $reverse: Boolean
    $country: CountryCode
    $language: LanguageCode
    $sortKey: ProductSortKeys
  ) @inContext(country: $country, language: $language) {
    products(first: $count, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

// no-op
export default function ProductsApiRoute() {
  return null;
}
