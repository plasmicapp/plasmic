import {
  isCodeComponent,
  isHostLessCodeComponent,
  isPlumeComponent,
} from "@/wab/shared/core/components";
import { TplComponent } from "@/wab/shared/model/classes";
import { analytics } from "..";

export function trackInsertItem(eventData: InsertItemEventData) {
  analytics().track("Insert item", eventData);
}

export interface InsertOpts {
  from: "add-drawer" | "components-tab" | "copy-paste";
  dragged?: boolean;
}

export interface InsertItemEventData extends InsertOpts {
  insertableKey: string;
  insertableName: string;
  sourceProjectId?: string;
  sourceComponentId?: string;
  sourceComponentName?: string;
  isHostless?: boolean;
  isCodeComponent?: boolean;
  tplTag?: string;
  type?: string;
}

export function getEventDataForTplComponent(
  tplNode: TplComponent
): Omit<InsertItemEventData, "from"> {
  const { component } = tplNode;
  return {
    insertableKey: component.uuid,
    insertableName: component.name,
    sourceProjectId: component.templateInfo?.projectId || undefined,
    sourceComponentId: component.templateInfo?.componentId || undefined,
    isHostless: isHostLessCodeComponent(component),
    isCodeComponent: isCodeComponent(component),
    type: isPlumeComponent(component) ? "plume" : "tpl",
  };
}
