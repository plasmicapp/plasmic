import { Cart, CartDraft } from '@commercetools/platform-sdk'
import { ClientResponse } from '@commercetools/sdk-client-v2'
import { FetcherOptions } from '@plasmicpkgs/commerce'
import { removeCartCookie, setCartId } from './cart-cookie'

const createCart = async (
  fetch: <T = any, B = Body>(options: FetcherOptions<B>) => Promise<T>
) => {
  const draft: CartDraft = {
    currency: 'USD',
    country: 'US',
  }

  const cart = await fetch<ClientResponse<Cart>, CartDraft>({
    query: 'carts',
    method: 'post',
    body: draft,
  })

  if (!cart.body) {
    removeCartCookie()
  } else {
    setCartId(cart.body.id)
  }
  return cart.body
}

export default createCart
