import Cookies from 'js-cookie'

import * as mutation from './mutations'
import { CheckoutCreate } from '../schema'
import { CHECKOUT_ID_COOKIE } from '../const'

export const checkoutCreate = async (fetch: any): Promise<CheckoutCreate> => {
  const data = await fetch({ query: mutation.CheckoutCreate })
  const checkout = data.checkoutCreate?.checkout
  const checkoutId = checkout?.id
  const checkoutToken = checkout?.token

  const value = `${checkoutId}:${checkoutToken}`

  if (checkoutId) {
    const options: Cookies.CookieAttributes = {
      expires: 60 * 60 * 24 * 30,
      sameSite: "none",
      secure: process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_COOKIES !== 'true',,
    }
    Cookies.set(CHECKOUT_ID_COOKIE, value, options)
  }

  return checkout
}

export default checkoutCreate