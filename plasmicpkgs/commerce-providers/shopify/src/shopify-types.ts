import { CartType } from "@plasmicpkgs/commerce";

export type ShopifyCart = CartType.Cart & {
  lineItems: CartType.LineItem[];
  url?: string;
};
