/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: None
*/
import Cookies from 'js-cookie'
import { SHOPIFY_CHECKOUT_ID_COOKIE } from '../const'

const getCheckoutId = (id?: string) => {
  return id ?? Cookies.get(SHOPIFY_CHECKOUT_ID_COOKIE);
}

export default getCheckoutId
