import { CartType } from "@plasmicpkgs/commerce";

export const createCart: () => CartType.Cart = () => (
  {
    id: '',
    createdAt: '',
    currency: { code: '' },
    taxesIncluded: false,
    lineItems: [],
    lineItemsSubtotalPrice: 0,
    subtotalPrice: 0,
    totalPrice: 0,
  }
)