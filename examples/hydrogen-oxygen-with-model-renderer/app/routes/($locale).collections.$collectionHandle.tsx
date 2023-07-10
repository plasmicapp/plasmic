import {json, type LoaderArgs} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import type {
  Filter,
  ProductCollectionSortKeys,
} from '@shopify/hydrogen/storefront-api-types';
import {
  flattenConnection,
  AnalyticsPageType,
  Pagination__unstable as Pagination,
  getPaginationVariables__unstable as getPaginationVariables,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {
  PageHeader,
  Section,
  Text,
  SortFilter,
  Grid,
  ProductCard,
  Button,
} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {routeHeaders} from '~/data/cache';
import {seoPayload} from '~/lib/seo.server';
import type {AppliedFilter, SortParam} from '~/components/SortFilter';
import {getImageLoadingPriority} from '~/lib/const';

export const headers = routeHeaders;

type VariantFilterParam = Record<string, string | boolean>;
type PriceFiltersQueryParam = Record<'price', {max?: number; min?: number}>;
type VariantOptionFiltersQueryParam = Record<
  'variantOption',
  {name: string; value: string}
>;
type FiltersQueryParams = Array<
  VariantFilterParam | PriceFiltersQueryParam | VariantOptionFiltersQueryParam
>;

export async function loader({params, request, context}: LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });
  const {collectionHandle} = params;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const searchParams = new URL(request.url).searchParams;
  const knownFilters = ['productVendor', 'productType'];
  const available = 'available';
  const variantOption = 'variantOption';
  const {sortKey, reverse} = getSortValuesFromParam(
    searchParams.get('sort') as SortParam,
  );
  const filters: FiltersQueryParams = [];
  const appliedFilters: AppliedFilter[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (available === key) {
      filters.push({available: value === 'true'});
      appliedFilters.push({
        label: value === 'true' ? 'In stock' : 'Out of stock',
        urlParam: {
          key: available,
          value,
        },
      });
    } else if (knownFilters.includes(key)) {
      filters.push({[key]: value});
      appliedFilters.push({label: value, urlParam: {key, value}});
    } else if (key.includes(variantOption)) {
      const [name, val] = value.split(':');
      filters.push({variantOption: {name, value: val}});
      appliedFilters.push({label: val, urlParam: {key, value}});
    }
  }

  // Builds min and max price filter since we can't stack them separately into
  // the filters array. See price filters limitations:
  // https://shopify.dev/custom-storefronts/products-collections/filter-products#limitations
  if (searchParams.has('minPrice') || searchParams.has('maxPrice')) {
    const price: {min?: number; max?: number} = {};
    if (searchParams.has('minPrice')) {
      price.min = Number(searchParams.get('minPrice')) || 0;
      appliedFilters.push({
        label: `Min: $${price.min}`,
        urlParam: {key: 'minPrice', value: searchParams.get('minPrice')!},
      });
    }
    if (searchParams.has('maxPrice')) {
      price.max = Number(searchParams.get('maxPrice')) || 0;
      appliedFilters.push({
        label: `Max: $${price.max}`,
        urlParam: {key: 'maxPrice', value: searchParams.get('maxPrice')!},
      });
    }
    filters.push({
      price,
    });
  }

  const {collection, collections} = await context.storefront.query(
    COLLECTION_QUERY,
    {
      variables: {
        ...paginationVariables,
        handle: collectionHandle,
        filters,
        sortKey,
        reverse,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    },
  );

  if (!collection) {
    throw new Response('collection', {status: 404});
  }

  const seo = seoPayload.collection({collection, url: request.url});

  return json({
    collection,
    appliedFilters,
    collections: flattenConnection(collections),
    analytics: {
      pageType: AnalyticsPageType.collection,
      collectionHandle,
      resourceId: collection.id,
    },
    seo,
  });
}

export default function Collection() {
  const {collection, collections, appliedFilters} =
    useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={collection.title}>
        {collection?.description && (
          <div className="flex items-baseline justify-between w-full">
            <div>
              <Text format width="narrow" as="p" className="inline-block">
                {collection.description}
              </Text>
            </div>
          </div>
        )}
      </PageHeader>
      <Section>
        <SortFilter
          filters={collection.products.filters as Filter[]}
          appliedFilters={appliedFilters}
          collections={collections}
        >
          <Pagination connection={collection.products}>
            {({nodes, isLoading, PreviousLink, NextLink}) => (
              <>
                <div className="flex items-center justify-center mb-6">
                  <Button as={PreviousLink} variant="secondary" width="full">
                    {isLoading ? 'Loading...' : 'Load previous'}
                  </Button>
                </div>
                <Grid layout="products">
                  {nodes.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      loading={getImageLoadingPriority(i)}
                    />
                  ))}
                </Grid>
                <div className="flex items-center justify-center mt-6">
                  <Button as={NextLink} variant="secondary" width="full">
                    {isLoading ? 'Loading...' : 'Load more products'}
                  </Button>
                </div>
              </>
            )}
          </Pagination>
        </SortFilter>
      </Section>
    </>
  );
}

const COLLECTION_QUERY = `#graphql
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          hasNextPage
          endCursor
        }
      }
    }
    collections(first: 100) {
      edges {
        node {
          title
          handle
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

function getSortValuesFromParam(sortParam: SortParam | null): {
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
} {
  switch (sortParam) {
    case 'price-high-low':
      return {
        sortKey: 'PRICE',
        reverse: true,
      };
    case 'price-low-high':
      return {
        sortKey: 'PRICE',
        reverse: false,
      };
    case 'best-selling':
      return {
        sortKey: 'BEST_SELLING',
        reverse: false,
      };
    case 'newest':
      return {
        sortKey: 'CREATED',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'MANUAL',
        reverse: false,
      };
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}
