import { ChoiceCore, ChoiceValue } from "./choice-type";
import { ArrayTypeBaseCore, ObjectTypeBaseCore } from "./container-types";
import { DynamicCore, GraphQLCore, GraphQLValue } from "./misc-types";
import {
  DateRangeStringsCore,
  DateStringCore,
  NumberTypeBaseCore,
  RichBooleanCore,
} from "./primitive-types";
import { QueryBuilderCore } from "./query-builder-types";
import {
  CommonTypeBase,
  ContextDependentConfig,
  Defaultable,
  GenericContext,
} from "./shared-controls";
import { Nullish } from "./type-utils";

/**
 * `[string, number]` -> `[string | undefined, number | undefined]`
 */
export type PartialParams<P extends any[]> = {
  [K in keyof P]: P[K] | undefined;
};

export type FunctionControlContext<P extends any[]> = GenericContext<
  PartialParams<P>, // Function params, each may be undefined
  any // Data from fnContext
>;

export type FunctionContextConfig<P extends any[], R> = ContextDependentConfig<
  FunctionControlContext<P>,
  R
>;

export interface TypeBaseDefault<Ctx extends any[], T>
  extends CommonTypeBase,
    Defaultable<Ctx, T> {
  displayName?: string;
  /**
   * Function for whether this prop should be hidden in the right panel,
   * given the current props for this component
   */
  hidden?: ContextDependentConfig<Ctx, boolean>;
}

export interface PlainStringType<
  P extends any[],
  T extends Nullish<string> = string
> extends TypeBaseDefault<FunctionControlContext<P>, T> {
  type: "string" | `'${T}'`;
}

export type StringType<P extends any[], T extends string = string> =
  | "string"
  | PlainStringType<P, T>
  | ChoiceType<P, T>
  | DateStringType<P>
  | DateRangeStringsType<P>
  | AnyType<P>;

export interface PlainNumberType<
  P extends any[],
  T extends Nullish<number> = number
> extends TypeBaseDefault<FunctionControlContext<P>, T> {
  type: "number" | `${number extends T ? number : T}`;
}

export type NumberType<P extends any[], T extends number = number> =
  | PlainNumberType<P, T>
  | (TypeBaseDefault<FunctionControlContext<P>, T> &
      NumberTypeBaseCore<FunctionControlContext<P>>)
  | ChoiceType<P, T>
  | AnyType<P>;

export interface PlainBooleanType<
  P extends any[],
  T extends Nullish<boolean> = boolean
> extends TypeBaseDefault<FunctionControlContext<P>, T> {
  type: "boolean" | `${boolean extends T ? boolean : T}`;
}

export type BooleanType<P extends any[], T extends boolean = boolean> =
  | PlainBooleanType<P, T>
  | (TypeBaseDefault<FunctionControlContext<P>, T> & RichBooleanCore)
  | ChoiceType<P, T>
  | AnyType<P>;

export type GraphQLType<P extends any[]> = TypeBaseDefault<
  FunctionControlContext<P>,
  any
> &
  GraphQLCore<FunctionControlContext<P>>;

export interface PlainNullType<P extends any[]>
  extends TypeBaseDefault<FunctionControlContext<P>, null> {
  type: "null";
}
export type NullType<P extends any[]> = PlainNullType<P> | AnyType<P>;

export interface PlainUndefinedType<P extends any[]>
  extends TypeBaseDefault<FunctionControlContext<P>, undefined> {
  type: "undefined";
}
export type UndefinedType<P extends any[]> = PlainUndefinedType<P> | AnyType<P>;

export type ExtractObjectKeys<T extends object> = keyof T & string;

export type ObjectType<
  P extends any[],
  T extends Record<string, any> = Record<string, any>
> = TypeBaseDefault<FunctionControlContext<P>, T> &
  ObjectTypeBaseCore<
    FunctionControlContext<P>,
    GenericType<P, any>,
    ExtractObjectKeys<T>
  >;
export type ArrayType<
  P extends any[],
  T extends any[] = any[]
> = TypeBaseDefault<FunctionControlContext<P>, T> &
  ArrayTypeBaseCore<FunctionControlContext<P>, GenericType<P, any>>;

export type QueryBuilderType<P extends any[]> = TypeBaseDefault<
  FunctionControlContext<P>,
  any
> &
  QueryBuilderCore<FunctionControlContext<P>>;

export interface PlainAnyType<P extends any[]>
  extends TypeBaseDefault<FunctionControlContext<P>, any> {
  type: "any";
}
export type AnyType<P extends any[]> = PlainAnyType<P>;

export interface PlainVoidType extends CommonTypeBase {
  type: "void";
}
export type VoidType<P extends any[]> = PlainVoidType | AnyType<P>;

type IsAny<T> = 0 extends 1 & T ? true : false;

type CommonType<P extends any[], T> = T extends GraphQLValue
  ? GraphQLType<P>
  : T extends null
  ? NullType<P>
  : T extends undefined
  ? UndefinedType<P>
  : T extends Array<any>
  ? ArrayType<P>
  : T extends object
  ? ObjectType<P, T>
  : AnyType<P>;

type AnyTyping<P extends any[], T> = T extends string
  ? StringType<P, T>
  : T extends number
  ? NumberType<P, T>
  : T extends boolean
  ? BooleanType<P, T>
  : CommonType<P, T>;

export type ChoiceTypeBase<
  P extends any[],
  Opt extends ChoiceValue = ChoiceValue
> = TypeBaseDefault<FunctionControlContext<P>, Opt | Opt[]> &
  ChoiceCore<FunctionControlContext<P>, Opt>;

export interface SingleChoiceType<
  P extends any[],
  Opt extends ChoiceValue = ChoiceValue
> extends ChoiceTypeBase<P, Opt> {
  multiSelect?: false;
}

export interface MultiChoiceType<
  P extends any[],
  Opt extends ChoiceValue = ChoiceValue
> extends ChoiceTypeBase<P, Opt> {
  multiSelect: true;
}

export interface CustomChoiceType<
  P extends any[],
  Opt extends ChoiceValue = ChoiceValue
> extends ChoiceTypeBase<P, Opt> {
  multiSelect: FunctionContextConfig<P, boolean>;
}

export type ChoiceType<P extends any[], T extends ChoiceValue = ChoiceValue> =
  | SingleChoiceType<P, T>
  | MultiChoiceType<P, T>
  | CustomChoiceType<P, T>;

export type DateStringType<P extends any[]> = TypeBaseDefault<
  FunctionControlContext<P>,
  string
> &
  DateStringCore;
export type DateRangeStringsType<P extends any[]> = TypeBaseDefault<
  FunctionControlContext<P>,
  [string, string]
> &
  DateRangeStringsCore;

export interface DynamicType<P extends any[]>
  extends CommonTypeBase,
    DynamicCore<FunctionControlContext<P>, GenericType<P, any>> {}

export type RestrictedType<P extends any[], T> = IsAny<T> extends true
  ? AnyTyping<P, T>
  : // Exact primitive types
  [T] extends [string]
  ? StringType<P, T>
  : [T] extends [number]
  ? NumberType<P, T>
  : [T] extends [boolean]
  ? BooleanType<P, T>
  : // Primitive + nullable
  T extends string | null | undefined
  ? Exclude<T, null | undefined> extends string
    ? StringType<P, T extends string ? T : string>
    : CommonType<P, T>
  : T extends number | null | undefined
  ? Exclude<T, null | undefined> extends number
    ? NumberType<P, T extends number ? T : number>
    : CommonType<P, T>
  : T extends boolean | null | undefined
  ? Exclude<T, null | undefined> extends boolean
    ? BooleanType<P, T extends boolean ? T : boolean>
    : CommonType<P, T>
  : // Everything else
    CommonType<P, T>;

export type GenericType<P extends any[], T> =
  | RestrictedType<P, T>
  | DynamicType<P>
  | QueryBuilderType<P>;

export interface ParamTypeBase {
  name: string;
}

export type ParamType<P extends any[], T> = ParamTypeBase & GenericType<P, T>;

export type RequiredParam<P extends any[], T> = ParamTypeBase &
  ParamType<P, T> & {
    isOptional?: false;
    isRestParameter?: false;
  };

export type OptionalParam<P extends any[], T> = ParamTypeBase &
  ParamType<P, T> & {
    isRestParameter?: false;
  };

export type RestParam<P extends any[], T> = ParamTypeBase &
  ParamType<P, T> & {
    isOptional?: false;
    isRestParameter: true;
  };

// https://stackoverflow.com/questions/70684030/remove-all-optional-items-from-a-tuple-type
type RequiredParams<
  T extends any[],
  U extends any[] = []
> = Partial<T> extends T
  ? U
  : T extends [infer F, ...infer R]
  ? RequiredParams<R, [...U, F]>
  : U;

type OptionalParams<T extends any[]> = T extends [
  ...RequiredParams<T>,
  ...infer R
]
  ? [...R]
  : [];

type HandleRequiredParams<P extends any[], R extends any[]> = R extends [
  infer H,
  ...infer T
]
  ? [string | RequiredParam<P, H>, ...HandleRequiredParams<P, T>]
  : [];

type HandleOptionalParams<P extends any[], R extends any[]> = R extends [
  infer H,
  ...infer T
]
  ?
      | []
      | [
          string | OptionalParam<P, H | undefined>,
          ...HandleOptionalParams<P, T>
        ]
  : R extends []
  ? []
  : R extends Array<infer T>
  ? [] | [RestParam<P, T[]>]
  : [];

export type HandleParams<P extends any[]> = [
  ...HandleRequiredParams<P, RequiredParams<P>>,
  ...HandleOptionalParams<P, Required<OptionalParams<P>>>
];

export type HandleReturnType<P extends any[], T> =
  | VoidType<P>
  | ParamType<P, T>;
