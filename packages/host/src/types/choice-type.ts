import { MaybeContextDependentConfig } from "./shared-controls";

export type ChoiceValue = string | number | boolean;
export type ChoiceObject<T = ChoiceValue> = { label: string; value: T };
export type ChoiceOption<T extends ChoiceValue = ChoiceValue> =
  | T
  | ChoiceObject<T>;
export type ChoiceOptions<T extends ChoiceValue = ChoiceValue> =
  | T[]
  | ChoiceObject<T>[];

export interface ChoiceCore<Ctx extends any[], T extends ChoiceValue> {
  type: "choice";
  options: MaybeContextDependentConfig<Ctx, ChoiceOptions<T>>;
  multiSelect?: MaybeContextDependentConfig<Ctx, boolean>;
  allowSearch?: boolean;
  filterOption?: boolean;
  onSearch?: MaybeContextDependentConfig<
    Ctx,
    ((v: string) => void) | undefined
  >;
}
