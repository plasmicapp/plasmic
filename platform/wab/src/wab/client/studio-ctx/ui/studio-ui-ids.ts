import {
  ComponentDataQuery,
  ComponentServerQuery,
  DataToken,
  Param,
} from "@/wab/shared/model/classes";

export type UiId = SectionUiId | ModelUiId;

type SectionUiId = `Section:${Section}`;

type Section = "PageMetaUrl" | "PageMetaUrlParams";

export function mkSectionUiId(x: Section): SectionUiId {
  return `Section:${x}`;
}

/** Model:<typeTag>:<uuid> */
type ModelUiId = `Model:${Model["typeTag"]}:${string}`;
type Model = ComponentDataQuery | ComponentServerQuery | Param | DataToken;

export function mkModelUiId(x: Model): ModelUiId {
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
  }
}
