import {
  AnimationSequence,
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  DataToken,
  Param,
  StyleToken,
  TplNode,
  Variant,
} from "@/wab/shared/model/classes";

export type SiteScopedModel =
  Component | StyleToken | DataToken | AnimationSequence | Variant;

export type ComponentScopedModel =
  ComponentDataQuery | ComponentServerQuery | Param | Variant | TplNode;

export type SiteScopedTag =
  Exclude<SiteScopedModel, Variant>["typeTag"] | "GlobalVariant";

export type ComponentScopedTag =
  Exclude<ComponentScopedModel, TplNode>["typeTag"] | "Tpl";

type Section = "PageMetaUrl" | "PageMetaUrlParams";

export type UiId = SectionUiId | ModelUiId;

type SectionUiId = `Section:${Section}`;

export type ModelUiId =
  | `Model:${SiteScopedTag}:${string}`
  | `Model:${ComponentScopedTag}:${string}/${string}`;

export function mkSectionUiId(section: Section): SectionUiId {
  return `Section:${section}`;
}

export function mkSiteScopedUiId(model: {
  typeTag: SiteScopedTag;
  uuid: string;
}): ModelUiId {
  return `Model:${model.typeTag}:${model.uuid}`;
}

export function mkComponentScopedUiId(
  model: { typeTag: ComponentScopedTag; uuid: string },
  componentUuid: string,
): ModelUiId {
  return `Model:${model.typeTag}:${componentUuid}/${model.uuid}`;
}

export interface ParsedSiteScopedUiId {
  type: "SiteScoped";
  tag: SiteScopedTag;
  uuid: string;
}

export interface ParsedComponentScopedUiId {
  type: "ComponentScoped";
  tag: ComponentScopedTag;
  componentUuid: string;
  uuid: string;
}

export type ParsedModelUiId = ParsedSiteScopedUiId | ParsedComponentScopedUiId;

type ParsedUiId = { type: "Section"; section: Section } | ParsedModelUiId;

export function mkModelUiId(parsed: ParsedModelUiId): ModelUiId {
  return parsed.type === "SiteScoped"
    ? mkSiteScopedUiId({ typeTag: parsed.tag, uuid: parsed.uuid })
    : mkComponentScopedUiId(
        { typeTag: parsed.tag, uuid: parsed.uuid },
        parsed.componentUuid,
      );
}

export function parseUiId(id: UiId): ParsedUiId | undefined {
  const [kind, tag] = id.split(":");
  if (kind === "Section") {
    return { type: "Section", section: tag as Section };
  }
  return parseModelUiId(id as ModelUiId);
}

export function parseModelUiId(id: ModelUiId): ParsedModelUiId | undefined {
  const [, tag, key] = id.split(":");
  if (!tag || !key) {
    return undefined;
  }
  const [componentUuid, uuid] = key.split("/");
  return uuid
    ? {
        type: "ComponentScoped",
        tag: tag as ComponentScopedTag,
        componentUuid,
        uuid,
      }
    : { type: "SiteScoped", tag: tag as SiteScopedTag, uuid: key };
}
