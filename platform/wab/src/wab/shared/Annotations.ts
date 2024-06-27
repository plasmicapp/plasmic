import { mkUuid, xSetDefault } from "@/wab/shared/common";
import { TplNode } from "@/wab/shared/model/classes";

export class Annotation {
  public readonly id = mkUuid();
  constructor(public name: string, public value: string) {}
}

export const annotationsMap = new WeakMap<TplNode, Annotation[]>();

export function getAnnotations(tpl: TplNode): Annotation[] {
  return annotationsMap.get(tpl) || [];
}

export function addAnnotation(tpl: TplNode, annot: Annotation) {
  xSetDefault(annotationsMap, tpl, () => []).push(annot);
}
