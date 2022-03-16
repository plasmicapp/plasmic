/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/shopify/src
  Changes: 
    - When a product doesn't have a variant, Shopify sets the default variant title as "Default Title"
      Changed to "Default Variant" to have the same default title as the Swell provider. 
*/
import type { Page } from '../types/page'
import type { Product } from '@plasmicpkgs/commerce'
import type { Cart, LineItem } from '../types/cart'

import {
  Product as ShopifyProduct,
  Checkout,
  CheckoutLineItemEdge,
  SelectedOption,
  ImageConnection,
  ProductVariantConnection,
  MoneyV2,
  ProductOption,
  Page as ShopifyPage,
  PageEdge,
  Collection,
} from '../schema'
import { colorMap } from './colors'

const money = ({ amount, currencyCode }: MoneyV2) => {
  return {
    value: +amount,
    currencyCode,
  }
}

const isDefaultOption = (selectedOption: SelectedOption) =>
  selectedOption.name === "Title";

const normalizeProductOption = ({
  id,
  name: displayName,
  values,
}: ProductOption) => {
  return {
    __typename: 'MultipleChoiceOption',
    id,
    displayName: displayName.toLowerCase(),
    values: values.map((value) => {
      let output: any = {
        label: value,
      }
      if (displayName.match(/colou?r/gi)) {
        const mapedColor = colorMap[value.toLowerCase().replace(/ /g, '')]
        if (mapedColor) {
          output = {
            ...output,
            hexColors: [mapedColor],
          }
        }
      }
      return output
    }),
  }
}

const normalizeProductImages = ({ edges }: ImageConnection) =>
  edges?.map(({ node: { originalSrc: url, ...rest } }) => ({
    url,
    ...rest,
  }))

const normalizeProductVariants = ({ edges }: ProductVariantConnection) => {
  return edges?.map(
    ({
      node: {
        id,
        selectedOptions,
        sku,
        title,
        priceV2,
        compareAtPriceV2,
        requiresShipping,
        availableForSale,
      },
    }) => {
      return {
        id,
        name: selectedOptions.some(o => !isDefaultOption(o)) ? title : "Default variant",
        sku: sku ?? id,
        price: +priceV2.amount,
        listPrice: +compareAtPriceV2?.amount,
        requiresShipping,
        availableForSale,
        options: selectedOptions.map(({ name, value }: SelectedOption) => {
          const options = normalizeProductOption({
            id,
            name,
            values: [value],
          })

          return options
        }),
      }
    }
  )
}

export function normalizeProduct({
  id,
  title: name,
  vendor,
  images,
  variants,
  description,
  descriptionHtml,
  handle,
  priceRange,
  options,
  metafields,
  ...rest
}: any): Product {
  return {
    id,
    name,
    vendor,
    path: `/${handle}`,
    slug: handle?.replace(/^\/+|\/+$/g, ''),
    price: money(priceRange?.minVariantPrice),
    images: normalizeProductImages(images),
    variants: variants ? normalizeProductVariants(variants) : [],
    options: options
      ? options
          .filter((o: any) => !isDefaultOption(o)) // By default Shopify adds a 'Title' name when there's only one option. We don't need it. https://community.shopify.com/c/Shopify-APIs-SDKs/Adding-new-product-variant-is-automatically-adding-quot-Default/td-p/358095
          .map((o: any) => normalizeProductOption(o))
      : [],
    ...(description && { description }),
    ...(descriptionHtml && { descriptionHtml }),
    ...rest,
  }
}

export function normalizeCart(checkout: any): Cart {
  return {
    id: checkout.id,
    url: checkout.webUrl,
    customerId: '',
    email: '',
    createdAt: checkout.createdAt,
    currency: {
      code: checkout.totalPriceV2?.currencyCode,
    },
    taxesIncluded: checkout.taxesIncluded,
    lineItems: checkout.lineItems?.edges.map(normalizeLineItem),
    lineItemsSubtotalPrice: +checkout.subtotalPriceV2?.amount,
    subtotalPrice: +checkout.subtotalPriceV2?.amount,
    totalPrice: +checkout.totalPriceV2?.amount,
    discounts: [],
  }
}

function normalizeLineItem({
  node: { id, title, variant, quantity },
}: CheckoutLineItemEdge): LineItem {
  return {
    id,
    variantId: String(variant?.id),
    productId: String(variant?.id),
    name: `${title}`,
    quantity,
    variant: {
      id: String(variant?.id),
      sku: variant?.sku ?? '',
      name: variant?.title!,
      image: {
        url: variant?.image?.originalSrc || '/product-img-placeholder.svg',
      },
      requiresShipping: variant?.requiresShipping ?? false,
      price: variant?.priceV2?.amount,
      listPrice: variant?.compareAtPriceV2?.amount,
    },
    path: String(variant?.product?.handle),
    discounts: [],
    options: variant?.title == 'Default Title' ? [] : variant?.selectedOptions,
  }
}
/*
export const normalizePage = (
  { title: name, handle, ...page }: ShopifyPage,
  locale: string = 'en-US'
): Page => ({
  ...page,
  url: `/${locale}/${handle}`,
  name,
})

export const normalizePages = (edges: PageEdge[], locale?: string): Page[] =>
  edges?.map((edge) => normalizePage(edge.node, locale))

export const normalizeCategory = ({
  title: name,
  handle,
  id,
}: Collection): Category => ({
  id,
  name,
  slug: handle,
  path: `/${handle}`,
})
*/