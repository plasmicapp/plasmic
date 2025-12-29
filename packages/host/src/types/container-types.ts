import { ContextDependentConfig } from "./shared-controls";

export interface ObjectTypeBaseCore<Ctx extends any[], Fields> {
  type: "object";
  fields?: Record<string, Fields>;
  nameFunc?: (item: any, ...args: Ctx) => string | undefined;
  /**
   * Controls how the object editor is displayed in the UI.
   * - "popup":  Displays the object in a popup (default)
   * - "inline": Displays the object fields inline
   * - "flatten": Displays the object fields inline at the parent level. The parent label is not displayed.
   * @default "popup"
   */
  display?: "inline" | "popup" | "flatten";
}

export interface ArrayTypeBaseCore<Ctx extends any[], Fields> {
  type: "array";
  itemType?: ObjectTypeBaseCore<Ctx, Fields>;
  /**
   * Optional function that determines whether the user can delete a given item.
   */
  unstable__canDelete?: (item: any, ...args: Ctx) => boolean;
  /**
   * Specify how to let Plasmic know how to update its own internal representation of the data when the value has
   * changed, or when issuing a minimalValue or shownValue that is different.
   *
   * Important to specify this if you are expecting any nested expression values in this data type!
   */
  unstable__keyFunc?: (item: any) => any;
  /**
   * Specify what would be the tentative new value that is set if the user makes any changes.
   *
   * Useful for field mappings.
   *
   * For instance, consider a Table where we have a `fields` prop:
   *
   * - Initially, the value is undefined. But if the user makes any changes, we would want to save an array of at
   *   least three items (corresponding to, say, three columns inferred from a schema).
   *
   * - Let's say there are 5 columns in the value. The data schema changes, removing a column and adding two new
   *   ones. Now we would want a different minimal value, containing 6 items.
   */
  unstable__minimalValue?: ContextDependentConfig<Ctx, any>;
}
