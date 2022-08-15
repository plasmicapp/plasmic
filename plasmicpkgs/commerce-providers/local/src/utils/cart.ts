import { CartType } from "@plasmicpkgs/commerce";
import Cookies from "js-cookie";
import { LOCAL_CART_ID, LOCAL_CART_OBJ } from "../const";

const options: Cookies.CookieAttributes = {
  sameSite: "none",
  secure: true,
};

export const createCart: () => CartType.Cart = () => {
  const cart = {
    id: "",
    createdAt: "",
    currency: { code: "USD" },
    taxesIncluded: false,
    lineItems: [],
    lineItemsSubtotalPrice: 0,
    subtotalPrice: 0,
    totalPrice: 0,
  };

  const cartId = Date.now().toString();

  Cookies.set(LOCAL_CART_ID, cartId);
  Cookies.set(
    LOCAL_CART_OBJ,
    JSON.stringify({
      id: cartId,
      cart,
    })
  );

  return cart;
};

export const getCart: (cartId?: string) => CartType.Cart = (
  cartId?: string
) => {
  cartId = cartId ?? Cookies.get(LOCAL_CART_ID);
  const cartStr = Cookies.get(LOCAL_CART_OBJ);
  const cart = cartStr ? JSON.parse(cartStr) : undefined;

  if (!cart || cart.id !== cartId) {
    return createCart();
  } else {
    return cart.cart;
  }
};

export const cartUpdate = (newCart: CartType.Cart) => {
  Cookies.set(
    LOCAL_CART_OBJ,
    JSON.stringify({
      id: Cookies.get(LOCAL_CART_ID),
      cart: newCart,
    })
  );

  return newCart;
};
