// This should be kept in sync with wab/ApiSchema.

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
  type: "text";
}

export interface CmsLongText extends CmsBaseType, CmsTextLike {
  type: "long-text";
}

export interface CmsNumber extends CmsBaseType {
  type: "number";
  defaultValue?: number;
}

export interface CmsBoolean extends CmsBaseType {
  type: "boolean";
  defaultValue?: boolean;
}

export interface CmsImage extends CmsBaseType {
  type: "image";
  defaultValue?: string;
}

export interface CmsDateTime extends CmsBaseType {
  type: "date-time";
  defaultValue?: string;
}

export interface CmsRichText extends CmsBaseType {
  type: "rich-text";
  defaultValue?: string;
}

export interface CmsFile extends CmsBaseType {
  type: "file";
  defaultValue?: string;
}

export type CmsFieldMeta =
  | CmsText
  | CmsLongText
  | CmsNumber
  | CmsBoolean
  | CmsImage
  | CmsFile
  | CmsDateTime
  | CmsRichText;

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
  order?: (string | { field: string; dir: "asc" | "desc" })[];
}
