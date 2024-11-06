/** @deprecated */
export const PLUME_INSERTABLE_ID = "plume";
export const PLEXUS_INSERTABLE_ID = "plexus";
export const PLEXUS_STORAGE_KEY = `plasmic.${PLEXUS_INSERTABLE_ID}`;

export type InsertableId =
  | typeof PLUME_INSERTABLE_ID
  | typeof PLEXUS_INSERTABLE_ID;
