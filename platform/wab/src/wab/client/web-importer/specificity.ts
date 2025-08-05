import { SELF_SELECTOR } from "@/wab/client/web-importer/constants";
import { CssLocation } from "css-tree";
import * as specificity from "specificity";

export interface SpecificityWithPosition {
  isDirectlyOnElement: boolean;
  byId: number;
  byClass: number;
  byType: number;
  loc?: CssLocation;
}

export function compareSpecificity(
  a: SpecificityWithPosition,
  b: SpecificityWithPosition
) {
  if (a.isDirectlyOnElement && !b.isDirectlyOnElement) {
    return 1;
  }
  if (!a.isDirectlyOnElement && b.isDirectlyOnElement) {
    return -1;
  }
  if (a.byId !== b.byId) {
    return a.byId - b.byId;
  }
  if (a.byClass !== b.byClass) {
    return a.byClass - b.byClass;
  }
  if (a.byType !== b.byType) {
    return a.byType - b.byType;
  }
  if (a.loc?.start?.line !== b.loc?.start?.line) {
    return (a.loc?.start?.line ?? 0) - (b.loc?.start?.line ?? 0);
  }
  return (a.loc?.start?.column ?? 0) - (b.loc?.start?.column ?? 0);
}

export function getSpecificity(
  selector: string,
  loc?: CssLocation
): SpecificityWithPosition {
  if (selector === SELF_SELECTOR) {
    return {
      isDirectlyOnElement: true,
      byId: 0,
      byClass: 0,
      byType: 0,
      loc,
    };
  }

  const parsed = specificity.calculate(selector);
  const spec_id = parsed.A;
  const spec_class = parsed.B;
  const spec_type = parsed.C;
  return {
    isDirectlyOnElement: false,
    byId: spec_id,
    byClass: spec_class,
    byType: spec_type,
    loc,
  };
}
