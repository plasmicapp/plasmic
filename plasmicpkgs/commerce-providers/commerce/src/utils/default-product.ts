import { Product } from "../types/product";
export const defaultProduct: Product = {
  id: "123456789",
  name: "Product name",
  description: "",
  descriptionHtml: `
    <p>This is a <strong>placeholder</strong>.</p>
  `,
  images: [
    {
      url: "https://static1.plasmic.app/commerce/lightweight-jacket-0.png",
      alt: "Lightweight Jacket",
    },
    {
      url: "https://static1.plasmic.app/commerce/lightweight-jacket-1.png",
      alt: "Lightweight Jacket",
    },
    {
      url: "https://static1.plasmic.app/commerce/lightweight-jacket-2.png",
      alt: "Lightweight Jacket",
    },
  ],
  variants: [
    {
      id: "variant1",
      name: "Variant 1",
      options: [],
    },
    {
      id: "variant2",
      name: "Variant 2",
      options: [],
    },
  ],
  price: {
    value: 0,
    currencyCode: "USD",
  },
  options: [],
};
