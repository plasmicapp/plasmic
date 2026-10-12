import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { Result } from "neverthrow";

export type Prompt<T, Config extends object = {}> = {
  _type: "text" | "number" | "boolean" | "choice";
  _valueTypeMarker: T;
  displayName?: string;
  required?: boolean;
} & Config;

export type StringPrompt = Prompt<string, { placeholder?: string }>;
export type BooleanPrompt = Prompt<boolean, { placeholder?: string }>;
export type ChoicePrompt<T> = Prompt<
  T,
  {
    options: Array<{ id: string | number; label: string; value: T }>;
    multi?: boolean;
  }
>;

export function stringPrompt(
  config: Omit<StringPrompt, "_type" | "_valueTypeMarker">,
): StringPrompt {
  return { _valueTypeMarker: "", _type: "text", ...config };
}
export function booleanPrompt(
  config: Omit<BooleanPrompt, "_type" | "_valueTypeMarker">,
): BooleanPrompt {
  return { _valueTypeMarker: false, _type: "boolean", ...config };
}

export function choicePrompt<T>(
  config: Omit<ChoicePrompt<T>, "_type" | "_valueTypeMarker">,
): ChoicePrompt<T> {
  return {
    _valueTypeMarker: undefined as unknown as T,
    _type: "choice",
    ...config,
  };
}

export type CommandMeta<Args = unknown> = {
  // Args were introduced to derive UI metadata for a given arg when
  // rendering command inputs. This could also come in handy in cases where a tool call would
  // require human approval so we can show UI for respective args.
  args: { [K in keyof Args]: Prompt<Args[K]> };
  id: string;
  name: string;
  title: string;
  description: string;
};

export type ContextFunc<C> = (studioCtx: StudioCtx) => C[];

export interface Command<
  Args = unknown,
  Context = unknown,
  T = void,
  E = never,
> {
  meta: (
    context: Context & {
      studioCtx: StudioCtx;
    },
  ) => CommandMeta<Args>;
  context: ContextFunc<Context>;
  execute: (
    studioCtx: StudioCtx,
    args: Args,
    context: Context,
  ) => Promise<Result<T, E>>;
}
