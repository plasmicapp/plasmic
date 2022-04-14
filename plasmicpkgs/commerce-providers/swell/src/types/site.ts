/*
  Forked from https://github.com/vercel/commerce/tree/main/packages/swell/src
  Changes: None
*/
import { SiteTypes } from "@plasmicpkgs/commerce"

export type Category = SiteTypes.Category;

export type SwellCategory = Category & {
  children?: Category[]
}

export type Brand = SiteTypes.Brand;

export type SiteTypes = SiteTypes.SiteTypes;

export type GetSiteInfoOperation = SiteTypes.GetSiteInfoOperation;
