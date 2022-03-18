/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes:
    - Added sameSite and secure to the cookie options to allow third-party cookies.
	    We need this to make work on the studio
*/
import { SWELL_CHECKOUT_URL_COOKIE, SWELL_COOKIE_EXPIRE } from '../../const'

import Cookies from 'js-cookie'

export const checkoutCreate = async (fetch: any) => {
  const cart = await fetch({
    query: 'cart',
    method: 'get',
  })

  if (!cart) {
    await fetch({
      query: 'cart',
      method: 'setItems',
      variables: [[]],
    })
  }

  const checkoutUrl = cart?.checkout_url
  const options: Cookies.CookieAttributes = {
    expires: SWELL_COOKIE_EXPIRE,
    sameSite: "none",
    secure: true
  }
  if (checkoutUrl) {
    Cookies.set(SWELL_CHECKOUT_URL_COOKIE, checkoutUrl, options)
  }

  return cart
}

export default checkoutCreate
