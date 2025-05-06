import { SELF_SELECTOR } from "@/wab/client/web-importer/constants";
import { CssCommonPositionAST } from "@adobe/css-tools";
import * as specificity from "specificity";

type Position = CssCommonPositionAST["position"];

export interface SpecificityWithPosition {
  isDirectlyOnElement: boolean;
  byId: number;
  byClass: number;
  byType: number;
  position: Position;
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
  if (a.position?.start?.line !== b.position?.start?.line) {
    return (a.position?.start?.line ?? 0) - (b.position?.start?.line ?? 0);
  }
  return (a.position?.start?.column ?? 0) - (b.position?.start?.column ?? 0);
}

export function getSpecificity(
  selector: string,
  position?: Position
): SpecificityWithPosition {
  if (selector === SELF_SELECTOR) {
    return {
      isDirectlyOnElement: true,
      byId: 0,
      byClass: 0,
      byType: 0,
      position,
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
    position,
  };
}
