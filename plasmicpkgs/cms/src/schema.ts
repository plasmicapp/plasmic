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

export interface CmsBaseType {
  identifier: string;
  name: string;
  helperText: string;
  required: boolean;
  hidden: boolean;
}

export interface CmsTextLike {
  defaultValue?: string;
  minChars?: number;
  maxChars?: number;
}

export interface CmsText extends CmsBaseType, CmsTextLike {
  type: CmsMetaType.TEXT;
}

export interface CmsLongText extends CmsBaseType, CmsTextLike {
  type: CmsMetaType.LONG_TEXT;
}

export interface CmsNumber extends CmsBaseType {
  type: CmsMetaType.NUMBER;
  defaultValue?: number;
}

export interface CmsBoolean extends CmsBaseType {
  type: CmsMetaType.BOOLEAN;
  defaultValue?: boolean;
}

export interface CmsImage extends CmsBaseType {
  type: CmsMetaType.IMAGE;
  defaultValue?: string;
}

export interface CmsDateTime extends CmsBaseType {
  type: CmsMetaType.DATE_TIME;
  defaultValue?: string;
}

export interface CmsRichText extends CmsBaseType {
  type: CmsMetaType.RICH_TEXT;
  defaultValue?: string;
}

export interface CmsFile extends CmsBaseType {
  type: CmsMetaType.FILE;
  defaultValue?: string;
}

export interface CmsRef extends CmsBaseType {
  type: CmsMetaType.REF;
  defaultValue?: string;
}

export interface CmsEnum extends CmsBaseType {
  type: CmsMetaType.ENUM;
  defaultValue?: string;
  options: string[];
}

export type CmsFieldMeta =
  | CmsText
  | CmsLongText
  | CmsNumber
  | CmsBoolean
  | CmsImage
  | CmsFile
  | CmsDateTime
  | CmsRef
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
