import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ensure } from "@/wab/shared/common";
import { isPlumeComponent, PlumeComponent } from "@/wab/shared/core/components";

const PLUME_IMAGE = {
  checkbox: "checkbox",
  select: "select",
  switch: "switch",
  button: "button",
  "text-input": "input",
};

export function getPlumeImage(plumeType: string) {
  return `https://static1.plasmic.app/insertables/${ensure(
    PLUME_IMAGE[plumeType],
    "Plume type must exist"
  )}.svg`;
}

export const ACTIVE_PLUME_TYPES = [
  "checkbox",
  "select",
  "switch",
  "button",
  "text-input",
];

export function getPlumeComponentTemplates(
  studioCtx: StudioCtx
): PlumeComponent[] {
  const plumeSite = studioCtx.projectDependencyManager.plumeSite;
  if (!plumeSite) {
    return [];
  }

  return plumeSite.components
    .filter(isPlumeComponent)
    .filter(
      (comp) =>
        ACTIVE_PLUME_TYPES.includes(comp.plumeInfo.type) &&
        !comp.name.startsWith("_")
    );
}
