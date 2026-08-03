import {
  AnimationSequence,
  Component,
  ComponentDataQuery,
  ComponentServerQuery,
  DataToken,
  Param,
  StyleToken,
  Variant,
} from "@/wab/shared/model/classes";

export type UiId = SectionUiId | ModelUiId | TplUiId;

type SectionUiId = `Section:${Section}`;

type Section = "PageMetaUrl" | "PageMetaUrlParams";

export function mkSectionUiId(x: Section): SectionUiId {
  return `Section:${x}`;
}

type TplUiId = `Tpl:${string}/${string}`;

export function mkTplUiId(componentUuid: string, tplUuid: string): TplUiId {
  return `Tpl:${componentUuid}/${tplUuid}`;
}

/** Model:<typeTag>:<uuid> */
type ModelUiId = `Model:${Model["typeTag"]}:${string}`;

type Model =
  | ComponentDataQuery
  | ComponentServerQuery
  | Param
  | DataToken
  | StyleToken
  | AnimationSequence
  | Variant
  | Component;

export type ModelTypeTag = Model["typeTag"];

export function mkModelUiId(x: Pick<Model, "typeTag" | "uuid">): ModelUiId {
  return `Model:${x.typeTag}:${x.uuid}`;
}

export type ParsedUiId =
  | {
      type: "Section";
      section: Section;
    }
  | {
      type: "Model";
      typeTag: Model["typeTag"];
      uuid: string;
    }
  | {
      type: "Tpl";
      componentUuid: string;
      tplUuid: string;
    };

export function parseUiId(id: UiId): ParsedUiId {
  const parts = id.split(":");
  const type = parts[0] as ParsedUiId["type"];
  switch (type) {
    case "Section":
      return { type, section: parts[1] as Section };
    case "Model":
      return {
        type,
        typeTag: parts[1] as Model["typeTag"],
        uuid: parts[2],
      };
    case "Tpl": {
      const [componentUuid, tplUuid] = parts[1].split("/");
      return { type, componentUuid, tplUuid };
    }
  }
}
