import { COMMERCETOOLS_CART_COOKIE } from '../const'
import { getCookies, setCookies, removeCookies } from './cookies'

export const getCartId = () =>
  getCookies<string>(COMMERCETOOLS_CART_COOKIE)

export const setCartId = (id: string) =>
  setCookies(COMMERCETOOLS_CART_COOKIE, id)

export const removeCartCookie = () =>
  removeCookies(COMMERCETOOLS_CART_COOKIE)
