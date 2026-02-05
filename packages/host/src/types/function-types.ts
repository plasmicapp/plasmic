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

export type FunctionControlContext<P> = GenericContext<
  Partial<P>, // Partial function props
  any
>;

export type FunctionContextConfig<
  Args extends any[],
  R
> = ContextDependentConfig<FunctionControlContext<Args>, R>;

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

export interface PlainStringType<T extends Nullish<string> = string>
  extends TypeBaseDefault<any[], T> {
  type: "string" | `'${T}'`;
}

export type StringType<P, T extends string = string> =
  | "string"
  | PlainStringType<T>
  | ChoiceType<P, T>
  | DateStringType
  | DateRangeStringsType
  | AnyType;

export interface PlainNumberType<T extends Nullish<number> = number>
  extends TypeBaseDefault<any[], T> {
  type: "number" | `${number extends T ? number : T}`;
}

export type NumberType<P, T extends number = number> =
  | PlainNumberType<T>
  | (TypeBaseDefault<FunctionControlContext<P>, T> &
      NumberTypeBaseCore<FunctionControlContext<P>>)
  | ChoiceType<P, T>
  | AnyType;

export interface PlainBooleanType<T extends Nullish<boolean> = boolean>
  extends TypeBaseDefault<any[], T> {
  type: "boolean" | `${boolean extends T ? boolean : T}`;
}

export type BooleanType<P, T extends boolean = boolean> =
  | PlainBooleanType<T>
  | (TypeBaseDefault<FunctionControlContext<P>, T> & RichBooleanCore)
  | ChoiceType<P, T>
  | AnyType;

export type GraphQLType<P> = TypeBaseDefault<FunctionControlContext<P>, any> &
  GraphQLCore<FunctionControlContext<P>>;

export interface PlainNullType extends TypeBaseDefault<any[], null> {
  type: "null";
}
export type NullType = PlainNullType | AnyType;

export interface PlainUndefinedType extends TypeBaseDefault<any[], undefined> {
  type: "undefined";
}
export type UndefinedType = PlainUndefinedType | AnyType;

export type ExtractObjectKeys<T extends object> = keyof T & string;

export type ObjectType<P, T extends object> = TypeBaseDefault<
  FunctionControlContext<P>,
  T
> &
  ObjectTypeBaseCore<
    FunctionControlContext<P>,
    GenericType<P, any>,
    ExtractObjectKeys<T>
  >;
export type ArrayType<P> = TypeBaseDefault<FunctionControlContext<P>, any[]> &
  ArrayTypeBaseCore<FunctionControlContext<P>, GenericType<P, any>>;

export type QueryBuilderType<P> = TypeBaseDefault<
  FunctionControlContext<P>,
  any
> &
  QueryBuilderCore<FunctionControlContext<P>>;

export interface PlainAnyType
  extends TypeBaseDefault<FunctionControlContext<any>, any> {
  type: "any";
}
export type AnyType = PlainAnyType;

export interface PlainVoidType extends CommonTypeBase {
  type: "void";
}
export type VoidType = PlainVoidType | AnyType;

type IsAny<T> = 0 extends 1 & T ? true : false;

type CommonType<P, T> = T extends GraphQLValue
  ? GraphQLType<P>
  : T extends null
  ? NullType
  : T extends undefined
  ? UndefinedType
  : T extends Array<any>
  ? ArrayType<P>
  : T extends object
  ? ObjectType<P, T>
  : AnyType;

type AnyTyping<P, T> = T extends string
  ? StringType<P, T>
  : T extends number
  ? NumberType<P, T>
  : T extends boolean
  ? BooleanType<P, T>
  : CommonType<P, T>;

export type ToTuple<T> = T extends any[] ? T : never;

export type ChoiceTypeBase<
  Args,
  Opt extends ChoiceValue = ChoiceValue
> = TypeBaseDefault<FunctionControlContext<ToTuple<Args>>, Opt | Opt[]> &
  ChoiceCore<FunctionControlContext<ToTuple<Args>>, Opt>;

export interface SingleChoiceType<P, Opt extends ChoiceValue = ChoiceValue>
  extends ChoiceTypeBase<P, Opt> {
  multiSelect?: false;
}

export interface MultiChoiceType<P, Opt extends ChoiceValue = ChoiceValue>
  extends ChoiceTypeBase<P, Opt> {
  multiSelect: true;
}

export interface CustomChoiceType<P, Opt extends ChoiceValue = ChoiceValue>
  extends ChoiceTypeBase<P, Opt> {
  multiSelect: FunctionContextConfig<ToTuple<P>, boolean>;
}

export type ChoiceType<P, T extends ChoiceValue = ChoiceValue> =
  | SingleChoiceType<P, T>
  | MultiChoiceType<P, T>
  | CustomChoiceType<P, T>;

export type DateStringType = TypeBaseDefault<
  FunctionControlContext<string>,
  string
> &
  DateStringCore;
export type DateRangeStringsType = TypeBaseDefault<
  FunctionControlContext<[string, string]>,
  [string, string]
> &
  DateRangeStringsCore;

export interface DynamicType<P>
  extends CommonTypeBase,
    DynamicCore<FunctionControlContext<ToTuple<P>>, GenericType<P, any>> {}

export type RestrictedType<P, T> = IsAny<T> extends true
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

export type GenericType<P, T> =
  | RestrictedType<P, T>
  | DynamicType<P>
  | QueryBuilderType<P>;

export interface ParamTypeBase {
  name: string;
}

export type ParamType<P, T> = ParamTypeBase & GenericType<P, T>;

export type RequiredParam<P, T> = ParamTypeBase &
  ParamType<P, T> & {
    isOptional?: false;
    isRestParameter?: false;
  };

export type OptionalParam<P, T> = ParamTypeBase &
  ParamType<P, T> & {
    isRestParameter?: false;
  };

export type RestParam<P, T> = ParamTypeBase &
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

type HandleRequiredParams<P, R extends any[]> = R extends [infer H, ...infer T]
  ? [string | RequiredParam<P, H>, ...HandleRequiredParams<P, T>]
  : [];

type HandleOptionalParams<P, R extends any[]> = R extends [infer H, ...infer T]
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

export type HandleReturnType<P, T> = VoidType | ParamType<P, T>;
