const root = globalThis as any;

export interface BasicTrait {
  label?: string;
  type: "text" | "number" | "boolean";
}

export interface ChoiceTrait {
  label?: string;
  type: "choice";
  options: string[];
}

export type TraitMeta = BasicTrait | ChoiceTrait;

export interface TraitRegistration {
  trait: string;
  meta: TraitMeta;
}

declare global {
  interface Window {
    __PlasmicTraitRegistry: TraitRegistration[];
  }
}

if (root.__PlasmicTraitRegistry == null) {
  root.__PlasmicTraitRegistry = [];
}

export default function registerTrait(trait: string, meta: TraitMeta) {
  root.__PlasmicTraitRegistry.push({
    trait,
    meta,
  });
}
