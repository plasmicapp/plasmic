import { CartType as Core } from '@plasmicpkgs/commerce'

export type SelectedOption = Core.SelectedOption;
export type LineItem = Core.LineItem;
export type ProductVariant = Core.ProductVariant;
export type CartItemBody = Core.CartItemBody;

/**
 * Extend core cart types
 */

export type Cart = Core.Cart & {
  lineItems: Core.LineItem[]
  url?: string
}

export type CartTypes = Core.CartTypes

export type CartHooks = Core.CartHooks<CartTypes>

export type GetCartHook = CartHooks['getCart']
export type AddItemHook = CartHooks['addItem']
export type UpdateItemHook = CartHooks['updateItem']
export type RemoveItemHook = CartHooks['removeItem']

export type CartSchema = Core.CartSchema<CartTypes>

export type CartHandlers = Core.CartHandlers<CartTypes>

export type GetCartHandler = CartHandlers['getCart']
export type AddItemHandler = CartHandlers['addItem']
export type UpdateItemHandler = CartHandlers['updateItem']
export type RemoveItemHandler = CartHandlers['removeItem']
