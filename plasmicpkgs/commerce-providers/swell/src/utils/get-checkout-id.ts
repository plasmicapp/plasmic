/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import Cookies from 'js-cookie'
import { SWELL_CHECKOUT_ID_COOKIE } from '../const'

const getCheckoutId = (id?: string) => {
  return id ?? Cookies.get(SWELL_CHECKOUT_ID_COOKIE)
}

export default getCheckoutId
