/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes:
    - Added sameSite and secure to the cookie options to allow third-party cookies.
	    We need this to make work on the studio
*/
import { FetcherOptions } from "@plasmicpkgs/commerce";
import Cookies from "js-cookie";
import {
  SHOPIFY_CART_ID_COOKIE,
  SHOPIFY_CHECKOUT_URL_COOKIE,
  SHOPIFY_COOKIE_EXPIRE,
} from "../const";
import {
  CartLineInput,
  CreateCartMutation,
  CreateCartMutationVariables,
} from "./graphql/gen/graphql";
import { createCartMutation } from "./mutations/cart";
import { normalizeCart } from "./normalize";

export const cartCreate = async (
  fetch: <T = any, B = Body>(options: FetcherOptions<B>) => Promise<T>,
  lines: CartLineInput[]
) => {
  const { cartCreate } = await fetch<
    CreateCartMutation,
    CreateCartMutationVariables
  >({
    query: createCartMutation.toString(),
    variables: {
      lines,
    },
  });

  const cart = cartCreate?.cart;
  if (cart) {
    const options: Cookies.CookieAttributes = {
      expires: SHOPIFY_COOKIE_EXPIRE,
      sameSite: "none",
      secure: true,
    };
    Cookies.set(SHOPIFY_CART_ID_COOKIE, cart.id, options);
    Cookies.set(SHOPIFY_CHECKOUT_URL_COOKIE, cart.checkoutUrl, options);
    return normalizeCart(cart);
  } else {
    return undefined;
  }
};
