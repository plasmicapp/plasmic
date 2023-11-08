import { TplNode } from "../classes";
import { mkUuid, xSetDefault } from "../common";

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
