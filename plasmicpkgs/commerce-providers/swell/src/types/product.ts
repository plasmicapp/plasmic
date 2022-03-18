/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: Expose Product Types from the commerce package
*/
import { ProductTypes } from "@plasmicpkgs/commerce";

export type ProductImage = ProductTypes.ProductImage;

export type ProductPrice = ProductTypes.ProductPrice;

export type ProductOption = ProductTypes.ProductOption;

export type ProductOptionValues = ProductTypes.ProductOptionValues;

export type ProductVariant = ProductTypes.ProductVariant;

export type Product = ProductTypes.Product;

export type SearchProductsBody = ProductTypes.SearchProductsBody;

export type ProductTypes = ProductTypes.ProductTypes;

export type SearchProductsHook = ProductTypes.SearchProductsHook;

export type ProductsSchema = ProductTypes.ProductsSchema;

export type GetAllProductPathsOperation = ProductTypes.GetAllProductPathsOperation;

export type GetAllProductsOperation = ProductTypes.GetAllProductsOperation;

export type GetProductOperation = ProductTypes.GetProductOperation;