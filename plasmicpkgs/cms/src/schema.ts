// This should be kept in sync with wab/ApiSchema.

// eslint-disable-next-line no-shadow
export enum CmsMetaType {
  TEXT = "text",
  LONG_TEXT = "long-text",
  NUMBER = "number",
  IMAGE = "image",
  FILE = "file",
  DATE_TIME = "date-time",
  BOOLEAN = "boolean",
  COLOR = "color",
  RICH_TEXT = "rich-text",
  REF = "ref",
  LIST = "list",
  OBJECT = "object",
  ENUM = "enum",
}

export interface CmsBaseType<T> {
  /** The stable unique identifier, like `heroImage`. */
  identifier: string;
  /** The field label. */
  label?: string;
  helperText: string;
  required: boolean;
  hidden: boolean;
  localized: boolean;
  unique: boolean;
  /** The empty string "" locale is the default locale. */
  defaultValueByLocale: { [locale: string]: T };
}

export interface CmsTextLike {
  defaultValue?: string;
  minChars?: number;
  maxChars?: number;
}

export interface CmsText extends CmsBaseType<string>, CmsTextLike {
  type: CmsMetaType.TEXT;
}

export interface CmsLongText extends CmsBaseType<string>, CmsTextLike {
  type: CmsMetaType.LONG_TEXT;
}

export interface CmsNumber extends CmsBaseType<number> {
  type: CmsMetaType.NUMBER;
  defaultValue?: number;
}

export interface CmsBoolean extends CmsBaseType<boolean> {
  type: CmsMetaType.BOOLEAN;
  defaultValue?: boolean;
}

export interface CmsImage extends CmsBaseType<string> {
  type: CmsMetaType.IMAGE;
  defaultValue?: string;
}

export interface CmsDateTime extends CmsBaseType<string> {
  type: CmsMetaType.DATE_TIME;
  defaultValue?: string;
}

export interface CmsRichText extends CmsBaseType<string> {
  type: CmsMetaType.RICH_TEXT;
  defaultValue?: string;
}

export interface CmsFile extends CmsBaseType<string> {
  type: CmsMetaType.FILE;
  defaultValue?: string;
}

export interface CmsRef extends CmsBaseType<string> {
  type: CmsMetaType.REF;
  defaultValue?: string;
}

export interface CmsList extends CmsBaseType<any[]> {
  type: CmsMetaType.LIST;
  fields: CmsFieldMeta[];
}

export interface CmsObject extends CmsBaseType<object> {
  type: CmsMetaType.OBJECT;
  fields: CmsFieldMeta[];
}

export interface CmsColor extends CmsBaseType<string> {
  type: CmsMetaType.COLOR;
  defaultValue?: string;
}

export interface CmsEnum extends CmsBaseType<string> {
  type: CmsMetaType.ENUM;
  defaultValue?: string;
  options: string[];
}

export type CmsFieldMeta =
  | CmsRef
  | CmsList
  | CmsObject
  | CmsText
  | CmsLongText
  | CmsNumber
  | CmsBoolean
  | CmsImage
  | CmsFile
  | CmsDateTime
  | CmsColor
  | CmsRichText
  | CmsEnum;

export type CmsType = CmsFieldMeta["type"];

export interface CmsTableSchema {
  fields: CmsFieldMeta[];
}

export interface ApiCmsTable {
  identifier: string;
  name: string;
  schema: CmsTableSchema;
}

export interface ApiCmsRow {
  identifier: string | null;
  data: Record<string, any> | null;
}

type FilterClause = any;

export interface ApiCmsQuery {
  where?: FilterClause;
  limit?: number;
  offset?: number;
  order?: (string | { field: string; dir: "asc" | "desc" })[];
  fields?: string[];
}
