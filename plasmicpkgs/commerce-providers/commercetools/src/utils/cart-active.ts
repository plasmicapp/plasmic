import { Cart, ClientResponse } from '@commercetools/platform-sdk'
import { FetcherOptions } from '@plasmicpkgs/commerce'
import { getCartId, removeCartCookie, setCartId } from './cart-cookie'
import createCart from './cart-create'

const getActiveCart = async (
  fetch: <T = any, B = Body>(options: FetcherOptions<B>) => Promise<T>
) => {
  const cartId = getCartId()
  let activeCart
  if (cartId) {
    activeCart = (
      await fetch<ClientResponse<Cart>>({
        query: 'carts',
        method: 'get',
        variables: {
          id: cartId,
        },
      })
    ).body
  } else {
    activeCart = await createCart(fetch)
  }

  if (!activeCart) {
    removeCartCookie()
  } else {
    setCartId(activeCart.id)
  }
  return activeCart
}

export default getActiveCart
