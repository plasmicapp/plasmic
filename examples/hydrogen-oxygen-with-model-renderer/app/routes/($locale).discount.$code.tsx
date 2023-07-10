import {redirect, type LoaderArgs} from '@shopify/remix-oxygen';

import {getCartId} from '~/lib/utils';

import {cartCreate, cartDiscountCodesUpdate} from './($locale).cart';

/**
 * Automatically applies a discount found on the url
 * If a cart exists it's updated with the discount, otherwise a cart is created with the discount already applied
 * @param ?redirect an optional path to return to otherwise return to the home page
 * @example
 * Example path applying a discount and redirecting
 * ```ts
 * /discount/FREESHIPPING?redirect=/products
 *
 * ```
 * @preserve
 */
export async function loader({request, context, params}: LoaderArgs) {
  const {storefront} = context;
  // N.B. This route will probably be removed in the future.
  const session = context.session as any;
  const {code} = params;

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const redirectParam =
    searchParams.get('redirect') || searchParams.get('return_to') || '/';

  searchParams.delete('redirect');
  searchParams.delete('return_to');

  const redirectUrl = `${redirectParam}?${searchParams}`;
  const headers = new Headers();

  if (!code) {
    return redirect(redirectUrl);
  }

  let cartId = getCartId(request);

  //! if no existing cart, create one
  if (!cartId) {
    const {cart, errors: graphqlCartErrors} = await cartCreate({
      input: {},
      storefront,
    });

    if (graphqlCartErrors?.length) {
      return redirect(redirectUrl);
    }

    //! cart created - we only need a Set-Cookie header if we're creating
    cartId = cart.id;
    headers.append('Set-Cookie', `cart=${cartId.split('/').pop()}`);
  }

  //! apply discount to the cart
  await cartDiscountCodesUpdate({
    cartId,
    discountCodes: [code],
    storefront,
  });

  return redirect(redirectUrl, {headers});
}
