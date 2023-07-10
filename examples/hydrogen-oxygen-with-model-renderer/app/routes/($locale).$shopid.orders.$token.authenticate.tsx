import {redirect, type LoaderArgs} from '@shopify/remix-oxygen';
import invariant from 'tiny-invariant';

import {Button, PageHeader} from '~/components';

/*
 If your online store had active orders before you launched your Hydrogen storefront,
 and the Hydrogen storefront uses the same domain formerly used by the online store,
 then customers will receive 404 pages when they click on the old order status URLs
 that are routing to your Hydrogen storefront. To prevent this, ensure that you redirect
 those requests back to Shopify.
*/
export async function loader({request, context: {storefront}}: LoaderArgs) {
  const {origin} = new URL(request.url);
  const {shop} = await storefront.query(
    `#graphql
      query getShopPrimaryDomain { shop { primaryDomain { url } } }
    `,
    {cache: storefront.CacheLong()},
  );
  invariant(shop, 'Error redirecting to the order status URL');
  return redirect(request.url.replace(origin, shop.primaryDomain.url));
}

export default function () {
  return null;
}
export function ErrorBoundary() {
  return (
    <PageHeader
      heading={'Error redirecting to the order status URL'}
      className="text-red-600"
    >
      <div className="flex items-baseline justify-between w-full">
        <Button as="button" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </PageHeader>
  );
}
