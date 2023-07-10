import {useEffect} from 'react';
import {useFetcher} from '@remix-run/react';

import {usePrefixPathWithLocale} from '~/lib/utils';
import type {FeaturedData} from '~/routes/($locale).featured-products';

import {FeaturedCollections} from './FeaturedCollections';
import {ProductSwimlane} from './ProductSwimlane';

export function FeaturedSection() {
  const {load, data} = useFetcher<FeaturedData>();
  const path = usePrefixPathWithLocale('/featured-products');

  useEffect(() => {
    load(path);
  }, [load, path]);

  if (!data) return null;

  const {featuredCollections, featuredProducts} = data;

  return (
    <>
      {featuredCollections.nodes.length < 2 && (
        <FeaturedCollections
          title="Popular Collections"
          collections={featuredCollections}
        />
      )}
      <ProductSwimlane products={featuredProducts} />
    </>
  );
}
