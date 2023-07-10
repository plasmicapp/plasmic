import {useLocation, useMatches} from '@remix-run/react';
import {parse as parseCookie} from 'worktop/cookie';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import typographicBase from 'typographic-base';

import type {
  ChildMenuItemFragment,
  MenuFragment,
  ParentMenuItemFragment,
} from 'storefrontapi.generated';
import {countries} from '~/data/countries';

import type {I18nLocale} from './type';

type EnhancedMenuItemProps = {
  to: string;
  target: string;
  isExternal?: boolean;
};

export type ChildEnhancedMenuItem = ChildMenuItemFragment &
  EnhancedMenuItemProps;

export type ParentEnhancedMenuItem = (ParentMenuItemFragment &
  EnhancedMenuItemProps) & {
  items: ChildEnhancedMenuItem[];
};

export type EnhancedMenu = Pick<MenuFragment, 'id'> & {
  items: ParentEnhancedMenuItem[];
};

export function missingClass(string?: string, prefix?: string) {
  if (!string) {
    return true;
  }

  const regex = new RegExp(` ?${prefix}`, 'g');
  return string.match(regex) === null;
}

export function formatText(input?: string | React.ReactNode) {
  if (!input) {
    return;
  }

  if (typeof input !== 'string') {
    return input;
  }

  return typographicBase(input, {locale: 'en-us'}).replace(
    /\s([^\s<]+)\s*$/g,
    '\u00A0$1',
  );
}

export function getExcerpt(text: string) {
  const regex = /<p.*>(.*?)<\/p>/;
  const match = regex.exec(text);
  return match?.length ? match[0] : text;
}

export function isNewArrival(date: string, daysOld = 30) {
  return (
    new Date(date).valueOf() >
    new Date().setDate(new Date().getDate() - daysOld).valueOf()
  );
}

export function isDiscounted(price: MoneyV2, compareAtPrice: MoneyV2) {
  if (compareAtPrice?.amount > price?.amount) {
    return true;
  }
  return false;
}

function resolveToFromType(
  {
    customPrefixes,
    pathname,
    type,
  }: {
    customPrefixes: Record<string, string>;
    pathname?: string;
    type?: string;
  } = {
    customPrefixes: {},
  },
) {
  if (!pathname || !type) return '';

  /*
    MenuItemType enum
    @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
  */
  const defaultPrefixes = {
    BLOG: 'blogs',
    COLLECTION: 'collections',
    COLLECTIONS: 'collections', // Collections All (not documented)
    FRONTPAGE: 'frontpage',
    HTTP: '',
    PAGE: 'pages',
    CATALOG: 'collections/all', // Products All
    PRODUCT: 'products',
    SEARCH: 'search',
    SHOP_POLICY: 'policies',
  };

  const pathParts = pathname.split('/');
  const handle = pathParts.pop() || '';
  const routePrefix: Record<string, string> = {
    ...defaultPrefixes,
    ...customPrefixes,
  };

  switch (true) {
    // special cases
    case type === 'FRONTPAGE':
      return '/';

    case type === 'ARTICLE': {
      const blogHandle = pathParts.pop();
      return routePrefix.BLOG
        ? `/${routePrefix.BLOG}/${blogHandle}/${handle}/`
        : `/${blogHandle}/${handle}/`;
    }

    case type === 'COLLECTIONS':
      return `/${routePrefix.COLLECTIONS}`;

    case type === 'SEARCH':
      return `/${routePrefix.SEARCH}`;

    case type === 'CATALOG':
      return `/${routePrefix.CATALOG}`;

    // common cases: BLOG, PAGE, COLLECTION, PRODUCT, SHOP_POLICY, HTTP
    default:
      return routePrefix[type]
        ? `/${routePrefix[type]}/${handle}`
        : `/${handle}`;
  }
}

/*
  Parse each menu link and adding, isExternal, to and target
*/
function parseItem(customPrefixes = {}) {
  return function (
    item:
      | MenuFragment['items'][number]
      | MenuFragment['items'][number]['items'][number],
  ):
    | EnhancedMenu['items'][0]
    | EnhancedMenu['items'][number]['items'][0]
    | null {
    if (!item?.url || !item?.type) {
      // eslint-disable-next-line no-console
      console.warn('Invalid menu item.  Must include a url and type.');
      return null;
    }

    // extract path from url because we don't need the origin on internal to attributes
    const {pathname} = new URL(item.url);

    /*
      Currently the MenuAPI only returns online store urls e.g — xyz.myshopify.com/..
      Note: update logic when API is updated to include the active qualified domain
    */
    const isInternalLink = /\.myshopify\.com/g.test(item.url);

    const parsedItem = isInternalLink
      ? // internal links
        {
          ...item,
          isExternal: false,
          target: '_self',
          to: resolveToFromType({type: item.type, customPrefixes, pathname}),
        }
      : // external links
        {
          ...item,
          isExternal: true,
          target: '_blank',
          to: item.url,
        };

    if ('items' in item) {
      return {
        ...parsedItem,
        items: item.items.map(parseItem(customPrefixes)).filter(Boolean),
      } as EnhancedMenu['items'][number];
    } else {
      return parsedItem as EnhancedMenu['items'][number]['items'][number];
    }
  };
}

/*
  Recursively adds `to` and `target` attributes to links based on their url
  and resource type.
  It optionally overwrites url paths based on item.type
*/
export function parseMenu(
  menu: MenuFragment,
  customPrefixes = {},
): EnhancedMenu | null {
  if (!menu?.items) {
    // eslint-disable-next-line no-console
    console.warn('Invalid menu passed to parseMenu');
    return null;
  }

  const parser = parseItem(customPrefixes);

  const parsedMenu = {
    ...menu,
    items: menu.items.map(parser).filter(Boolean),
  } as EnhancedMenu;

  return parsedMenu;
}

export const INPUT_STYLE_CLASSES =
  'appearance-none rounded dark:bg-transparent border focus:border-primary/50 focus:ring-0 w-full py-2 px-3 text-primary/90 placeholder:text-primary/50 leading-tight focus:shadow-outline';

export const getInputStyleClasses = (isError?: string | null) => {
  return `${INPUT_STYLE_CLASSES} ${
    isError ? 'border-red-500' : 'border-primary/20'
  }`;
};

export function statusMessage(status: string) {
  const translations: Record<string, string> = {
    ATTEMPTED_DELIVERY: 'Attempted delivery',
    CANCELED: 'Canceled',
    CONFIRMED: 'Confirmed',
    DELIVERED: 'Delivered',
    FAILURE: 'Failure',
    FULFILLED: 'Fulfilled',
    IN_PROGRESS: 'In Progress',
    IN_TRANSIT: 'In transit',
    LABEL_PRINTED: 'Label printed',
    LABEL_PURCHASED: 'Label purchased',
    LABEL_VOIDED: 'Label voided',
    MARKED_AS_FULFILLED: 'Marked as fulfilled',
    NOT_DELIVERED: 'Not delivered',
    ON_HOLD: 'On Hold',
    OPEN: 'Open',
    OUT_FOR_DELIVERY: 'Out for delivery',
    PARTIALLY_FULFILLED: 'Partially Fulfilled',
    PENDING_FULFILLMENT: 'Pending',
    PICKED_UP: 'Displayed as Picked up',
    READY_FOR_PICKUP: 'Ready for pickup',
    RESTOCKED: 'Restocked',
    SCHEDULED: 'Scheduled',
    SUBMITTED: 'Submitted',
    UNFULFILLED: 'Unfulfilled',
  };
  try {
    return translations?.[status];
  } catch (error) {
    return status;
  }
}

/**
 * Errors can exist in an errors object, or nested in a data field.
 */
export function assertApiErrors(data: Record<string, any> | null | undefined) {
  const errorMessage = data?.customerUserErrors?.[0]?.message;
  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export const DEFAULT_LOCALE: I18nLocale = Object.freeze({
  ...countries.default,
  pathPrefix: '',
});

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart =
    '/' + url.pathname.substring(1).split('/')[0].toLowerCase();

  return countries[firstPathPart]
    ? {
        ...countries[firstPathPart],
        pathPrefix: firstPathPart,
      }
    : {
        ...countries['default'],
        pathPrefix: '',
      };
}

export function usePrefixPathWithLocale(path: string) {
  const [root] = useMatches();
  const selectedLocale = root.data?.selectedLocale ?? DEFAULT_LOCALE;

  return `${selectedLocale.pathPrefix}${
    path.startsWith('/') ? path : '/' + path
  }`;
}

export function useIsHomePath() {
  const {pathname} = useLocation();
  const [root] = useMatches();
  const selectedLocale = root.data?.selectedLocale ?? DEFAULT_LOCALE;
  const strippedPathname = pathname.replace(selectedLocale.pathPrefix, '');
  return strippedPathname === '/';
}

/**
 * Validates that a url is local
 * @param url
 * @returns `true` if local `false`if external domain
 */
export function isLocalPath(url: string) {
  try {
    // We don't want to redirect cross domain,
    // doing so could create fishing vulnerability
    // If `new URL()` succeeds, it's a fully qualified
    // url which is cross domain. If it fails, it's just
    // a path, which will be the current domain.
    new URL(url);
  } catch (e) {
    return true;
  }

  return false;
}

/**
 * Shopify's 'Online Store' stores cart IDs in a 'cart' cookie.
 * By doing the same, merchants can switch from the Online Store to Hydrogen
 * without customers losing carts.
 */
export function getCartId(request: Request) {
  const cookies = parseCookie(request.headers.get('Cookie') || '');
  return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
}
