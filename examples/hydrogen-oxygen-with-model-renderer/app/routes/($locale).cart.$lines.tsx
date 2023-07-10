import {redirect, type LoaderArgs} from '@shopify/remix-oxygen';

import {cartCreate} from './($locale).cart';

/**
 * Automatically creates a new cart based on the URL and redirects straight to checkout.
 * Expected URL structure:
 * ```ts
 * /cart/<variant_id>:<quantity>
 *
 * ```
 * More than one `<variant_id>:<quantity>` separated by a comma, can be supplied in the URL, for
 * carts with more than one product variant.
 *
 * @param `?discount` an optional discount code to apply to the cart
 * @example
 * Example path creating a cart with two product variants, different quantities, and a discount code:
 * ```ts
 * /cart/41007289663544:1,41007289696312:2?discount=HYDROBOARD
 *
 * ```
 * @preserve
 */
export async function loader({request, context, params}: LoaderArgs) {
  const {storefront} = context;

  const session = context.session;

  const {lines} = params;
  const linesMap = lines?.split(',').map((line) => {
    const lineDetails = line.split(':');
    const variantId = lineDetails[0];
    const quantity = parseInt(lineDetails[1], 10);

    return {
      merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
    };
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const discount = searchParams.get('discount');
  const discountArray = discount ? [discount] : [];

  const headers = new Headers();

  //! create a cart
  const {cart, errors: graphqlCartErrors} = await cartCreate({
    input: {
      lines: linesMap,
      discountCodes: discountArray,
    },
    storefront,
  });

  if (graphqlCartErrors?.length || !cart) {
    throw new Response('Link may be expired. Try checking the URL.', {
      status: 410,
    });
  }

  //! cart created - set and replace the session cart if there is one
  session.unset('cartId');
  session.set('cartId', cart.id);
  headers.set('Set-Cookie', await session.commit());

  //! redirect to checkout
  if (cart.checkoutUrl) {
    return redirect(cart.checkoutUrl, {headers});
  } else {
    throw new Error('No checkout URL found');
  }
}

export default function Component() {
  return null;
}
