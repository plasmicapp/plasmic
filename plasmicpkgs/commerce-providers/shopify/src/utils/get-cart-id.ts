/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import Cookies from "js-cookie";
import { SHOPIFY_CART_ID_COOKIE } from "../const";

export const getCartId = (id?: string) => {
  return id ?? Cookies.get(SHOPIFY_CART_ID_COOKIE);
};
