import {
  CmsMetaType,
  CmsTypeLongText,
  CmsTypeMeta,
  CmsTypeText,
} from "@/wab/shared/ApiSchema";

export function isCmsTextLike(
  typeMeta: CmsTypeMeta
): typeMeta is CmsTypeText | CmsTypeLongText {
  return [CmsMetaType.TEXT, CmsMetaType.LONG_TEXT].includes(typeMeta.type);
}
