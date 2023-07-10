import {useLocation, useFetchers, useMatches} from '@remix-run/react';
import type {
  ShopifyAddToCartPayload,
  ShopifyPageViewPayload,
} from '@shopify/hydrogen';
import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
} from '@shopify/hydrogen';
import {useEffect} from 'react';

import type {I18nLocale} from '../lib/type';
import {CartAction} from '../lib/type';

export function useAnalytics(hasUserConsent: boolean, locale: I18nLocale) {
  useShopifyCookies({hasUserConsent});
  const location = useLocation();
  const analyticsFromMatches = useDataFromMatches(
    'analytics',
  ) as unknown as ShopifyPageViewPayload;

  const pageAnalytics = {
    ...analyticsFromMatches,
    currency: locale.currency,
    acceptedLanguage: locale.language,
    hasUserConsent,
  };

  // Page view analytics
  // We want useEffect to execute only when location changes
  // which represents a page view
  useEffect(() => {
    const payload: ShopifyPageViewPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Add to cart analytics
  const cartData = useDataFromFetchers({
    formDataKey: 'cartAction',
    formDataValue: CartAction.ADD_TO_CART,
    dataKey: 'analytics',
  }) as unknown as ShopifyAddToCartPayload;
  if (cartData) {
    const addToCartPayload: ShopifyAddToCartPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
      ...cartData,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload: addToCartPayload,
    });
  }
}

/**
 * Collects data under a certain key from useMatches
 * @param dataKey - The key in `event.data` to collect data from
 * @returns A merged object of the specified key
 *
 * @example
 * ```tsx
 * import {
 *   useDataFromMatches
 * } from '@shopify/hydrogen';
 *
 * export async function loader({request, context}: LoaderArgs) {
 *   return defer({
 *     analytics: {
 *       shopId: 'gid://shopify/Shop/1',
 *     },
 *   });
 * }
 *
 * export default function App() {
 *   const analytics = useDataFromMatches('analytics');
 *
 *   console.log(analytics);
 *   // {
 *   //   shopId: 'gid://shopify/Shop/1',
 *   // }
 * ```
 **/
function useDataFromMatches(dataKey: string): Record<string, unknown> {
  const matches = useMatches();
  const data: Record<string, unknown> = {};

  matches.forEach((event) => {
    const eventData = event?.data;
    if (eventData && eventData[dataKey]) {
      Object.assign(data, eventData[dataKey]);
    }
  });

  return data;
}

/**
 * Collects data under a certain key from useFetches.
 *
 * @param formDataKey - The form data key
 * @param formDataValue - The value of formDataKey
 * @param dataKey - the key in `fetcher.data` to collect data from
 * @returns A merged object of the specified key
 *
 * @example
 * ```tsx
 * // In routes/cart.tsx
 * import {
 *   useDataFromFetchers
 * } from '@shopify/hydrogen';
 *
 * export async function action({request, context}: ActionArgs) {
 *   const cartId = await session.get('cartId');
 *   ...
 *   return json({
 *     analytics: {
 *       cartId,
 *     },
 *   });
 * }
 *
 * // Anywhere when an action can be requested, make sure there is a form input and value
 * // to identify the fetcher
 * export function AddToCartButton({
 *   ...
 *   return (
 *     <fetcher.Form action="/cart" method="post">
 *       <input type="hidden" name="cartAction" value={CartAction.ADD_TO_CART} />
 *
 * // You can add additional data as hidden form inputs and it will also be collected
 * // As long as it is JSON parse-able.
 * export function AddToCartButton({
 *
 *   const analytics = {
 *     products: [product]
 *   };
 *
 *   return (
 *     <fetcher.Form action="/cart" method="post">
 *       <input type="hidden" name="cartAction" value={CartAction.ADD_TO_CART} />
 *       <input type="hidden" name="analytics" value={JSON.stringify(analytics)} />
 *
 * // In root.tsx
 * export default function App() {
 *   const cartData = useDataFromFetchers({
 *     formDataKey: 'cartAction',
 *     formDataValue: CartAction.ADD_TO_CART,
 *     dataKey: 'analytics',
 *   });
 *
 *   console.log(cartData);
 *   // {
 *   //   cartId: 'gid://shopify/Cart/abc123',
 *   //   products: [...]
 *   // }
 * ```
 **/
function useDataFromFetchers({
  formDataKey,
  formDataValue,
  dataKey,
}: {
  formDataKey: string;
  formDataValue: unknown;
  dataKey: string;
}): Record<string, unknown> | undefined {
  const fetchers = useFetchers();
  const data: Record<string, unknown> = {};

  for (const fetcher of fetchers) {
    const formData = fetcher.submission?.formData;
    const fetcherData = fetcher.data;
    if (
      formData &&
      formData.get(formDataKey) === formDataValue &&
      fetcherData &&
      fetcherData[dataKey]
    ) {
      Object.assign(data, fetcherData[dataKey]);

      try {
        if (formData.get(dataKey)) {
          const dataInForm: unknown = JSON.parse(String(formData.get(dataKey)));
          Object.assign(data, dataInForm);
        }
      } catch {
        // do nothing
      }
    }
  }
  return Object.keys(data).length ? data : undefined;
}
