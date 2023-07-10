import type {Storefront as HydrogenStorefront} from '@shopify/hydrogen';
import type {
  CountryCode,
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen/storefront-api-types';

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type Locale = {
  language: LanguageCode;
  country: CountryCode;
  label: string;
  currency: CurrencyCode;
};

export type Localizations = Record<string, Locale>;

export type I18nLocale = Locale & {
  pathPrefix: string;
};

export type Storefront = HydrogenStorefront<I18nLocale>;

export enum CartAction {
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  UPDATE_CART = 'UPDATE_CART',
  UPDATE_DISCOUNT = 'UPDATE_DISCOUNT',
  UPDATE_BUYER_IDENTITY = 'UPDATE_BUYER_IDENTITY',
}
export type CartActions = keyof typeof CartAction;
