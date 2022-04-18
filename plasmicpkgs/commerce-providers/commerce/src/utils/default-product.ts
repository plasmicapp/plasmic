import { Product } from "../types/product";
export const defaultProduct: Product = {
  id: "123456789",
  name: "Product Placeholder",
  description: "",
  descriptionHtml: `
    <p>This is a <strong>placeholder</strong>.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
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
      id: "variiant1",
      name: "Variant Placeholder",
      options: [],
    },
    {
      id: "variant2",
      name: "Variant Placeholder 2",
      options: [],
    },
  ],
  price: {
    value: 0,
    currencyCode: "USD",
  },
  options: [],
};
