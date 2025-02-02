import type {
  Product,
  ProductImage,
  ProductOption,
  SiteTypes,
} from "@plasmicpkgs/commerce";
import type { ShopifyCart } from "../shopify-types";
import { colorMap } from "./colors";
import {
  CartFragment,
  Collection,
  ImageFragment,
  MoneyV2,
  ProductFragment,
  SelectedOption,
  ProductOption as ShopifyProductOption,
} from "./graphql/gen/graphql";

const money = ({ amount, currencyCode }: MoneyV2) => {
  return {
    value: +amount,
    currencyCode,
  };
};

const isDefaultOption = (selectedOption: SelectedOption) =>
  selectedOption.name === "Title";

const normalizeProductOption = ({
  id,
  name: displayName,
  values,
}: ShopifyProductOption): ProductOption => {
  return {
    __typename: "MultipleChoiceOption",
    id,
    displayName: displayName.toLowerCase(),
    values: values.map((value) => {
      let output: any = {
        label: value,
      };
      if (displayName.match(/colou?r/gi)) {
        const mapedColor = colorMap[value.toLowerCase().replace(/ /g, "")];
        if (mapedColor) {
          output = {
            ...output,
            hexColors: [mapedColor],
          };
        }
      }
      return output;
    }),
  };
};

export function normalizeProduct({
  id,
  title: name,
  vendor,
  images,
  variants,
  description,
  handle,
  priceRange,
  options,
  ...rest
}: ProductFragment): Product {
  return {
    id,
    name,
    description: description || "",
    path: `/${handle}`,
    slug: handle?.replace(/^\/+|\/+$/g, ""),
    price: money(priceRange?.minVariantPrice),
    images: images.edges.map((edge) => normalizeImage(edge.node)),
    variants: variants.edges.map(
      ({
        node: {
          id,
          selectedOptions,
          sku,
          title,
          price,
          compareAtPrice,
          requiresShipping,
          availableForSale,
        },
      }) => {
        return {
          id,
          name: selectedOptions.some((o) => !isDefaultOption(o))
            ? title
            : "Default variant",
          sku: sku ?? id,
          price: +price.amount,
          listPrice: +compareAtPrice?.amount,
          requiresShipping,
          availableForSale,
          options: selectedOptions.map(({ name, value }) => {
            const options = normalizeProductOption({
              id,
              name,
              optionValues: [
                {
                  id,
                  name,
                },
              ],
              values: [value],
            });

            return options;
          }),
        };
      }
    ),
    options: options
      ? options
          .filter((o: any) => !isDefaultOption(o)) // By default Shopify adds a 'Title' name when there's only one option. We don't need it. https://community.shopify.com/c/Shopify-APIs-SDKs/Adding-new-product-variant-is-automatically-adding-quot-Default/td-p/358095
          .map((o: any) => normalizeProductOption(o))
      : [],
    ...rest,
  };
}

export function normalizeCart(
  cart: CartFragment | null | undefined
): ShopifyCart | undefined {
  if (!cart) {
    return undefined;
  }
  return {
    id: cart.id,
    url: cart.checkoutUrl,
    customerId: "",
    email: "",
    createdAt: cart.createdAt,
    currency: {
      code: cart.cost.totalAmount?.currencyCode,
    },
    taxesIncluded: false,
    lineItems: cart.lines.edges.map(
      ({ node: { id, quantity, merchandise } }) => {
        return {
          id,
          variantId: merchandise.id,
          productId: merchandise.product.id,
          name: merchandise.product.title,
          quantity,
          variant: {
            id: merchandise.id,
            sku: merchandise.id ?? "",
            name: merchandise.title,
            image: normalizeImage(merchandise.image),
            requiresShipping: merchandise.requiresShipping,
            price: merchandise.price.amount,
            listPrice: merchandise.compareAtPrice?.amount,
          },
          path: merchandise.product.handle,
          discounts: [],
          options:
            merchandise.title === "Default Title"
              ? []
              : merchandise.selectedOptions,
        };
      }
    ),
    lineItemsSubtotalPrice: +cart.cost.subtotalAmount.amount,
    subtotalPrice: +cart.cost.subtotalAmount.amount,
    totalPrice: +cart.cost.totalAmount.amount,
    discounts: [],
  };
}

export function normalizeCategory({
  title: name,
  handle,
  id,
  products,
  image,
}: Collection): SiteTypes.Category {
  return {
    id,
    name,
    slug: handle,
    path: `/${handle}`,
    isEmpty: products.edges.length === 0,
    images: image ? [normalizeImage(image)] : undefined,
  };
}

function normalizeImage(image: ImageFragment | null | undefined): ProductImage {
  if (!image) {
    return {
      url: "/product-img-placeholder.svg",
    };
  }

  const { url, altText, height, width } = image;
  return {
    url,
    alt: altText || undefined,
    height: height || undefined,
    width: width || undefined,
  };
}
